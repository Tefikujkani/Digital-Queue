import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import './styles/index.css'
import { applyIosAppClass, listenForInstallPrompt } from './app/lib/pwaInstall'
import { preloadGoogleAuth } from './app/lib/googleAuth'

applyIosAppClass()
listenForInstallPrompt()
preloadGoogleAuth()

createRoot(document.getElementById('root')!).render(<App />)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => {})
    }).catch(() => {})
  })
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
