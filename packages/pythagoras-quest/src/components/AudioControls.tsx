import React, { useState, useRef, useEffect } from 'react';
import { useAudioManager } from '../context/AudioContext';
import { useGameContext } from '../context/GameContext';
import { useTranslations } from '../hooks/useTranslations';
import IconButton from './common/IconButton';

export const AudioControls: React.FC = () => {
  const { state } = useGameContext();
  const { t } = useTranslations();
  const {
    isMuted,
    toggleMute,
    bgmVolume,
    setBgmVolume,
    dialogVolume,
    setDialogVolume,
  } = useAudioManager();

  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsPopup(false);
      }
    };

    if (showSettingsPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsPopup]);

  if (state.currentSceneId === 'title' || state.currentSceneId === 'loading') return null;

  return (
    <>
      <img
        src="assets/buttons/controls/controls_bg.png"
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '74px',
          height: 'auto',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
      <div className="audio-controls" style={{ position: 'absolute', top: 17, right: 17, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 9999 }}>
        <IconButton
          iconSrc={isMuted ? 'assets/buttons/controls/mute_icon.png' : 'assets/buttons/controls/volume_icon.png'}
          ariaLabel={isMuted ? t('audio.controls.unmute') : t('audio.controls.mute')}
          onClick={toggleMute}
          size={48}
        />
        
        {/* Settings button with popup */}
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <IconButton
            iconSrc='assets/buttons/controls/settings_icon.png'
            ariaLabel={t('audio.controls.settings')}
            onClick={() => setShowSettingsPopup(!showSettingsPopup)}
            size={48}
          />
          
          {/* Settings popup */}
          {showSettingsPopup && (
            <div
              style={{
                position: 'absolute',
                right: 60, // Position to the left of the button
                top: 0,
                width: 302,
                height: 196,
                backgroundColor: '#000B16',
                border: '1px solid #A57600',
                borderRadius: '4px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '25px',
                zIndex: 1000,
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setShowSettingsPopup(false)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 8,
                  width: 24,
                  padding: 0,
                  height: 24,
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label={t('audio.controls.close')}
              >
                ×
              </button>
              {/* Background Music Volume */}
              <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'white', fontSize: '18px', fontWeight: 500 }}>{t('audio.controls.bgmLabel')}</span>
                  <span style={{ color: 'white', fontSize: '18px', fontWeight: 500 }} aria-hidden="true">{Math.round(bgmVolume * 100)}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="audio-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(bgmVolume * 100)}
                    onChange={(e) => setBgmVolume(parseFloat(e.target.value) / 100)}
                    aria-label={t('audio.controls.bgmAria')}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(bgmVolume * 100)}
                    aria-valuetext={`${Math.round(bgmVolume * 100)} percent`}
                    style={{ 
                      flex: 1,
                      '--progress': `${bgmVolume * 100}%`
                    } as React.CSSProperties & { '--progress': string }}
                  />
                </div>
              </div>
              
              {/* Dialog Volume */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'white', fontSize: '18px', fontWeight: 500 }}>{t('audio.controls.dialogLabel')}</span>
                  <span style={{ color: 'white', fontSize: '18px', fontWeight: 500 }} aria-hidden="true">{Math.round(dialogVolume * 100)}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="audio-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(dialogVolume * 100)}
                    onChange={(e) => setDialogVolume(parseFloat(e.target.value) / 100)}
                    aria-label={t('audio.controls.dialogAria')}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(dialogVolume * 100)}
                    aria-valuetext={`${Math.round(dialogVolume * 100)} percent`}
                    style={{ 
                      flex: 1,
                      '--progress': `${dialogVolume * 100}%`
                    } as React.CSSProperties & { '--progress': string }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AudioControls;


