---
marp: true
theme: default
paginate: true
size: 16:9
footer: "AI Hackathon 2026 - Team Project"
---

# AI Hackathon 2026
## プロジェクト発表資料

**期間**: 7月4日～7月25日（20時間）  
**チーム**: Kyosuke（Infra Lead） + 3名（Frontend/Backend/QA）  
**発表日**: 7月25日（約10分間）

---

## プロジェクト概要

### お出かけプラン AI アシスタント「ことこと町」

架空エリア「ことこと町」を舞台に、複数の欲求（「ランチもしたい、映画も見たい、子連れで」）を1回の入力で解決する、まったり系お出かけプランナー。

**実装済みの機能**:
- ユーザー認証・権限管理（admin / store_manager / user）
- 店舗管理（登録・編集・地図配置・写真管理）
- 予約（空き確認・作成・キャンセル）
- いいね・レビュー、混雑度の報告と分析ダッシュボード
- 混雑通知メール（cron）、エラー管理ダッシュボード

**統合作業中**: Claude API によるお出かけプラン自動生成（本プロジェクトの核）

---

## 解決したい課題

### ユーザー側の課題

- 複数の欲求を満たす店舗・時間帯の組み合わせを**手動で探すのは煩雑**
- 混雑や営業時間を考慮した「今から行ける」プランは自力では作りにくい

### 店舗側の課題

- 混雑の偏り（ピーク集中・閑散時間の空席）が収益を不安定にする

### アプローチ

- LLM（Claude API）で欲求を自然言語から解析し、店舗DB × 混雑度 × 営業時間から最適ルートを提案
- 架空エリア採用で商標・実在店舗リスクをゼロにし、デモの再現性を完全にコントロール

---

## システム全体構成

```
┌─────────────────────────────────────────────────────┐
│           Frontend (React 18 + TypeScript)          │
│         (Vite + Tailwind CSS + Auth Context)        │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────┐
│  Backend (Node.js + Express / Vercel Functions)     │
│  (ビジネスロジック / Claude API 統合作業中)            │
└────────────────────┬────────────────────────────────┘
                     │ SQL
┌────────────────────▼────────────────────────────────┐
│    Database (Supabase / PostgreSQL)                 │
│  (users, stores, reservations, likes, reviews,      │
│   crowd_*, email_*, error_logs, store_media)        │
└─────────────────────────────────────────────────────┘
                     │
         Deploy to Vercel (Auto)
         Notion Sync (GitHub Actions)
```

---

## ディレクトリ構成・アーキテクチャ

### リポジトリ構成

```
src/          # フロントエンド（React）
├── pages/    #   7画面（Login/Dashboard/Stores/Reservations/Likes/Admin/Errors）
├── components/ # 15コンポーネント（フォーム・パネル・モーダル等）
├── context/  #   認証状態管理（AuthContext）
└── lib/      #   API クライアント層
server/       # Express（auth/users/stores/media）— ローカル & Vercel 両対応
api/          # Vercel Functions（reservations/crowd/analytics/errors/cron/mail）
scripts/      # ローカル開発用 cron
tests/        # unit / integration / e2e（jest + playwright、18本）
docs/         # 要件定義・DB・チーム運用・発表資料・監査手順書
```

### Database Schema（主要テーブル）

| Table | 役割 |
|-------|------|
| `users` / `role_permissions` | ユーザー・権限（RBAC） |
| `stores` / `store_media` | ことこと町の店舗マスタ・写真 |
| `reservations` | 予約（空き状況・キャンセル） |
| `likes` / `reviews` | いいね・レビュー（星評価+コメント） |
| `crowd_status` / `crowd_history` / `crowd_patterns` | 混雑度（現況・履歴・パターン） |
| `email_notifications` / `error_logs` | 通知メール・エラー記録 |

---

## AI をどのように利用しているか

### 1. プロダクト内: Claude API によるプラン生成（統合作業中）

