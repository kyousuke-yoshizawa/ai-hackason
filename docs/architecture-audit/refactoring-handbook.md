# アーキテクチャ監査報告 & リファクタリング実装手順書

**監査日**: 2026-07-13
**監査方針**: 「Claude が生成したものだから一定品質」という前提を捨て、敵対的・批判的・ゼロベースで監査。既存構成の尊重・互換性維持は目的としない。
**対象**: ディレクトリ構成・設計・責務分離・命名・依存関係・開発体験・保守性・拡張性・実装方針の全域。
**この文書の用途**: 下位モデル（実装エージェント）へ渡す実装手順書。各タスクは可能な限り独立しており、単独で着手できる。

---

## 監査サマリ（結論）

このコードベースには **「動いているように見えるが、品質ゲート・アーキテクチャ境界・ドキュメントの三層すべてが実態と乖離している」** という構造的問題がある。主要な発見:

| # | 発見 | 深刻度 |
|---|------|--------|
| 1 | **ESLint が devDependencies に存在せず `npm run lint` は実行不能**。CLAUDE.md が謳う「max 0 warnings」の品質ゲートは虚構 | Critical |
| 2 | **CI が存在しない**（GitHub Actions は Notion 同期のみ）。テスト・型検査・lint は一度も自動実行されていない | Critical |
| 3 | **tsconfig が `api/` `server/` `tests/` を型検査していない**（include は `src` のみ）。バックエンドは `tsc -b` の検査対象外 | Critical |
| 4 | **serverless 側の認可が `is_active` を見ない**（無効化ユーザが管理 API を通過）。店舗管理者判定が `users.store_id`（Express）と `store_managers` テーブル（serverless）の2系統に分裂 | Critical |
| 5 | **デッドコード大量残置**: `src/lib/api-stubs.ts`（447行・import 0件）、`tests/test-runner.ts`（乱数で95%合格を偽装する偽テストランナー）、`LikeButton`/`StoreReviewSection`（UI から到達不能） | Critical |
| 6 | **バックエンドが二重構造**: `server/`（Express）と `api/`（Vercel functions）が併存し、`api/index.ts` が Express app を丸ごと re-export。`supabaseAdmin` と `requireAdmin` が別実装で重複 | High |
| 7 | **フロントのデータアクセスが二系統混在**: likes/reviews/権限取得は Supabase 直、他は REST。ビジネスルールがクライアント側でのみ強制される箇所あり | High |
| 8 | **ErrorManagementDashboard が `api.ts` ラッパーを迂回して相対 fetch** → `VITE_API_URL` 設定時に本番で壊れる実バグ | High |
| 9 | **ドメイン型 `CongestionLevel` が `email/templates.ts`（インフラ層）に定義**され、crowd/crowdAnalytics ドメインが email モジュールへ依存する逆転 | High |
| 10 | **README・CLAUDE.md・要件定義が謳う「Claude API 統合」が実コードに一切存在しない**（依存・呼び出し・環境変数キーすべて皆無）。プロジェクトの核が未実装 | High |
| 11 | ルーティング不在（URL とビュー非同期、`useNavigate` はフルリロード偽装）、Express にグローバルエラーハンドラ・404・CORS 制限なし、API エラー形式が4パターン混在、バックエンドに zod 未導入 | High |
| 12 | 型の重複定義（`User`/`AdminUser`、`StoreMedia` 二重定義等）、jest の環境ハック、`002_` 番号の SQL 4本重複、cron の UTC/JST ズレ疑い、ドキュメント乖離多数 | Medium |

---

## 全タスク共通ルール

1. **ブランチ**: 各メンバーの `feature/<name>` ブランチで作業（CLAUDE.md のブランチ戦略に従う）。
2. **作業前**: `git pull origin main` を必ず実行。
3. **コミット**: こまめに（1論点1コミット）。メッセージは日本語で簡潔に。
4. **検証**: タスクごとに `npm run build` と `npm test` が green であることを確認してから push。
5. **PR**: 日本語・簡潔。レビューはレビュー専用サブエージェントで行う（自己レビュー禁止）。
6. **⚠️ Marp 資料更新（必須・全タスク共通の最終ステップ）**: `docs/presentation/presentation.md` を更新する。「何を変更したか・なぜ・得られた効果・発表で触れる価値があるポイント」を該当スライド（アーキテクチャ／工夫した点／苦労した点など）へ反映する。反映不要と判断した場合も、PR 説明にその理由を1行記録すること。

---

## タスク一覧

### T01. ESLint の導入（lint スクリプトの実体化）

**優先度**: Critical

**問題**
`package.json:10` に `"lint": "eslint . --ext ts,tsx ..."` が定義されているが、eslint 本体が devDependencies に存在せず、設定ファイル（`.eslintrc.*` / `eslint.config.*`）も無い。`npm run lint` は実行不能。CLAUDE.md は「ESLint / max 0 warnings」を品質基準として明記しており、記載と実態が完全に乖離している。

**根本原因**
プロジェクト雛形作成時に lint スクリプトだけコピーされ、依存導入と設定作成が行われないまま、誰も一度も lint を実行しなかった（CI が無いため発覚しなかった）。

**改善方針**
ESLint 一式を導入し、リポジトリ全体（src/api/server/scripts/tests）を対象に 0 エラーまで修正する。

**実装手順**
1. devDependencies に追加: `eslint@^8`, `@typescript-eslint/parser@^7`, `@typescript-eslint/eslint-plugin@^7`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
2. ルートに `.eslintrc.cjs` を新規作成。parser は `@typescript-eslint/parser`、extends は `eslint:recommended` + `plugin:@typescript-eslint/recommended` + `plugin:react-hooks/recommended`。`ignorePatterns: ['dist', 'node_modules', 'coverage', 'playwright-report']`
3. `npm run lint` を実行し、エラーを潰す。自明でない修正（ロジック変更を伴うもの）は別タスクに切り出し、`eslint-disable-next-line` + 理由コメントで一時退避してよい
4. CLAUDE.md の `npm lint` という表記（無効な npm 構文）を `npm run lint` へ修正
5. **Marp 資料更新**（共通ルール6）

**完了条件**
- `npm run lint` が exit code 0 で完了する
- CLAUDE.md の lint 記述が実際のコマンドと一致する

---

### T02. CI パイプラインの新設

**優先度**: Critical

**問題**
`.github/workflows/` には Notion 同期（PR マージ時）しか無く、push/PR で lint・型検査・テストが一切自動実行されない。`tests/README.md` は「GitHub Actions で push/PR ごとにテスト実行」と記載しており虚偽。壊れた lint（T01）が放置されたのも CI 不在が原因。

**根本原因**
Notion 同期ワークフローだけが「GitHub Actions」タスクとして実装され、品質ゲートとしての CI が誰の担当にもなっていなかった。

**改善方針**
push（main）と PR で lint → typecheck → jest を回す最小 CI を追加する。

**実装手順**
1. ⚠️ **事前に Kyosuke の承認を得ること**（CLAUDE.md: GitHub Actions 変更は Kyosuke 承認必須）
2. `.github/workflows/ci.yml` を新規作成: トリガーは `pull_request` と `push: branches: [main]`。ジョブは ubuntu-latest / Node 20 / `npm ci` → `npm run lint` → `npm run typecheck`（T03 で追加）→ `npm test`
3. e2e（playwright）は CI に含めない（実行時間とブラウザ依存のため。将来タスク）
4. `tests/README.md` の CI 記述を実態に合わせて修正
5. **Marp 資料更新**

