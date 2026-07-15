# マスタ画面 検索ボタン・クリアボタン化 設計書

**日付**: 2026-07-15
**対象画面**: 店舗マスタ（`StoreManagementPanel`）、ユーザーマスタ（`UserManagementPanel`）、店舗一覧（`StoresPage`）

## 背景・目的

先行機能（マスタ画面の検索・絞り込み・ソート、2026-07-15 実装）では、テキスト検索・プルダウン絞り込みはすべてリアルタイムに反映される方式にしていた。今回、テキスト検索・プルダウン絞り込みについて「検索」ボタンを押すまで一覧に反映しない方式に変更し、あわせて検索条件と一覧表示をリセットする「クリア」ボタンを追加する。

## 方針

各画面の入力状態を「入力用の一時状態（draft）」と「絞り込みに実際に使う適用済み状態（applied）」の2層に分離する。

- テキスト入力・プルダウン（カテゴリ／ロール／有効無効）は常に draft state にバインドする（見た目上は入力のたびに即座に変わる）
- 一覧の絞り込み（`useMemo`）は applied state を参照する
- 「検索」ボタン押下時、draft の内容を applied にコピーして一覧に反映する
- 「クリア」ボタン押下時、draft・applied 双方をそれぞれの初期値（テキスト検索は空文字、プルダウンは「すべて」）に戻し、一覧を全件表示に戻す
- ソート（テーブルヘッダークリック、店舗一覧のプルダウン）は対象外とし、これまで通りリアルタイムに反映する
- テキスト検索欄での Enter キー押下による検索実行はスコープ外とする（「検索」ボタンのクリックのみで検索を実行する）

3画面とも同一パターンで適用する。共有コンポーネント化はせず、既存のコード構成（各画面がそれぞれ `useState`/`useMemo` を持つ）を踏襲する。

## 画面ごとの仕様

### 店舗マスタ（`src/components/StoreManagementPanel.tsx`）

- draft state: `draftSearchText`（テキスト入力にバインド）、`draftCategoryFilter`（カテゴリ選択にバインド）
- applied state: `appliedSearchText`、`appliedCategoryFilter`（`visibleStores` の `useMemo` が参照）
- 「検索」ボタン: `appliedSearchText = draftSearchText`、`appliedCategoryFilter = draftCategoryFilter` を設定
- 「クリア」ボタン: draft・applied 双方を `''` / `'all'` にリセット
- ソート（`sortKey`/`sortDir`、ヘッダークリック）は変更なし

### ユーザーマスタ（`src/components/UserManagementPanel.tsx`）

- draft state: `draftSearchText`、`draftRoleFilter`、`draftActiveFilter`
- applied state: `appliedSearchText`、`appliedRoleFilter`、`appliedActiveFilter`（`visibleUsers` の `useMemo` が参照）
- 「検索」「クリア」ボタンの挙動は店舗マスタと同様
- `limit=100` の全件取得ロジック、ソートは変更なし

### 店舗一覧（`src/pages/StoresPage.tsx`）

- draft state: `draftSearchText`、`draftCategoryFilter`
- applied state: `appliedSearchText`、`appliedCategoryFilter`（`visibleStores` の `useMemo` が参照）
- 「検索」「クリア」ボタンの挙動は店舗マスタと同様
- ソート（プルダウン、`sortKey`）は変更なし

## UI

各画面の検索条件エリアに「検索」「クリア」の2ボタンを追加する。

- 「検索」: `ac-btn-secondary`
- 「クリア」: `ac-btn-ghost`
- 「新規登録」ボタン（`ac-btn-primary`）とは別の見た目にし、誤操作・混同を避ける

## 空状態メッセージ

既存の出し分け（元データ自体が0件／検索・絞り込み結果が0件）は、applied state を基準に判定する点は変更しない。「クリア」ボタン押下後は applied state が初期値に戻るため、自動的に全件表示（0件でなければ通常表示、元データが0件なら「〜がありません」）に戻る。

## スコープ外

- テキスト検索欄での Enter キーによる検索実行
- 「検索」ボタンの活性・非活性制御（draft と applied が一致する場合でも常に押下可能とする）
- ソートのボタン化（引き続きリアルタイム反映）

## テスト方針

- 既存テスト（`tests/unit/storeManagementPanel.test.tsx`、`tests/unit/userManagementPanel.test.tsx`、`tests/unit/storesPage.test.tsx`）のうち、入力変更後すぐに絞り込み結果を検証しているテストは、`fireEvent.change` の後に「検索」ボタンのクリックを挟むよう更新する
- 各画面に「クリア」ボタン押下で検索条件・一覧表示が初期状態に戻ることを検証するテストを追加する
- 「検索」ボタンを押すまでは一覧が変化しないこと（draft 変更だけでは絞り込まれないこと）を検証するテストを各画面に追加する
