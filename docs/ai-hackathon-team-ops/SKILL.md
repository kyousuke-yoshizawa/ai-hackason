---
name: ai-hackathon-team-ops
description: Team operations playbook for the AI Hackathon 2026 project (Kyosuke + 3 new-grad members, 20-hour build, GitHub Codespaces + React/TS/Tailwind + Node/Express + Claude API + Supabase + Vercel + Notion). Use this whenever anyone on the team asks about the project's Git/GitHub workflow, branch or PR rules, Issue-driven task breakdown, Codespaces hour budgeting, Supabase/Vercel key setup, Notion auto-sync, or what a specific role (frontend/backend/infra/QA) should be doing — including phrases like "PRってどう出すの", "コンフリクトの直し方", "Vercelの環境変数どこで設定する", "Notionが自動更新されない", "Codespacesの時間管理", "自分の役割で何をすればいいか". Also consult this before onboarding a new member or right before development kicks off, to confirm the team's setup decisions are being followed.
---

# AI Hackathon 2026 - Team Ops SKILL

このSKILLは、AI Hackathon 2026（4人チーム・20時間開発）における
チーム運用・AIエージェント活用の全体像をまとめたものです。
AIエージェント（Claude Code等）およびチームメンバー全員がまず最初に読むファイルです。

### クイックリファレンス（質問→どのファイルを見るか）

| こういう質問が来たら | 見るファイル |
|---|---|
| Git/GitHubの操作方法・コンフリクト | `references/github-git-tutorial.md` |
| PRの出し方・レビュー・マージ手順 | `references/pr-review-merge-flow.md` |
| Issueの立て方・スプリント分割 | `references/issue-driven-workflow.md` |
| Supabase/VercelのAPIキー・環境変数 | `references/supabase-vercel-setup.md` |
| Notionデータベース・自動同期 | `references/notion-database-config.md` |
| AIエージェントに実装を頼むときのルール | `references/ai-harness-core.md` |
| 自分の役割（フロント/バック/インフラ/QA）で何をすべきか | `agents/*-subagent.md` |
| 開発開始前に何を準備すればいいか | `checklists/pre-launch.md` |

迷ったら、まずこの表で該当ファイルを特定してから、そのファイルの該当セクションを
根拠に回答してください。複数ファイルにまたがる質問（例:「開発を始める手順を最初から」）は
`README.md` の全体フローを併せて参照します。

---

## 1. プロジェクト概要

- **チーム構成:** Kyosuke（インフラ・ハーネスリード）+ フロント担当 + バック担当 + QA担当
- **開発環境:** GitHub Codespaces（全員共通のUbuntu環境）
- **技術スタック:** React 18 + TypeScript + Tailwind + Vite / Node.js + Express + Claude API / Supabase + PostgreSQL / Vercel
- **通信:** Microsoft Teams（Slackは不使用）
- **ドキュメント:** Notion Database（PRマージ時に自動同期）

## 2. このスキルセットの構成

なぜ1つの巨大なファイルにせず、これだけ分割しているのか？ 20時間という短い開発時間の中では、
必要な人が必要な部分だけを素早く読めることが重要だからです。全員がREADME.mdとSKILL.mdで
全体像だけ掴み、詳細は自分の役割に応じた `references/*.md` や `agents/*.md` にその都度飛ぶ、
という2段階構成にすることで、誰も700行のドキュメントを毎回読み返さずに済みます。

```
ai-hackathon-team-ops/
├─ SKILL.md                      ← このファイル（全体像）
├─ README.md                     ← セットアップ・使い方ガイド
├─ MANIFEST.txt                  ← ファイル一覧
├─ references/                   ← 詳細マニュアル
│  ├─ ai-harness-core.md         ← AIエージェントの基本ルール（必読）
│  ├─ github-git-tutorial.md     ← Git/GitHub初心者ガイド
│  ├─ pr-review-merge-flow.md    ← PR作成〜マージの完全フロー
│  ├─ issue-driven-workflow.md   ← Issue駆動の実装フロー
│  ├─ notion-database-config.md  ← Notion DB構成・API
│  └─ supabase-vercel-setup.md   ← APIキー取得・セットアップ
├─ agents/                       ← 役割別のAIエージェント向け指示書
│  ├─ frontend-subagent.md
│  ├─ backend-subagent.md
│  ├─ infra-subagent.md
│  ├─ qa-subagent.md
│  └─ reviewer-subagent.md
├─ github-workflows/
│  └─ sync-notion.yml            ← PRマージ時のNotion自動同期
└─ checklists/
   └─ pre-launch.md              ← 開発開始24時間前のチェックリスト
```

### 使い方の具体例

**例1:**
質問: 「PRを出したらコンフリクトって出た。どうすればいい？」
参照先: `references/pr-review-merge-flow.md` の「6. コンフリクト解消」→ 具体的なgitコマンド手順を回答する。

**例2:**
質問: 「新卒メンバーです。今日から開発始まるんですけど、まず何を読めばいいですか？」
参照先: `README.md` の「2. 事前に必要なもの」と `SKILL.md` の「3. 全体の開発フロー（Day 0）」→
README→SKILL.md→ai-harness-core.md→自分の役割ファイル、の順で読むよう案内する。

このように、質問の種類に応じて「どのファイルに答えがあるか」をまず特定してから、
そのファイルの該当箇所を根拠に回答することが、このSKILL全体の使い方の基本パターンです。

## 3. 全体の開発フロー

```
Day 0（前日）
 └─ README.md / SKILL.md / ai-harness-core.md を全員が読む（約1.5h）

Day 1（開発当日・20時間）
 1. Issue作成（issue-driven-workflow.md）
 2. 各自の役割ファイル（agents/*.md）に沿って実装
      - フロント → frontend-subagent.md
      - バック   → backend-subagent.md
      - インフラ → infra-subagent.md
 3. PR作成 → レビュー → マージ（pr-review-merge-flow.md）
 4. マージ時、GitHub Actionsが自動でNotionに同期（sync-notion.yml）
 5. QAが本番環境でテスト（qa-subagent.md）
 6. 発表準備
```

## 4. AIエージェントを使う人へ（最重要）

Claude Code等のAIエージェントにコーディングを依頼する場合、必ず先に
`references/ai-harness-core.md` の内容をエージェントのコンテキストに含めてください。
これはAIが守るべき制約（勝手にSecretsを変更しない、mainに直接pushしない等）を定義したものです。

## 5. 困ったときは

1. まず該当する `references/*.md` を確認
2. それでも解決しない場合はTeamsのチャネルでKyosukeまたは全員に相談
3. インフラ（Supabase/Vercel/GitHub設定）に関することは必ずKyosuke経由

## 6. 関連ドキュメント

- セットアップ全体の手順書: `setup-guide-github-to-secrets.md`（別途配布済み）
- このSKILLの詳細な使い方: `README.md`
