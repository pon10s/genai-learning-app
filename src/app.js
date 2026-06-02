// ============================================================
// 生成AI学習アプリ — クイズプレイヤー（ポップ・ゲーム風UI）
//
// 画面の流れ：
//   ホーム（成績・ストリーク表示）→ 出題 → 回答（演出）→ 解説 → … → 結果
//
// 進捗の保存は storage.js（window.Progress）に任せる。
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
  combo: 0,
  answered: false,
  progress: null,   // localStorage から読んだ累計の記録
};

const appEl = document.getElementById("app");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------
// 起動：記録を読み、クイズを読み、ホーム画面へ
// ------------------------------------------------------------
async function init() {
  state.progress = window.Progress.load();
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
    renderHome();
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
// 画面：ホーム（成績・ストリーク・はじめる）
// ------------------------------------------------------------
function renderHome() {
  const p = state.progress;
  const acc = window.Progress.accuracy(p);
  const streak = p.streak.current;
  const total = state.quizzes.length;

  appEl.innerHTML = `
    <div class="card home-card">
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-num">${streak >= 1 ? "🔥" + streak : "0"}</div>
          <div class="stat-label">連続学習日数</div>
        </div>
        <div class="stat">
          <div class="stat-num">${p.stats.totalAnswered}</div>
          <div class="stat-label">これまで解いた</div>
        </div>
        <div class="stat">
          <div class="stat-num">${acc}<span class="unit">%</span></div>
          <div class="stat-label">通算 正答率</div>
        </div>
      </div>
      <p class="home-lead">今日のクイズは <b>全 ${total} 問</b>。サクッと挑戦しよう！</p>
      <button id="startBtn" class="primary">はじめる ▶</button>
      ${p.stats.totalAnswered > 0 ? `<button id="resetBtn" class="ghost">記録をリセット</button>` : ""}
    </div>`;

  document.getElementById("startBtn").addEventListener("click", startQuiz);
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("これまでの学習記録（正答率・連続日数）をすべて消します。よろしいですか？")) {
        state.progress = window.Progress.reset();
        renderHome();
      }
    });
  }
}

function startQuiz() {
  state.current = 0;
  state.correct = 0;
  state.combo = 0;
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  const progress = Math.round((state.current / total) * 100);

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

  if (isCorrect) { state.correct++; state.combo++; }
  else { state.combo = 0; }

  // --- 記録を更新して保存 ---
  const p = state.progress;
  window.Progress.touchStreakToday(p);     // 今日学習した（連続日数を更新）
  window.Progress.recordAnswer(p, q.id, isCorrect);
  window.Progress.save(p);

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
    const fill = appEl.querySelector(".pbar-fill");
    if (fill) fill.style.width = Math.round(((state.current + 1) / state.quizzes.length) * 100) + "%";
  } else if (selectedBtn) {
    selectedBtn.classList.add("shake");
  }

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
// 画面：結果（今回の成績＋通算）
// ------------------------------------------------------------
function renderResult() {
  const total = state.quizzes.length;
  const rate = Math.round((state.correct / total) * 100);
  const p = state.progress;

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
      <p class="rate">今回の正答率 ${rate}%</p>
      <div class="overall">
        <span>🔥 連続 ${p.streak.current}日</span>
        <span>通算 ${window.Progress.accuracy(p)}%</span>
        <span>累計 ${p.stats.totalAnswered}問</span>
      </div>
      <button id="retryBtn" class="primary">もう一度挑戦する 🔄</button>
      <button id="homeBtn" class="ghost">ホームへ戻る</button>
    </div>`;

  if (rate >= 67) launchConfetti();

  document.getElementById("retryBtn").addEventListener("click", startQuiz);
  document.getElementById("homeBtn").addEventListener("click", () => {
    renderHome();
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
