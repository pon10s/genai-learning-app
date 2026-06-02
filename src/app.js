// ============================================================
// 生成AI学習アプリ — クイズプレイヤー（ポップ・ゲーム風UI）
//
// やること：
//   1. data/manifest.json を読む（クイズファイルの一覧）
//   2. 各クイズファイルを読み込んで1つの配列にまとめる
//   3. 1問ずつ出題 → 回答 → 正誤判定（演出つき）→ 解説＋出典 → 次へ
//   4. 最後に成績をまとめて表示
//
// ※ 進捗の保存（localStorage）はフェーズ2で追加する。ここではまだやらない。
// ============================================================

const CATEGORY_LABELS = {
  trend: "最新トレンド",
  "ai-dev": "AI駆動開発",
  basics: "開発の基礎",
};

const state = {
  quizzes: [],
  current: 0,
  correct: 0,
  combo: 0,       // 連続正解数
  answered: false,
};

const appEl = document.getElementById("app");

// 動きを控えるべきか（OSの設定を尊重）
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------
// 起動
// ------------------------------------------------------------
async function init() {
  renderLoading();
  try {
    const manifest = await fetchJson("data/manifest.json");
    const files = manifest.quizFiles || [];
    const lists = await Promise.all(files.map((f) => fetchJson("data/" + f)));
    state.quizzes = lists.flat();

    if (state.quizzes.length === 0) {
      renderMessage("まだクイズがありません 🐣", "Claude Codeに「クイズ作って」と頼んで追加できます。");
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

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`読み込み失敗: ${path} (${res.status})`);
  return res.json();
}

// ------------------------------------------------------------
// 画面：読み込み中 / メッセージ
// ------------------------------------------------------------
function renderLoading() {
  appEl.innerHTML = `<div class="card"><p>読み込み中… ⏳</p></div>`;
}
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
  const progress = Math.round((state.current / total) * 100); // 解く前の進み具合

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
    <div class="topbar">
      <div class="pbar"><div class="pbar-fill" style="width:${progress}%"></div></div>
      <div class="combo">${state.combo >= 2 ? "🔥" + state.combo : ""}</div>
    </div>
    <div class="qhead">
      <span>第 ${num} 問 / 全 ${total} 問</span>
      <span class="cat cat-${q.category}">${escapeHtml(catLabel)}</span>
    </div>
    <div class="card">
      ${q.summary ? `<p class="summary">${escapeHtml(q.summary)}</p>` : ""}
      <h2 class="question">${escapeHtml(q.question)}</h2>
      <div class="choices">${choicesHtml}</div>
      <div id="feedback"></div>
    </div>`;

  appEl.querySelectorAll(".choice").forEach((btn) => {
    btn.addEventListener("click", () => onAnswer(Number(btn.dataset.index), btn));
  });
}

// ------------------------------------------------------------
// 回答したとき
// ------------------------------------------------------------
function onAnswer(selectedIndex, selectedBtn) {
  if (state.answered) return;
  state.answered = true;

  const q = state.quizzes[state.current];
  const isCorrect = selectedIndex === q.answerIndex;

  if (isCorrect) {
    state.correct++;
    state.combo++;
  } else {
    state.combo = 0;
  }

  // 選択肢に色をつけて押せなくする＋演出
  appEl.querySelectorAll(".choice").forEach((btn) => {
    const i = Number(btn.dataset.index);
    btn.disabled = true;
    if (i === q.answerIndex) btn.classList.add("correct");
    if (i === selectedIndex && !isCorrect) btn.classList.add("wrong");
  });

  if (isCorrect) {
    const correctBtn = appEl.querySelector(".choice.correct");
    if (correctBtn) correctBtn.classList.add("bounce");
    launchConfetti();
    // 進捗バーを「この問題ぶん」前進させる
    const fill = appEl.querySelector(".pbar-fill");
    if (fill) fill.style.width = Math.round(((state.current + 1) / state.quizzes.length) * 100) + "%";
  } else if (selectedBtn) {
    selectedBtn.classList.add("shake");
  }

  // コンボ表示の更新
  const comboEl = appEl.querySelector(".combo");
  if (comboEl) comboEl.textContent = state.combo >= 2 ? "🔥" + state.combo : "";

  const isLast = state.current === state.quizzes.length - 1;
  const src = q.source || {};
  const sourceHtml = src.url
    ? `<p class="source">📰 出典：<a href="${encodeURI(src.url)}" target="_blank" rel="noopener">${escapeHtml(src.title || src.url)}</a>${src.date ? `（${escapeHtml(src.date)}）` : ""}</p>`
    : "";

  const banner = isCorrect
    ? (state.combo >= 2 ? `正解！ ${state.combo}連続！ 🔥` : "正解！ 🎉")
    : "おしい！ 不正解 😵";

  document.getElementById("feedback").innerHTML = `
    <div class="result-banner ${isCorrect ? "ok" : "ng"}">${banner}</div>
    <div class="explanation">
      <h3>💡 解説</h3>
      <p>${escapeHtml(q.explanation || "")}</p>
      ${sourceHtml}
    </div>
    <button id="nextBtn" class="primary">${isLast ? "結果を見る 🏁" : "次の問題へ →"}</button>`;

  document.getElementById("nextBtn").addEventListener("click", goNext);
}

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

  let emoji, message;
  if (rate === 100) { emoji = "🏆"; message = "全問正解！ すごい！"; }
  else if (rate >= 67) { emoji = "🎉"; message = "いい調子！ その調子！"; }
  else if (rate >= 34) { emoji = "💪"; message = "あと一歩！ 解説を読み返そう"; }
  else { emoji = "🌱"; message = "ここからが伸びどき！"; }

  appEl.innerHTML = `
    <div class="card result-card">
      <div class="result-emoji">${emoji}</div>
      <h2>${escapeHtml(message)}</h2>
      <p class="score">${state.correct} / ${total}</p>
      <p class="rate">正答率 ${rate}%</p>
      <p class="muted">解説で出てきた言葉は、用語集にも少しずつ貯めていきます。</p>
      <button id="retryBtn" class="primary">もう一度挑戦する 🔄</button>
    </div>`;

  if (rate >= 67) launchConfetti();

  document.getElementById("retryBtn").addEventListener("click", () => {
    state.current = 0;
    state.correct = 0;
    state.combo = 0;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ------------------------------------------------------------
// 紙吹雪（ライブラリ不要の軽量実装）
// ------------------------------------------------------------
function launchConfetti() {
  if (reduceMotion) return;
  const colors = ["#7c3aed", "#22c55e", "#f97316", "#ef4444", "#facc15", "#06b6d4"];
  const count = 28;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = 1.6 + Math.random() * 1.2 + "s";
    piece.style.animationDelay = Math.random() * 0.2 + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(piece);
    // 落ち切ったら片付ける
    setTimeout(() => piece.remove(), 3200);
  }
}

// ------------------------------------------------------------
// 安全対策：HTMLに文字を埋めるときの記号エスケープ
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
