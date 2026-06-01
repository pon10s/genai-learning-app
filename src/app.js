// ============================================================
// 生成AI学習アプリ — クイズプレイヤー（フェーズ1 MVP）
//
// やること：
//   1. data/manifest.json を読む（クイズファイルの一覧）
//   2. 各クイズファイルを読み込んで1つの配列にまとめる
//   3. 1問ずつ出題 → 回答 → 正誤判定 → 解説＋出典 → 次の問題
//   4. 最後に成績をまとめて表示
//
// ※ 進捗の保存（localStorage）はフェーズ2で追加する。ここではまだやらない。
// ============================================================

// カテゴリの日本語ラベル（表示用）
const CATEGORY_LABELS = {
  trend: "最新トレンド",
  "ai-dev": "AI駆動開発",
  basics: "開発の基礎",
};

// アプリ全体の状態をまとめて持つ
const state = {
  quizzes: [],   // 出題するクイズの配列
  current: 0,    // いま何問目か（0始まり）
  correct: 0,    // 正解数
  answered: false, // この問題に回答済みか
};

const appEl = document.getElementById("app");

// ------------------------------------------------------------
// 起動：クイズを読み込んで最初の問題を表示する
// ------------------------------------------------------------
async function init() {
  renderLoading();
  try {
    const manifest = await fetchJson("data/manifest.json");
    const files = manifest.quizFiles || [];

    // すべてのクイズファイルを読み、ひとつの配列にまとめる
    const lists = await Promise.all(files.map((f) => fetchJson("data/" + f)));
    state.quizzes = lists.flat();

    if (state.quizzes.length === 0) {
      renderMessage("まだクイズがありません", "Claude Codeに「クイズ作って」と頼んで追加できます。");
      return;
    }
    renderQuestion();
  } catch (err) {
    console.error(err);
    renderMessage(
      "クイズの読み込みに失敗しました",
      "ローカルでファイルを直接開くと読み込めない場合があります。公開URL、または開発サーバー経由で開いてください。"
    );
  }
}

// JSONを取ってくる小さな道具
async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`読み込み失敗: ${path} (${res.status})`);
  return res.json();
}

// ------------------------------------------------------------
// 画面：読み込み中
// ------------------------------------------------------------
function renderLoading() {
  appEl.innerHTML = `<div class="card"><p>読み込み中…</p></div>`;
}

// 画面：メッセージ（エラーや「クイズなし」用）
function renderMessage(title, body) {
  appEl.innerHTML = `
    <div class="card">
      <h2>${escapeHtml(title)}</h2>
      <p class="muted">${escapeHtml(body)}</p>
    </div>`;
}

// ------------------------------------------------------------
// 画面：問題を出す
// ------------------------------------------------------------
function renderQuestion() {
  state.answered = false;
  const q = state.quizzes[state.current];
  const total = state.quizzes.length;
  const num = state.current + 1;
  const catLabel = CATEGORY_LABELS[q.category] || q.category;

  const choicesHtml = q.choices
    .map(
      (choice, i) => `
      <button class="choice" data-index="${i}">
        <span class="choice-mark">${String.fromCharCode(65 + i)}</span>
        <span class="choice-text">${escapeHtml(choice)}</span>
      </button>`
    )
    .join("");

  appEl.innerHTML = `
    <div class="progress">
      <span>第 ${num} 問 / 全 ${total} 問</span>
      <span class="cat cat-${q.category}">${escapeHtml(catLabel)}</span>
    </div>
    <div class="card">
      ${q.summary ? `<p class="summary">${escapeHtml(q.summary)}</p>` : ""}
      <h2 class="question">${escapeHtml(q.question)}</h2>
      <div class="choices">${choicesHtml}</div>
      <div id="feedback"></div>
    </div>`;

  // 選択肢のクリックを受け付ける
  appEl.querySelectorAll(".choice").forEach((btn) => {
    btn.addEventListener("click", () => onAnswer(Number(btn.dataset.index)));
  });
}

// ------------------------------------------------------------
// 回答したとき：正誤判定 → 解説表示
// ------------------------------------------------------------
function onAnswer(selectedIndex) {
  if (state.answered) return; // 二重回答を防ぐ
  state.answered = true;

  const q = state.quizzes[state.current];
  const isCorrect = selectedIndex === q.answerIndex;
  if (isCorrect) state.correct++;

  // 選択肢に正解／不正解の色をつけ、押せないようにする
  appEl.querySelectorAll(".choice").forEach((btn) => {
    const i = Number(btn.dataset.index);
    btn.disabled = true;
    if (i === q.answerIndex) btn.classList.add("correct");
    if (i === selectedIndex && !isCorrect) btn.classList.add("wrong");
  });

  const isLast = state.current === state.quizzes.length - 1;
  const src = q.source || {};
  const sourceHtml = src.url
    ? `<p class="source">📰 出典：<a href="${encodeURI(src.url)}" target="_blank" rel="noopener">${escapeHtml(src.title || src.url)}</a>${src.date ? `（${escapeHtml(src.date)}）` : ""}</p>`
    : "";

  document.getElementById("feedback").innerHTML = `
    <div class="result-banner ${isCorrect ? "ok" : "ng"}">
      ${isCorrect ? "正解！ 🎉" : "残念… 不正解"}
    </div>
    <div class="explanation">
      <h3>解説</h3>
      <p>${escapeHtml(q.explanation || "")}</p>
      ${sourceHtml}
    </div>
    <button id="nextBtn" class="primary">${isLast ? "結果を見る" : "次の問題へ →"}</button>`;

  document.getElementById("nextBtn").addEventListener("click", goNext);
}

// 次の問題へ（最後なら結果画面）
function goNext() {
  if (state.current < state.quizzes.length - 1) {
    state.current++;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    renderResult();
  }
}

// ------------------------------------------------------------
// 画面：結果
// ------------------------------------------------------------
function renderResult() {
  const total = state.quizzes.length;
  const rate = Math.round((state.correct / total) * 100);

  appEl.innerHTML = `
    <div class="card result-card">
      <h2>おつかれさまでした！</h2>
      <p class="score">${state.correct} / ${total} 問 正解</p>
      <p class="rate">正答率 ${rate}%</p>
      <p class="muted">解説で出てきた言葉は、用語集にも少しずつ貯めていきます。</p>
      <button id="retryBtn" class="primary">もう一度挑戦する</button>
    </div>`;

  document.getElementById("retryBtn").addEventListener("click", () => {
    state.current = 0;
    state.correct = 0;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ------------------------------------------------------------
// HTMLに文字を埋めるとき、記号で表示が壊れないようにする（安全対策）
// ------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

init();
