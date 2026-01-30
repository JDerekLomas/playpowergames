export interface TransitionConfig {
  /** Duration to show background before applying blur (in milliseconds) */
  backgroundDuration: number;
  /** Duration of blur transition (in milliseconds) */
  blurDuration: number;
  /** Duration of content fade-in (in milliseconds) */
  contentFadeInDuration: number;
  /** Blur amount to apply to background (in pixels) */
  blurAmount: number;
  /** Whether to enable transitions for this scene */
  enabled: boolean;
}

export interface SceneTransitionConfig {
  /** Default configuration for all scenes */
  default: TransitionConfig;
  /** Scene-specific overrides */
  scenes: {
    [sceneType: string]: Partial<TransitionConfig>;
  };
}

export const transitionConfig: SceneTransitionConfig = {
  default: {
    backgroundDuration: 800, // 800ms to show background
    blurDuration: 300, // 300ms for blur transition
    contentFadeInDuration: 600, // 600ms for content fade-in
    blurAmount: 2, // 2px blur
    enabled: true
  },
  scenes: {
    // Title scene has transitions disabled
    title: {
      enabled: false
    },
    // Map, library, and main character scenes have transitions disabled
    map: {
      enabled: false
    },
    library: {
      enabled: false
    },
    mainCharacter: {
      enabled: false
    },
    // Interactive scenes might need longer background display for complex scenes
    interactive: {
      backgroundDuration: 800
    }
  }
};

/**
 * Get transition configuration for a specific scene type
 */
export const getTransitionConfig = (sceneType: string): TransitionConfig => {
  const sceneConfig = transitionConfig.scenes[sceneType] || {};
  return {
    ...transitionConfig.default,
    ...sceneConfig
  };
};
