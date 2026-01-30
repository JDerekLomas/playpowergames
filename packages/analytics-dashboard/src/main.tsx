import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import TrialsTable from './components/trials_data'

function Root() {
  const params = new URLSearchParams(window.location.search)
  const hasSession = !!(params.get('sessionId') || params.get('sessionid'))
  return hasSession ? <TrialsTable /> : <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)