**完了条件**
- PR 作成時に CI が自動実行され green になる
- tests/README.md の記述と実際のワークフローが一致する

---

### T03. 型検査範囲の拡大（api/ server/ scripts/ tests/ を検査対象へ）

**優先度**: Critical

**問題**
`tsconfig.json` の include は `["src"]` のみ、`tsconfig.node.json` は `["vite.config.ts"]` のみ。**バックエンド全体とテストが `tsc -b` の型検査対象外**。CLAUDE.md の「strict mode; enforced at build time」はフロントにしか当てはまらない。

**根本原因**
Vite 雛形の tsconfig をそのまま流用し、後から追加された `api/` `server/` `scripts/` `tests/` を誰も include に足さなかった。ts-jest / tsx が「実行時に個別トランスパイル」するため、型エラーがあっても動いてしまい発覚しなかった。

**改善方針**
バックエンド用 tsconfig を新設し、`typecheck` スクリプトで全ツリーを検査する。

**実装手順**
1. ルートに `tsconfig.backend.json` を新規作成: `extends: "./tsconfig.json"`、compilerOptions は `{ "noEmit": true, "module": "ESNext", "moduleResolution": "bundler", "jsx": "react-jsx", "types": ["node", "jest"] }`、include は `["api", "server", "scripts", "tests", "src"]`
2. package.json に `"typecheck": "tsc --noEmit -p tsconfig.backend.json"` を追加
3. `npm run typecheck` を実行し、発見された型エラーをすべて修正（エラー内容はコミットメッセージに要約を残す）
4. `npm run build`（`tsc -b`）が従来どおり通ることも確認
5. **Marp 資料更新**

**完了条件**
- `npm run typecheck` が api/server/scripts/tests/src 全域を検査して exit 0
- CI（T02）に typecheck が組み込まれている

---

### T04. 認可ロジックの一本化と is_active 欠落の修正【セキュリティ】

**優先度**: Critical

**問題**
1. `api/_lib/requireAdmin.ts:19-24` と `api/_lib/requireStoreAccess.ts` は `is_active` を確認しない。**無効化されたユーザが serverless 側の管理 API を通過できる**（Express 側 `server/middleware/auth.ts:28` は `.eq('is_active', true)` でチェックしており、挙動が分裂）
2. 店舗管理者の判定ソースが2系統: Express は `users.store_id` カラム（`server/middleware/auth.ts:60`）、serverless は `store_managers` テーブル（`api/_lib/crowd/repository.ts:69-78`）。同じ「店舗管理者か？」の答えが経路によって変わり得る

**根本原因**
Express 側と serverless 側を別々の作業（別エージェント）が実装し、認可という横断的関心事の共通化が行われなかった。

**改善方針**
認可ヘルパを1モジュールに統一し、両系統から同じ関数を使う。店舗管理者判定は `store_managers` テーブルを正とする（多対多に対応でき、`users.store_id` の単一店舗制約より拡張性が高い）。

**実装手順**
1. `api/_lib/authz.ts` を新規作成（T06 実施後は `backend/auth/authz.ts`）。エクスポート:
   - `getActiveUser(userId: string): Promise<AuthedUser | null>` — users を id で照会し **`is_active = true` を必須条件に含める**
   - `requireAdmin(userId: string | undefined): Promise<AuthedUser | null>` — getActiveUser + role === 'admin'
   - `requireStoreAccess(userId: string | undefined, storeId: string): Promise<AuthedUser | null>` — admin または `store_managers` テーブルで判定
2. `api/_lib/requireAdmin.ts` と `api/_lib/requireStoreAccess.ts` の中身を authz.ts への委譲に置換（既存 import 先は変更不要にする）か、呼び出し側（`api/errors/*.ts` 等）の import を authz.ts へ張り替えて旧ファイルを削除
3. `server/middleware/auth.ts` の `requireAuth`/`requireAdmin` も内部で authz.ts の関数を呼ぶ形に書き換え、**店舗管理者判定の `users.store_id` 参照を廃止**して store_managers へ統一
4. `users.store_id` を参照している他の箇所を grep（`store_id` で server/ 内を検索）し、判定用途の参照をすべて置換。データ移行が必要な場合（store_id にあるが store_managers に無いレコード）は SQL を `docs/database/` に追加
5. テスト追加: `tests/integration/` に「is_active=false のユーザが admin API で 403」「store_managers 非登録ユーザが store API で 403」のケース
6. **Marp 資料更新**（セキュリティ改善は「苦労した点/工夫した点」の発表ネタになる）

**完了条件**
- `is_active=false` ユーザが全認可経路で拒否される（テストで担保）
- 店舗管理者判定の実装が1箇所のみ（grep で `store_managers` 参照が authz 経由に集約）

**注意点**
- x-user-id ヘッダ自体がなりすまし可能である問題（コード内コメントで既知）は本タスクのスコープ外（T21 参照）。本タスクは「二重実装の分裂」解消に限定する

---

### T05. デッドコードの削除

**優先度**: Critical（コード理解を汚染し、AI エージェントの誤読を誘発するため）

**問題**
1. `src/lib/api-stubs.ts`（447行）: import 元 0 件。Supabase 直叩きのモック実装群で、現行の REST 構成と矛盾する内容。AI エージェントや新規参加者がこれを「正しいパターン」と誤読するリスクが高い
2. `tests/test-runner.ts`（280行）: `Math.random() > 0.05` で95%合格を偽装する**実テストを実行しない**スクリプト。package.json から呼ばれてもいない。「テストが通った」という誤認を生む有害物
3. `jest.config.ts` の moduleNameMapper `^@/(.*)$`: `@/` import はコードベースに0件（デッド設定）

**根本原因**
「後で使うかもしれない」生成物が削除判断されないまま蓄積。フェーズ移行（スタブ→実API）時に旧成果物の廃棄プロセスが無かった。

**実装手順**
1. `grep -rn "api-stubs" src/ tests/` でコード参照0件を再確認 → `src/lib/api-stubs.ts` を削除
2. `grep -rn "test-runner" . --include="*.ts" --include="*.json"` で参照0件を再確認 → `tests/test-runner.ts` を削除
3. `jest.config.ts` から `^@/(.*)$` の moduleNameMapper を削除（`\.js$` の mapper は server/ の ESM import 解決に必要なので**残す**）
4. `tests/README.md` に残る api-stubs への言及（286行目・296行目付近）を削除
5. `npm run build && npm test` で green を確認
6. **Marp 資料更新**

**完了条件**
- 上記3点が削除され、build/test が green
- ※ `LikeButton.tsx` / `StoreReviewSection.tsx` / `src/lib/likes.ts` / `src/lib/reviews.ts` も UI から到達不能だが、これらは**削除せず T13 で結線する**（要件定義にレビュー・いいね機能が含まれるため）

---

### T06. バックエンド二重基盤の統一（backend/ レイヤの新設）

**優先度**: High

