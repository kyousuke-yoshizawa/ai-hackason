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
- **バックエンド:** Node.js + Express（`server/`）+ Vercel Functions（`api/`）
- **AI:** Claude API によるお出かけプラン生成 — 統合作業中（詳細: `docs/architecture-audit/refactoring-handbook.md` T12）
- **データベース:** Supabase (PostgreSQL)
- **デプロイ:** Vercel（自動デプロイ）
- **ドキュメント:** Notion Database（PRマージ時に自動同期）
- **開発環境:** Ubuntu (WSL2) + Claude CLI

## 💻 開発環境の起動

1. WSL2 Ubuntu ターミナルを開く
2. リポジトリに移動:

```bash
cd /mnt/c/Develop/Projects/ai-hackason
```

3. 依存関係をインストール（初回のみ）:

```bash
npm install
```

4. 開発サーバーを起動:

```bash
npm run dev
```

5. ブラウザで http://localhost:5173 を開く

## 📁 リポジトリ構成

```
.
├─ src/                        ← フロントエンド（React）
├─ server/                     ← バックエンド（Express: auth/users/stores/media）
├─ api/                        ← バックエンド（Vercel Functions: reservations/crowd/analytics/errors/cron/mail）
├─ scripts/                    ← ローカル開発用cron
├─ tests/                      ← unit/integration/e2e（jest + playwright）
├─ docs/
│  ├─ ai-hackathon-team-ops/   ← チーム運用ドキュメント一式
│  ├─ architecture-audit/      ← アーキテクチャ監査報告・実装手順書
│  ├─ presentation/            ← 発表資料（Marp）
│  └─ database/                ← DBスキーマ・マイグレーション
└─ .github/
   └─ workflows/
      └─ sync-notion.yml       ← PRマージ時のNotion自動同期
```

## 💬 連絡先

質問・相談は Microsoft Teams のチームチャネルへ（Slackは使用していません）。
インフラ（Supabase/Vercel/GitHub設定）に関することは Kyosuke まで。