**設計**（要件定義 v2 で確定）:
- 複数の欲求（「ランチも映画も、子連れで」）を自然言語から解析
- 架空エリア「ことこと町」の店舗DB × 混雑度 × 営業時間からプラン生成
- API 呼び出しは1回に統合、スコアリングで複数案を提示

**実装予定の配置**: `backend/domains/plan/`（プロンプト構築・スコアリング・Claude クライアントを分離。設計は `docs/architecture-audit/` 手順書 T12 に記載）

### 2. 開発プロセス: AI エージェントによる並列開発（実績）

- 4つの役割別サブエージェント（Frontend/Backend/QA/Reviewer）で分業
- レビュー専用エージェントによる品質確保（自己レビュー禁止ルール）
- **敵対的アーキテクチャ監査**: 調査エージェント3系統を並列投入し、22件の改善タスクを特定・手順書化

---

## AIエージェント同士の役割分担

このプロジェクトでは、開発プロセスで複数の AI エージェントを活用：

| エージェント | 役割 | 視点 |
|------------|------|------|
| **Frontend Agent** | UI/UX 実装、React コンポーネント開発 | ユーザー体験 |
| **Backend Agent** | Claude API 統合、ビジネスロジック | API・ロジック |
| **QA Agent** | テスト・品質確認、バグ検出 | 品質・信頼性 |
| **Reviewer Agent** | コード品質レビュー、セキュリティ審査 | 正確性・セキュリティ |

### 人間（開発者）の役割

- **企画・要件定義** — 機能・仕様の最終判断
- **アーキテクチャ設計** — システム構成の決定
- **統合・デプロイ** — 各パートの統合と本番展開
- **進捗管理** — タイムラインと品質監督

---

## 技術選定理由

### Frontend: React 18 + TypeScript + Tailwind CSS

✅ **理由**:
- **React**: コンポーネント再利用、状態管理が容易
- **TypeScript**: 型安全性により開発効率向上、バグ削減
- **Tailwind CSS**: ユーティリティベースで高速スタイリング

### Backend: Node.js + Express

✅ **理由**:
- **JavaScript 統一** — Frontend と同一言語で学習コスト削減
- **Express**: ミニマル・軽量、Claude API 統合が簡単
- **高速開発** — API エンドポイント実装が迅速

### Database: Supabase (PostgreSQL)

✅ **理由**:
- **マネージド PostgreSQL** — インフラ管理不要、信頼性高
- **リアルタイム機能** — WebSocket サポート
- **認証組み込み** — Supabase Auth で認証機構が標準搭載

### Deployment: Vercel + GitHub Actions

✅ **理由**:
- **自動デプロイ** — main push 時に自動本番反映
- **Preview Deploy** — PR ごとに検証環境を自動生成
- **Notion 同期** — GitHub Actions で Notion 自動更新

---

## 工夫した点

### 1. AI エージェント分業による高速開発

👥 **実装**:
- 4 人のチームメンバーが各自担当領域で AI と協力
- レビュー専用サブエージェントで品質を自動確保
- PR レビュー → AI 修正 → マージまで人手を最小化

💡 **効果**: 20 時間という限られた時間で多くの機能を実装

### 2. GitHub → Notion 自動同期

📋 **実装**:
- GitHub Actions ワークフロー（PR マージトリガー）
- PR メタデータを自動抽出して Notion に登録
- 進捗管理を GitHub と Notion で二重管理

💡 **効果**: チーム全体で進捗可視化、発表資料準備が容易

### 3. ドキュメント駆動開発

📚 **実装**:
- CLAUDE.md で開発ルール・アーキテクチャを一元管理
- 各実装タスクで PR 説明を詳細に記載
- 発表資料を作業のたびに更新（継続的ドキュメント更新）

💡 **効果**: 最後になって資料をまとめる苦労がない、常に発表可能な状態を維持

---

## 工夫した点（続き）

### 4. 敵対的アーキテクチャ監査（AI が AI の成果物を疑う）

