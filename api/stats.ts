// GET /api/stats — how many ideas have been submitted, and their verdict split.
// The queries themselves are cached in memory for 5 minutes; this header lets
// the browser reuse the response so most visits never reach the server.
import { evaluationStats } from './_analytics-db.js'

export async function GET(): Promise<Response> {
  try {
    return new Response(JSON.stringify(evaluationStats()), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (err) {
    console.error('[stats] failed:', err instanceof Error ? err.name : 'unknown')
    return new Response(JSON.stringify({ error: 'Stats unavailable.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
}
