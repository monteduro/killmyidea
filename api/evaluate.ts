// POST /api/evaluate — the only server code. Holds TYPESAFE_API_KEY.
// The idea text is never logged or stored here.
import { buildState, composeEvaluation, validateIdea } from '../src/lib/evaluate.js'
import { QUESTIONS } from '../src/lib/questions.js'
import { TypeSafeError, askJev } from '../src/lib/typesafe.js'
import { saveToDataset } from './_dataset.js'
import { mockJev } from './_mock.js'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export async function POST(request: Request): Promise<Response> {
  let payload: { idea?: unknown; datasetOptIn?: unknown }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }

  const valid = validateIdea(payload?.idea)
  if (!valid.ok) return json({ error: valid.error }, 400)

  const useMock = process.env.TYPESAFE_MOCK === '1' && !process.env.VERCEL
  const apiKey = process.env.TYPESAFE_API_KEY
  if (!apiKey && !useMock) return json({ error: 'TYPESAFE_API_KEY is not configured.' }, 500)

  try {
    const { response, latencyMs } = useMock
      ? await mockJev(valid.idea)
      : await askJev({ apiKey: apiKey!, state: buildState(valid.idea), questions: QUESTIONS })

    const evaluation = composeEvaluation(response, latencyMs, useMock)

    if (payload.datasetOptIn === true) await saveToDataset(valid.idea, evaluation)

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