🔍 **実装**:
- 「AI 生成コードだから品質が高い」という前提を捨て、ゼロベースで全域監査
- 調査エージェント3系統（フロント / バックエンド / テスト・設定）を並列投入
- 発見: 実行不能な lint、CI 不在、型検査の穴、認可ロジックの分裂、447行のデッドコード等
- 22件の改善タスクを優先度付き実装手順書に整理（`docs/architecture-audit/`）

💡 **効果**: 「動いているように見える」と「品質が担保されている」の乖離を早期に可視化

### 5. 監査結果の即実行（T01/T05: 品質ゲート確立とデッドコード削除）

🛠 **実装**:
- ESLint を導入し `npm run lint` を 0 エラー・0 警告で実行可能に（従来は実行不能だった）
- デッドコード削除: `api-stubs.ts`（447行）・偽テストランナーを撤去
- 副次的に発見した既存バグも修正（jest が e2e を誤検出、AuthContext の export 漏れ、テストの `&&` チェーンが真偽値を返さない等）

💡 **効果**: `npm run lint` / `npm run build` / `npm test`（16スイート・116テスト）が全て green の状態を確立。以降のリファクタリングの安全網ができた

### 6. 型検査範囲の拡大（T03）

🛠 **実装**:
- `tsconfig.backend.json` を新設し、`npm run typecheck` で `api/server/scripts/tests/src` 全体を strict mode 検査
- 従来は `tsc -b`（ビルド）が `src/` しか見ておらず、バックエンド全体が型検査の外だった

💡 **効果**: バックエンドの型安全性を可視化。今回は既存コードに追加のエラーはなく、テストユーティリティの型不整合1件のみ発見・修正

### 7. ドキュメントと実装の乖離修正（T19）

🛠 **実装**:
- CLAUDE.md の Source Tree・DB スキーマ・技術スタック記述を実態（7画面・15コンポーネント・10以上のテーブル）に全面改訂
- `.github/workflows/` と `docs/` に同一内容の sync-notion.yml が二重管理されていた問題を解消（docs側は非実行コピーだったため削除）
- README・tests/README.md の CI 記述（存在しないCIを前提にしていた）を実態に修正

💡 **効果**: ドキュメントを「真実」として参照する AI エージェントが誤った前提で実装判断を行うリスクを排除

### 8. 認可ロジックの統一とセキュリティ修正（T04）

🔒 **実装**:
- 認可ロジックを新設し（現 `backend/auth/authz.ts`。T06でさらに移動済み）、Express（`server/`）と Vercel Functions（`api/`）の認可ロジックを一本化
- **セキュリティ修正**: serverless 側が `is_active` を確認しておらず、無効化ユーザが管理APIを通過できる欠陥を修正
- 店舗管理者判定を `users.store_id`（Express）／`store_managers`テーブル（serverless）の2系統分裂から、`store_managers`テーブルに一本化
- 調査の過程で、`reservations`（既修正済み）を除く9テーブル・10カラムが誤って Supabase Auth の `auth.users` を参照しており、実運用でFK制約違反になる系統的バグを発見。今回は依存する `store_managers` のみ修正し、残り8テーブルは追加タスク（T23）として記録
- 認可ロジック専用のユニットテストを新規追加（is_active/店舗管理者判定の正常系・異常系）

💡 **効果**: 「無効化したユーザが管理操作を続行できる」という実害のあるセキュリティ欠陥を解消。認可の判定ソースが1箇所に統一され、Express/serverless間の挙動差異が無くなった

### 9. バックエンド共有レイヤの新設と型の所有権修正（T06+T07）

