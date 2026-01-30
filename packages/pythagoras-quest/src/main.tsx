import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GameConfigManager } from '@k8-games/sdk'
import './index.css'
import App from './App.tsx'
import { initializeI18n } from './utils/lang'

// Initialize game configuration and i18n
const initializeApp = async () => {
  try {
    const gameConfigManager = GameConfigManager.getInstance();
    await gameConfigManager.loadConfigs();
    initializeI18n();
    
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Fallback: render without i18n initialization
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  }
};

initializeApp();
