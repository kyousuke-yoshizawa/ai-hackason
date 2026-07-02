# Frontend Subagent - フロント実装ガイド（AI向け）

対象: フロント担当者、またはフロント実装を依頼されたAIエージェント

---

## 1. 技術スタック

- React 18 + TypeScript
- Tailwind CSS
- Vite（ビルドツール）

## 2. ディレクトリ構成（推奨）

```
src/
├─ components/       # 再利用可能なUIコンポーネント
├─ pages/            # ページ単位のコンポーネント
├─ hooks/            # カスタムフック
├─ lib/
│  └─ supabase.ts    # Supabaseクライアント初期化
├─ types/            # 共通の型定義
└─ App.tsx
```

## 3. Supabaseクライアントの初期化例

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

> `service_role` キーは絶対にフロントに含めない（`ai-harness-core.md` 参照）。

## 4. API連携の基本パターン

```typescript
// バックエンド(Express)への呼び出し例
const res = await fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: userInput }),
})
const data = await res.json()
```

## 5. コンポーネント実装の指針

- Tailwindのユーティリティクラスを直接使い、独自CSSファイルは最小限にする
- 状態管理はまず `useState` / `useContext` で十分（Redux等は導入しない、時間コスト対効果が悪い）
- ローディング・エラー状態は必ずUIに表示する（ハッカソンのデモで固まって見えるのを防ぐ）

```tsx
{loading && <p>読み込み中...</p>}
{error && <p className="text-red-500">エラー: {error}</p>}
```

## 6. デモ映えのための最低限のUI品質

- レスポンシブ対応（`sm:` `md:` プレフィックスを使う）
- ボタンにホバー・フォーカス状態を付ける（`hover:` `focus:`）
- ローディングスピナー等、待機中であることが分かる表現を入れる

## 7. 動作確認

実装後は必ず以下を確認:

```bash
npm run dev       # ローカルで確認
npm run build     # ビルドが通ることを確認（Vercelデプロイ前に必須）
```

## 8. PR作成前のセルフチェック

- [ ] `npm run build` がエラーなく通る
- [ ] コンソールにエラー・警告が出ていない
- [ ] Supabaseキー等がハードコードされていない
- [ ] レスポンシブで崩れていない（スマホ幅で確認）
