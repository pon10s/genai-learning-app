// ============================================================
// generate-article.js — 記事を1本 自動生成する（GitHub Actions / cron 用）
//
// Anthropic Messages API を「依存ライブラリなし・Node標準 fetch」で呼び、
// web search ツールで最新の生成AI記事を1本探して、
// 「要約(段落配列)＋4択クイズ2〜3問」のJSONを生成し、
// src/data/articles/ に保存して manifest を更新する。
//
// 必要な環境変数: ANTHROPIC_API_KEY
// 任意: MODEL（既定 claude-opus-4-8）
//
// このスクリプトは「データを足す」だけ。検証は tools/validate-articles.js が行う。
// ============================================================
"use strict";
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "src", "data");
const ARTICLES_DIR = path.join(DATA, "articles");
const MANIFEST = path.join(DATA, "manifest.json");

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const MODEL = process.env.MODEL || "claude-opus-4-8";
const API_KEY = process.env.ANTHROPIC_API_KEY;

// カテゴリ
const CATEGORIES = ["trend", "ai-dev", "basics"];
const CATEGORY_JP = { trend: "最新トレンド", "ai-dev": "AI駆動開発", basics: "開発の基礎" };

// 安定したシステムプロンプト（キャッシュ対象）。中身を頻繁に変えないこと。
const SYSTEM_PROMPT = `あなたは日本語の「生成AIキャッチアップ学習アプリ」のコンテンツ編集者です。
最新の生成AI/LLM・AI駆動開発・開発基礎に関する記事を1本、web_searchで探して読み、
学習者向けに「まず読む要約」と「4択クイズ」をセットで作ります。

# 品質ルール（厳守）
- 信頼できる新しめの記事を選ぶ（一次情報・公式ブログ・定番技術メディアを優先。広告だらけ/古すぎる記事は避ける）。
- 事実は記事に書かれている内容だけを使う。推測で断定しない。数値・モデル名・日付など時点依存の情報は「その記事の時点の主張」として扱う。
- summary は段落の配列。合計300〜500字程度で、1〜2分で読めるやさしい全体まとめ。専門用語はかみ砕く。
- questions は2〜3問。各 choices は4個。「紛らわしい良問」にする（同じ分野・同じ粒度のもっともらしいダミー。
  記事を理解していないと選べないレベル。パスワード等の明らかなジョーク選択肢は禁止）。
- explanation で「なぜ正解か／なぜ他が違うか」を書く。
- source.url は実在する、実際に参照した記事のURLにする（必須）。

# 出力形式（厳守）
最後に、次のスキーマの JSON オブジェクトを1つだけ、\`\`\`json のコードブロックで出力する。
JSON の外に文章・引用・注釈を書かない。
{
  "id": "art-<英小文字とハイフンのslug>",
  "category": "trend | ai-dev | basics",
  "title": "画面見出し用の短い日本語タイトル",
  "readMinutes": 2,
  "source": { "title": "記事タイトル", "url": "https://...", "date": "YYYY-MM" },
  "summary": ["段落1", "段落2", "段落3"],
  "questions": [
    { "question": "問題文", "choices": ["A","B","C","D"], "answerIndex": 0, "difficulty": 2, "explanation": "解説" }
  ]
}`;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

// 既存記事から「タイトル一覧」と「カテゴリ別本数」を集める
function surveyExisting() {
  const manifest = readJson(MANIFEST, { articles: [] });
  const titles = [];
  const counts = { trend: 0, "ai-dev": 0, basics: 0 };
  for (const rel of manifest.articles || []) {
    const a = readJson(path.join(DATA, rel), null);
    if (!a) continue;
    if (a.title) titles.push(a.title);
    if (counts[a.category] != null) counts[a.category]++;
  }
  return { manifest, titles, counts };
}

// 一番少ないカテゴリを選ぶ（同数なら配列順）
function leastCoveredCategory(counts) {
  return CATEGORIES.slice().sort((x, y) => (counts[x] || 0) - (counts[y] || 0))[0];
}

// Messages API を1回呼ぶ
async function callApi(messages) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

// web search はサーバー側ループ。pause_turn の間は再送して続行する。
async function runConversation(userPrompt) {
  let messages = [{ role: "user", content: userPrompt }];
  let resp;
  for (let i = 0; i < 6; i++) {
    resp = await callApi(messages);
    if (resp.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: resp.content });
      continue;
    }
    return resp;
  }
  return resp;
}

// 応答のテキストブロックを連結
function extractText(resp) {
  return (resp.content || [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

// テキストから JSON オブジェクトを取り出す
function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

// slug を id から作る（安全化）
function slugFromId(id) {
  return String(id).replace(/^art-/, "").replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "article";
}

async function main() {
  if (!API_KEY) {
    console.error("ANTHROPIC_API_KEY が設定されていません。");
    process.exit(1);
  }

  const { manifest, titles, counts } = surveyExisting();
  const category = leastCoveredCategory(counts);
  const today = new Date().toISOString().slice(0, 10);

  const userPrompt =
    `今日のテーマは「${CATEGORY_JP[category]}」（category: "${category}"）です。` +
    `このテーマで最新の良い記事を web_search で1本見つけ、要約とクイズのJSONを作ってください。\n` +
    `本日: ${today}。\n` +
    `次の既存タイトルと内容が重複しないものにしてください:\n- ` +
    (titles.length ? titles.join("\n- ") : "(まだ無し)");

  console.log(`テーマ=${category} / 既存 ${JSON.stringify(counts)} / 記事 ${titles.length}本`);

  const resp = await runConversation(userPrompt);
  const text = extractText(resp);
  let article;
  try {
    article = extractJson(text);
  } catch (e) {
    console.error("JSONの取り出しに失敗:", e.message);
    console.error("---応答の末尾---\n" + text.slice(-800));
    process.exit(1);
  }

  // カテゴリは安全側で今日のテーマに固定
  if (!CATEGORIES.includes(article.category)) article.category = category;

  const slug = slugFromId(article.id || `art-${category}-${today}`);
  article.id = "art-" + slug;
  const rel = `articles/${slug}.json`;
  const outPath = path.join(DATA, rel);

  if (fs.existsSync(outPath)) {
    console.error(`同名ファイルが既にあります: ${rel}（重複の可能性）。中止します。`);
    process.exit(1);
  }

  fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(article, null, 2) + "\n", "utf8");

  if (!manifest.articles.includes(rel)) {
    manifest.articles.push(rel);
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  }

  const usage = resp.usage || {};
  console.log(`✅ 生成: ${rel}  「${article.title}」  設問${(article.questions || []).length}問`);
  console.log(`   出典: ${article.source && article.source.url}`);
  console.log(`   tokens: in=${usage.input_tokens} out=${usage.output_tokens} cache_read=${usage.cache_read_input_tokens || 0}`);
}

main().catch((e) => { console.error("失敗:", e.message); process.exit(1); });
