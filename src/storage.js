// ============================================================
// storage.js — 学習の進捗を localStorage に保存する係
//
// localStorage は「ブラウザの中の小さな保存箱」。サーバー無しで
// 前回の記録を覚えておける（その端末の中だけ・他の端末とは別）。
//
// 保存する中身（キー: "genai-quiz-progress-v1"）:
// {
//   version: 1,
//   perQuestion: { [問題id]: { seen, correct, lastWrong, lastAt } },
//   stats: { totalAnswered, totalCorrect },
//   streak: { current, longest, lastStudyDate }   // 連続学習日数
// }
// ============================================================

const STORAGE_KEY = "genai-quiz-progress-v1";

// 初期状態（まだ何も解いていないとき）
function emptyProgress() {
  return {
    version: 1,
    perQuestion: {},
    stats: { totalAnswered: 0, totalCorrect: 0 },
    streak: { current: 0, longest: 0, lastStudyDate: null },
  };
}

// 読み込む（壊れていたら初期状態に戻す）
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw);
    // 念のため、足りない項目は初期値で補う
    return Object.assign(emptyProgress(), data, {
      perQuestion: data.perQuestion || {},
      stats: Object.assign({ totalAnswered: 0, totalCorrect: 0 }, data.stats),
      streak: Object.assign({ current: 0, longest: 0, lastStudyDate: null }, data.streak),
    });
  } catch (e) {
    console.warn("進捗の読み込みに失敗。初期化します。", e);
    return emptyProgress();
  }
}

// 保存する（プライベートモード等で失敗しても落とさない）
function saveProgress(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch (e) {
    console.warn("進捗の保存に失敗しました（記録は残りません）。", e);
  }
}

// 日付を「YYYY-MM-DD」の文字列にする（その端末のローカル時間で）
function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 「昨日」の日付文字列
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

// 1問回答したときに呼ぶ：問題ごと＆通算の記録を更新
function recordAnswer(p, questionId, isCorrect) {
  const q = p.perQuestion[questionId] || { seen: 0, correct: 0, lastWrong: false, lastAt: null };
  q.seen += 1;
  if (isCorrect) q.correct += 1;
  q.lastWrong = !isCorrect;
  q.lastAt = new Date().toISOString();
  p.perQuestion[questionId] = q;

  p.stats.totalAnswered += 1;
  if (isCorrect) p.stats.totalCorrect += 1;
  return p;
}

// 「今日学習した」ことを記録し、連続学習日数（ストリーク）を更新
// 戻り値: { changed, current } … changed は今日はじめて記録したか
function touchStreakToday(p) {
  const today = todayStr();
  const s = p.streak;
  if (s.lastStudyDate === today) {
    return { changed: false, current: s.current }; // 今日はもう記録済み
  }
  if (s.lastStudyDate === yesterdayStr()) {
    s.current += 1; // 連続！
  } else {
    s.current = 1; // 間が空いた（または初回）→ 1日目から
  }
  s.lastStudyDate = today;
  if (s.current > s.longest) s.longest = s.current;
  return { changed: true, current: s.current };
}

// 通算の正答率（%）。まだ0問なら0。
function accuracy(p) {
  if (p.stats.totalAnswered === 0) return 0;
  return Math.round((p.stats.totalCorrect / p.stats.totalAnswered) * 100);
}

// すべての記録を消す（設定などから使う想定）
function resetProgress() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  return emptyProgress();
}

// app.js から使えるように、まとめて公開する
window.Progress = {
  load: loadProgress,
  save: saveProgress,
  recordAnswer,
  touchStreakToday,
  accuracy,
  reset: resetProgress,
};
