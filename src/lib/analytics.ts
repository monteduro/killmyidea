// The single DataFast custom goal (cookieless script, see index.html).

declare global {
  interface Window {
    datafast?: (goal: string, params?: Record<string, string>) => void
  }
}

export function trackIdeaSubmitted(params: { length: number; saved: boolean; archived: boolean }) {
  try {
    window.datafast?.('idea_submitted', {
      length: String(params.length),
      saved: String(params.saved),
      archived: String(params.archived),
    })
  } catch {
    // Analytics must never break the app.
  }
}