🏗️ **実装**:
- `backend/` ディレクトリを新設し、`api/_lib/`（Vercel専用のはずが実質共有ライブラリ化していた）の全ロジックを移動
- `api/`（Vercel Functions）と `server/`（Express）を「backend/ を参照する薄いアダプタ」に整理。依存方向を `api/ → backend/ ← server/` の一方向に統一
- Vercel専用のHTTPアダプタ（`requireAdmin`/`requireStoreAccess`）は `api/_http/` に分離し、ドメインロジックと区別
- `CongestionLevel` 型を、本来無関係なメールテンプレート層（`email/templates.ts`）から `crowd/types.ts` に移動し、「ドメイン→インフラ」に逆転していた依存方向を修正

💡 **効果**: `supabaseAdmin` の定義重複（`api/_lib/` と `server/db.ts` の2箇所）を解消し1箇所に統一。テスト17スイート・128件を維持したまま大規模なファイル移動を完了し、アーキテクチャ境界を明確化

### 10. APIエラー形式の統一とzodによる入力検証（T09）

🛠 **実装**:
- `backend/http/respond.ts` を新設し、`sendError(res, status, code, message)` でエラー形式を `{error: 機械可読code, message: 人間向け日本語}` に統一（従来は `{error: string}` / `{error, message}` / HTML など4パターン混在）
- zod スキーマ（users/stores/reservations/errors/crowd/auth）を新設し、手書き `typeof` 検証を置換。`server/routes/stores.ts` は座標 x/y の数値型チェックが元々存在しなかった欠陥も解消
- 調査の過程で `server/routes/{stores,users,auth}.ts` に実 Express app への統合テストが一つも存在しないことが判明（既存テストはローカルモック関数のみで実コードを検証していなかった）。新設した zod 検証を実証する統合テスト8件を追加
- メールリンク着地ページ（`crowd/report.ts` の GET）は HTML を返す設計のため例外として現状維持し、ファイル冒頭にその旨を明記

💡 **効果**: `npm run typecheck`/`lint`/`build`/`test`（18スイート・136テスト）を維持したままエラー契約を統一。バックエンドの主要3ルートに初めて実コードを検証する統合テストが追加された

### 11. Express防御整備（T11）

🛡️ **実装**:
- `server/app.ts` にグローバルエラーハンドラを追加。未処理例外・multerのファイルサイズ超過を、HTMLスタックトレースではなく統一エラー形式のJSONで返す
- 未知の `/api/*` パスへの404ハンドラを追加（従来はExpress既定の404 HTMLページが返っていた）
- CORSを全オリジン許可から許可リスト化（`CORS_ALLOWED_ORIGINS`、既定は開発サーバーのみ）。x-user-id認証（なりすまし可能な既知の制約）と組み合わさるリスクを縮小
- 404・413・CORS制限を検証する統合テスト5件を新規追加

💡 **効果**: 本番環境でスタックトレースがクライアントに漏れるリスクを解消。任意オリジンからのAPIアクセスを許可リストで制限

### 12. cronスクリプトのdotenv欠落修正とUTC/JST変換ミスの発見（T18）

⏰ **実装**:
- `scripts/notifyCongestionCron.ts`・`aggregateCrowdAnalyticsCron.ts` に `dotenv/config` を追加。従来は env 未読込で `npm run cron:dev` が即死していた
- **実バグを発見**: `vercel.json` の cron 式（`*/30 9-21 * * *`）は Vercel 上では UTC 解釈のため、意図していた JST 9:00-21:30（営業時間）ではなく実際は JST 18:00-翌6:30（深夜）に混雑通知が実行されていた。UTC換算（`*/30 0-12 * * *`）へ修正
- 同様の理由で集計バッチのcron式もJST 23:00相当に修正
- ローカル開発用スクリプトは `node-cron` の `timezone: 'Asia/Tokyo'` オプションでJSTのまま維持し、本番（UTC表記）とローカル（JST表記）の対応をCLAUDE.mdに明記

💡 **効果**: 「動いているように見えるが実際は深夜に実行されていた」という気付きにくい本番バグを本番投入前に発見・修正

### 13. フロントのデータアクセス一本化（T08）

