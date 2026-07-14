# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Hackathon 2026** — A 20-hour team project (Kyosuke + 3 members) building 「ことこと町」お出かけプラン AI アシスタント using React + TypeScript + Tailwind / Node.js + Express + Vercel Functions / Supabase PostgreSQL.

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express（`server/`, ローカル & auth/users/stores/media）+ Vercel Functions（`api/`, reservations/crowd/analytics/errors/cron/mail/plan）
- **AI**: Claude API（`@anthropic-ai/sdk`）によるお出かけプラン生成。`backend/domains/plan/`（`claudeClient.ts`/`promptBuilder.ts`/`scoring.ts`/`schema.ts`）+ `POST /api/plan/generate`（T12で実装。意図解析・店舗照合・スコアリング・プラン生成をAPI呼び出し1回に統合。UI画面は別タスク）
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (auto-deploy on main)
- **Documentation Sync**: Notion Database (auto-sync on PR merge via GitHub Actions)
- **Team Coordination**: Microsoft Teams (not Slack)

For team operations, workflow, and roles, see `docs/ai-hackathon-team-ops/` (comprehensive documentation exists there).

## Common Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint TypeScript and TSX (reports unused directives, max 0 warnings)
npm run lint

# Preview production build
npm run preview
```

## Code Architecture

### Source Tree

```
src/
├── pages/               # 8画面: LoginPage, Dashboard, StoresPage,
│                         #   StoreDetailPage(いいね・レビュー結線先, T13),
│                         #   ReservationsListPage, LikesListPage,
│                         #   AdminPage, ErrorManagementDashboard
├── components/           # 16コンポーネント: フォーム(StoreForm/UserForm)、
│                         #   パネル(StoreManagementPanel/UserManagementPanel/
│                         #   StoreMediaPanel)、モーダル(ReservationModal/
│                         #   ReviewFormModal/Modal)、汎用UI(Toast/StarRating等)、
│                         #   ProtectedRoute(認証・権限ガード)
├── context/
│   └── AuthContext.tsx   # 認証状態(login/logout/isAuthenticated/permissions)
├── lib/                  # api.ts(REST共通クライアント) + likes/reviews/
│                         #   reservations/storeMedia(機能別)
├── types/                # reservation.ts, social.ts
├── App.tsx               # react-router-dom (T10導入) によるURLベースルーティング
│                         #   （/login /dashboard /stores /reservations /likes
│                         #   /admin /admin/errors）。ProtectedRouteで認証・権限ガード
├── main.tsx
└── index.css

server/                  # Express（auth/users/stores/media）。ローカル開発と
                          #   Vercel本番の両方で使用（api/index.ts が re-export）
api/                     # Vercel Functions（reservations/crowd/analytics/
                          #   errors/cron/mail/plan）。api/_http/ に Vercel専用の
                          #   HTTPアダプタ（requireAdmin/requireStoreAccess）
backend/                 # api/ と server/ が共有するドメインロジック
                          #   db.ts（supabaseAdmin唯一の定義）
                          #   auth/authz.ts（認可: is_active + store_managers判定）
                          #   domains/{crowd,crowdAnalytics,email,reservations,
                          #     notifications,social,auth,stores,plan}/
                          #   （plan: Claude API統合。claudeClient/promptBuilder/
                          #     scoring/schema。T12で新設）