**問題**
1. `api/_lib/supabaseAdmin.ts` と `server/db.ts` が**ほぼ同一コードの重複**（同じ env、同じ createClient）。`api/_lib/supabaseAdmin.ts:10` には「api/ 配下からのみ使用すること」というコメントがあるが、scripts/ がこれを import しており（下記3項）、注記が守られていない
2. `api/index.ts` が `server/app.ts` を丸ごと re-export しており、「serverless と Express は別物」という見かけと裏腹に、本番では auth/users/stores が Express 実装で動く。境界が曖昧
3. `scripts/*.ts` が `../api/_lib/...` を直接 import — 「Vercel functions のプライベートヘルパ」であるはずの `_lib` が実質共有ライブラリ化している

**根本原因**
Vercel のファイルベースルーティング（`api/` 直下がエンドポイント、`_` prefix は除外）という**デプロイ都合のディレクトリ規約**の中に、共有ビジネスロジックまで押し込んだため。デプロイ単位とコード編成単位が混同されている。

**改善方針**
共有バックエンドコードを `backend/` に集約し、`api/`（Vercel エントリ）と `server/`（ローカル Express エントリ）を「薄いアダプタ」に格下げする。依存方向は `api/ → backend/ ← server/` の一方向のみ。

**実装手順**
1. `backend/` ディレクトリを新規作成し、以下の構造で `api/_lib/` から移動:
   ```
   backend/
   ├── db.ts                  # 旧 api/_lib/supabaseAdmin.ts（唯一の supabaseAdmin 定義）
   ├── auth/
   │   └── authz.ts           # T04 の認可ヘルパ
   └── domains/
       ├── crowd/             # 旧 api/_lib/crowd/*
       ├── crowdAnalytics/    # 旧 api/_lib/crowdAnalytics/*
       ├── email/             # 旧 api/_lib/email/*
       ├── reservations/      # 旧 api/_lib/reservations/*
       └── notifications/     # 旧 api/_lib/cron/congestionNotificationJob.ts
   ```
2. `server/db.ts` を削除し、import を `backend/db.js` へ変更。**対象は `grep -rln "db.js" server/` で全列挙してから置換すること**（`server/routes/*.ts` 4本に加え `server/middleware/auth.ts` も `../db.js` を import している）
3. `api/` 直下の各ハンドラ・`scripts/*.ts`・`tests/` の import を `api/_lib/...` から `backend/...` へ一括張り替え（`grep -rln "_lib" api/ scripts/ tests/` で対象を列挙してから機械的に置換）
4. 空になった `api/_lib/` を削除
5. **注意点（必ず検証）**: Vercel の Node functions は import 依存を追跡して `api/` 外のファイルもバンドルするが、デプロイ後に Preview 環境で `/api/reservations` 等が動くことを必ず確認する。動かない場合は `vercel.json` に `functions` 設定を追加検討
6. **注意点**: `server/` 内の import は ESM 拡張子付き（`./app.js`）規約。backend/ 内も同一規約（`.js` 拡張子付き相対 import）で統一する（jest の `\.js$` mapper が解決する）
7. `npm test && npm run typecheck` green を確認
8. **Marp 資料更新**（アーキテクチャ図スライドを新構成に差し替え）

**完了条件**
- `supabaseAdmin` の定義が `backend/db.ts` の1箇所のみ（grep で確認）
- `api/_lib/` が存在しない
- scripts/tests/api/server すべてが backend/ を import
- Vercel Preview デプロイで全エンドポイント動作確認済み

---

### T07. ドメイン型 CongestionLevel の配置修正（依存方向の正常化）

**優先度**: High（T06 と同時実施を推奨）

**問題**
混雑度レベル `CongestionLevel` は crowd ドメインの中核型なのに `api/_lib/email/templates.ts`（メール HTML 生成＝インフラ層）に定義されており、`crowd/`・`crowdAnalytics/` が型のためだけに email モジュールへ依存している。依存方向が「ドメイン → インフラ」に逆転しており、将来 email を差し替え/削除すると crowd が壊れる。

**根本原因**
最初に CongestionLevel を必要としたコードがメールテンプレートで、後続モジュールが「既にある場所」から import し続けた。型の所有権が設計されていない。

**実装手順**
1. `backend/domains/crowd/types.ts` を新規作成し、`CongestionLevel` 型（および crowd 固有の共有型）を移動
2. `email/templates.ts` は `crowd/types.js` から import する形に逆転
3. `grep -rn "email/templates" backend/ api/ tests/` で「型だけを templates から import している箇所」をすべて `crowd/types.js` へ張り替え
4. 循環 import が無いことを確認（`npx madge --circular backend/` の実行を推奨。madge が無ければ import を目視確認）
5. **Marp 資料更新**

**完了条件**
- `CongestionLevel` の定義が `backend/domains/crowd/types.ts` のみ
- email → crowd 方向の依存のみ存在し、crowd → email の import が0件

---

### T08. フロントのデータアクセス一本化（Supabase 直叩きの廃止）

**優先度**: High

**問題**
1. データアクセスが二系統混在: `likes.ts`・`reviews.ts`・`AuthContext` の権限取得は **Supabase 直**、stores/users/reservations/media/errors は **REST（api.ts）**。信頼境界が曖昧で、レビューの文字数制限・rating 範囲などのビジネスルールが**クライアント側でしか強制されない**
2. `ErrorManagementDashboard.tsx:42,64` は api.ts を迂回して相対パスで生 `fetch('/api/errors...')` を実行。**`VITE_API_URL` を設定した本番構成ではこの画面だけ API に到達できない実バグ**。認証ヘッダも手書きで重複
3. `AuthContext.tsx:30-44` の権限取得も Supabase 直（認証は REST なのに権限は Supabase という分裂）

**根本原因**
機能ごとに別エージェント/別タイミングで実装され、「データアクセスはどの層を通すか」という規約が存在しなかった。

**改善方針**
フロントのデータアクセスを REST（api.ts）に全面統一。likes/reviews の API をバックエンドに新設し、バリデーションをサーバ側へ移す。

**実装手順**
1. バックエンドに likes/reviews のエンドポイントを新設（T06 後の構成で）:
   - `backend/domains/social/` に repository + validation（rating 1-5、comment ≤500 を zod で。T09 の形式に合わせる）
   - Express ルータ `server/routes/likes.ts`・`server/routes/reviews.ts` を作成し `server/app.ts` にマウント（auth/users/stores と同じ Express 系に載せ、`vercel.json` の rewrite 対象へ `likes|reviews` を追加）
   - エンドポイント: `POST/DELETE /api/likes`、`GET /api/likes/user/:userId`、`GET /api/stores/:id/likes/count`、`POST/PUT/DELETE /api/reviews`、`GET /api/stores/:id/reviews`、`GET /api/stores/:id/reviews/stats`
2. `src/lib/likes.ts`・`src/lib/reviews.ts` を api.ts 経由の実装に書き換え（関数シグネチャは維持し、呼び出し側の変更を最小化）
3. `AuthContext.tsx` の `fetchPermissions` を `GET /api/auth/permissions`（新設、`server/routes/auth.ts` に追加）へ置換
4. `ErrorManagementDashboard.tsx` の生 fetch 2箇所を `api.get`/`api.patch` に置換（authHeaders の手書き重複も解消される）
5. ここまで完了すると `src/lib/supabase.ts` の import 元が0になるはず → grep で確認して **`src/lib/supabase.ts` を削除**し、`@supabase/supabase-js` をフロントバンドルから排除（package.json の dependencies には backend が使うため残す）
6. `.env.example` から `VITE_SUPABASE_*` の「フロント必須」という位置づけを修正（backend 用である旨コメント変更）
7. テスト: likes/reviews の integration テストを追加（fakeSupabase 利用、supertest で Express app を叩く）
8. **Marp 資料更新**（システム構成図の「Frontend → Supabase 直結」線を削除）

