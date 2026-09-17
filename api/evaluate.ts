// POST /api/evaluate — the only server code. Holds TYPESAFE_API_KEY.
import { randomUUID } from 'node:crypto'
import { buildState, composeEvaluation, validateGoal, validateIdea } from '../src/lib/evaluate.js'
import { questionsFor } from '../src/lib/questions.js'
import { TypeSafeError, askJev } from '../src/lib/typesafe.js'
import { saveEvaluation } from './_analytics-db.js'
import { mockJev } from './_mock.js'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export async function POST(request: Request): Promise<Response> {
  let payload: { idea?: unknown; goal?: unknown; doNotArchive?: unknown }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }

  const valid = validateIdea(payload?.idea)
  if (!valid.ok) return json({ error: valid.error }, 400)
  const goal = validateGoal(payload.goal)
  if (!goal.ok) return json({ error: goal.error }, 400)

  const useMock = process.env.TYPESAFE_MOCK === '1' && !process.env.VERCEL
  const apiKey = process.env.TYPESAFE_API_KEY
  if (!apiKey && !useMock) return json({ error: 'TYPESAFE_API_KEY is not configured.' }, 500)

  try {
    const { response, latencyMs } = useMock
      ? await mockJev(valid.idea, goal.goal)
      : await askJev({ apiKey: apiKey!, state: buildState(valid.idea), questions: questionsFor(goal.goal) })

    const evaluation = composeEvaluation(response, latencyMs, useMock, goal.goal)

    if (payload.doNotArchive !== true) {
      try {
        saveEvaluation({
          requestId: randomUUID(),
          createdAt: new Date().toISOString(),
          idea: valid.idea,
          evaluation,
        })
      } catch (err) {
        // Archiving must not make a successful evaluation fail.
        console.error('[evaluate] analytics archive failed:', err instanceof Error ? err.message : 'unknown')
      }
    }

    return json(evaluation)
  } catch (err) {
    if (err instanceof TypeSafeError) {
      console.error('[evaluate] TypeSafe error', err.status)
      const busy = err.status === 429 || err.status === 529
      return json({ error: busy ? 'Jev is busy. Try again in a moment.' : 'Jev could not judge this one.' }, busy ? 503 : 502)
    }
    console.error('[evaluate] failed:', err instanceof Error ? err.name : 'unknown')
    return json({ error: 'Jev could not judge this one.' }, 502)
  }
}
