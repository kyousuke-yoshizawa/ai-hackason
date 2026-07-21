// Issue #145: 要件定義書10章の成功基準1番目「複数パターンの自然言語入力で
// 正確にJSON構造化できるか」を検証するためのゴールデンケース集。
// LLM出力の表現の揺れ（「ランチ」→「昼食」等）を吸収するため、expect は
// 完全一致ではなく緩い判定（キーワード包含・null許容）にする。
// 実行は scripts/check-intent-golden.ts（実API・コストあり）で行い、Jestには含めない。

export interface IntentCaseExpectation {
  // desires 配列のいずれかの要素にこのキーワードが含まれていればOK（各キーワードごとに判定）
  desiresInclude: string[]
  // number: この値と一致することを期待 / null: nullであることを期待 / 'any': 値を問わない
  party_size: number | null | 'any'
  budget: number | null | 'any'
  time_limit: string | null | 'any'
}

export interface IntentCase {
  name: string
  message: string
  expect: IntentCaseExpectation
}

export const INTENT_CASES: IntentCase[] = [
  {
    name: '基本形',
    message: 'ランチして、映画見て、カフェ行きたい。2人、15時まで',
    expect: { desiresInclude: ['ランチ', '映画', 'カフェ'], party_size: 2, budget: 'any', time_limit: '15:00' },
  },
  {
    name: '予算あり',
    message: '3人で予算5000円以内でランチとカフェを楽しみたい',
    expect: { desiresInclude: ['ランチ', 'カフェ'], party_size: 3, budget: 5000, time_limit: 'any' },
  },
  {
    name: '人数なし',
    message: '映画を見たあとにカフェでゆっくりしたい',
    expect: { desiresInclude: ['映画', 'カフェ'], party_size: null, budget: 'any', time_limit: 'any' },
  },
  {
    name: '時間なし',
    message: 'ランチと買い物を楽しみたい、4人で',
    expect: { desiresInclude: ['ランチ', '買い物'], party_size: 4, budget: 'any', time_limit: null },
  },
  {
    name: '欲求1つだけ',
    message: 'とにかく美味しいランチが食べたい',
    expect: { desiresInclude: ['ランチ'], party_size: 'any', budget: 'any', time_limit: 'any' },
  },
  {
    name: '欲求4つ',
    message: 'ランチと映画とカフェと買い物、全部やりたい。2人で',
    expect: { desiresInclude: ['ランチ', '映画', 'カフェ', '買い物'], party_size: 2, budget: 'any', time_limit: 'any' },
  },
  {
    name: '口語崩れ',
    message: '映画みたいな〜あとなんか甘いものとか食べたいかも、友達と2人で',
    expect: { desiresInclude: ['映画'], party_size: 2, budget: 'any', time_limit: 'any' },
  },
  {
    name: '子連れ・シーン指定',
    message: '子連れでランチできるところ探してます、3人家族です',
    expect: { desiresInclude: ['ランチ'], party_size: 3, budget: 'any', time_limit: 'any' },
  },
  {
    name: '曖昧予算',
    message: '安めでランチとカフェ、2人でお願いします',
    expect: { desiresInclude: ['ランチ', 'カフェ'], party_size: 2, budget: 'any', time_limit: 'any' },
  },
  {
    name: '関係ない雑談混じり',
    message: '今日は天気がいいですね。それはそうと、ランチと映画に行きたいです。2人で17時まで',
    expect: { desiresInclude: ['ランチ', '映画'], party_size: 2, budget: 'any', time_limit: '17:00' },
  },
  {
    name: '絵文字混じり',
    message: 'ランチ🍜行きたい！カフェ☕でまったりしたいな〜 2人で😊',
    expect: { desiresInclude: ['ランチ', 'カフェ'], party_size: 2, budget: 'any', time_limit: 'any' },
  },
]
