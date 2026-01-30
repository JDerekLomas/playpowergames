import React, { useState, useEffect, useRef } from 'react';
import { getTransitionConfig } from '../../config/transitionConfig';
import type { TransitionConfig } from '../../config/transitionConfig';

interface SceneTransitionProps {
  /** Type of scene for configuration lookup */
  sceneType: string;
  /** Custom CSS class to apply to the container */
  className?: string;
  /** Additional CSS classes for specific background variants */
  backgroundClassName?: string;
  /** Content to render after transition */
  children: React.ReactNode;
  /** Callback when transition completes */
  onTransitionComplete?: () => void;
  /** Callback when content phase starts (good time to start audio) */
  onContentPhaseStart?: () => void;
}

type TransitionPhase = 'background' | 'blur' | 'content' | 'complete';

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  sceneType,
  className = '',
  backgroundClassName = '',
  children,
  onTransitionComplete,
  onContentPhaseStart
}) => {
  const [phase, setPhase] = useState<TransitionPhase>('background');
  const [config] = useState<TransitionConfig>(() => getTransitionConfig(sceneType));
  const timeoutRefs = useRef<number[]>([]);

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  // Run transition sequence
  useEffect(() => {
    if (!config.enabled) {
      setPhase('complete');
      onTransitionComplete?.();
      return;
    }

    // Phase 1: Show background for configured duration
    const backgroundTimeout = window.setTimeout(() => {
      setPhase('blur');
      
      // Phase 2: Apply blur transition
      const blurTimeout = window.setTimeout(() => {
        setPhase('content');
        onContentPhaseStart?.(); // Notify when content phase starts
        
        // Phase 3: Fade in content
        const contentTimeout = window.setTimeout(() => {
          setPhase('complete');
          onTransitionComplete?.();
        }, config.contentFadeInDuration);
        
        timeoutRefs.current.push(contentTimeout);
      }, config.blurDuration);
      
      timeoutRefs.current.push(blurTimeout);
    }, config.backgroundDuration);
    
    timeoutRefs.current.push(backgroundTimeout);

    // Cleanup function
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [config, onTransitionComplete]);

  // Generate dynamic CSS variables for this transition
  const containerStyle: React.CSSProperties = {
    '--blur-amount': `${config.blurAmount}px`,
    '--blur-duration': `${config.blurDuration}ms`,
    '--content-fade-duration': `${config.contentFadeInDuration}ms`
  } as React.CSSProperties;

  // Combine all CSS classes
  const containerClasses = [
    'scene-transition-container',
    className,
    backgroundClassName,
    `transition-phase-${phase}`,
    config.enabled ? 'transitions-enabled' : 'transitions-disabled'
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={containerClasses}
      style={containerStyle}
    >
      {/* Background layer (handled by CSS ::before) */}
      
      {/* Content layer */}
      <div className="scene-transition-content">
        {children}
      </div>
    </div>
  );
};
