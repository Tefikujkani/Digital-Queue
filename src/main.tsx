import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import './styles/index.css'
import { listenForInstallPrompt } from './app/lib/pwaInstall'

listenForInstallPrompt()

createRoot(document.getElementById('root')!).render(<App />)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ignore */
    })
  })
}
