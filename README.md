# 生成AIキャッチアップ学習アプリ

生成AI / LLM の最新トレンドや AI駆動開発の知識を、
「記事を読む → クイズで定着」のサイクルで学ぶ個人用Webアプリ。

## 特徴

- **APIキー不要**：クイズは Claude Code が記事を探して作る（B方式）。
- **バニラ構成**：HTML / CSS / JS のみ。ビルド不要。
- **localStorage**：進捗・正答率を端末内に保存。
- **GitHub Pages 公開前提**：スマホからも学べる。

## フォルダ構成

```
.
├─ CLAUDE.md          AIへの指示（毎回最初に読む）
├─ REQUIREMENTS.md    要件定義
├─ CHANGELOG.md       変更履歴
├─ README.md          このファイル
├─ docs/
│   ├─ PHASES.md      フェーズ・タスク管理
│   ├─ WORKFLOW.md    クイズ生成の手順
│   ├─ REVIEW.md      セルフレビュー チェックリスト
│   ├─ DESIGN.md      デザイン方針
│   └─ GLOSSARY.md    用語集（学習メモ）
├─ src/               学習プレイヤー本体（アプリのコード）
└─ data/
    └─ quizzes/       クイズデータ（JSON）
```

## 使い方（できあがり後のイメージ）

1. Claude Code に「今日のキャッチアップ」と頼む → 記事候補が出る。
2. 読みたい記事を選ぶ → クイズが `data/quizzes/` に追加される。
3. アプリ（公開URL or `src/index.html`）を開いて出題に挑戦。
4. 進捗・正答率が記録され、間違えた問題は復習できる。

## 開発の進め方

`docs/PHASES.md` のフェーズ順に、1タスクずつ「実装 → セルフレビュー → 記録更新」で進める。
