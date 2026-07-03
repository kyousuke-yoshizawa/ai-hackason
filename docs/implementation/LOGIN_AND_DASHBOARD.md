# ログイン機能とダッシュボード実装ガイド

## 概要

ユーザ認証とダッシュボード画面を実装しました。Supabase のユーザマスタテーブルと連携し、ログイン・ログアウト機能を提供します。

## 実装コンポーネント

### 1. 認証コンテキスト（`src/context/AuthContext.tsx`）

ユーザ認証状態を管理します。

**機能**：
- ユーザログイン
- ユーザログアウト
- 認証状態の管理
- ローカルストレージへの保存

**使用例**：
```typescript
const { user, login, logout, isAuthenticated } = useAuth()
```

### 2. ログイン画面（`src/pages/LoginPage.tsx`）

メールアドレスとパスワードでログインします。

**機能**：
- メールアドレス・パスワード入力
- ログイン処理
- エラーメッセージ表示
- テストアカウント情報表示

**テストアカウント**：
```
yoshizawa@ai-hackason.example （admin権限）
satoh@ai-hackason.example       （user権限）
itagaki@ai-hackason.example     （user権限）
takayanagi@ai-hackason.example  （user権限）
```

### 3. ダッシュボード（`src/pages/Dashboard.tsx`）

ログイン後のメインページです。

**機能**：
- ユーザ情報表示
- プロジェクト統計表示
- 最近のアクティビティ表示
- ログアウトボタン

### 4. Supabase クライアント（`src/lib/supabase.ts`）

Supabase への接続を管理します。

### 5. 環境変数設定

`.env` ファイルで Supabase 認証情報を設定します。

## セットアップ手順

### 1. 環境変数を設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して以下を設定：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. Supabase でテーブル作成

前述の `USER_TABLE_README.md` を参照して、`users` テーブルを作成してください。

### 4. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてテストします。

## ログインフロー

```
1. ログイン画面を表示
2. メールアドレス・パスワードを入力
3. Supabase の users テーブルをクエリ
4. ユーザ情報をローカルストレージに保存
5. ダッシュボードにリダイレクト
```

## ログアウトフロー

```
1. ログアウトボタンをクリック
2. ローカルストレージからユーザ情報を削除
3. ログイン画面にリダイレクト
```

## ファイル構成

```
src/
├── pages/
│   ├── LoginPage.tsx        ← ログイン画面
│   └── Dashboard.tsx        ← ダッシュボード画面
├── context/
│   └── AuthContext.tsx      ← 認証状態管理
├── lib/
│   └── supabase.ts          ← Supabase クライアント
├── hooks/
│   └── useNavigate.ts       ← ナビゲーションフック
├── App.tsx                  ← メインアプリ
└── main.tsx                 ← エントリーポイント
```

## 今後の改善予定

### セキュリティ向上
- [ ] バックエンド側でパスワード検証を実装
- [ ] JWT トークンによるセッション管理
- [ ] リフレッシュトークン機能
- [ ] 2要素認証（2FA）対応

### 機能追加
- [ ] パスワード変更機能
- [ ] パスワードリセット機能
- [ ] ユーザプロフィール編集
- [ ] アカウント削除機能

### UI/UX 改善
- [ ] ローディングスピナーのアニメーション
- [ ] トーストメッセージ通知
- [ ] ダークモード対応
- [ ] レスポンシブデザイン調整

## トラブルシューティング

### "Supabase URL and Key are required" エラー

→ `.env` ファイルで環境変数が正しく設定されているか確認してください。

### "メールアドレスが見つかりません" エラー

→ Supabase でユーザマスタテーブルが作成されているか、テストデータが挿入されているか確認してください。

### ログインしてもダッシュボードに遷移しない

→ ブラウザのコンソールでエラーメッセージを確認してください。

---

**作成日**：2026年7月3日
**作成者**：吉沢
