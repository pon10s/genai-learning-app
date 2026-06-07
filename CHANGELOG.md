# CHANGELOG — 変更履歴

> 何を変えたかを上から新しい順に記録する。日付は YYYY-MM-DD。

## 2026-06-02

- プロジェクト開始。要件ヒアリングを実施し、方針を確定：
  - **B方式**（Claude Code 自身がコンテンツ生成エンジン。APIキー不要）
  - バニラ HTML/CSS/JS + localStorage、**最初から GitHub Pages 公開前提**
  - 学習の柱：生成AI/LLMの最新トレンド／AI駆動開発の実践知（＋開発基礎）
- ドキュメント一式を作成：
  - `CLAUDE.md`（AIへの指示・役割分担）
  - `REQUIREMENTS.md`（要件定義・クイズJSONスキーマ叩き台）
  - `docs/PHASES.md`（フェーズ0〜6、各タスクにセルフレビュー工程）
  - `docs/WORKFLOW.md`（記事探し→要約→クイズ化の手順書）
  - `docs/REVIEW.md`（セルフレビュー チェックリスト）
  - `docs/DESIGN.md`（デザイン方針）
  - `docs/GLOSSARY.md`（学習用 用語集）
  - `README.md`
- 最小の学習プレイヤー雛形を作成：`src/index.html`（ロードマップ表示）, `src/style.css`（モバイルファースト・青アクセント）。
- `.gitignore`, `.claude/launch.json`（ローカル確認用）を追加。
- Git を初期化（`main` ブランチ）し、初回コミット `e020916` を作成。
  - 次の作業：GitHub リポジトリ作成 → push → GitHub Pages 公開（スマホアクセス解禁）。
- GitHub CLI (gh) を導入。リポジトリ `pon10s/genai-learning-app`（public）を作成し push。
- `.github/workflows/pages.yml` を追加し、GitHub Actions で `src/` を自動デプロイ。
- **GitHub Pages 公開完了** 🎉 → https://pon10s.github.io/genai-learning-app/ （HTTP 200 確認）。
- **フェーズ0 完了。** スマホからもアクセス可能に。

## 2026-06-02（フェーズ1）

- クイズJSONスキーマを確定（4択固定、`type` は持たない。`category` は trend/ai-dev/basics）。
- データ保存場所を **`src/data/quizzes/`** に統一（公開サイトに載せるため）。`src/data/manifest.json` で一覧管理。
  これに合わせて CLAUDE.md / REQUIREMENTS.md / docs/WORKFLOW.md を更新。
- **クイズプレイヤーMVPを実装**：
  - `src/app.js` — manifest経由でクイズ読込 → 1問ずつ出題 → 正誤判定 → 解説＋出典表示 → 結果画面（正答率）。
  - `src/style.css` — カード型UI、カテゴリ色分け、正誤の色付け、モバイルファースト。
  - `src/data/quizzes/sample.json` — 評価用サンプル3問（トークン／RAG／システムプロンプト。各出典付き）。
- 検証：JSON妥当性・`app.js` 文法・公開サイトの全アセット HTTP 200・クイズ3問取得を確認。
  （ブラウザ実クリックは環境制約で自動検証できず、実機確認に委ねる。）
- **デザイン刷新（フェーズ5を前倒し）**：朱音さんの希望で「ポップ・ゲーム風（Duolingo系）」を採用。
  - `docs/DESIGN.md` を新テーマで更新。
  - 立体ボタン、上部の進捗バー、連続正解コンボ🔥、正解バウンド／不正解シェイク、自前の軽量紙吹雪を実装。
  - `prefers-reduced-motion` を尊重。依存ライブラリなし。
  - 公開反映を確認（全アセット200、新クラス配信OK）。実クリックは朱音さん確認待ち。
- **ローカル検証ルートを確立**：プレビューが主プロジェクト固定だったため、沖縄そば側 launch.json に
  一時設定を借りて Claude自身のブラウザで全クリック確認 → 確認後すぐ元に戻す運用に。`tools/devserver.js` も追加。

## 2026-06-02（フェーズ2：進捗の記録）

- `src/storage.js` を追加（localStorage 係）。キー `genai-quiz-progress-v1`。
  - 問題ごと（出題数・正解数・最後に間違えたか・最終回答時刻）、通算（回答数・正解数）、
    ストリーク（連続学習日数・最長・最終学習日）を保存。
- `src/app.js`：起動時に**ホーム画面**を追加（🔥連続学習日数・累計回答数・通算正答率を表示／はじめる／記録リセット）。
  回答ごとに記録を保存。結果画面に通算サマリーと「ホームへ戻る」を追加。
- `src/style.css`：ホームの成績グリッド、控えめボタン(.ghost)、結果の通算サマリーを追加。
- 検証：storage.js/app.js 文法OK。Claude自身のブラウザで全フロー操作＋**リロード後も記録が残る**ことを確認。
  localStorage 内容も妥当（3問・全正解・ストリーク1日）。コンソールエラー無し。