🔌 **実装**:
- フロントエンドから `@supabase/supabase-js` を直接呼ぶコードを全廃し、`src/lib/api.ts` 経由のREST呼び出しに統一（`src/lib/likes.ts`・`reviews.ts`・`AuthContext.tsx` の権限取得を書き換え）
- 新設: `backend/domains/social/`（likes/reviewsのリポジトリ・zodスキーマ）、`backend/domains/auth/permissionsRepository.ts`、`server/routes/likes.ts`・`reviews.ts`、`GET /api/auth/permissions`
- `ErrorManagementDashboard.tsx` が生 `fetch()` で `x-user-id` を手動付与していた実バグを発見・修正（`VITE_API_URL` 設定時に壊れる経路だった）。`api.ts` に `patch` メソッドを追加
- テスト用フェイクSupabaseクライアント（`fakeSupabase.ts`）にUNIQUE制約シミュレーション・`count`/`in`/`maybeSingle` 等の対応を追加し、新規統合テスト18件を追加
- 完了条件を確認: `src/` 配下でsupabase import 0件、生 `fetch(` は `api.ts` のみ

💡 **効果**: フロントの本番バンドルから `@supabase/supabase-js` を除去（459KB→244KB, gzip 125KB→70KB）。認証・入力検証をバックエンドに一元化し、フロントが直接DBスキーマに依存しない構成に

### 14. ルーティングの導入（react-router-dom, T10）

🧭 **実装**:
- `react-router-dom@^6` を導入し、`App.tsx` を `<BrowserRouter>` + `<Routes>` 構成に書き換え。`/login`・`/dashboard`・`/stores`・`/reservations`・`/likes`・`/admin`・`/admin/errors` の各URLを新設
- `ProtectedRoute` コンポーネントを新設。未認証は `/login` へ、admin専用ルートは非adminを、権限専用ルートは`users:delete`権限を持たないユーザを `/dashboard` へリダイレクト
- `Dashboard.tsx` の `useState` による画面切替（6画面をコンポーネント内で条件分岐レンダリング）を撤去し、`<Link>`/`useNavigate`（react-router版）に置換。各画面（StoresPage/ReservationsListPage/LikesListPage/AdminPage/ErrorManagementDashboard）の `onBack`/`onViewReservations` コールバックpropsも同様に置換
- **`src/hooks/useNavigate.ts`（`window.location.pathname =` 代入によるフルリロードの「偽物」フック）を削除**
- 新規テスト `tests/unit/routing.test.tsx`（8件）でURL直アクセス・未認証リダイレクト・admin/権限ガードを検証。ヘッドレスブラウザ（Playwright Chromium）でビルド済みバンドルを実際に起動し、`/`・`/dashboard`・`/stores`・存在しないパスへの直アクセスがconsoleエラー無くログイン画面へ遷移することを確認
- 完了条件を確認: `window.location.pathname =` への代入がコードベースに0件

💡 **効果**: 全画面がURL直アクセス・リロード・ブラウザバックに耐える構成になり、画面共有・ブックマークが可能に。デモ中のブラウザバックで画面が破綻するリスクを解消

---

## 苦労した点

### 1. 20 時間という限られた時間

⏰ **課題**:
- フルスタック開発（Frontend + Backend + DB）を短時間で実装
- テストの充実度とのバランス

✅ **対応**:
- AI エージェント活用で並列開発
- 本当に必要な機能に集中（スコープを絞った）

### 2. AI エージェント間の一貫性維持

🤖 **課題**:
- 複数の AI エージェントが独立に実装すると、設計にズレが生じる可能性
- API 仕様、データベーススキーマの統一

✅ **対応**:
- 事前に CLAUDE.md でアーキテクチャを詳細に定義
- レビュー専用サブエージェントで品質確保

### 3. 実装 ↔ 発表資料の同期

📊 **課題**:
- 実装が進む中で資料が古くなる
- 最後に資料をまとめると時間がない

✅ **対応**:
- **継続的ドキュメント更新**：作業のたびに資料を更新
- タスク完了時に Marp 資料更新を必須化
- 常に「今この瞬間に発表できる状態」を維持

