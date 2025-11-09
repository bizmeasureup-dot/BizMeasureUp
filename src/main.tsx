import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import 'tailwindcss/tailwind.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found. Make sure index.html has a <div id="root"></div> element.')
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (error) {
  console.error('Failed to render app:', error)
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: sans-serif;">
      <h1 style="color: red;">Failed to load application</h1>
      <p>Please check the console for errors.</p>
      <pre style="text-align: left; background: #f5f5f5; padding: 10px; margin-top: 20px; border-radius: 4px;">
        ${error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  `
}

