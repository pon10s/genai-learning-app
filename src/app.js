// ============================================================
// 生成AIキャッチアップ学習アプリ — クイズプレイヤー
//
// 画面の流れ：
//   ホーム（今日の記事一覧＋達成状況）→ 記事を選ぶ → 読む → クイズ → 結果 → ホーム
//
// 記事は毎日5本に入れ替わる。挑戦済みは点数(◯/◯)を表示。リトライOK（記録は上書き）。
// 進捗の保存は storage.js（window.Progress）に任せる。
// ============================================================

const CATEGORY_LABELS = {
  trend: "最新トレンド",
  "ai-dev": "AI駆動開発",
  basics: "開発の基礎",
};

const state = {
  articles: [],
  article: null,
  questions: [],
  current: 0,
  correct: 0,
  combo: 0,
  answered: false,
  progress: null,
};

const appEl = document.getElementById("app");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------
// 起動
// ------------------------------------------------------------
async function init() {
  state.progress = window.Progress.load();
  renderLoading();
  try {
    const manifest = await fetchJson("data/manifest.json");
    const files = manifest.articles || [];
    state.articles = await Promise.all(files.map((f) => fetchJson("data/" + f)));
    state.articles = state.articles.filter((a) => a && Array.isArray(a.questions) && a.questions.length);

    if (state.articles.length === 0) {
      renderMessage("まだ記事がありません 🐣", "明日の自動更新で記事が入ります。");
      return;
    }
    renderHome();
  } catch (err) {
    console.error(err);
    renderMessage(
      "記事の読み込みに失敗しました",
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
// 画面：ホーム（成績サマリー＋今日の記事一覧）
// ------------------------------------------------------------
function renderHome() {
  const p = state.progress;
  const acc = window.Progress.accuracy(p);
  const streak = p.streak.current;
  const total = state.articles.length;
  const doneCount = state.articles.filter((a) => window.Progress.getArticleResult(p, a.id)).length;

  const listHtml = state.articles
    .map((a) => {
      const r = window.Progress.getArticleResult(p, a.id);
      const catLabel = CATEGORY_LABELS[a.category] || a.category;
      const status = r
        ? `<span class="ai-status done">${r.score}/${r.total}点 ✓</span>`
        : `<span class="ai-status todo">未挑戦</span>`;
      return `
        <button class="article-item" data-id="${escapeHtml(a.id)}">
          <span class="cat cat-${a.category}">${escapeHtml(catLabel)}</span>
          <span class="ai-title">${escapeHtml(a.title)}</span>
          ${status}
        </button>`;
    })
    .join("");

  appEl.innerHTML = `
    <div class="card home-card">
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-num">${streak >= 1 ? "🔥" + streak : "0"}</div>
          <div class="stat-label">連続学習日数</div>
        </div>
        <div class="stat">
          <div class="stat-num">${doneCount}<span class="unit">/${total}</span></div>
          <div class="stat-label">今日の達成</div>
        </div>
        <div class="stat">
          <div class="stat-num">${acc}<span class="unit">%</span></div>
          <div class="stat-label">通算 正答率</div>
        </div>
      </div>
    </div>
    <p class="list-head">📚 今日の記事（${total}本）— 読みたいものを選ぼう</p>
    <div class="article-list">${listHtml}</div>
    ${p.stats.totalAnswered > 0 ? `<button id="resetBtn" class="ghost">記録をリセット</button>` : ""}`;

  appEl.querySelectorAll(".article-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const a = state.articles.find((x) => x.id === btn.dataset.id);
      if (a) openArticle(a);
    });
  });
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("これまでの学習記録（点数・正答率・連続日数）をすべて消します。よろしいですか？")) {
        state.progress = window.Progress.reset();
        renderHome();
      }
    });
  }
}

