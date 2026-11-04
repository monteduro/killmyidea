// /mcp/: static docs page. Styles, the site header, copy buttons and one-click install links.
import '@fontsource-variable/inter-tight'
import '@fontsource-variable/jetbrains-mono'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PageHeader } from './components/PageHeader'
import './index.css'

// Replaces the static fallback header that crawlers and no-JS visitors see.
createRoot(document.getElementById('site-header')!).render(
  <StrictMode>
    <PageHeader active="mcp" />
  </StrictMode>,
)

const endpoint = document.getElementById('mcp-url')?.textContent?.trim() ?? ''

const deeplinks: Record<string, string> = {
  cursor: `cursor://anysphere.cursor-deeplink/mcp/install?name=killmyidea&config=${btoa(JSON.stringify({ url: endpoint }))}`,
  vscode: `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: 'killmyidea', type: 'http', url: endpoint }))}`,
}
for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-deeplink]')) {
  const href = deeplinks[a.dataset.deeplink ?? '']
  if (href) a.href = href
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const label = button.textContent
  button.addEventListener('click', async () => {
    const text = document.getElementById(button.dataset.copy ?? '')?.textContent?.trim() ?? ''
    try {
      await navigator.clipboard.writeText(text)
      button.textContent = 'Copied'
    } catch {
      button.textContent = 'Copy failed'
    }
    setTimeout(() => (button.textContent = label), 1500)
  })
}
