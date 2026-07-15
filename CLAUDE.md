# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Hackathon 2026** — A 20-hour team project (Kyosuke + 3 members) building a production application using React + TypeScript + Tailwind / Node.js + Express + Claude API / Supabase PostgreSQL / Vercel.

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express (Claude API integration)
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
npm lint

# Preview production build
npm run preview
```

## Code Architecture

### Source Tree

```
src/
├── pages/
│   ├── LoginPage.tsx         # Authentication UI (email/password input)
│   └── Dashboard.tsx         # Main app after login (user info, stats, activity)
├── context/
│   └── AuthContext.tsx       # User auth state (login/logout/isAuthenticated)
├── hooks/
│   └── useNavigate.ts        # Navigation utility
├── lib/
│   └── supabase.ts           # Supabase client (connection + auth queries)
├── App.tsx                   # Root routing component
├── main.tsx                  # Entry point (React DOM mount)
└── index.css                 # Global styles (Tailwind directives)
```

### Authentication & State Management

**AuthContext.tsx** is the central auth state manager. It:
- Stores user session in localStorage
- Provides `useAuth()` hook for components
- Integrates with Supabase via `src/lib/supabase.ts`
- Manages login/logout/isAuthenticated flags

Components consume auth via:
```typescript
const { user, login, logout, isAuthenticated } = useAuth()
```

### Key Files & Responsibilities

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client initialization; queries users table |
| `src/context/AuthContext.tsx` | Auth state (login, logout, user), localStorage persistence |
| `src/pages/LoginPage.tsx` | Email/password login form; test account info display |
| `src/pages/Dashboard.tsx` | Post-login dashboard; user info, stats, activity |
| `src/App.tsx` | Routing; protected Dashboard vs LoginPage based on auth state |

### Database Schema

See `docs/database/USER_TABLE_README.md` for the full `users` table schema. Key columns:
- `id`, `email`, `password_hash`, `role` (admin/user), timestamps

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

See `docs/ai-hackathon-team-ops/references/pr-review-merge-flow.md`.

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
- See `docs/ai-hackathon-team-ops/references/pr-review-merge-flow.md` section 2-B for full details

### Local Development (Ubuntu + Claude CLI)

- **Environment**: WSL2 + Ubuntu + Claude CLI (Windows PC)
- **Setup**: WSL2 install Ubuntu → `nvm install --lts` → `npm install -g @anthropic-ai/claude-code`
- **Daily startup**: Ubuntu terminal → `cd /mnt/c/Develop/Projects/ai-hackason` → `npm run dev` + `claude`

For details, see `docs/ai-hackathon-team-ops/README.md`.

## Testing & Quality

- **Linting**: `npm lint` (ESLint with TypeScript/TSX; max 0 warnings)
- **Type checking**: TypeScript in strict mode; enforced at build time
- **No test framework configured yet** — manual testing recommended for this 20-hour sprint

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
