---
name: subagent-evaluator
description: Evaluate and test Claude Code subagents across design quality, triggering accuracy, task completion, and output format. Measure description effectiveness, system prompt clarity, and tool usage patterns. Use when you want to assess whether an agent works as designed, improve its description for better triggering, or verify quality before deploying a custom agent.
---

# Subagent Evaluator

このスキルを使用して、既存のサブエージェント（~/.claude/agents/ または .claude/agents/ に置かれた .md ファイル）の
品質・動作・設計を評価できます。

## 何ができるのか

- **Description 適切性の評価**: エージェントの説明文が実際のユースケースを適切にカバーしているか検証
- **実行品質の測定**: 複数のテストプロンプトを実行し、期待通りの結果を得るか確認
- **ツール利用パターンの分析**: 必要なツールを適切に選んでいるか、無駄なツール呼び出しがないか確認
- **システムプロンプト品質の評価**: 指示の明確性、出力形式への準拠、エラー耐性
- **改善提案の生成**: description 改善案、システムプロンプト修正案、ツール制限の最適化

## いつこのスキルを使うか

- **新しいエージェント作成直後**: 設計通りに動作するか、description は十分か
- **エージェントの重大変更後**: システムプロンプト修正が期待通りの結果をもたらしたか
- **テスト不足の既存エージェント**: 既存エージェントの品質を向上させたい
- **Description 改善**: エージェントが呼ばれる頻度が低い場合、トリガー条件を最適化

## 実行フロー

### ステップ 1: 評価対象の選択

1. **利用可能なエージェント一覧を表示**
   ```bash
   ls ~/.claude/agents/
   ls .claude/agents/
   ```

2. **AskUserQuestion で評価対象を選択**
   - header: "評価するエージェント"
   - 一覧から 1 件選んでもらう
   - 同時に「このエージェントの主目的は何か」をユーザーに確認

### ステップ 2: エージェント内容の読み取りと分析

1. **frontmatter を解析**
   - name, description, model, tools などのメタデータを抽出

2. **system prompt（本体）を読む**
   - ペルソナ、ミッション、実行ルール、出力形式を確認
   - 500 行以内か、構造は明確か

3. **ユースケース候補を抽出**
   - description から「呼び出されるべき状況」を 3-5 件導出

### ステップ 3: テストプロンプトの設計

1. **テストセット構成**
   
   以下の組み合わせで **5-8 件** のテストプロンプトを作成：
   
   - **should-trigger テスト** (3-4 件)
     - エージェント説明文で「このような場合に呼ぶ」と言及されている状況を再現
     - 異なるフレーミング（フォーマル / カジュアル / 専門用語混在）で複数バリエーション
     - 例：code-reviewer なら「この PR コードをレビュー」「このコードの問題点を指摘」など
   
   - **should-not-trigger テスト** (2-3 件)
     - エージェント説明で「呼ばない」と明記されている状況
     - あるいはエージェント範囲外だが紛らわしいケース（近傍タスク）
     - 例：code-reviewer の場合「このコードを実装してください」（実装は求めていない）
   
   - **境界ケース** (1-2 件)
     - 不完全な入力、曖昧な指示、複数解釈可能な状況
     - エージェントが graceful に対応できるか確認

2. **テスト内容をユーザーに確認**
   ```
   以下のテストプロンプトで評価します：
   1. [should-trigger case 1]
   2. [should-trigger case 2]
   ...
   
   修正やケース追加があれば教えてください。
   ```

### ステップ 4: テスト実行

1. **並列実行（Agent ツールで複数呼び出し）**
   - 各テストプロンプトを指定エージェントで実行
   - ベースライン（エージェント指定なし）も同時に実行

   ```
   For each test case:
   - Run with target agent: Agent(prompt=test, subagent_type=<agent-name>)
   - Run baseline (no agent): Agent(prompt=test) [or local execution]
   ```

