import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ?kids opens Kids Mode (its own component tree — see docs/kids/PLAN.md)
const KidsApp = lazy(() => import('./kids/KidsApp.jsx'))
const isKids = new URLSearchParams(window.location.search).has('kids')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isKids ? <Suspense fallback={null}><KidsApp /></Suspense> : <App />}
  </StrictMode>,
)
