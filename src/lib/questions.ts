// Every Jev question lives here.
//
// Eight plain questions an indie hacker would ask. Each one returns a Score
// from 0 to 4. Jev judges each level on its own, so every level is a complete
// situation. The idea is sent as `state.startup_idea`.
//
// The goal picked in the form swaps questions that do not fit that goal.

/** Questions for the default "Make money" goal, in display order. */
export const DIMENSIONS = [
  'problem',
  'customer',
  'demand',
  'money',
  'reach',
  'different',
  'buildable',
  'shareable',
] as const

/** Goal-specific replacements for questions that do not fit. */
export const GOAL_DIMENSIONS = ['adoption', 'appeal', 'fun'] as const

export type DimensionKey = (typeof DIMENSIONS)[number] | (typeof GOAL_DIMENSIONS)[number]

export const GOALS = ['money', 'open_source', 'fun'] as const
export type Goal = (typeof GOALS)[number]
export const DEFAULT_GOAL: Goal = 'money'

export const GOAL_LABELS: Record<Goal, string> = {
  money: 'Make money',
  open_source: 'Open source',
  fun: 'Just for fun',
}

/** The question that takes Money's slot for each goal. */
export const GOAL_DIMENSION: Record<Goal, DimensionKey> = {
  money: 'money',
  open_source: 'adoption',
  fun: 'fun',
}

/** Fun projects need an immediate hook, not a painful real-world problem. */
export const PROBLEM_DIMENSION: Record<Goal, DimensionKey> = {
  money: 'problem',
  open_source: 'problem',
  fun: 'appeal',
}

export const isGoal = (v: unknown): v is Goal => (GOALS as readonly unknown[]).includes(v)

/** The eight scored questions for a goal, in display order. */
export const dimensionsFor = (goal: Goal = DEFAULT_GOAL): DimensionKey[] =>
  DIMENSIONS.map((k) => {
    if (k === 'problem') return PROBLEM_DIMENSION[goal]
    if (k === 'money') return GOAL_DIMENSION[goal]
    return k
  })

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  problem: 'Real problem',
  customer: 'Clear customer',
  demand: 'Demand',
  money: 'Money',
  reach: 'Reach',
  different: 'Different',
  buildable: 'Buildable',
  shareable: 'Shareable',
  adoption: 'Adoption',
  appeal: 'Immediate appeal',
  fun: 'Fun',
}

/** One-line explanation shown in the breakdown legend. */
export const DIMENSION_HINTS: Record<DimensionKey, string> = {
  problem: 'Does it fix something people actually feel?',
  customer: 'Is it obvious who this is for?',
  demand: 'Are people already trying to solve this today?',
  money: 'Would they pay for it?',
  reach: 'Can a small team find these users?',
  different: 'Does it stand out from what already exists?',
  buildable: 'Can 1–2 devs ship a first version fast?',
  shareable: 'Would users tell or show other people?',
  adoption: 'Would developers use, star and contribute to it?',
  appeal: 'Would people immediately want to try it?',
  fun: 'Would people enjoy playing with it?',
}

export const CATEGORIES = [
  'SaaS',
  'Consumer',
  'Marketplace',
  'Developer Tool',
  'AI',
  'Social',
  'Ecommerce',
  'Fintech',
  'Other',
] as const

type ScoreQuestion = { type: 'score'; instructions: string; criteria: string[] }
type ChoiceQuestion = { type: 'choice'; instructions: string; criteria: Record<string, string | null> }
type NoulQuestion = { type: 'noul'; instructions: string; criteria?: { true?: string; false?: string } }
export type JevQuestion = ScoreQuestion | ChoiceQuestion | NoulQuestion

