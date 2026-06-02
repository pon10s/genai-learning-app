// ============================================================
// validate-articles.js — 記事データの検証ゲート
//
// 使い方:  node tools/validate-articles.js
//   問題なければ exit 0（サマリーを表示）
//   1つでも異常があれば exit 1（エラー一覧を表示）
//
// 自動生成のあと・公開(push)の前に必ず通すこと。
// これに通らないデータは公開しない。
// ============================================================
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "src", "data");
const VALID_CATEGORIES = ["trend", "ai-dev", "basics"];
const errors = [];
const e = (msg) => errors.push(msg);

function main() {
  const manifestPath = path.join(DATA, "manifest.json");
  if (!fs.existsSync(manifestPath)) { e("manifest.json がありません"); return done(); }

  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
  catch (err) { e("manifest.json が壊れています: " + err.message); return done(); }

  if (!Array.isArray(manifest.articles) || manifest.articles.length === 0) {
    e("manifest.articles が空、または配列ではありません");
    return done();
  }

  const seenIds = new Set();
  let totalQuestions = 0;
  const cats = {};

  for (const rel of manifest.articles) {
    const file = path.join(DATA, rel);
    if (!fs.existsSync(file)) { e(`${rel}: ファイルが存在しません`); continue; }

    let a;
    try { a = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch (err) { e(`${rel}: JSONが壊れています (${err.message})`); continue; }

    // --- 記事レベルの必須項目 ---
    if (!a.id || typeof a.id !== "string") e(`${rel}: id がありません`);
    if (seenIds.has(a.id)) e(`${rel}: id "${a.id}" が重複しています`);
    seenIds.add(a.id);

    if (!VALID_CATEGORIES.includes(a.category)) e(`${rel}: category "${a.category}" が不正（${VALID_CATEGORIES.join("/")} のいずれか）`);
    if (!a.title || typeof a.title !== "string") e(`${rel}: title がありません`);
    if (typeof a.readMinutes !== "number") e(`${rel}: readMinutes（数値）がありません`);
    if (!a.source || !a.source.url || !/^https?:\/\//.test(a.source.url)) e(`${rel}: source.url（出典URL）がありません`);

    // --- 要約（読み物）---
    if (!Array.isArray(a.summary) || a.summary.length < 2) {
      e(`${rel}: summary は段落2つ以上の配列にしてください`);
    } else {
      const chars = a.summary.join("").length;
      if (chars < 150) e(`${rel}: summary が短すぎます（${chars}字。目安300〜500字）`);
      if (chars > 900) e(`${rel}: summary が長すぎます（${chars}字。1〜2分で読める量に）`);
      if (a.summary.some((p) => typeof p !== "string")) e(`${rel}: summary に文字列でない要素があります`);
    }

    // --- 設問 ---
    if (!Array.isArray(a.questions) || a.questions.length < 2) {
      e(`${rel}: questions は2問以上にしてください`);
    } else {
      a.questions.forEach((q, i) => {
        const at = `${rel} Q${i + 1}`;
        if (!q.question || typeof q.question !== "string") e(`${at}: question がありません`);
        if (!Array.isArray(q.choices) || q.choices.length < 3 || q.choices.length > 4) e(`${at}: choices は3〜4個にしてください`);
        if (Array.isArray(q.choices) && new Set(q.choices).size !== q.choices.length) e(`${at}: choices に重複があります`);
        if (typeof q.answerIndex !== "number" || !Array.isArray(q.choices) || q.answerIndex < 0 || q.answerIndex >= q.choices.length) e(`${at}: answerIndex が範囲外です`);
        if (!q.explanation || typeof q.explanation !== "string" || q.explanation.length < 10) e(`${at}: explanation（解説）が短すぎます`);
        if (q.difficulty != null && (q.difficulty < 1 || q.difficulty > 3)) e(`${at}: difficulty は1〜3です`);
        totalQuestions++;
      });
    }

    cats[a.category] = (cats[a.category] || 0) + 1;
  }

  if (errors.length === 0) {
    console.log(`✅ 検証OK：記事 ${manifest.articles.length} 本 / 設問 ${totalQuestions} 問 / カテゴリ ${JSON.stringify(cats)}`);
  }
  return done();
}

function done() {
  if (errors.length) {
    console.error(`❌ 検証エラー ${errors.length} 件:`);
    errors.forEach((m) => console.error("  - " + m));
    process.exit(1);
  }
  process.exit(0);
}

main();
