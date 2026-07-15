---
name: subagent-creator
description: Create custom Claude Code subagents by designing name, description, system prompt, and metadata. Use when you want to design a new subagent from scratch, define trigger conditions (description), or package an existing agent workflow into a reusable .md file. Guides through persona design, capability definition, tool constraints, and file generation.
---

# Subagent Creator

このスキルを使用して、Claude Code のカスタムサブエージェントを対話的に設計・作成できます。

## 何ができるのか

- **新しいサブエージェントの設計**: ペルソナ、ミッション、能力を定義
- **メタデータの構成**: name、description、model、color、tools などを決定
- **システムプロンプトの作成**: 既存エージェント（source-commenter、performance-optimizer）のスタイルに準拠
- **ファイル生成**: `~/.claude/agents/` または `.claude/agents/` に `.md` ファイルを出力
- **既存ワークフローの再パッケージ化**: 効果的だった Agent 呼び出しを再利用可能なエージェントに変換

## いつこのスキルを使うか

- Claude Code エージェント（Agent ツール）を複数回呼び出しているなら、それをサブエージェント化できるか検討
- 共通タスク（コードレビュー、翻訳、データ変換など）が何度も出てくるなら、カスタムエージェント化して時間短縮
- 複雑なシステムプロンプトを整理し、再利用可能な形にしたい場合

## 実行フロー

### ステップ 1: 目的と範囲の確認

1. **エージェントのユースケースを説明してもらう**
   - 何をするエージェントか
   - どんな場面で呼ばれるか
   - 期待される出力形式は何か

2. **既存エージェントとの重複確認**
   ```bash
   ls ~/.claude/agents/
   ls .claude/agents/
   ```
   一覧から既存エージェント（source-commenter、performance-optimizer など）との重複がないか確認

### ステップ 2: メタデータ設計（AskUserQuestion で段階的確認）

以下の情報を確認してください：

#### 2.1 名前と説明
- **name**: 英数字・ハイフン区切り（例: `code-reviewer`, `api-integrator`, `doc-translator`）
  - 短く、目的が明確で、他のエージェント名と重複しない
  
- **description**: 
  - "Use this agent when..." で始める形式推奨
  - ユースケース（何をするのか）と呼び出し条件（いつ呼ぶのか）を含める
  - 反例（呼ばない場合）も示すと効果的
  - 例: "Use this agent when you need to review code for correctness bugs and suggest simplifications. Invoke for pull request reviews, code quality audits, or refactoring assessments. Skip for documentation, design feedback, or performance optimization (use other specialized agents instead)."

#### 2.2 モデル選択
選択肢から選んでもらう：
- **Haiku** - 軽量タスク（解析、変換、簡単な判定）
- **Sonnet**（推奨） - バランス型タスク（コードレビュー、翻訳、設計）
- **Opus** - 複雑なタスク（建築設計、複数ファイル分析、創造的な合成）

#### 2.3 UI 色（オプション）
- cyan、blue、purple、green、orange、red など
- 省略可（デフォルト色が使われる）

#### 2.4 メモリスコープ（オプション）
- `user` - ユーザー全体で共有
- 省略可（デフォルト: メモリなし）

#### 2.5 ツール制限（オプション）
- 許可するツール一覧
- 省略 = すべてのツール利用可
- 例: `["Bash", "Read", "Edit"]`（Bash と Read/Edit だけを許可）

### ステップ 3: システムプロンプト設計

スキルの本体部分をユーザーと一緒に設計します。以下の構成に従ってください：

```
# Agent Name

## Your Mission
（何をするのか、どんな視点を持つのか）

## Core Principles / Key Responsibilities
（実行時に守るべきルール）

## Output Format
（期待される回答の形式）

## Examples / Guidelines
（実例を示しながら実行方法を説明）
```

参考：
- `~/.claude/agents/source-commenter.md` — コード品質系エージェントの例
- `~/.claude/agents/performance-optimizer.md` — 分析系エージェントの例

### ステップ 4: 配置先の確認

AskUserQuestion で以下の 2 択を確認：
- **このプロジェクト専用**: `.claude/agents/<name>.md`
- **すべてのプロジェクトで使用**: `~/.claude/agents/<name>.md`

### ステップ 5: ファイル生成と確認

1. Write ツールで指定パスにファイルを生成
2. 生成直後に内容を表示してユーザーに確認させる
3. 修正が必要なら Edit で調整

## メタデータフロントマターの完全スキーマ

```yaml
---
name: agent-identifier          # Required: ハイフン区切り英数字
description: |                  # Required: ユースケースと呼び出し条件
  Use this agent when...
model: sonnet                    # Optional: haiku, sonnet, opus (default: sonnet)
color: cyan                      # Optional: UI color
memory: user                     # Optional: user, project (default: none)
tools:                          # Optional: tool allowlist
  - Bash
  - Read
  - Edit
---
```

## システムプロンプト執筆ガイド

### 構成パターン

1. **自己紹介 / ペルソナ** (1-2 段落)
   ```
   You are an elite [role] with deep expertise in [domain].
   ```

2. **ミッション** (1 段落)
   ```
   Your mission is to [task] by [approach].
   ```

3. **制約・原則** (3-5 項目)
   - framework / project conventions に従う
   - output format を守る
   - edge case への対応

4. **出力形式** (code block または markdown)
   - 期待される構造を明示
   - 例を示す

### 命名と実行スタイル

- **命令形を使用** - "Do X", "Provide Y"
- **Why の説明を重視** - MUST/NEVER より「なぜそうするのか」を説明
- **理論的背景を示す** - LLM は theory of mind を活用できるため、目的と原理を伝える

### 長さ

- **500 行以下を目標** （参考ファイル本体のみ）
- 複雑な参考資料は別ファイル（references/）に分割

## ファイル構造例

サブエージェント単体で十分な場合：
```
~/.claude/agents/code-reviewer.md
```

大規模なシステムプロンプトが必要な場合（参考資料付き）：
```
.claude/agents/
├── code-reviewer.md           (frontmatter + main prompt)
└── code-reviewer-refs/        (optional: supporting materials)
    ├── patterns.md            (design patterns, examples)
    └── guidelines.md          (project-specific rules)
```

## チェックリスト

実装前に以下を確認：

- [ ] 既存エージェントと名前・機能が重複していない
- [ ] description に「Use this agent when」または明確なトリガー条件が含まれている
- [ ] システムプロンプトが 500 行以内 (または reference に分割)
- [ ] 出力形式が明確に定義されている
- [ ] model 選択が適切 (複雑度に応じた Haiku/Sonnet/Opus)
- [ ] ファイルが YAML frontmatter で始まり `---` で区切られている

## トラブルシューティング

**Q: エージェントが呼ばれない**  
A: description を確認。「ユースケース」と「呼び出し条件」の両方が明確か？ 逆にスキルの description のように「手順を説明する」形になっていないか？

**Q: システムプロンプトが長すぎる**  
A: references/ ディレクトリに分割。SKILL.md と同じ三層構造（metadata → 本体 → 参考資料）を使う。

**Q: 既存エージェントとの違いが不明**  
A: `~/.claude/agents/` の既存ファイルを 2-3 件読んで、命名・description・スタイルの慣例を確認。