- **フェーズ2 完了。**

## 2026-06-02（フェーズ3：本物のクイズ生成 / B方式 初回バッチ）

- WORKFLOW手順で最新記事を検索→朱音さんが4記事を選定→本文を読んで要約→クイズ化。
- 出典差し替え：Zenn(403)→Anthropic公式ベストプラクティス、Qiita(本文薄)→クラウドエース比較記事。
- 追加した問題（計8問、すべて出典付き）：
  - `2026-06-02-claude-code.json`（3問・ai-dev）CLAUDE.md / Explore-Plan-Code-Commit / /clear
  - `2026-06-02-llm-compare.json`（2問・trend）ARC-AGI-2 / SWE-bench の意味
  - `2026-06-02-local-llm.json`（2問・basics）MoE / Ollama
  - `2026-06-02-ai-dev-tools.json`（1問・ai-dev）AIツールの移り変わりの速さ
- `manifest.json` を更新（全5ファイル）。アプリの合計は **11問**（trend2 / ai-dev6 / basics3）。
- 検証：全問のJSON妥当性・出典URL有・answerIndex正常・id重複なし。
  Claude自身のブラウザで「全11問」「1問目が正しく描画」「コンソールエラー無し」を確認。
- **フェーズ3（初回バッチ）完了。** 今後は同手順でクイズを増やせる。

## 2026-06-02（フェーズ4：朱音さんFBで学習体験を作り替え）

- フィードバック反映：①選択肢が簡単すぎ→難化 ②先に1〜2分読ませる ③記事は都度ランダム。
- **データ構造を記事単位に刷新**：`src/data/articles/*.json`（1ファイル＝読み物(段落配列)＋クイズ）。
  manifest を `articles` 配列に変更。旧 `src/data/quizzes/` は削除。
- **アプリのフロー変更**（app.js）：ホーム→ランダム1記事→「まず読む(1〜2分)」→クイズ→結果→「別の記事に挑戦(ランダム)」。
  直前と同じ記事はなるべく回避。記事の読む画面・出典表示を追加（style.css）。
- **選択肢を“紛らわしい良問”に再作成**：同分野・同粒度のダミーで、記事を理解しないと選べない形に。
- 既存5テーマを新フォーマットで書き直し（basics用語/Claude Code/LLM比較/ローカルLLM/AIツール、全14問・要約320〜475字）。
- スキーマ・保存場所の変更を REQUIREMENTS / WORKFLOW / CLAUDE に反映。
- 検証：JSON妥当・app.js文法OK・Claude自身のブラウザで「読む→解く→結果→別記事(連続回避)」を目視、コンソールエラー無し。
- 次の相談事項：**定期自動生成**（スケジュールで新記事を自動ランダム生成→公開）。

## 2026-06-02（自動生成の土台＋試し生成）

- 方針決定：**毎日1記事・自動でそのまま公開**（フルオート）。
- 安全装置として **検証ゲート `tools/validate-articles.js`** を追加（出典必須・JSON妥当・選択肢/正解番号・要約長・id重複を機械チェック。NGなら公開しない）。
- **手順書 `docs/AUTO_GENERATION.md`** を追加（スケジュール実行Claude向けの自己完結ルーティン）。
- **試し生成を実施**（手順書どおり手動実行）：trendを選択→AIエージェントの記事を検索→Salesforce(403)はAIsmileyへ差し替え→
  本文を読み記事化「AIエージェントとは？ 2026年の行動するAI入門」→検証ゲート通過→公開。記事は計6本・17問に。
- スケジュール登録（毎日7時JST）はバックエンド接続が一時的に不可のため保留 → 後日再試行。仕組み・手順・検証は完成済み。

## 2026-06-02（毎日自動公開を GitHub Actions で実現）

- `/schedule`（クラウド版ルーティン）が登録できなかった原因を究明：Anthropic障害ではなく、
  **この環境に claude.ai サブスクのログインが無い（APIキー方式）**ためと判断（status正常・`.credentials.json`無し・`oauthAccount`無し・`ANTHROPIC_API_KEY`有り）。
- 代替として **GitHub Actions による真の自動化**を採用（朱音さんのAPIキーを使い、GitHubのクラウドで実行＝PCオフでも毎朝動く）：
  - `tools/generate-article.js` — Node標準fetchで Anthropic Messages API（モデル `claude-opus-4-8`）＋ `web_search_20260209` ツールを呼び、
    最新記事を1本探して「要約＋4択クイズ」JSONを生成→`src/data/articles/`保存→`manifest.json`更新。pause_turn対応・JSON抽出・プロンプトキャッシュ入り。
  - `.github/workflows/daily-article.yml` — 毎朝7時JST（cron `0 22 * * *`）に 生成 → `validate-articles.js` 検証ゲート → commit/push → Pages自動デプロイ。