---

## 今後の展望

### Phase 2: AI 提案の高度化

🚀 **計画**:
- **複数の Claude モデルを使い分け** — 高速な Haiku、高精度な Opus
- **提案理由の説明付与** — "なぜこのプランか" を AI が説明
- **ユーザーフィードバック学習** — ユーザーの評価から提案を改善

### Phase 3: スケーリング

📈 **計画**:
- **バッチ提案** — 複数参加者を同時にフィルタリング
- **リアルタイム推奨** — ダッシュボードで動的に提案更新
- **多言語対応** — 海外チームメンバーへの対応

### Phase 4: 社内展開

🏢 **計画**:
- **他部門への展開** — イベント管理、研修計画など
- **AI エージェント自動化の拡大** — 開発プロセスの完全自動化

---

## デモで説明する内容

### Demo Scenario

**シーン**: ログイン → 店舗一覧 → 予約 → 混雑分析（→ AI プラン提案は統合後に追加）

#### 1. ログイン
```
📧 Email: yoshizawa@ai-hackason.example（テストアカウント）
→ /login → /dashboard へ遷移（role に応じた画面出し分け。URL直リンク・リロード・
  ブラウザバックにも対応。T10でreact-router-dom導入済み）
```

#### 2. ことこと町の店舗を探す・予約する
- 🏪 **店舗一覧**（`/stores`） — のんびり亭・ことりカフェ等8店舗（カテゴリ・価格帯・営業時間）
  ※デモ前提: シードデータ投入スクリプト（監査手順書 P3-4）を発表前週に実施
- 📅 **予約**（`/reservations`） — 空き確認 → 予約作成 → 予約一覧でキャンセル

#### 3. 店舗管理者・管理者の画面
- 📊 **混雑分析ダッシュボード** — 時間帯別の混雑パターン可視化
- 🛠 **店舗・ユーザー管理**（`/admin`）**、エラー管理**（`/admin/errors`、いずれも admin のみ）

#### 4. AI プラン提案 🚧（Claude API 統合後にデモへ追加予定）
```
入力: 「ランチして映画も見たい。子連れで13時から」
出力: のんびり亭(空いてる時間帯) → つきみ座 の順路プラン＋理由
```

---

## まとめ

### 🎯 目標達成

| 目標 | 達成度 | 備考 |
|-----|--------|------|
| **AI による提案機能** | 🚧 | プラン生成ドメイン設計済み・統合作業中 |
| **ユーザー認証・ダッシュボード** | ✅ | ログイン・権限管理完了 |
| **データベース（複数テーブル）** | ✅ | 正規化済み PostgreSQL |
| **自動デプロイ** | ✅ | Vercel + GitHub Actions |
| **ドキュメント完備** | ✅ | 継続的に更新中 |

### 🚀 技術的ハイライト

1. **AI エージェント分業** — 4 人チームの並列開発を最大化
2. **自動化パイプライン** — GitHub → Notion → Vercel を自動同期
3. **継続的ドキュメント更新** — 常に発表可能な状態を維持

### 💡 学習成果

- **フルスタック開発** — Frontend + Backend + DB の統合
- **AI 活用** — AI エージェントを開発プロセスに組み込む実践経験（プロダクト内 Claude API 統合は作業中）
- **チーム開発** — AI エージェントを含む分業管理

---

## 質疑応答

**Contact**: Kyosuke Yoshizawa  
**Repository**: https://github.com/kyousuke-yoshizawa/ai-hackason  
**発表日**: 2026年7月25日

---

## 附録: 技術スタック一覧

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, Vercel Functions, Claude API（統合作業中）
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel, GitHub Actions
- **Testing**: Jest, Playwright, Testing Library
- **Development**: Git, GitHub, VS Code, Claude Code
- **Documentation**: Markdown, Marp (presentation)
- **Team Coordination**: Microsoft Teams, Notion

