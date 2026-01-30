import { useEffect } from 'react';
import { useTranslations } from './useTranslations';

/**
 * Hook to announce scene changes to screen readers
 * @param sceneKey - The translation key for the scene name (e.g., 'titleScreen', 'mapScene')
 * @param additionalMessage - Optional additional message to announce after scene name
 */
export const useSceneAnnouncement = (sceneKey: string, additionalMessage?: string) => {
  const { t } = useTranslations();

  useEffect(() => {
    // Delay announcement to ensure scene is fully loaded and focused
    const timeoutId = setTimeout(() => {
      // Get the scene name from translations
      const sceneName = t(`sceneNames.${sceneKey}`) as string;
      
      // Build announcement message
      const message = additionalMessage 
        ? `${sceneName}. ${additionalMessage}`
        : sceneName;

      // Announce to screen reader without shifting focus
      const announcer = document.getElementById('aria-announcer');
      if (announcer) {
        // Clear previous announcement
        announcer.textContent = '';
        // Use a small delay to ensure screen readers pick up the change
        setTimeout(() => {
          announcer.textContent = message;
        }, 100);
      }
    }, 300); // Delay to let scene render and gain focus first

    return () => clearTimeout(timeoutId);
  }, [sceneKey, t, additionalMessage]);
};