// ------------------------------------------------------------
// 画面：記事を読む（クイズの前に）
// ------------------------------------------------------------
function openArticle(article) {
  state.article = article;
  const catLabel = CATEGORY_LABELS[article.category] || article.category;
  const src = article.source || {};
  const paragraphs = (article.summary || []).map((para) => `<p>${escapeHtml(para)}</p>`).join("");
  const sourceHtml = src.url
    ? `<p class="source">📰 出典：<a href="${encodeURI(src.url)}" target="_blank" rel="noopener">${escapeHtml(src.title || src.url)}</a>${src.date ? `（${escapeHtml(src.date)}）` : ""}</p>`
    : "";

  appEl.innerHTML = `
    <div class="qhead">
      <span>📖 まず読む（${article.readMinutes || 2}分）</span>
      <span class="cat cat-${article.category}">${escapeHtml(catLabel)}</span>
    </div>
    <div class="card reading">
      <h2 class="reading-title">${escapeHtml(article.title)}</h2>
      <div class="reading-body">${paragraphs}</div>
      ${sourceHtml}
      <button id="toQuizBtn" class="primary">クイズに挑戦（全${article.questions.length}問）▶</button>
      <button id="backBtn" class="ghost">← 一覧にもどる</button>
    </div>`;

  document.getElementById("toQuizBtn").addEventListener("click", startQuiz);
  document.getElementById("backBtn").addEventListener("click", goHome);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHome() {
  renderHome();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startQuiz() {
  state.questions = state.article.questions;
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
  const q = state.questions[state.current];
  const article = state.article;
  const total = state.questions.length;
  const num = state.current + 1;
  const catLabel = CATEGORY_LABELS[article.category] || article.category;
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
      <span class="cat cat-${article.category}">${escapeHtml(catLabel)}</span>
    </div>
    <div class="card">
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

  const q = state.questions[state.current];
  const isCorrect = selectedIndex === q.answerIndex;

  if (isCorrect) { state.correct++; state.combo++; }
  else { state.combo = 0; }

  const p = state.progress;
  const qid = state.article.id + "#" + state.current;
  window.Progress.touchStreakToday(p);
  window.Progress.recordAnswer(p, qid, isCorrect);
  window.Progress.save(p);

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
    if (fill) fill.style.width = Math.round(((state.current + 1) / state.questions.length) * 100) + "%";
  } else if (selectedBtn) {
    selectedBtn.classList.add("shake");
  }

  const comboEl = appEl.querySelector(".combo");
  if (comboEl) comboEl.textContent = state.combo >= 2 ? "🔥" + state.combo : "";

  const isLast = state.current === state.questions.length - 1;
  const banner = isCorrect
    ? (state.combo >= 2 ? `正解！ ${state.combo}連続！ 🔥` : "正解！ 🎉")
    : "おしい！ 不正解 😵";

  document.getElementById("feedback").innerHTML = `
    <div class="result-banner ${isCorrect ? "ok" : "ng"}">${banner}</div>
    <div class="explanation">
      <h3>💡 解説</h3>
      <p>${escapeHtml(q.explanation || "")}</p>
    </div>
    <button id="nextBtn" class="primary">${isLast ? "結果を見る 🏁" : "次の問題へ →"}</button>`;

  document.getElementById("nextBtn").addEventListener("click", goNext);
}

function goNext() {
  if (state.current < state.questions.length - 1) {
    state.current++;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    renderResult();
  }
}

// ------------------------------------------------------------
// 画面：結果（この記事の成績を保存＝上書き）
// ------------------------------------------------------------
function renderResult() {
  const total = state.questions.length;
  const rate = Math.round((state.correct / total) * 100);
  const p = state.progress;

  // 記事ごとの最新スコアを上書き保存
  window.Progress.recordArticleResult(p, state.article.id, state.correct, total);
  window.Progress.save(p);

  let emoji, message;
  if (rate === 100) { emoji = "🏆"; message = "全問正解！ すごい！"; }
  else if (rate >= 67) { emoji = "🎉"; message = "いい調子！ その調子！"; }
  else if (rate >= 34) { emoji = "💪"; message = "あと一歩！ 記事を読み返そう"; }
  else { emoji = "🌱"; message = "ここからが伸びどき！"; }

  appEl.innerHTML = `
    <div class="card result-card">
      <div class="result-emoji">${emoji}</div>
      <h2>${escapeHtml(message)}</h2>
      <p class="score">${state.correct} / ${total}</p>
      <p class="rate">この記事の正答率 ${rate}%（記録を更新しました）</p>
      <button id="homeBtn" class="primary">一覧にもどる 📚</button>
      <button id="retryBtn" class="ghost">この記事をもう一度（記録は上書き）</button>
    </div>`;

  if (rate >= 67) launchConfetti();

  document.getElementById("homeBtn").addEventListener("click", goHome);
  document.getElementById("retryBtn").addEventListener("click", () => openArticle(state.article));
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