2. **結果をワークスペースに保存**
   ```
   .claude/eval-workspace/subagent-<name>/
   ├── iteration-1/
   │   ├── test-001-should-trigger-1/
   │   │   ├── with-agent/output.txt
   │   │   └── baseline/output.txt
   │   ├── test-002-should-trigger-2/
   │   │   ├── with-agent/output.txt
   │   │   └── baseline/output.txt
   │   ...
   │   └── eval-summary.json
   ```

### ステップ 5: 評価・採点

テスト結果に対して以下 5 つの観点でスコアリング（各 1-5 点）：

#### 5.1 Description 適切性 (1-5 点)
- **5点**: description に記載されたすべてのユースケースで正しくトリガー・実行される
- **4点**: 大部分のユースケースで適切だが、細部で曖昧さ残存
- **3点**: 概ね適切だが改善案が複数ある
- **2点**: description と実際の挙動に乖離
- **1点**: description が実行内容と大きく異なる

#### 5.2 タスク完遂率 (1-5 点)
- **5点**: すべてのテストで期待通りの結果
- **4点**: 90% 以上のテストで成功
- **3点**: 70-89% のテストで成功（いくつかエッジケース失敗）
- **2点**: 50-69% （主要ケースでも不安定）
- **1点**: 50% 未満 （実行不可またはほぼ失敗）

#### 5.3 出力品質 (1-5 点)
- **5点**: 指定された出力形式を完全に守り、内容も正確
- **4点**: 形式・内容ともに良好だが軽微な逸脱
- **3点**: 基本的な形式は守るが、完全性に欠ける
- **2点**: 形式不備、または内容の信頼性が低い
- **1点**: 出力が期待と大きく異なる、または形式無視

#### 5.4 ツール利用パターン (1-5 点)
- **5点**: 必要なツールのみ効率的に利用
- **4点**: 適切なツール利用だが若干の冗長性
- **3点**: 必要なツールは使用しているが非効率な方法もある
- **2点**: 不要なツール呼び出しがある、または遠回りなツール利用
- **1点**: ツール利用が不適切、多数の無駄な呼び出し

#### 5.5 エラー耐性 (1-5 点)
- **5点**: 不完全・曖昧な入力に対し、graceful に対応（質問確認・合理的な仮定）
- **4点**: 多くのエラーケースに対応、稀にハング・失敗
- **3点**: 基本的なエラー対応はあるが、複雑なケースには脆弱
- **2点**: エラー対応が限定的（入力エラーで頻繁に失敗）
- **1点**: エラー対応ほぼなし

### ステップ 6: レポート生成

以下の形式でレポートを作成・表示：

```
【エージェント評価レポート】

エージェント名: <name>
評価日時: <timestamp>
モデル: <model>

【メタデータ評価】
- Name: <name> — 命名規則に準拠しているか
- Description: <現在の説明文>
  改善提案: <具体的改善案>

【テスト結果サマリー】
実施: <N> テストケース（should-trigger: <n1>, should-not-trigger: <n2>）
成功率: <XX%>

【採点結果】
┌─────────────────────┬────┐
│ 観点                 │ 点 │
├─────────────────────┼────┤
│ Description 適切性   │ 5  │
│ タスク完遂率        │ 4  │
│ 出力品質            │ 5  │
│ ツール利用パターン  │ 4  │
│ エラー耐性         │ 3  │
├─────────────────────┼────┤
│ 平均スコア          │ 4.2│
│ 総合評価            │ 良好│
└─────────────────────┴────┘

【詳細分析】

### 強み
- [テスト結果から見える強み 1]
- [テスト結果から見える強み 2]

### 改善機会
1. **Description の改善**
   現在: <現在の説明文>
   提案: <改善文案>
   理由: should-trigger テスト <#> で曖昧さが見られた

2. **システムプロンプト修正**
   - [修正提案 1]：[根拠]
   - [修正提案 2]：[根拠]

3. **ツール制限の最適化**
   現在: <許可ツール> または <指定なし>
   提案: <最適化ツール一覧>
   根拠: テスト実行時に <X> は使用されず、<Y> で十分

【テスト詳細】

#### Test 001: [テスト名]
Status: ✓ PASS / ✗ FAIL / ⚠ PARTIAL
With-Agent Output: [概要]
Baseline Output: [概要]
分析: [テスト結果から何が学べたか]

[以下同様に各テスト]

---

【推奨アクション】
1. [優先度 1] <改善内容>
2. [優先度 2] <改善内容>
3. [優先度 3] <改善内容>
```

