// /privacy/ and /terms/: static text pages. Styles and the app header; the text is in the HTML.
import '@fontsource-variable/inter-tight'
import '@fontsource-variable/jetbrains-mono'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PageHeader } from './components/PageHeader'
import './index.css'

// Replaces the static fallback header that crawlers and no-JS visitors see.
createRoot(document.getElementById('site-header')!).render(
  <StrictMode>
    <PageHeader />
  </StrictMode>,
)
