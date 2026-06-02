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