**完了条件**
- `src/` 内で `supabase` を import する箇所が0件
- `src/` 内で生 `fetch(` を呼ぶのは `src/lib/api.ts` のみ（grep で確認）
- likes/reviews のビジネスルールがサーバ側テストで担保される

---

### T09. API エラーレスポンス形式の統一と zod によるバックエンド検証

**優先度**: High

**問題**
1. エラー形式が4パターン混在: `{error: string}`（最多）、`{error: code, message: 詳細}`（reservations のみ）、`{available:false, reason, message}` を 200 で返す（availability）、HTML 文字列（crowd/report GET）。`error` の意味も「人間向け文」と「機械可読コード」で二義的
2. フロント `api.ts:22` は `body?.error` しか読まないため、`message` ベースのレスポンスを正しく表示できない
3. zod が **フロントのフォーム2つでしか使われておらず**、バックエンドは手書き `typeof` チェック。`server/routes/stores.ts` は座標 x/y の数値型検証すら無い

**根本原因**
ハンドラごとに独立実装され、レスポンス契約のオーナーが不在。zod は依存に入っていたのに使う規約が無かった。

**改善方針**
エラー契約を `{ error: <機械可読code>, message: <人間向け日本語> }` に統一（最も情報量の多い reservations 形式を全体標準へ昇格）。バックエンド入力検証を zod に統一。

**実装手順**
1. `backend/http/respond.ts` を新規作成: `sendError(res, status, code, message)` と `zodError(res, zodResult)` ヘルパを定義（Express の res と Vercel の res 両対応のシグネチャで）
2. `api/` 直下の全ハンドラと `server/routes/*` のエラーレスポンスを sendError 経由に置換。HTML を返す `api/crowd/report.ts` の GET（メールリンク着地ページ）は**例外として現状維持**し、その旨をファイル冒頭コメントに明記
3. availability の「200 + available:false」は正常系レスポンスなので変更しない（エラーではない）。ただし `reason`/`message` のキー名は統一契約と揃える
4. 各ルートの req.body/query 検証を zod スキーマ化: `backend/domains/<domain>/schema.ts` にスキーマを置き、ハンドラ冒頭で `safeParse` → 失敗時 `sendError(res, 400, 'validation_error', ...)`。最低限、users（role enum・email 形式）、stores（x/y の number 強制）、reservations（既存手書き検証の zod 化）、errors、crowd/report を対象
5. `src/lib/api.ts` の `parseResponse` を更新: `body.message ?? body.error` の優先順で表示メッセージを取得
6. integration テストのアサーションを新形式に追従させる
7. **Marp 資料更新**

**完了条件**
- 全 JSON エラーレスポンスが `{error, message}` 形式（grep で `res.status(4` `res.status(5` の周辺を確認）
- バックエンドの req.body 直接参照（検証なし分割代入）が0件
- テスト green

---

### T10. ルーティングの導入（react-router-dom）

**優先度**: High

**問題**
1. ルータ不在。`App.tsx` は認証状態で `<Dashboard/>` / `<LoginPage/>` を出し分けるのみで、6画面（dashboard/admin/errors/likes/stores/reservations）は `Dashboard.tsx:13` の `useState` による条件分岐レンダリング。**URL が変わらないため、リロードで画面が消える・画面共有/ブックマーク不可・ブラウザバック不能**
2. `src/hooks/useNavigate.ts` は `window.location.pathname` 代入で**フルページリロードを起こす偽物**。react-router の同名 API と紛らわしく、渡された `/dashboard` 等のパスは実質無意味
3. デモ（発表）でブラウザバックを押した瞬間に破綻するリスク

**根本原因**
「ログイン→ダッシュボード」の最小構成から画面を増やす際、ルータ導入の判断が先送りされ続け、useState 分岐が既成事実化した。

**実装手順**
1. `react-router-dom@^6` を dependencies に追加
2. `src/App.tsx` を `<BrowserRouter>` + `<Routes>` 構成に書き換え。ルート: `/login`, `/dashboard`, `/stores`, `/reservations`, `/likes`, `/admin`, `/admin/errors`。`/` は認証状態で `/dashboard` or `/login` へ `<Navigate>`
3. `ProtectedRoute` コンポーネントを新設（`useAuth().isAuthenticated` が false なら `/login` へリダイレクト）。admin 系ルートは `user.role === 'admin'` も要求
4. `Dashboard.tsx` の `useState<'dashboard'|...>` 分岐を撤去し、ナビゲーションを `<Link>`/`useNavigate`（react-router 版）へ置換
5. **`src/hooks/useNavigate.ts` を削除**し、`LoginPage.tsx`・`Dashboard.tsx` の import 文（各ファイル冒頭）を react-router-dom へ変更
6. `vercel.json` の SPA fallback（`/((?!api/).*) → /index.html`）が既に有るため本番の直リンクは動く。dev は Vite が標準対応
7. e2e テスト（`tests/e2e/*.spec.ts`）の遷移アサーションを URL ベースに更新
8. **Marp 資料更新**（デモ手順スライドの画面遷移説明を URL 付きに更新）

**完了条件**
- 全画面が URL 直アクセス・リロード・ブラウザバックに耐える
- `window.location.pathname =` への代入がコードベースに0件

---

### T11. Express の防御整備（エラーハンドラ・404・CORS 制限）

**優先度**: High

**問題**
1. `server/app.ts` に**グローバルエラーハンドラが無い**。multer のサイズ超過等の同期エラーは Express 既定の HTML スタックトレースがクライアントへ漏れる
2. 未知の `/api/*` パスへの 404 ハンドラが無い（SPA fallback とも整合しない）
3. `app.use(cors())` が**全オリジン許可**。x-user-id 認証（なりすまし可能）と組み合わさると、任意サイトからユーザ ID さえ推測できれば API を叩ける

**実装手順**
1. `server/app.ts` の全ルートマウント後に追加:
   - `/api` 配下の 404: `app.use('/api', (req,res) => sendError(res, 404, 'not_found', ...))`
   - グローバルエラーハンドラ: `app.use((err, req, res, next) => ...)` — multer の `LIMIT_FILE_SIZE` は 413、その他は 500 で `{error,message}` 形式（T09 のヘルパ使用）。err はコンソールへ構造化ログ
2. CORS を許可リスト化: `const allowed = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',')` を `cors({origin: allowed})` へ。`.env.example` に `CORS_ALLOWED_ORIGINS` を追記（本番は Vercel の自ドメインを設定する旨コメント）
3. テスト: 未知パス 404・巨大ファイル 413 の integration テストを追加
4. **Marp 資料更新**

**完了条件**
- 未処理例外がスタックトレース HTML ではなく JSON で返る（テストで担保）
- 許可外オリジンからの CORS プリフライトが拒否される

---

### T12. Claude API 統合の「場所」の実装（プラン生成ドメイン新設）

**優先度**: High（プロジェクトの中核価値。発表の主役）

