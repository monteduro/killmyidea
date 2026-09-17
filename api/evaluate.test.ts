import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveEvaluation } from './_analytics-db'
import { POST } from './evaluate'

vi.mock('./_analytics-db', () => ({ saveEvaluation: vi.fn() }))

afterEach(() => {
  vi.mocked(saveEvaluation).mockClear()
  vi.unstubAllEnvs()
})

describe('POST /api/evaluate archive preference', () => {
  it('archives by default and honours the explicit opt-out', async () => {
    vi.stubEnv('TYPESAFE_MOCK', '1')
    vi.stubEnv('VERCEL', '')

    const archived = await POST(
      new Request('http://localhost/api/evaluate', {
        method: 'POST',
        body: JSON.stringify({ idea: 'A detailed startup idea that can be archived.' }),
      }),
    )
    expect(archived.status).toBe(200)
    expect(saveEvaluation).toHaveBeenCalledOnce()
    expect(vi.mocked(saveEvaluation).mock.calls[0][0]).toMatchObject({
      idea: 'A detailed startup idea that can be archived.',
    })

    const optedOut = await POST(
      new Request('http://localhost/api/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          idea: 'A private startup idea that must not be archived.',
          doNotArchive: true,
        }),
      }),
    )
    expect(optedOut.status).toBe(200)
    expect(saveEvaluation).toHaveBeenCalledOnce()
  })
})

describe('POST /api/evaluate goal', () => {
  it('judges with the chosen goal and rejects unknown ones', async () => {
    vi.stubEnv('TYPESAFE_MOCK', '1')
    vi.stubEnv('VERCEL', '')
    const post = (goal: unknown) =>
      POST(
        new Request('http://localhost/api/evaluate', {
          method: 'POST',
          body: JSON.stringify({ idea: 'An open source idea evaluator for founders.', goal, doNotArchive: true }),
        }),
      )

    const res = await post('open_source')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.goal).toBe('open_source')
    expect(body.dimensions).toHaveProperty('adoption')
    expect(body.dimensions).not.toHaveProperty('money')

    expect((await post('crypto')).status).toBe(400)
  })
})