scripts/                 # ローカル開発用cron（node-cron。本番はvercel.jsonのcrons）
tests/                   # unit(14) + integration(15) + e2e(2) = 31ファイル
docs/architecture-audit/ # アーキテクチャ監査報告・実装手順書
```

詳細な依存関係・既知の技術課題は `docs/architecture-audit/refactoring-handbook.md` を参照。

### Authentication & State Management

**AuthContext.tsx** is the central auth state manager. It:
- Stores user session in localStorage（トークンレス。`x-user-id` ヘッダで認証 — 既知の制約。詳細は手順書 T04/T21）
- Provides `useAuth()` hook for components
- Login: REST 経由（`src/lib/api.ts` → `server/routes/auth.ts` の `POST /login`）／Logout: ローカル状態クリアのみ（サーバー呼び出しなし）
- Permission fetch: REST 経由（`GET /api/auth/permissions`。ロールはサーバー側が `x-user-id` から解決）

Components consume auth via:
```typescript
const { user, login, logout, isAuthenticated, permissions, hasPermission } = useAuth()
```

### Key Files & Responsibilities

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | REST共通クライアント（`x-user-id` ヘッダ付与、`VITE_API_URL` or `localhost:3000`）。フロントの全データアクセスがここを経由（T08でSupabase直接呼び出しを廃止） |
| `src/context/AuthContext.tsx` | Auth state (login, logout, user, permissions), localStorage persistence |
| `src/pages/LoginPage.tsx` | Email/password login form; test account info display |
| `src/pages/Dashboard.tsx` | Post-login dashboard（`/dashboard`）; 他画面への `<Link>` ナビゲーション |
| `src/App.tsx` | react-router-dom によるURLベースルーティング＋`ProtectedRoute`での認証・権限ガード（T10） |

### Database Schema

主要テーブル（`docs/database/*.sql` 参照）:

| Table | 役割 |
|-------|------|
| `users` / `role_permissions` | ユーザー・権限（RBAC） |
| `stores` / `store_media` | 店舗マスタ・写真 |
| `reservations` | 予約 |
| `likes` / `reviews` | いいね・レビュー |
| `crowd_status` / `crowd_history` / `crowd_patterns` | 混雑度（現況・履歴・パターン） |
| `email_notifications` / `email_send_logs` | 通知メール |
| `error_logs` | エラー記録 |

`users` テーブルの詳細は `docs/database/USER_TABLE_README.md` を参照。Key columns: `id`, `email`, `password`, `role` (admin/store_manager/user), timestamps

Current test accounts:
```
yoshizawa@ai-hackason.example (admin)
satoh@ai-hackason.example (user)
itagaki@ai-hackason.example (user)
takayanagi@ai-hackason.example (user)
```

## Configuration & Secrets

### Environment Variables

Required in `.env` (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anonkey
```

These are injected at build time by Vite. In Vercel/CI, set via environment variables panel.

Do NOT commit `.env`. Use `.env.example` as template.

### TypeScript Configuration

- `tsconfig.json`: Main config (ES2020 target, JSX + React, strict mode, bundler resolution)
- `tsconfig.node.json`: Build tool config
- `strict: true` — all strict checks enabled; no `any` types

### Styling

Tailwind CSS + PostCSS. Configuration in:
- `tailwind.config.js` — Tailwind setup
- `postcss.config.js` — PostCSS plugins (autoprefixer, etc.)
- `src/index.css` — Global Tailwind directives

## Development Workflow

### Before Starting

1. Read `docs/ai-hackathon-team-ops/README.md` — team onboarding & setup
2. Read `docs/ai-hackathon-team-ops/SKILL.md` — full overview
3. Read `docs/ai-hackathon-team-ops/references/ai-harness-core.md` if delegating to AI agents
4. Read your role's subagent file (`docs/ai-hackathon-team-ops/agents/*-subagent.md`)

### Branches & PRs

**Quick Flow**:
```
git pull → branch feature/<name> → 修正（こまめにコミット） → 自レビュー → 
  git push → PR作成 → AI レビュー → 修正サイクル → マージ
```

**Full details**: See `docs/ai-hackathon-team-ops/references/pr-review-merge-flow.md` (section 0-6 for local dev, section 2-C for AI review cycle).

⚠️ **STRICT BRANCH STRATEGY** (Mandatory):
- **Only 5 branches allowed**: `main`, `feature/yoshizawa`, `feature/itagaki`, `feature/sato`, `feature/takayanagi`
- **Before any branch creation**: Always ask "どなたが作業されていますか？" (Which team member is this for?)
- **One branch per person**: Each member works in their own feature branch throughout the hackathon
- **Branch name is fixed**: Use exactly `feature/<name>` (e.g., `feature/itagaki`) — no descriptions or variations
- **No other branches**: Do NOT create develop, hotfix, release, or any other branch variants
- **PR titles & descriptions**: Japanese; concise, include context
- **Merge to main only via PR review** (never direct push to main)
- **On PR merge**: GitHub Actions auto-syncs changes to Notion Database

### GitHub CLI for PR Operations (Optional)

If you prefer CLI over web UI for PR creation/merge:

```bash
# Install gh CLI (Ubuntu/Debian)
sudo apt-get install gh

# Authenticate (requires GitHub personal access token)
export GH_TOKEN="ghp_your-personal-access-token-here"
gh auth status

# Create PR
gh pr create --title "PR title" --body "PR body"

# Merge PR
gh pr merge <PR-number> --merge
```

⚠️ **Important**: 
- Get token from https://github.com/settings/tokens (scopes: `repo`, `workflow`)
- Never commit token to code; use environment variable only
- See `docs/ai-hackathon-team-ops/references/pr-review-merge-flow.md` (section 2-B for CLI details)

### Local Development (Ubuntu + Claude CLI)

- **Environment**: WSL2 + Ubuntu + Claude CLI (Windows PC)
- **Setup**: WSL2 install Ubuntu → `nvm install --lts` → `npm install -g @anthropic-ai/claude-code`
- **Daily startup**: Ubuntu terminal → `cd /mnt/c/Develop/Projects/ai-hackason` → `npm run dev` + `claude`

For details, see `docs/ai-hackathon-team-ops/README.md`.

### Presentation & Documentation (Continuous Update)

**重要**: 発表資料は最後にまとめるのではなく、作業のたびに更新してください。常に「今この瞬間に発表できる状態」を維持することが目標です。

#### 発表資料の場所

- **Marp 形式**: `docs/presentation/presentation.md`
- **目的**: 7月25日の約10分間のプレゼンテーション資料
- **形式**: Markdown ベースで VS Code や Marp CLI でプレビュー可能

#### 各タスク完了時の更新チェックリスト

**必須**: 機能実装・バグ修正後、以下の項目を確認して Marp 資料を更新してください。

```
☐ 何を変更したか → presentation.md の該当セクション（「システム全体構成」「アーキテクチャ」など）を更新
☐ なぜ変更したか → 「解決したい課題」「工夫した点」セクションに理由を記載
☐ 得られた効果 → 「今後の展望」「まとめ」に効果を記載
☐ デモで説明する内容 → 「デモで説明する内容」セクションに UI/UX の変化を記載
☐ 図表・アーキテクチャ更新 → 必要に応じて `docs/presentation/` に画像・図を追加
```

#### 更新が不要な場合

以下のような変更の場合は、資料更新をスキップ可能です：

- ドキュメント修正のみ（実装変更なし）
- 内部リファクタリング（UI/API 変更なし）
- 単純なバグ修正（既存機能の安定化のみ）

#### Marp CLI でのプレビュー

```bash
# インストール（初回のみ）
npm install -g marp-cli

# プレビュー
marp docs/presentation/presentation.md

# HTML 出力
marp docs/presentation/presentation.md -o docs/presentation/presentation.html

# PDF 出力
marp docs/presentation/presentation.md -o docs/presentation/presentation.pdf
```

## Testing & Quality

- **Linting**: `npm run lint` (ESLint with TypeScript/TSX; max 0 warnings)
- **Type checking**: `npm run build`（`src/` のみ、tsc -b）と `npm run typecheck`（`api/server/scripts/tests/src` 全体、tsconfig.backend.json）の2種類。strict mode 有効
- **Tests**: `npm test`（Jest, 29 suites / 197 tests）+ `npm run test:e2e`（Playwright）

## Common Patterns & Constraints

### Do Not

1. **Push directly to main** — always use PR + review
2. **Modify GitHub Actions workflows** without Kyosuke approval (they control Notion sync)
3. **Hardcode API keys/secrets in code** — use `.env` variables only
4. **Commit `.env` file** — update `.env.example` instead if schema changes
5. **Change Supabase schema without coordinating** — database state is shared; see `docs/database/` first

### Do

1. **Use Supabase anon key in frontend** (authentication handled server-side in Express backend)
2. **Store auth state in AuthContext + localStorage** (centralized, survives page refresh)
3. **Route through AuthContext** — check `isAuthenticated` before rendering protected pages
4. **Keep VITE_ prefix on frontend env vars** so Vite can inject them at build time
5. **Reference team-ops docs** when unsure about workflow, branch strategy, or Notion sync

### Component Patterns

- Use React Context for auth state (not Redux)
- Export custom hooks (`useAuth`) from context for cleaner component code
- Tailwind for styling (no CSS modules or styled-components)
- TypeScript strict mode; aim for zero `any` types

## Deployment

- **Main push → Vercel auto-deploys** (GitHub integration)
- **Preview deployments** on every PR
- **Environment variables** set in Vercel dashboard (not in `.env`)
- **Production secrets** (Supabase URL + key) must be in Vercel → Environment Variables

See `.github/workflows/sync-notion.yml` for PR → Notion sync pipeline.

### Cron スケジュール（UTC/JST 変換に注意）

**Vercel Cron（`vercel.json` の `crons`）は UTC で解釈される。** JST（日本時間）表記のまま書くと実行時刻が9時間ずれる（既知の過去バグ、`docs/architecture-audit/refactoring-handbook.md` T18 参照）。

| 用途 | JST（意図） | `vercel.json`（UTC 表記） |
|---|---|---|
| 混雑通知（30分おき・営業時間中） | 9:00–21:30 | `*/30 0-12 * * *` |
| 混雑分析集計（毎日・営業終了後） | 23:00 | `0 14 * * *` |

ローカル開発用の `scripts/*.ts`（`npm run cron:dev` / `cron:dev:analytics`）は `node-cron` の `timezone: 'Asia/Tokyo'` オプションで JST のまま実行されるため、上記の変換は不要。

## Documentation & References

Quick lookup for specific topics:

| Topic | Location |
|-------|----------|
| Team setup, roles, local dev env | `docs/ai-hackathon-team-ops/README.md` |
| Git/GitHub & PR workflow | `docs/ai-hackathon-team-ops/references/pr-review-merge-flow.md` |
| Issue-driven task breakdown | `docs/ai-hackathon-team-ops/references/issue-driven-workflow.md` |
| AI agent constraints & rules | `docs/ai-hackathon-team-ops/references/ai-harness-core.md` |
| Supabase & Vercel setup | `docs/ai-hackathon-team-ops/references/supabase-vercel-setup.md` |
| Notion sync & API | `docs/ai-hackathon-team-ops/references/notion-database-config.md` |
| Database schema | `docs/database/USER_TABLE_README.md` |
| Login & Dashboard impl. | `docs/implementation/LOGIN_AND_DASHBOARD.md` |
| Pre-launch checklist | `docs/ai-hackathon-team-ops/checklists/pre-launch.md` |

## Contact & Support

- **General questions, workflow**: Microsoft Teams team channel
- **Infra (Supabase/Vercel/GitHub setup)**: Kyosuke directly
- **Stuck on code issue**: Check team-ops references first, then ask in Teams

---

**Last updated**: 2026-07-04  
**Project Lead**: Kyosuke Yoshizawa  
**Team**: Kyosuke (Infra Lead) + 3 new-grad members (Frontend/Backend/QA)
