import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import { useGameContext } from '../../context/GameContext';
import { useAudioManager } from '../../context/AudioContext';
import { SceneTransition } from '../common/SceneTransition';
import { renderMathSR } from '../../utils/mathA11y';
import { useSceneAnnouncement } from '../../hooks/useSceneAnnouncement';

interface EndingSceneProps {
  onComplete: () => void;
}

export const EndingScene: React.FC<EndingSceneProps> = ({ onComplete }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const { t } = useTranslations();
  const { state } = useGameContext();
  const { playSfx } = useAudioManager();
  
  // Announce scene change to screen readers
  useSceneAnnouncement('ending');

  // Get completed interactive scenes from context
  const getCompletedBadges = () => {
    const badges = [];
    
    console.log('Debug - state.completedQuests:', state.completedQuests); // Debug log
    
    const questIds = state.completedQuests || [];
    
    // Add badges based on completed quests - check for all possible quest patterns
    if (questIds.some(id => id.includes('monochord1'))) {
      badges.push({ id: 'monochord', name: t('interactiveCelebration.monochord1.name') });
    }
    if (questIds.some(id => id.includes('monochord2'))) {
      badges.push({ id: 'figurate', name: t('interactiveCelebration.monochord2.name') });
    }
    
    // Check for proof completions (multiple possible patterns)
    if (questIds.some(id => id.includes('pebble') || id.includes('pebbleProof'))) {
      badges.push({ id: 'pebble_proof', name: t('interactiveCelebration.pebble.name') });
    }
    if (questIds.some(id => id.includes('pouring') || id.includes('waterProof') || id.includes('pouringProof'))) {
      badges.push({ id: 'pouring_proof', name: t('interactiveCelebration.pouring.name') });
    }
    if (questIds.some(id => id.includes('dissection') || id.includes('dissectionProof'))) {
      badges.push({ id: 'dissection_proof', name: t('interactiveCelebration.dissection.name') });
    }
    if (questIds.some(id => id.includes('ladder') || id.includes('ladderChallenge'))) {
      badges.push({ id: 'ladder_challenge', name: t('interactiveCelebration.ladder.name') });
    }
    if (questIds.some(id => id.includes('final') || id.includes('finalChallenge'))) {
      badges.push({ id: 'final_challenge', name: t('interactiveCelebration.final.name') });
    }
    
    return badges;
  };

  const completedBadges = getCompletedBadges();

  useEffect(() => {
  const overlayTimer = setTimeout(() => setShowOverlay(true), 400); // shorter delay
  return () => clearTimeout(overlayTimer);
  }, []);

  // Play badge sfx when the overlay (and badges) appear
  useEffect(() => {
    if (showOverlay) {
      playSfx('badge_sfx');
    }
  }, [showOverlay, playSfx]);

  const handlePlayAgain = () => {
    onComplete();
  };

  return (
    <SceneTransition 
      sceneType="ending"
      className="ending-scene"
    >
      <div className={`ending-overlay ${showOverlay ? 'fade-in' : ''}`}>
        <div className="ending-content">
          <div className="ending-header">
            <h1>{renderMathSR(t('endingScene.title'))}</h1>
            <h2>{renderMathSR(t('endingScene.subtitle'))}</h2>
          </div>

          {/* Badges row */}
          <div className="ending-badges">
            {completedBadges.map((badge, index) => (
              <div key={index} className="ending-badge-item">
                <span className="ending-badge-text">{badge.name}</span>
                <img src={`assets/badges/${badge.id}.png`} alt={badge.name} />
              </div>
            ))}
          </div>

          <div className="ending-achievements">
            <ul>
              {(() => {
                const achievements = t('endingScene.achievements', true);
                return Array.isArray(achievements)
                  ? achievements.map((a: string, i: number) => <li key={i}>{renderMathSR(a)}</li>)
                  : null;
              })()}
            </ul>
          </div>

          <button
            className="ending-play-again-btn"
            onClick={handlePlayAgain}
          >
            {t('endingScene.playAgain')}
          </button>
        </div>
      </div>
    </SceneTransition>
  );
};