### ステップ 7: 改善提案の詳細化

スコアが 3 点以下の観点については、具体的な改善案を提示：

**例 1: Description 改善**
```
【現在の Description】
Use this agent when you need code review assistance.

【改善案】
Use this agent when you need to review code for correctness bugs, 
design patterns, and potential regressions. Invoke for pull request 
reviews, refactoring audits, and code quality assessments. 
Skip for: architecture design discussions (use architect-agent), 
performance optimization (use performance-optimizer), 
and documentation writing.
```

**例 2: システムプロンプト改善**
```
【改善個所】
現在: "Review the code for issues."

【提案】
Review the code from three angles:
1. Correctness - Will this code work correctly? Are there edge cases?
2. Clarity - Can a developer unfamiliar with this code understand it?
3. Performance - Are there obvious inefficiencies?

Focus on high-confidence findings; if you're unsure, flag it as "worth considering".
```

## 既存スキル（skill-evaluator.md）との違い

| 項目 | skill-evaluator.md | subagent-evaluator.md |
|------|------------------|---------------------|
| 対象 | スキル全般 | エージェント（.md in agents/） |
| 評価軸 | パフォーマンス（時間・エラー率・成功率） | 設計品質（description・システムプロンプト） |
| テスト方法 | 実行時間・リソース計測 | 機能テスト・ユースケース検証 |
| フォーカス | メトリクス（ベンチマーク） | 品質（設計・ユーザビリティ） |

## ベストプラクティス

### テストプロンプト設計

**良い例**:
```
"このプルリクエストのコードを見てください。キャッシュ戦略が正しいか確認してください。
ファイル: src/cache.js
変更内容: TTL を 5 分から 10 分に変更し、メモリ上限を削除した。
このアプローチに問題がないか指摘してください。"
```

**悪い例**:
```
"コード見て"  ← 短すぎて、エージェントの能力を測定できない
```

### 採点時の注意点

- **should-trigger テストが 1 つ失敗してもタスク完遂率が高い場合**: description が実装より広い可能性 → description 絞込み提案
- **should-not-trigger テストで false positive**: description が曖昧で、呼ばれるべきでない状況で呼ばれている → description 明確化提案
- **境界ケースで失敗多数**: エラーハンドリング強化を提案

## チェックリスト

実装前に確認：

- [ ] 評価対象エージェントの frontmatter、本体をすべて読んだ
- [ ] should-trigger と should-not-trigger のテストを含めている
- [ ] テスト内容をユーザーに確認済み
- [ ] ベースライン（エージェントなし実行）も用意
- [ ] 5 つの採点観点がすべて明確に定義されている
- [ ] 改善提案が実装可能で具体的

## トラブルシューティング

**Q: ベースラインの実行方法がわからない**  
A: ベースラインは「同じプロンプトを Agent ツール指定なしで実行」または「Claude の基本回答能力での結果」。エージェント使用との差分が見える。

**Q: description 改善案をどう作るか**  
A: should-not-trigger で失敗したケースを見る。そのケースを除外する表現を description に追加。逆に should-trigger で失敗したケースは「対象に含まれるべき」という説明を追加。

**Q: スコア計算がぶれる**  
A: 5 つの観点ごとに「何が 5 点か、1 点か」を明確に定義してからスコア付けする。定義後は一貫性を保つ。
