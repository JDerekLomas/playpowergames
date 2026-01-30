import { AnalyticsHelper, GameConfigManager } from '@k8-games/sdk';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function App() {
  const multiverseRef = useRef<HTMLIFrameElement>(null);

  const getTopic = async () => {
    const gameConfigManager = GameConfigManager.getInstance();
    await gameConfigManager.loadConfigs();
    return gameConfigManager.get('topic') || 'grade3_topic2';
  }

  const [activeGameSrc, setActiveGameSrc] = useState<string | null>(null);
  const [isGameVisible, setIsGameVisible] = useState(false);
  const [topic, setTopic] = useState<string>('');
  const [lang, setLang] = useState<string>('');
  const [gameAriaLabel, setGameAriaLabel] = useState<string>('GameScene');
  const multiverseSrc = useMemo(() => `games/multiverse/index.html?topic=${topic}&lang=${lang}`, [topic, lang]);

  useEffect(() => {
    getTopic().then(topic => {
      setTopic(topic);
      const gameConfigManager = GameConfigManager.getInstance();
      setLang(gameConfigManager.get('lang') || 'en');
      
      AnalyticsHelper.createInstance('multiverse', topic, { isMultiverse: true, isLauncher: true });
    });
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; package?: string; mode?: string; label?: string; message?: string; ariaLive?: string } | undefined;
      if (!data || typeof data !== 'object' || !('type' in data)) return;

      if (data.type === 'START_GAME' && data.package) {
        let url = `games/${data.package}/index.html?topic=${topic}&lang=${lang}`;
        if (data.mode) {
          url += `&mode=${data.mode}`;
        }
        setActiveGameSrc(url);
        setGameAriaLabel('GameScene'); // Reset aria label when starting a game
      } else if (data.type === 'CLOSE_GAME') {
        setActiveGameSrc(null);
        setGameAriaLabel('GameScene'); // Reset aria label
        // focus on the game container of multiverse
        setTimeout(() => {
          const iframe = multiverseRef.current;
          if (iframe?.contentWindow && iframe.contentDocument) {
            const container = iframe.contentDocument.getElementById('multiverse-container');
            if (container) {
              (container as HTMLElement).focus();
            }
          }
        }, 200);
      } else if (data.type === 'UPDATE_IFRAME_LABEL' && data.label) {
        // Handle iframe label updates from game
        setGameAriaLabel(data.label);
      } else if (data.type === 'ANNOUNCE_TO_SCREEN_READER' && data.message) {
        // Handle screen reader announcements from iframe games
        const announcer = document.getElementById('aria-announcer');
        if (announcer) {
          const ariaLive = data.ariaLive || 'assertive';
          announcer.setAttribute('aria-live', ariaLive);
          announcer.textContent = '';
          setTimeout(() => {
            if (data.message) {
              announcer.textContent = data.message;
            }
          }, 100);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [topic, lang]);

  useEffect(() => {
    // Reset visibility when the game src changes
    setIsGameVisible(false);
  }, [activeGameSrc]);

  useEffect(() => {
    const clearStudentData = () => {
      try {
        sessionStorage.removeItem('studentData');
      } catch {
        // ignore storage errors
      }
    };

    window.addEventListener('beforeunload', clearStudentData);
    return () => {
      clearStudentData();
      window.removeEventListener('beforeunload', clearStudentData);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <iframe
        title="multiverse"
        ref={multiverseRef}
        src={multiverseSrc}
        style={{
          position: 'fixed',
          display: !activeGameSrc || !isGameVisible ? 'block' : 'none',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          zIndex: 1,
        }}
        allowFullScreen
      />

      <iframe
        title={gameAriaLabel}
        aria-label={gameAriaLabel}
        src={activeGameSrc ?? undefined}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: activeGameSrc && isGameVisible ? 'block' : 'none',
          zIndex: 2,
        }}
        onLoad={() => {
          setIsGameVisible(true);
        }}
        allowFullScreen
      />
    </div>
  );
}
