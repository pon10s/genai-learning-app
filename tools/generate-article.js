// ============================================================
// generate-article.js — 「今日の5記事」を生成して総入れ替えする（GitHub Actions / cron 用）
//
// Anthropic Messages API を「依存ライブラリなし・Node標準 fetch」で呼び、
// web search ツールで “最近かつ重要” な生成AI記事を複数本探して、
// 各記事ごとに「要約(段落配列)＋4択クイズ2〜3問」のJSONを作る。
// 既存の記事は削除し、新しい5本にきれいに入れ替える（manifest も書き換え）。
//
// 必要な環境変数: ANTHROPIC_API_KEY
// 任意: MODEL（既定 claude-opus-4-8）, COUNT（既定 5）, MIN_OK（既定 3）
//
// このスクリプトは「データを差し替える」だけ。検証は tools/validate-articles.js が行う。
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
const COUNT = parseInt(process.env.COUNT || "5", 10);
const MIN_OK = parseInt(process.env.MIN_OK || "3", 10);

const CATEGORIES = ["trend", "ai-dev", "basics"];
const CATEGORY_JP = { trend: "最新トレンド", "ai-dev": "AI駆動開発", basics: "開発の基礎" };

// 料金表（USD / 100万トークン）。Web検索は 1,000回で約$10。
const PRICES = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-opus-4-7": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const WEB_SEARCH_PER_1000 = 10;
const USD_TO_JPY = 155; // ざっくり換算

// 使用量の合計（コスト概算の表示用）
const usageTotals = { inTok: 0, outTok: 0, cacheRead: 0, searches: 0 };
function accumulateUsage(u) {
  if (!u) return;
  usageTotals.inTok += u.input_tokens || 0;
  usageTotals.outTok += u.output_tokens || 0;
  usageTotals.cacheRead += u.cache_read_input_tokens || 0;
  const st = u.server_tool_use || {};
  usageTotals.searches += st.web_search_requests || 0;
}
function printCostSummary() {
  const p = PRICES[MODEL] || PRICES["claude-sonnet-4-6"];
  const tokenCost = (usageTotals.inTok / 1e6) * p.in + (usageTotals.outTok / 1e6) * p.out;
  const searchCost = (usageTotals.searches / 1000) * WEB_SEARCH_PER_1000;
  const usd = tokenCost + searchCost;
  console.log("\n----- 今回のコスト概算 -----");
  console.log(`モデル: ${MODEL}`);
  console.log(`入力トークン: ${usageTotals.inTok}  出力トークン: ${usageTotals.outTok}  Web検索: ${usageTotals.searches}回`);
  console.log(`トークン代: $${tokenCost.toFixed(3)}  ＋ 検索代: $${searchCost.toFixed(3)}`);
  console.log(`合計（概算）: $${usd.toFixed(3)}  ≒ 約 ${Math.round(usd * USD_TO_JPY)} 円`);
  console.log("※正確な金額は https://console.anthropic.com の Usage/Billing で確認してください。");
  console.log("----------------------------");
}

// 安定したシステムプロンプト（キャッシュ対象）。中身を頻繁に変えないこと。
const SYSTEM_PROMPT = `あなたは日本語の「生成AIキャッチアップ学習アプリ」のコンテンツ編集者です。
最新の生成AI/LLM・AI駆動開発・開発基礎に関する記事を1本、web_searchで探して読み、
学習者向けに「まず読む要約」と「4択クイズ」をセットで作ります。

# 記事選びの方針（重要）
- 「最近かつ重要」を最優先。できるだけ直近1〜2ヶ月以内の、話題になった/重要度の高いニュースや解説を選ぶ。
- 信頼できる情報源（一次情報・公式ブログ・定番技術メディア）を優先。広告だらけ/中身の薄い記事は避ける。

# 品質ルール（厳守）
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
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  accumulateUsage(json.usage);
  return json;
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

function extractText(resp) {
  return (resp.content || [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

function slugFromId(id, fallback) {
  return String(id || fallback).replace(/^art-/, "").replace(/[^a-z0-9-]/gi, "-").toLowerCase() || fallback;
}

// 1記事を生成（失敗時は null）
async function generateOne(category, avoidTitles, todayStr) {
  const userPrompt =
    `今日のテーマは「${CATEGORY_JP[category]}」（category: "${category}"）です。` +
    `このテーマで、最近かつ重要な記事を web_search で1本見つけ、要約とクイズのJSONを作ってください。\n` +
    `本日: ${todayStr}。直近1〜2ヶ月以内の記事を優先してください。\n` +
    `次のタイトルと内容が重複しないものにしてください:\n- ` +
    (avoidTitles.length ? avoidTitles.join("\n- ") : "(まだ無し)");
  try {
    const resp = await runConversation(userPrompt);
    const article = extractJson(extractText(resp));
    if (!CATEGORIES.includes(article.category)) article.category = category;
    if (!Array.isArray(article.questions) || article.questions.length < 2) throw new Error("設問不足");
    return article;
  } catch (e) {
    console.error(`  生成失敗(${category}): ${e.message}`);
    return null;
  }
}

async function main() {
  if (!API_KEY) {
    console.error("ANTHROPIC_API_KEY が設定されていません。");
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);

  // 5枠をカテゴリで埋める（round-robin で分散）
  const slots = Array.from({ length: COUNT }, (_, i) => CATEGORIES[i % CATEGORIES.length]);

  const newArticles = [];
  const avoidTitles = [];
  const usedSlugs = new Set();

  for (let i = 0; i < slots.length; i++) {
    const category = slots[i];
    console.log(`(${i + 1}/${slots.length}) テーマ=${category} を生成中…`);
    const article = await generateOne(category, avoidTitles, today);
    if (!article) continue;

    // slug を一意にする
    let slug = slugFromId(article.id, `${category}-${today}-${i + 1}`);
    if (usedSlugs.has(slug)) slug = `${slug}-${i + 1}`;
    usedSlugs.add(slug);
    article.id = "art-" + slug;
    article._slug = slug;

    newArticles.push(article);
    if (article.title) avoidTitles.push(article.title);
    console.log(`   ✅ 「${article.title}」 設問${article.questions.length}問 / 出典: ${article.source && article.source.url}`);
  }

  if (newArticles.length < MIN_OK) {
    console.error(`生成できたのが ${newArticles.length} 本（最低 ${MIN_OK} 本必要）。入れ替えを中止します。`);
    process.exit(1);
  }

  // --- ここで初めて総入れ替え（既存の記事ファイルを全削除→新規を書き込み）---
  fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  for (const f of fs.readdirSync(ARTICLES_DIR)) {
    if (f.endsWith(".json")) fs.unlinkSync(path.join(ARTICLES_DIR, f));
  }
  const manifestArticles = [];
  for (const a of newArticles) {
    const rel = `articles/${a._slug}.json`;
    delete a._slug;
    fs.writeFileSync(path.join(DATA, rel), JSON.stringify(a, null, 2) + "\n", "utf8");
    manifestArticles.push(rel);
  }
  fs.writeFileSync(MANIFEST, JSON.stringify({ articles: manifestArticles }, null, 2) + "\n", "utf8");

  console.log(`\n✅ 入れ替え完了：${newArticles.length} 本（${manifestArticles.join(", ")}）`);
  printCostSummary();
}

main().catch((e) => { console.error("失敗:", e.message); process.exit(1); });
