# AI Hackathon 2026

4人チーム（Kyosuke + 3名）で20時間かけて動く本番アプリケーションを作るハッカソンプロジェクトです。

## 🚀 まずやること

開発に参加する人は、まず以下を読んでください（全体で約1.5時間）。

1. [`docs/ai-hackathon-team-ops/README.md`](docs/ai-hackathon-team-ops/README.md) — セットアップ・使い方ガイド
2. [`docs/ai-hackathon-team-ops/SKILL.md`](docs/ai-hackathon-team-ops/SKILL.md) — プロジェクト全体像
3. [`docs/ai-hackathon-team-ops/references/ai-harness-core.md`](docs/ai-hackathon-team-ops/references/ai-harness-core.md) — AIエージェントに実装を頼む人は必読
4. `docs/ai-hackathon-team-ops/agents/` 配下の自分の役割のファイル（フロント/バック/インフラ/QA）

開発開始直前には [`checklists/pre-launch.md`](docs/ai-hackathon-team-ops/checklists/pre-launch.md) で最終確認します。

## 🧑‍🤝‍🧑 チーム

| 役割 | 担当 |
|---|---|
| インフラ・ハーネスリード | Kyosuke |
| フロントエンド | フロント担当 |
| バックエンド | バック担当 |
| QA | QA担当 |

## 🛠️ 技術スタック

- **フロントエンド:** React 18 + TypeScript + Tailwind CSS + Vite
- **バックエンド:** Node.js + Express + Claude API
- **データベース:** Supabase (PostgreSQL)
- **デプロイ:** Vercel（自動デプロイ）
- **ドキュメント:** Notion Database（PRマージ時に自動同期）
- **開発環境:** GitHub Codespaces

## 💻 開発環境の起動

1. 上部の緑色「**Code**」ボタン →「**Codespaces**」タブ
2. 「**Create codespace on main**」をクリック
3. Codespaces内のターミナルで:

```bash
npm install
npm run dev
```

## 📁 リポジトリ構成

```
.
├─ docs/
│  └─ ai-hackathon-team-ops/   ← チーム運用ドキュメント一式（16ファイル）
├─ .github/
│  └─ workflows/
│     └─ sync-notion.yml       ← PRマージ時のNotion自動同期
└─ （アプリ本体のソースコード）
```

## 💬 連絡先

質問・相談は Microsoft Teams のチームチャネルへ（Slackは使用していません）。
インフラ（Supabase/Vercel/GitHub設定）に関することは Kyosuke まで。

## ⏱️ Codespaces利用時間について

GitHub Freeプランは月60時間まで無料です。4人で共有するリソースのため、使い終わったら
Codespaceは明示的に「Stop」してください。詳しくは `docs/ai-hackathon-team-ops/README.md` を参照。