- 残作業：GitHub Secret `ANTHROPIC_API_KEY` の登録（朱音さんの操作。Claudeはキーを扱えない）。登録後に手動実行で初回確認予定。
- Secret登録後、手動実行でパイプライン全体（生成→検証→コミット→公開）が成功することを確認（記事「LLM-jp-4」を自動生成・公開）。

## 2026-06-02（朱音さんFB：5記事入れ替え・一覧選択・達成表示）

- **アプリ（プレイヤー）改修**：
  - ホームを「**今日の記事一覧**（タイトル＋カテゴリ＋達成状況）」にし、ランダムではなく**選んで**読む形に変更。
  - 各記事に**達成ステータス**を表示：未挑戦／挑戦済みは「◯/◯点 ✓」。ホーム上部は 連続日数・今日の達成(n/総数)・通算正答率。
  - 結果は**記事ごとに最新スコアを上書き保存**（storage.js に `articleResults` 追加。`recordArticleResult`/`getArticleResult`）。
  - **リトライOK**：同じ記事を解き直すと記録が上書き（増殖しない）。
  - Claude自身のブラウザで全フロー＋上書き挙動を確認（2/3→3/3に上書き、一覧反映、コンソールエラー無し）。
- **自動生成の改修**：`tools/generate-article.js` を「**毎日5記事に総入れ替え**」に変更。
  - 「最近かつ重要」を優先するプロンプトに更新（直近1〜2ヶ月を優先）。カテゴリは round-robin で分散。
  - 既存の記事ファイルを全削除→新5本を書き込み、manifest を書き換え（クリーンな入れ替え）。最低3本に満たなければ中止。
  - `COUNT`（既定5）・`MIN_OK`（既定3）を環境変数で調整可能。
- workflow のステップ名／コミットメッセージを「今日の5記事に更新」に調整。
- **生成モデルを既定 Sonnet 4.6 に変更**（コスト削減。Opus比 約4割安）。`vars.MODEL`（リポジトリ変数）で上書き可能
  （例: `claude-haiku-4-5` でさらに安く / `claude-opus-4-8` で最高品質）。Opusの試走は費用が高いためキャンセルし、Sonnetで再実行。
- **本番動作確認**：Sonnetで手動実行 → 5記事を生成（Google I/O 2026・AIコーディングエージェント比較・CI/CD基礎・GPT-5.5・Kiro）
  → 検証通過 → きれいに入れ替え → 公開（5記事）。品質良好・出典付き・最近の記事を確認。
- `tools/generate-article.js` に **今回のコスト概算**（トークン・検索回数・推定金額）の表示を追加。

## 2026-06-02（コスト削減：生成AIを Gemini に切り替え）

- 朱音さんの希望で、生成を **Google Gemini（安いFlash系）** に対応。`generate-article.js` を **プロバイダ切替式**に改修：
  - `PROVIDER=gemini`（既定）… Gemini API + Google検索グラウンディング（`tools:[{google_search:{}}]`）。既定モデル `gemini-2.5-flash`。
  - `PROVIDER=anthropic` … 従来の Claude API + web search（モデル既定 `claude-sonnet-4-6`）。
  - JSONはコードブロックで出力させて抽出（グラウンディング併用のため structured output は使わない）。
- 料金メモ：Gemini 2.5 Flash は 入力$0.30 / 出力$2.50（/1M）、**Google検索は1日1,500回まで無料**。
  5記事/日なら検索は無料枠内・トークン代もごく少額（1回 約10円前後の見込み。Sonnetの約1/10）。
- workflow を Gemini 既定に変更（`PROVIDER`/`MODEL` はリポジトリ変数で上書き可、キーは `GEMINI_API_KEY`）。
- 残作業：GitHub Secret `GEMINI_API_KEY` の登録（朱音さんの操作。鍵は Google AI Studio で無料取得）。登録後に手動実行で確認。
- 朱音さんが `GEMINI_API_KEY` を登録 → 手動実行で確認。初回は Gemini の一時的混雑(503 "high demand")で一部失敗したため、
  **一時エラー(503/429/5xx)の自動リトライ**（4→8→12→16秒バックオフ）を追加（Gemini/Anthropic両対応）。
- 再実行で **5記事すべて生成・検証・入れ替え・公開に成功**。実行ログのコスト概算は **$0.041 ≒ 約6円/回**
  （Sonnet時の約100〜250円から大幅減。Google検索は無料枠内）。記事品質も良好（出典付き・最近・かみ砕いた要約・良問）。
- **コスト削減 完了**：生成AIを Gemini 2.5 Flash に切替済み。毎朝の自動更新が 1回あたり数円規模に。
