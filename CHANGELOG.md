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
