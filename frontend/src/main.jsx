import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Suppress non-critical browser extension message channel closures (e.g. adblocker, react-devtools)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event?.reason?.message || event?.reason || '')
    if (
      reason.includes('message channel closed') ||
      reason.includes('listener indicated an asynchronous response') ||
      reason.includes('Cross-Origin-Opener-Policy')
    ) {
      event.preventDefault()
    }
  })
}

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)