const scoreQuestions: Record<DimensionKey, ScoreQuestion> = {
  problem: {
    type: 'score',
    instructions: 'Does `startup_idea` solve a real problem that people actually feel?',
    criteria: [
      'No real problem; it is a solution looking for a problem.',
      'A tiny annoyance most people would never bother fixing.',
      'A real but mild problem people mostly live with.',
      'A clear problem people complain about and would like fixed.',
      'A painful, expensive or urgent problem people badly want gone.',
    ],
  },
  customer: {
    type: 'score',
    instructions: 'Is it clear exactly who `startup_idea` is for?',
    criteria: [
      'Impossible to tell who would use it.',
      'It is for "everyone", with no specific group in mind.',
      'A rough group of people, loosely defined.',
      'A clear type of customer you could go and find.',
      'A very specific niche you could name and contact today.',
    ],
  },
  demand: {
    type: 'score',
    instructions: 'Are people already trying to solve the problem in `startup_idea` today?',
    criteria: [
      'Nobody is trying to solve this today.',
      'People would need to adopt a completely new habit.',
      'Some people use workarounds or loosely related tools.',
      'People already use spreadsheets, tools or manual work for exactly this.',
      'People already pay real money or spend hours every week on this.',
    ],
  },
  money: {
    type: 'score',
    instructions: 'Would the people in `startup_idea` pay for it?',
    criteria: [
      'Nobody would pay; it only works as free.',
      'Very few would pay, and only a trivial amount.',
      'Some users might pay a small subscription.',
      'Customers would clearly pay for this.',
      'It saves or makes money, so paying is an easy decision.',
    ],
  },
  reach: {
    type: 'score',
    instructions: 'How easily could a small team get the product in `startup_idea` in front of its users?',
    criteria: [
      'No idea where to find these users.',
      'Reaching users would need expensive ads or a big sales team.',
      'There are a few places to find users, with some effort.',
      'Users gather in obvious communities, searches or marketplaces.',
      'The product spreads by itself or users are trivially easy to reach.',
    ],
  },
  different: {
    type: 'score',
    instructions: 'How different is `startup_idea` from what already exists?',
    criteria: [
      'A copy of products that already exist.',
      'A crowded space with little to set it apart.',
      'Somewhat different from existing options.',
      'Clearly different from existing options.',
      'A fresh angle nobody else is doing.',
    ],
  },
  buildable: {
    type: 'score',
    // A plausible "it already works" claim settles the question: it has been built by one or two
    // people. The plausibility clause keeps a gigafactory from scoring high just by claiming to exist.
    instructions:
      'How easily could one or two developers build a first version of `startup_idea`? ' +
      'If `startup_idea` says a working version already exists, is live or is in use, and that claim ' +
      'is plausible for one or two developers, it is proven buildable: use the highest level.',
    criteria: [
      'Needs a big team, heavy capital or breakthroughs.',
      'Months of hard work with serious technical risk.',
      'A few weeks of solid work.',
      'Buildable in a week or two with standard tools.',
      'A working prototype in a weekend.',
    ],
  },
  shareable: {
    type: 'score',
    instructions: 'Would users of `startup_idea` show it to or tell other people about it?',
    criteria: [
      'Nobody would ever mention it.',
      'Rarely mentioned to anyone.',
      'Some users would recommend it.',
      'Users would happily tell friends or colleagues.',
      'Using it naturally makes people share or show it off.',
    ],
  },
  adoption: {
    type: 'score',
    instructions:
      'As an open source project, would developers actually use `startup_idea`, star it and contribute to it?',
    criteria: [
      'Nobody would install or use it.',
      'A handful of people might try it once.',
      'A small group would use it and occasionally star it.',
      'Developers would use it regularly and some would contribute.',
      'It fills a gap so clearly that people would adopt, star and help maintain it.',
    ],
  },
  appeal: {
    type: 'score',
    instructions:
      'As a just-for-fun project, how strongly would `startup_idea` make someone want to try it immediately?',
    criteria: [
      'There is no clear hook and almost nobody would try it.',
      'The premise creates mild curiosity, but not enough to take action.',
      'People would try it once if it appeared in front of them.',
      'The hook is easy to understand and makes people actively want to try it.',
      'The premise is instantly irresistible; people would stop what they are doing to try it.',
    ],
  },
  fun: {
    type: 'score',
    instructions: 'As a just-for-fun project, would people enjoy playing with `startup_idea`?',
    criteria: [
      'Nobody would find it enjoyable.',
      'Mildly amusing for a few seconds.',
      'Fun to try once, then forgotten.',
      'People would come back to play with it.',
      'So fun people would lose time on it and show it to friends.',
    ],
  },
}

const sharedQuestions: Record<string, JevQuestion> = {
  category: {
    type: 'choice',
    instructions: 'Which category best describes the product in `startup_idea`?',
    criteria: {
      SaaS: 'Software sold to businesses or professionals as a subscription service',
      Consumer: 'An app or service for individual consumers',
      Marketplace: 'Connects buyers and sellers or supply and demand',
      'Developer Tool': 'A tool, API or infrastructure for software developers',
      AI: 'A product whose core value is an AI or machine-learning capability',
      Social: 'A social network, community or content-sharing product',
      Ecommerce: 'Sells physical or digital goods online',
      Fintech: 'Payments, banking, investing, lending or other financial services',
      Other: 'None of the other categories fits',
    },
  },
  is_understandable: {
    type: 'noul',
    instructions:
      'A typical product-minded reader can understand what is being proposed from `startup_idea`.',
  },
}

/** Everything sent to Jev for one goal: its eight scored questions plus category and clarity. */
export function questionsFor(goal: Goal = DEFAULT_GOAL): Record<string, JevQuestion> {
  return {
    ...Object.fromEntries(dimensionsFor(goal).map((k) => [k, scoreQuestions[k]])),
    ...sharedQuestions,
  }
}

export const QUESTIONS = questionsFor(DEFAULT_GOAL)

/** Same for every goal: goal-specific questions replace shared slots, never add decisions. */
export const DECISION_COUNT = Object.keys(QUESTIONS).length