**問題**
README（L28「バックエンド Node.js+Express+**Claude API**」）、CLAUDE.md、要件定義 v2（Claude Sonnet 5 でプラン生成・API 呼び出し1回に統合と確定済み）のすべてが Claude API 統合を前提としているが、**実コードには `@anthropic-ai` 依存も API 呼び出しも `ANTHROPIC_API_KEY` も一切存在しない**。唯一 `api/_lib/crowd/getCurrentLevel.ts:42` に「Claude へのプロンプトに埋め込む」というコメントの整形関数があるだけ。ハッカソンの核機能とアーキテクチャ上の受け皿が両方欠落している。

**根本原因**
インフラ・周辺機能（認証、混雑、予約、メール）が先行し、コア機能が最後尾に回っている。受け皿となるドメイン設計が無いため、着手時に場当たり実装になるリスクが高い。

**改善方針**
要件定義 v2 に沿ってプラン生成ドメインを新設する。Claude 呼び出しは1箇所に集約し、プロンプト組み立て・スコアリングと分離する。

**実装手順**
1. `@anthropic-ai/sdk` を dependencies に追加。`.env.example` に `ANTHROPIC_API_KEY` を追記
2. `backend/domains/plan/` を新設:
   - `claudeClient.ts` — SDK 初期化と `generatePlan(prompt): Promise<...>` のみ（モデル ID は要件定義どおり `claude-sonnet-5`。※実装時に claude-api スキルで最新モデル ID を確認すること）
   - `promptBuilder.ts` — 店舗マスタ・混雑情報（既存 `getCurrentLevel.ts` の整形関数を利用）・ユーザー欲求テキストからプロンプトを構築。**API 呼び出しは1回に統合**（要件確定事項）
   - `scoring.ts` — 要件定義5章のスコアリング重み付け（距離感タグ・混雑度・営業時間）
   - `schema.ts` — 入出力の zod スキーマ（Claude 応答の JSON パースにも使用）
3. エンドポイント `POST /api/plan/generate` を新設（reservations と同様の Vercel function 形式: `api/plan/generate.ts`）
4. フロント: `src/lib/plan.ts`（api.ts 経由）+ プラン入力/結果画面（画面実装は別タスクに分割可。API までを本タスクの必須範囲とする）
5. テスト: claudeClient を jest.mock した promptBuilder / scoring の unit テスト、ハンドラの integration テスト
6. **注意点**: ANTHROPIC_API_KEY を Vercel の環境変数に設定するのは Kyosuke の作業（インフラ担当へ依頼）。キーをコードや `.env` にコミットしない
7. **Marp 資料更新**（「AI をどのように利用しているか」スライドを実装ベースの内容に書き換え。これが発表のハイライトになる）

**完了条件**
- `POST /api/plan/generate` がモック Claude でテスト green、実キーで手動疎通確認済み
- README / CLAUDE.md の「Claude API」記述が実態と一致する

---

### T13. 未接続機能（いいね・レビュー）の結線

**優先度**: Medium（T08 完了後に実施）

**問題**
`LikeButton.tsx`・`StoreReviewSection.tsx` は完成しているが**どこからも import されておらず**、`src/lib/likes.ts`・`reviews.ts` ごと UI から到達不能。e2e `scenario-2-user-engagement.spec.ts` は「いいね数: 1」等の UI を前提としており、**存在しない UI に対する e2e が置かれている**状態。

**根本原因**
コンポーネント実装と画面組み込みが別タスクに分かれ、組み込み側が実施されないままレビューを通過した（「コンポーネントが存在する」ことと「機能が使える」ことの完了条件が混同された）。

**実装手順**
1. `StoresPage.tsx` の店舗カードに `LikeButton` を組み込む（`user.id` は `useAuth()` から取得）
2. 店舗詳細（モーダルまたは `/stores/:id` ルート。T10 のルータ前提なら後者を推奨）に `StoreReviewSection` を組み込む
3. `LikesListPage` から各店舗への導線を確認
4. e2e `scenario-2` を実 UI に合わせて修正し、通す
5. **Marp 資料更新**（デモ手順スライドに「いいね・レビュー」操作を追加）

**完了条件**
- grep で `LikeButton`・`StoreReviewSection` の import 元が1件以上
- e2e scenario-2 が green

---

### T14. フロントエンドの feature-first 再構成

**優先度**: Medium（T08・T10 完了後に実施。単独で先行しない）

**問題**
1. 現構成は layer-first（components/ pages/ lib/ hooks/）だが、`components/` に 15 個のコンポーネントがフラットに並び、店舗系・ユーザ系・レビュー系・汎用 UI が混在。機能追加のたびに全域を横断する
2. データ取得ロジックがコンポーネント内の useEffect に直書きされ、`loadStores`/`loadUsers`/`load` がほぼ同一構造で3箇所以上に重複。店舗一覧の取得だけで `StoresPage`・`ReservationsListPage`・`StoreManagementPanel` の3実装がある
3. `useToast` フックが `Toast.tsx`（コンポーネントファイル）内に同居
4. React の ErrorBoundary が無い。error_logs テーブルと `POST /api/errors` が存在するのに、フロントのクラッシュは記録されない

**改善方針**
feature-first へ移行し、データ取得をカスタムフックに集約する。

**実装手順**
1. 以下の構造へ移動（git mv を使い履歴を保持）:
   ```
   src/
   ├── features/
   │   ├── auth/        # AuthContext, LoginPage
   │   ├── stores/      # StoresPage, StoreForm, StoreManagementPanel, MapPicker, useStores()
   │   ├── reservations/# ReservationModal, ReservationsListPage, lib/reservations → api.ts 呼び出し
   │   ├── social/      # LikeButton, StarRating, ReviewList, ReviewFormModal, StoreReviewSection, LikesListPage
   │   ├── crowd/       # CrowdAnalyticsDashboard
   │   ├── admin/       # AdminPage, UserForm, UserManagementPanel, ErrorManagementDashboard
   │   └── media/       # StoreMediaPanel
   ├── components/ui/   # Modal, Toast（汎用のみ）
   ├── hooks/           # useToast（Toast.tsx から分離）
   ├── lib/             # api.ts のみ
   └── types/           # T15 で shared へ移行するまでの暫定
   ```
2. 各 feature に `hooks.ts` を作り、`useStores()`・`useUsers()` 等のデータ取得フックを抽出。「setLoading → try api.get → catch notify → finally」の重複パターンを `src/hooks/useApiQuery.ts`（汎用フック）に一本化
3. import 規約: feature 間の直接 import 禁止（共有物は components/ui・hooks・lib 経由）。ESLint の `no-restricted-imports` で `features/*/` 相互参照を禁止するルールを追加
4. `src/components/ErrorBoundary.tsx` を新設し `main.tsx` でアプリ全体をラップ。componentDidCatch で `POST /api/errors` へ送信
5. **注意点**: 移動はタスク粒度を細かく（1 feature = 1 コミット）。一括移動で PR を巨大化させない
6. **Marp 資料更新**（ディレクトリ構成スライドを新構成に差し替え）

**完了条件**
- `src/components/` 直下に残るのは `ui/` と ErrorBoundary のみ
- 一覧取得の重複実装が0（useApiQuery 経由に統一）
- ESLint の feature 境界ルールが有効

---

### T15. 型契約の一元化（shared/types の新設）

**優先度**: Medium

