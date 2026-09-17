// Every Jev question lives here.
//
// Eight plain questions an indie hacker would ask. Each one returns a Score
// from 0 to 4. Jev judges each level on its own, so every level is a complete
// situation. The idea is sent as `state.startup_idea`.

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

export type DimensionKey = (typeof DIMENSIONS)[number]

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  problem: 'Real problem',
  customer: 'Clear customer',
  demand: 'Demand',
  money: 'Money',
  reach: 'Reach',
  different: 'Different',
  buildable: 'Buildable',
  shareable: 'Shareable',
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
    instructions: 'How easily could one or two developers build a first version of `startup_idea`?',
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
}

export const QUESTIONS: Record<string, JevQuestion> = {
  ...scoreQuestions,
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

export const DECISION_COUNT = Object.keys(QUESTIONS).length