**問題**
1. `User`（AuthContext）と `AdminUser`（UserForm）が同じ users テーブルを別形で二重表現し、`role` の型も `string` vs union 型でズレている
2. `StoreMedia` が `src/lib/storeMedia.ts:3` にインライン定義（バックエンドのレスポンス形と手動同期）
3. フロントとバックエンドで API レスポンスの型を共有する仕組みが無く、変更時に暗黙に壊れる（tsconfig 分離のため型エラーにもならない — T03 と複合）
4. 空 `ReviewStats` の初期値が `reviews.ts:57` と `StoreReviewSection.tsx:18` に重複定義

**実装手順**
1. ルートに `shared/types/` を新設: `user.ts`（User + role union）、`store.ts`、`reservation.ts`（src/types から移動）、`social.ts`（src/types から移動 + `EMPTY_REVIEW_STATS` 定数）、`media.ts`、`crowd.ts`、`error.ts`、`api.ts`（`ApiResult`、T09 のエラー契約型）
2. tsconfig（main と backend 両方）に `paths: { "@shared/*": ["./shared/*"] }` と `baseUrl: "."` を追加。vite.config.ts に `resolve.alias`、jest.config.ts に moduleNameMapper を追加
3. `src/types/` を削除し、全 import を `@shared/types/...` へ。インライン重複型（AdminUser、StoreMedia、CrowdAnalyticsRow、ErrorLog 等）を shared の型へ置換。フィールド差分（`store_id`、`is_active`）は shared の型に統合するか `Pick`/`Omit` で派生させる
4. バックエンド（backend/domains/*）のレスポンス構築箇所にも shared 型を適用（戻り値注釈を付ける）
5. **Marp 資料更新**

**完了条件**
- 同一 DB テーブルを表す型定義が shared に1つずつ（重複 grep で確認）
- front/back 双方が @shared を import している

---

### T16. jest 構成の projects 分割と coverage 閾値の実態化

**優先度**: Medium

**問題**
1. testEnvironment がグローバル jsdom で、node 環境が必要なテスト（supertest 使用の `api-store-media.test.ts`）はファイル先頭 docblock で個別上書きするハックに依存。新規テスト作成者が罠にはまる
2. coverageThreshold（branches 70 / functions 80 / lines 80）に対し、src/ のテストは `auth.test.tsx` 1本のみ。**`npm run test:coverage` は実行すれば確実に fail する死んだスクリプト**

**実装手順**
1. `jest.config.ts` を `projects` 構成に分割:
   - project "frontend": testEnvironment jsdom、testMatch は `tests/unit/**/*.tsx` と将来の `src/**/*.test.tsx`
   - project "backend": testEnvironment node、testMatch は `tests/integration/**/*.ts` と `tests/unit/**/*.ts`（.tsx を除く）
   - 共通設定（transform、moduleNameMapper）は各 project に明示
2. docblock による環境上書きコメントを削除
3. coverageThreshold を現実の測定値ベースに再設定: まず `npm run test:coverage` を実行して実測し、実測値-5% を閾値に設定（「閾値は下げてもよいが、下げた理由と現在値をコミットメッセージに記録」）。CI（T02）には当面 coverage を含めない
4. **Marp 資料更新**

**完了条件**
- 全テストが docblock ハックなしで green
- `npm run test:coverage` が green

---

### T17. DB マイグレーションの番号正規化と適用手順の明文化

**優先度**: Medium

**問題**
`docs/database/` に `002_` プレフィックスの SQL が4本（create_new_features_schema / create_likes_reviews_tables / create_rbac_tables / create_stores_table）。適用順序が番号から判別できず、依存関係（stores が先か、likes_reviews が先か）が暗黙知。新環境の再現手順が存在しない。

**根本原因**
複数メンバー/エージェントが同時期に「次は 002」と各自採番した。採番の調整機構が無い。

**実装手順**
1. 4本の内容を読み、テーブル依存関係（FK）から正しい適用順を確定する
2. ファイル名を依存順に `002a_`〜`002d_` へリネームする（**ファイル内容は変更しない**）。この方式なら名前順ソートで `002a〜002d` → `003_rls_policies`（002 群が作るテーブルに依存）の順序が保たれる
   - ⚠️ 既に適用済みの共有 DB があるため、リネームは「表示順の整理」であり再適用はしない
3. `docs/database/README.md` を新設: 全 SQL の適用順序表、各ファイルの作成テーブル一覧、「新環境構築時はこの順で実行」という手順、「次の番号はこの README で採番してから使う」という採番ルール
4. USER_TABLE_README 等の既存 README からのリンクを整合
5. **Marp 資料更新**

**完了条件**
- ファイル名の番号が一意で、名前順ソート＝適用順になっている
- README に適用順と採番ルールが明文化されている

---

### T18. ローカル cron スクリプトの dotenv 欠落修正と cron 時刻の TZ 検証

**優先度**: Medium

**問題**
1. `scripts/notifyCongestionCron.ts`・`aggregateCrowdAnalyticsCron.ts` は `dotenv/config` を import していない（読むのは `server/index.ts` のみ）。**`npm run cron:dev` は env 未読込で起動し、`supabaseAdmin` の生成時 throw で即死する**はず
2. `vercel.json` の cron `*/30 9-21 * * *` は **Vercel では UTC で解釈される**。「9〜21時」が日本の営業時間を意図しているなら、実際の実行は JST 18:00〜翌6:30 となり**昼夜逆転の実バグ**の疑い
3. serverless 版 cron には `CRON_SECRET` 認証があるが、ローカル scripts 版は同じジョブを認証なしで直接呼ぶ（これは開発用途なので許容だが、ファイル冒頭にその旨明記が無い）

**実装手順**
1. 両スクリプトの先頭に `import 'dotenv/config'` を追加し、`npm run cron:dev` がローカルで起動することを確認
2. cron 時刻の意図を確認（要件は日本の店舗営業時間 → JST 想定と推定）。JST 9:00-21:30 を意図する場合、`vercel.json` を UTC 換算 `*/30 0-12 * * *` へ修正し、`vercel.json` の crons の直前にコメントは書けないため `docs/database/README.md` か CLAUDE.md に「Vercel cron は UTC。JST-9h で記載」と明記。ローカル scripts 側は `node-cron` の `timezone: 'Asia/Tokyo'` オプションを指定して JST のまま維持
3. 両スクリプト冒頭コメントに「ローカル開発専用・CRON_SECRET 検証なし・本番は vercel.json」を明記（既存コメントの拡充）
4. **Marp 資料更新**

**完了条件**
- `npm run cron:dev` がローカルで env を読んで起動する
- 本番 cron の実行時刻が意図（JST 営業時間）と一致する設定になっている

**実施結果の追記（本タスク実施時に判明）**: 問題2は `notify-congestion` のみを指していたが、`aggregate-crowd-analytics`（`0 23 * * *`）も同じ「JST基準で書かれた式をVercelがUTCとして解釈する」根本原因で、意図（JST 23:00）に対し実際はJST 8:00（翌日）相当で稼働していた。一貫性のため両方を修正した（`0 23 * * *` → `0 14 * * *`）。

---

### T19. ドキュメントと実装の乖離修正

**優先度**: Medium（ただし作業コストが低いので早期実施推奨）

**問題**
AI エージェントが CLAUDE.md を「真実」として読むため、乖離は誤った実装判断を連鎖的に生む。現状の乖離:
1. CLAUDE.md の Source Tree: pages 2つ・components 0個と記載（実際: pages 7・components 15）。「No test framework configured yet」（実際: jest + playwright 導入済み・テスト18本）
2. CLAUDE.md のデータベース節: users テーブルのみ記載（実際: stores/likes/reviews/reservations/crowd_*/email_*/error_logs 等 10 以上）
3. README: 「バックエンド = Claude API」（実際: 未統合。T12 完了までは「統合予定」と書くべき）
4. tests/README.md: 「push/PR ごとに CI でテスト実行」（実際: CI 不在。T02 完了後に正しくなる）
5. `docs/ai-hackathon-team-ops/github-workflows/sync-notion.yml` と `.github/workflows/sync-notion.yml` の**二重管理**（drift の温床）
6. `.env.example`: `VITE_API_URL` がコメントアウトのまま用途説明なし。`ANTHROPIC_API_KEY` 欠落（T12 で追加）

**実装手順**
1. CLAUDE.md の Source Tree・テスト節・DB 節を現状に合わせて全面改訂（本手順書の調査結果を転記してよい）
2. README の技術スタック記述を実態に修正
3. tests/README.md の CI 節を修正（T02 と同時なら整合する内容に）
4. `docs/ai-hackathon-team-ops/github-workflows/sync-notion.yml` は「コピー」であることを冒頭コメントで明示するか削除し、`.github/workflows/` を正とする旨を README に記載
5. `.env.example` の各キーに1行コメント（誰が・どの層で使うか）を付与
6. **Marp 資料更新**

**完了条件**
- CLAUDE.md の記載内容が grep/ls の事実と一致する
- ワークフロー定義の正が1箇所

---

### T20. 開発体験の細部改善（Vite proxy・env 型・lang 属性）

**優先度**: Low

**問題**
1. Vite に proxy が無く、フロントは `VITE_API_URL || 'http://localhost:3000'` で API へ**クロスオリジン**アクセス。このため CORS 全開（T11）が「必要」になっていた。proxy を使えば dev は同一オリジンになり、相対パス fetch（ErrorManagementDashboard が誤ってやっていた形）がむしろ正になる
2. `vite-env.d.ts` に `ImportMetaEnv` の型定義が無く、`import.meta.env.VITE_XXX` が型チェックされない（typo が実行時まで発覚しない）
3. `index.html` が `lang="en"`（日本語アプリ）。favicon が Vite デフォルト

**実装手順**
1. `vite.config.ts` に `server.proxy: { '/api': 'http://localhost:3000' }` を追加。`src/lib/api.ts` の `API_BASE_URL` 既定値を `''`（相対パス）へ変更し、本番同一オリジン（Vercel）でも dev（proxy）でも相対で動く構成に。`VITE_API_URL` は「別オリジンにデプロイする場合のみ設定」とコメント
2. `src/vite-env.d.ts` に `interface ImportMetaEnv { readonly VITE_SUPABASE_URL: string; ... }` を追加（T08 完了後は VITE_SUPABASE_* が消えるため、その時点の実キーで定義）
3. `index.html` を `lang="ja"` へ。`<title>` とファビコンをプロジェクト名に合わせて差し替え（発表デモの見栄え）
4. **Marp 資料更新**

**完了条件**
- `VITE_API_URL` 未設定の dev 環境で全 API 機能が動く
- 未定義の env キー参照が型エラーになる

---

### T21. 認証トークン化への準備（インターフェース分離）

**優先度**: Low（20時間ハッカソンのスコープでは本実装しない判断。ただし準備だけ行う）

**問題**
認証が「localStorage の user.id を `x-user-id` ヘッダで送る」方式で、**ID を知っていれば誰でもなりすませる**。コード内コメント（`api/_lib/requireAdmin.ts:4-7` 等）で既知と明記されているが、「後で Supabase Auth + JWT へ移行」の移行コストを下げる構造的準備が無い — 現状、ヘッダ名 `x-user-id` の知識が front（api.ts）と back（全認可箇所）に分散している。

**改善方針**
本実装（JWT 化）はハッカソン後とし、今は「認証情報の出し入れ」を front/back 各1箇所に閉じ込め、将来ヘッダを Authorization: Bearer に差し替えるとき2ファイルの変更で済む状態にする。

**実装手順**
1. front: `x-user-id` の生成が `src/lib/api.ts` の `authHeaders()` に一本化されていることを確認（T08 完了で ErrorManagementDashboard の手書きが消え、一本化が完成する）
2. back: T04 の `backend/auth/authz.ts` に `getRequesterId(req): string | undefined` を追加し、各ハンドラの `req.headers['x-user-id']` 直接参照をすべてこの関数経由へ置換
3. `backend/auth/README.md`（10行程度）に「現方式の脆弱性・JWT 移行時に変更する2ファイル・移行手順の概略」を記録
4. **Marp 資料更新**（「今後の展望」スライドに認証強化を記載）

**完了条件**
- `x-user-id` という文字列リテラルの出現箇所が front 1・back 1 の計2箇所（+テスト）のみ

---

### T22. ブランチ保護の設定【人間の作業・GitHub 設定】

**優先度**: High（コード変更なし・5分で完了）

**問題**
CLAUDE.md は「main への直 push 禁止・PR 必須」を規約として掲げるが、**GitHub 側の branch protection が未設定で、実際に main へ直 push できてしまう**（本監査期間中にも直 push が発生した実績がある）。規約が運用でしか担保されていない。

**実装手順**（Kyosuke が GitHub UI で実施）
1. Settings → Branches → Add branch protection rule: pattern `main`
2. 「Require a pull request before merging」を有効化
3. T02 完了後、「Require status checks to pass」で CI を必須化
4. **Marp 資料更新**（チーム運営の工夫として発表可）

**完了条件**
- main への直 push が GitHub 側で拒否される

---

### T23. `auth.users` 外部キー参照の系統的な誤りを修正【DB整合性・T04実施時に発見】

**優先度**: High（データ書き込みが FK 制約違反で失敗する実害があるため）

**問題**
`002_create_new_features_schema.sql` で作成された複数テーブルの外部キーが `auth.users(id)`（Supabase Auth のユーザテーブル）を参照しているが、本アプリは Supabase Auth を使わず独自の `users` テーブル（`001_create_users_table.sql`）で認証している。実際の `users.id` を保存しようとすると FK 制約違反になり、機能そのものが動かない。

`reservations.user_id` は `008_fix_reservations_and_add_settings.sql` で既に `users(id)` へ修正済み（コメントに理由が明記されている）だが、**同じ誤りが他の8箇所に残っている**:

| テーブル.カラム | 用途 |
|---|---|
| `user_roles.user_id` | RBAC ロール割当 |
| `stores.created_by` | 店舗作成者 |
| `store_managers.manager_id` | 店舗管理者（**T04 で修正済み**: `010_fix_store_managers_fk.sql`） |
| `crowd_status.updated_by` | 混雑度報告者 |
| `crowd_history.recorded_by` | 混雑履歴記録者 |
| `email_notifications.manager_id` | 通知先店舗管理者 |
| `store_media.created_by` | 店舗写真アップロード者 |
| `error_logs.user_id` / `resolved_by` | エラー報告者・解決者 |

**根本原因**
DBスキーマ作成時に Supabase の雛形（Supabase Auth 利用を前提とした FK）をそのまま流用し、後から「Supabase Auth を使わない」という設計変更をした際に、既存テーブルへの反映が `reservations` の1箇所しか行われなかった。

**実装手順**
1. `docs/database/012_fix_remaining_auth_users_fk.sql` を新規作成
2. 上記表の残り7カラム（`store_managers.manager_id` を除く）それぞれに対し、`008`/`010` と同じパターンで実施:
   ```sql
   ALTER TABLE <table> DROP CONSTRAINT IF EXISTS <table>_<column>_fkey;
   ALTER TABLE <table> ADD CONSTRAINT <table>_<column>_fkey
     FOREIGN KEY (<column>) REFERENCES users(id) ON DELETE CASCADE;
   ```
   - `error_logs.resolved_by` 等 NULL 許容カラムは `ON DELETE CASCADE` ではなく `ON DELETE SET NULL` を検討
3. 制約名は Postgres のデフォルト命名規則（`<table>_<column>_fkey`）を前提にしているため、実際の Supabase 環境で `\d <table>` 等で制約名を確認してから実行すること
4. ⚠️ **`error_logs` テーブルは `002_create_new_features_schema.sql`（`error_message`/`resolved_by`列、`auth.users`参照）と `004_create_error_logs_table.sql`（`message`列、`resolved_by`列なし、`users`参照済み、`CREATE TABLE IF NOT EXISTS`）に矛盾する2つの定義が存在する（T17が扱うマイグレーション番号衝突問題の一種）。実行前に実際のSupabase環境で `\d error_logs` を確認し、`resolved_by` 列が実在する場合のみ本タスクでFK修正を行うこと。存在しない場合はT17側でスキーマ定義の重複解消を先に行う
5. **Marp 資料更新**

**完了条件**
- `grep -rn "auth.users" docs/database/*.sql` で新規マイグレーション適用後に残るのは、既に修正済みの箇所を除去した履歴コメントのみ
- 実際の Supabase 環境で各テーブルへの insert が FK 制約違反なく成功する

---

## 第2パス: 「この監査でも見落としている改善点」の再検証

上記22タスクをまとめた自分自身の監査にもバイアスがある前提で、ゼロベースで再走査した結果、以下を追加で特定した。

### P2-1. RLS ポリシーと service-role の信頼境界の再監査（High・調査タスク）
現状 likes/reviews はフロントが **anon key + RLS** で直接書き込んでおり、`docs/database/003_rls_policies.sql` が唯一の防壁。T08 で REST 化すると全書き込みが **service-role（RLS バイパス）** になり、防御の前提が「RLS」から「アプリ層の認可（T04）」へ移る。**RLS ポリシーがこの移行後も正しい前提で書かれているか、anon key で直接叩かれた場合に何が書けてしまうかを再監査するタスクが必要**。T08 完了後、anon key 経路を塞ぐ（RLS を deny-all に近づける）のが正着。

### P2-2. 予約作成の競合状態の検証（Medium・調査タスク）
`api/reservations/index.ts` は「空き容量チェック → insert」の2段階。**同時リクエストで容量超過を許す非原子性**の疑いがある。DB 側制約（トリガ or 一意制約 or `for update`）での担保有無を `008_fix_reservations_and_add_settings.sql` と突き合わせて検証し、無ければ DB 制約を追加する。

### P2-3. ログイン試行のレートリミット不在（Low）
`POST /api/auth/login` に試行回数制限が無くブルートフォース可能。`express-rate-limit` を login ルートに導入（ハッカソンスコープでは Low、本番前に必須）。

### P2-4. e2e テストの前提と実装の乖離（Medium）
`tests/e2e/scenario-1-store-admin.spec.ts:29` は `/test/email-notifications` という**実在しないルート**を、`scenario-2-user-engagement.spec.ts` は未結線の UI（「いいね数: 1」等）を前提にしている。e2e が「動く仕様書」ではなく「願望」になっている。T10/T13 完了時に全 e2e を実 UI と突き合わせて修正するタスクを独立で立てること。

### P2-5. 監視・構造化ログの不在（Low）
バックエンドのログは散発的な `console.log` のみ。せっかく `error_logs` テーブルと管理画面があるので、バックエンドの 500 系エラーも `error_logs` へ記録する（T11 のグローバルエラーハンドラに1行追加で実現可能）。

### P2-6. Dashboard.tsx の god component 化（Medium — T10/T14 で大半解消）
190行の Dashboard が「レイアウト・ナビゲーション・6画面の切替・統計表示」を兼務。T10（ルータ）と T14（feature 分割)で解消される見込みだが、完了後に「1コンポーネント150行以下」目安での再点検を行う。

### P2-7. AuthContext の permissions とユーザ状態の不整合（Low）
権限は login 時に取得したきりで、role_permissions テーブル変更後もログアウトまで古い権限で動く。ハッカソンでは許容、README に既知事項として記録。

---

## 第3パス: 「本当にこれ以上ないか」の最終検証

### P3-1. Notion 同期ワークフローの記録粒度（Low）
sync-notion.yml は PR タイトルと担当者しか送らない。発表資料の実装ログとして使うなら PR 本文（変更概要）も送ると資産価値が上がる。

### P3-2. `package.json` の name "ai-hackason"（保留）
"hackathon" の typo と思われるが、リポジトリ名と一致しているため**変更しない**（変更コスト > 益）。判断として記録のみ。

### P3-3. fakeSupabase の実装忠実度（Low・リスク認識のみ）
`tests/testUtils/fakeSupabase.ts` は upsert のキーを `store_id`/`id` に固定するなど実 Supabase と挙動差がある。integration テストが「fake に対して green」でも実 DB で壊れる余地は残る。重要フロー（予約・認可）は Preview 環境での手動確認を PR チェックリストに含めて補完する。

### P3-4. 発表デモの再現性担保（Medium・発表準備タスク）
要件定義 v2 は「デモの再現性を完全にコントロールできる」ことを架空エリア採用の根拠にしている。これを担保するため、**デモ用シードデータ投入スクリプト**（`scripts/seedDemoData.ts`: ことこと町の8店舗・テストユーザ・混雑パターンを一括投入）を用意するタスクを発表前週に実施すること。**発表資料のデモ手順（店舗一覧に8店舗表示）は本タスクの完了が前提**である。

### 検証終了の判断
第3パスで新規に発見される問題の重要度が Low 中心になり、既出タスクの派生・運用系に収束したため、監査の収穫逓減点に達したと判断し、ここで打ち切る。**合計: 主要タスク22件 + 追加検証項目11件**。

---

## 実施順序の推奨

```
週1（品質ゲート確立）: T01 → T03 → T02 → T22 → T05 → T19
週2（境界の修復）:     T04 → T06 → T07 → T09 → T11 → T18
週3（機能と構造）:     T08 → T10 → T12 → T13 → P2-1 → P2-2
発表前（仕上げ）:      T14 → T15 → T16 → T17 → T20 → T21 → P3-4 → P2-4
```

- T01〜T03 が最優先である理由: **品質ゲート（lint・型・CI）が無い状態で他のリファクタリングを行うと、変更の安全性を検証する手段が無い**。ゲートを先に立てる。
- 各タスクは独立実行可能だが、括弧内の依存（T13→T08 後、T14→T10 後等）にのみ従うこと。

---

**最終更新**: 2026-07-13
**監査実施**: アーキテクチャ監査エージェント（調査サブエージェント3系統の事実報告に基づく）
