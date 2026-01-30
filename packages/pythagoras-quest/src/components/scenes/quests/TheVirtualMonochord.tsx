import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { emitEvent } from '../../../utils/eventEmitter';
import { useAudioManager } from '../../../context/AudioContext';
import { useTranslations } from '../../../hooks/useTranslations';
import { announceToScreenReader } from '@k8-games/sdk';

interface Tuning {
  name: string;
  ratio: number;
  display: string;
  ariaLabel: string;
}

const TUNINGS: Tuning[] = [
  {
    name: 'Fifth Octave',
    ratio: 1 / 5,
    display: '1 : 5',
    ariaLabel: 'oneToFive',
  },
  {
    name: 'Fourth Octave',
    ratio: 1 / 4,
    display: '1 : 4',
    ariaLabel: 'oneToFour',
  },
  {
    name: 'Triple Octave',
    ratio: 1 / 3,
    display: '1 : 3',
    ariaLabel: 'oneToThree',
  },
  { name: 'Octave', ratio: 1 / 2, display: '1 : 2', ariaLabel: 'oneToTwo' },
  {
    name: 'Ratio √5',
    ratio: 1 / Math.sqrt(5),
    display: '1 : √5',
    ariaLabel: 'oneToRootFive',
  },
  { name: 'Fifth', ratio: 2 / 3, display: '2 : 3', ariaLabel: 'twoToThree' },
  {
    name: 'Ratio √3',
    ratio: 1 / Math.sqrt(3),
    display: '1 : √3',
    ariaLabel: 'oneToRootThree',
  },
  {
    name: 'Fourth',
    ratio: 3 / 4,
    display: '3 : 4',
    ariaLabel: 'threeToFour',
  },
  {
    name: 'Septimal Minor Third',
    ratio: 6 / 7,
    display: '6 : 7',
    ariaLabel: 'sixToSeven',
  },
  {
    name: 'Major Third',
    ratio: 4 / 5,
    display: '4 : 5',
    ariaLabel: 'fourToFive',
  },
  {
    name: 'Minor Third',
    ratio: 5 / 6,
    display: '5 : 6',
    ariaLabel: 'fiveToSix',
  },
  {
    name: 'Tritone (√2)',
    ratio: 1 / Math.sqrt(2),
    display: '1 : √2',
    ariaLabel: 'oneToRootTwo',
  },
].sort((a, b) => b.ratio - a.ratio);

interface TheVirtualMonochordProps {
  questId?: string;
  interaction?: any;
}

const TheVirtualMonochord: React.FC<TheVirtualMonochordProps> = ({}) => {
  const { t } = useTranslations();

  // State
  const [baseFrequency, setBaseFrequency] = useState(220);
  const [dividedFrequency, setDividedFrequency] = useState(440);
  const [vibratingFundamental, setVibratingFundamental] = useState(false);
  const [vibratingDivided, setVibratingDivided] = useState(false);
  const [selectedProportion, setSelectedProportion] = useState<Tuning | null>(
    TUNINGS.find((tuning) => tuning.display === '1 : 2') || null,
  );
  const [, setAudioStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finalChallengeActive, setFinalChallengeActive] = useState(false);
  const [currentChallengeRatio, setCurrentChallengeRatio] = useState<Tuning | null>(null);
  const [challengeAttempts, setChallengeAttempts] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [isInitialChallengeSetup, setIsInitialChallengeSetup] = useState(false);
  const [showHelpLeft, setShowHelpLeft] = useState(false);
  const [showHelpRight, setShowHelpRight] = useState(false);
  const [leftClicked, setLeftClicked] = useState(false);
  const [rightClicked, setRightClicked] = useState(false);

  // New: indicator drag state and refs
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const stringContainerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const helpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const challengeAnsweredRef = useRef(false);
  const challengeCompletedRef = useRef(false);
  const startFinalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mysteryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mysteryInnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playAgainInnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [challengeAnsweredState, setChallengeAnsweredState] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);

  // Audio context
  const { isMuted, pauseBgm, playBgm } = useAudioManager();

  // Refs
  const oscARef = useRef<Tone.Oscillator | null>(null);
  const oscBRef = useRef<Tone.Oscillator | null>(null);
  const envARef = useRef<Tone.AmplitudeEnvelope | null>(null);
  const envBRef = useRef<Tone.AmplitudeEnvelope | null>(null);
  const initializedRef = useRef(false);

  // Constants
  const DIVIDED_FREQ_MIN = 20;
  const DIVIDED_FREQ_MAX = 1100;
  const TONE_TYPE = 'sawtooth4';
  const VOLUME_DB = -20; // Much lower volume
  const MUTED_VOLUME_DB = -Infinity; // Completely silent when muted

  // Calculate indicator position based on frequency
  const indicatorTop = useMemo(() => {
    const rel = (DIVIDED_FREQ_MAX - dividedFrequency) / (DIVIDED_FREQ_MAX - DIVIDED_FREQ_MIN);
    const minTop = 35; // Decreased top limit
    const maxTop = 275; // Increased bottom limit
    return minTop + rel * (maxTop - minTop);
  }, [dividedFrequency]);

  // Helper function to get current volume based on mute state
  const getCurrentVolume = useCallback(() => {
    return isMuted ? MUTED_VOLUME_DB : VOLUME_DB;
  }, [isMuted]);

  // Initialize audio setup
  useEffect(() => {
    // Cleanup function for when component unmounts
    return () => {
      if (oscARef.current) {
        oscARef.current.dispose();
      }
      if (oscBRef.current) {
        oscBRef.current.dispose();
      }
      if (envARef.current) {
        envARef.current.dispose();
      }
      if (envBRef.current) {
        envBRef.current.dispose();
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      if (leftTimerRef.current) {
        clearTimeout(leftTimerRef.current);
      }
      if (rightTimerRef.current) {
        clearTimeout(rightTimerRef.current);
      }
      if (helpTimerRef.current) {
        clearTimeout(helpTimerRef.current);
      }
      if (startFinalTimeoutRef.current) {
        clearTimeout(startFinalTimeoutRef.current);
      }
      if (mysteryTimeoutRef.current) {
        clearTimeout(mysteryTimeoutRef.current);
      }
      if (mysteryInnerTimeoutRef.current) {
        clearTimeout(mysteryInnerTimeoutRef.current);
      }
      if (playAgainInnerTimeoutRef.current) {
        clearTimeout(playAgainInnerTimeoutRef.current);
      }
    };
  }, []);

  // Manage background music when component is active
  useEffect(() => {
    // Pause background music when component mounts
    pauseBgm();

    // Resume background music when component unmounts
    return () => {
      playBgm();
    };
  }, []); // Only run on mount/unmount
  // Play a single note
  const playNote = useCallback(
    (
      osc: Tone.Oscillator,
      env: Tone.AmplitudeEnvelope,
      freq: number,
      setVibrating: (vibrating: boolean) => void,
    ) => {
      try {
        // Ensure the oscillator is properly connected and started
        if (osc.state !== 'started') {
          console.log('Restarting oscillator...');
          osc.start();
        }

        osc.frequency.setValueAtTime(freq, Tone.now());
        env.triggerAttackRelease('1.5s', Tone.now());

        // Visual vibration
        setVibrating(true);
        setTimeout(() => setVibrating(false), 500);
      } catch (error) {
        console.error('Error playing note:', error);
        // Try to recover by restarting the audio system
        initializedRef.current = false;
      }
    },
    [],
  );

  // Start audio context
  const startAudio = useCallback(async () => {
    try {
      console.log('Starting audio context...');

      // Only start if we haven't already initialized
      if (initializedRef.current) {
        console.log('Audio already initialized');
        return;
      }

      // Start Tone.js context - this must be called from a user interaction
      await Tone.start();
      console.log('Tone.js context started');

      // Clean up any existing components
      if (oscARef.current) oscARef.current.dispose();
      if (oscBRef.current) oscBRef.current.dispose();
      if (envARef.current) envARef.current.dispose();
      if (envBRef.current) envBRef.current.dispose();

      // Create new envelopes
      const envA = new Tone.AmplitudeEnvelope({
        attack: 0.1,
        decay: 0.2,
        sustain: 1.0,
        release: 1.5,
      }).toDestination();

      const envB = new Tone.AmplitudeEnvelope({
        attack: 0.1,
        decay: 0.2,
        sustain: 1.0,
        release: 1.5,
      }).toDestination();

      // Create new oscillators
      const oscA = new Tone.Oscillator(baseFrequency, TONE_TYPE).connect(envA);
      const oscB = new Tone.Oscillator(dividedFrequency, TONE_TYPE).connect(envB);

      // Set volume
      oscA.volume.value = getCurrentVolume();
      oscB.volume.value = getCurrentVolume();

      // Store refs
      oscARef.current = oscA;
      oscBRef.current = oscB;
      envARef.current = envA;
      envBRef.current = envB;

      // Start oscillators
      oscA.start();
      oscB.start();

      initializedRef.current = true;
      setAudioStarted(true);

      console.log('Audio context state:', Tone.context.state);
    } catch (error) {
      console.error('Error starting audio:', error);
    }
  }, [baseFrequency, dividedFrequency]);

  // Update oscillator volumes when mute state changes
  useEffect(() => {
    if (oscARef.current) {
      oscARef.current.volume.rampTo(getCurrentVolume(), 0.1);
    }
    if (oscBRef.current) {
      oscBRef.current.volume.rampTo(getCurrentVolume(), 0.1);
    }
  }, [isMuted, getCurrentVolume]);

  // Help hand timer functions - simple timers that show help until clicked
  const startLeftTimer = useCallback(() => {
    if (leftClicked) return; // Don't show if already clicked
    if (leftTimerRef.current) clearTimeout(leftTimerRef.current);
    leftTimerRef.current = setTimeout(() => {
      if (!leftClicked) {
        setShowHelpLeft(true);
      }
    }, 5000);
  }, [leftClicked]);

  const startRightTimer = useCallback(() => {
    if (rightClicked) return; // Don't show if already clicked
    if (rightTimerRef.current) clearTimeout(rightTimerRef.current);
    rightTimerRef.current = setTimeout(() => {
      if (!rightClicked) {
        setShowHelpRight(true);
      }
    }, 5000);
  }, [rightClicked]);

  // Start help timers on mount
  useEffect(() => {
    startLeftTimer();
    // Don't start right timer yet, wait for left interaction
  }, [startLeftTimer]);

  // Handle play frequencies button
  const togglePlayPause = useCallback(async () => {
    await startAudio();

    setIsPlaying((prev) => {
      const newPlaying = !prev;

      if (newPlaying) {
        // Start continuous play
        if (envARef.current && envBRef.current) {
          envARef.current.triggerAttack(Tone.now());
          envBRef.current.triggerAttack(Tone.now());
          setVibratingFundamental(true);
          setVibratingDivided(true);
          // Emit event for playing both notes together
          emitEvent('monochord1_play_together', {
            baseFrequency,
            dividedFrequency,
            action: 'play_both_notes',
          });

          // Stop after 1 second
          setTimeout(() => {
            if (envARef.current && envBRef.current) {
              envARef.current.triggerRelease(Tone.now());
              envBRef.current.triggerRelease(Tone.now());
              setVibratingFundamental(false);
              setVibratingDivided(false);
            }
            setIsPlaying(false);
          }, 1000);
        }
      } else {
        // Stop continuous play
        if (envARef.current && envBRef.current) {
          envARef.current.triggerRelease(Tone.now());
          envBRef.current.triggerRelease(Tone.now());
          setVibratingFundamental(false);
          setVibratingDivided(false);
        }
      }

      return newPlaying;
    });
  }, [startAudio, baseFrequency, dividedFrequency]);

  // Handle fundamental string click
  const handleFundamentalClick = useCallback(async () => {
    await startAudio();
    if (oscARef.current && envARef.current) {
      playNote(oscARef.current, envARef.current, baseFrequency, setVibratingFundamental);
      // Emit event for fundamental string pluck
      emitEvent('monochord1_fundamental_pluck', {
        frequency: baseFrequency,
      });
    }
    // Clear all timers and hide help permanently
    if (leftTimerRef.current) {
      clearTimeout(leftTimerRef.current);
      leftTimerRef.current = null;
    }
    if (helpTimerRef.current) {
      clearTimeout(helpTimerRef.current);
      helpTimerRef.current = null;
    }
    setShowHelpLeft(false);
    setLeftClicked(true);
    // Start right timer after left interaction
    startRightTimer();
  }, [startAudio, baseFrequency, playNote, startLeftTimer]);

  // Handle divided string click
  const handleDividedClick = useCallback(async () => {
    await startAudio();
    if (oscBRef.current && envBRef.current) {
      playNote(oscBRef.current, envBRef.current, dividedFrequency, setVibratingDivided);
      // Emit event for divided string pluck
      emitEvent('monochord1_divided_pluck', {
        frequency: dividedFrequency,
      });
    }
    // Clear all timers and hide help permanently
    if (rightTimerRef.current) {
      clearTimeout(rightTimerRef.current);
      rightTimerRef.current = null;
    }
    if (helpTimerRef.current) {
      clearTimeout(helpTimerRef.current);
      helpTimerRef.current = null;
    }
    setShowHelpRight(false);
    setRightClicked(true);
  }, [startAudio, dividedFrequency, playNote]);

  // Update oscillator frequencies when base frequency changes
  useEffect(() => {
    if (oscARef.current) {
      oscARef.current.frequency.rampTo(baseFrequency, 0.1);
    }
  }, [baseFrequency]);

  // Update oscillator volumes when mute state changes
  useEffect(() => {
    if (oscARef.current) {
      oscARef.current.volume.rampTo(getCurrentVolume(), 0.1);
    }
    if (oscBRef.current) {
      oscBRef.current.volume.rampTo(getCurrentVolume(), 0.1);
    }
  }, [isMuted, getCurrentVolume]);

  // Handle proportion button click
  const handleProportionClick = useCallback(
    async (tuning: Tuning) => {
      await startAudio();

      let newBaseFrequency = baseFrequency;
      let newDividedFrequency = baseFrequency / tuning.ratio;

      // Ensure both frequencies are within range
      if (newDividedFrequency > DIVIDED_FREQ_MAX) {
        newBaseFrequency = DIVIDED_FREQ_MAX * tuning.ratio;
        newDividedFrequency = DIVIDED_FREQ_MAX;
      } else if (newDividedFrequency < DIVIDED_FREQ_MIN) {
        newBaseFrequency = DIVIDED_FREQ_MIN * tuning.ratio;
        newDividedFrequency = DIVIDED_FREQ_MIN;
      }

      // Clamp base frequency to its range
      newBaseFrequency = Math.max(20, Math.min(1100, newBaseFrequency));

      setBaseFrequency(newBaseFrequency);
      setDividedFrequency(newDividedFrequency);
      setSelectedProportion(tuning);

      // Update oscillator frequency
      if (oscBRef.current) {
        oscBRef.current.frequency.rampTo(newDividedFrequency, 0.1);
      }

      // Play both notes (but not during initial challenge setup and not after challenge completed)
      if (!isInitialChallengeSetup && !challengeCompletedRef.current) {
        console.log('🎵 Playing audio from handleProportionClick');
        if (oscARef.current && envARef.current) {
          playNote(oscARef.current, envARef.current, baseFrequency, setVibratingFundamental);
        }

        if (oscBRef.current && envBRef.current) {
          setTimeout(() => {
            playNote(oscBRef.current!, envBRef.current!, newDividedFrequency, setVibratingDivided);
          }, 50);
        }
      }

      // Handle final challenge logic
      if (finalChallengeActive && currentChallengeRatio) {
        setChallengeAttempts((prev) => prev + 1);

        if (tuning.display === currentChallengeRatio.display) {
          // Correct answer - reset challenge state first to prevent audio
          setFinalChallengeActive(false);
          setCurrentChallengeRatio(null);
          setChallengeAttempts(0);
          setShowRetryButton(false); // Only hide retry button on correct answer
          // mark answered/completed immediately
          challengeAnsweredRef.current = true;
          challengeCompletedRef.current = true;
          setChallengeAnsweredState(true);
          setChallengeCompleted(true);

          // clear any scheduled mystery/play timeouts so no audio fires later
          if (startFinalTimeoutRef.current) {
            clearTimeout(startFinalTimeoutRef.current);
            startFinalTimeoutRef.current = null;
          }
          if (mysteryTimeoutRef.current) {
            clearTimeout(mysteryTimeoutRef.current);
            mysteryTimeoutRef.current = null;
          }
          if (mysteryInnerTimeoutRef.current) {
            clearTimeout(mysteryInnerTimeoutRef.current);
            mysteryInnerTimeoutRef.current = null;
          }
          if (playAgainInnerTimeoutRef.current) {
            clearTimeout(playAgainInnerTimeoutRef.current);
            playAgainInnerTimeoutRef.current = null;
          }

          announceToScreenReader(t('common.correct'));

          // Then emit event
          emitEvent('monochord1_challenge_completed', {
            action: 'correct_answer',
            selectedRatio: tuning.display,
            targetRatio: currentChallengeRatio.display,
            attempts: challengeAttempts + 1,
          });
        } else {
          // Incorrect answer - show retry feedback and keep it visible for 2.5 seconds
          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
          setShowRetryButton(true);
          feedbackTimeoutRef.current = setTimeout(() => {
            setShowRetryButton(false);
            feedbackTimeoutRef.current = null;
          }, 2500);
          // Don't emit an event - this keeps the dialogue on the same step
        }
      }

      // Emit event if 3:2 ratio is selected
      if (tuning.display === '2 : 3') {
        emitEvent('monochord1_try_3to2_ratio', {
          ratio: tuning.display,
          tuningName: tuning.name,
          baseFrequency,
          dividedFrequency: newDividedFrequency,
        });
      }
    },
    [
      startAudio,
      baseFrequency,
      playNote,
      finalChallengeActive,
      currentChallengeRatio,
      challengeAttempts,
      isInitialChallengeSetup,
    ],
  );

  // Start final challenge (called automatically by dialogue system)
  const startFinalChallenge = useCallback(async () => {
    console.log('🎵 startFinalChallenge called');

    // Ensure audio is initialized
    await startAudio();

    // Set flag to prevent audio during setup
    setIsInitialChallengeSetup(true);

    // Clear help timers during challenge
    if (leftTimerRef.current) {
      clearTimeout(leftTimerRef.current);
      leftTimerRef.current = null;
    }
    if (rightTimerRef.current) {
      clearTimeout(rightTimerRef.current);
      rightTimerRef.current = null;
    }
    if (helpTimerRef.current) {
      clearTimeout(helpTimerRef.current);
      helpTimerRef.current = null;
    }
    setShowHelpLeft(false);
    setShowHelpRight(false);

    // Randomly select either 4:3 or 5:4 ratio
    const challengeRatios = TUNINGS.filter((tuning) => tuning.display === '3 : 4' || tuning.display === '4 : 5');
    const randomRatio = challengeRatios[Math.floor(Math.random() * challengeRatios.length)];

    console.log('🎵 Selected ratio:', randomRatio.display);

    setCurrentChallengeRatio(randomRatio);
    setFinalChallengeActive(true);
    setChallengeAttempts(0);
    setShowRetryButton(false);

    // Set the frequency for the challenge ratio but DON'T show which one is selected
    const newDividedFrequency = baseFrequency / randomRatio.ratio;
    setDividedFrequency(newDividedFrequency);
    setSelectedProportion(null); // Deselect all proportions - user must guess!

    // Update oscillator frequency
    if (oscBRef.current) {
      oscBRef.current.frequency.rampTo(newDividedFrequency, 0.1);
    }

    // Clear the setup flag after a brief moment
    setTimeout(() => {
      setIsInitialChallengeSetup(false);
    }, 100);

    // Play both notes automatically after a short delay (only once!)
    if (!challengeCompletedRef.current) {
      if (mysteryTimeoutRef.current) clearTimeout(mysteryTimeoutRef.current);
      mysteryTimeoutRef.current = setTimeout(() => {
        console.log('🎵 Playing scheduled mystery harmony');
        if (challengeCompletedRef.current) return;
        if (oscARef.current && envARef.current) {
          playNote(oscARef.current, envARef.current, baseFrequency, setVibratingFundamental);
        }

        if (oscBRef.current && envBRef.current) {
          if (mysteryInnerTimeoutRef.current) clearTimeout(mysteryInnerTimeoutRef.current);
          mysteryInnerTimeoutRef.current = setTimeout(() => {
            if (challengeCompletedRef.current) return;
            playNote(oscBRef.current!, envBRef.current!, newDividedFrequency, setVibratingDivided);
            mysteryInnerTimeoutRef.current = null;
          }, 50);
        }
        mysteryTimeoutRef.current = null;
      }, 50); // Reduced delay
    }

    // Don't emit any event here - we only emit when user selects correct answer
    // The dialogue system should wait for monochord1_challenge_completed
  }, [startAudio, baseFrequency, playNote]);

  // Play mystery harmony again
  const playMysteryHarmonyAgain = useCallback(async () => {
    if (currentChallengeRatio) {
      await startAudio();
      const challengeFreq = baseFrequency / currentChallengeRatio.ratio;

      if (oscARef.current && envARef.current) {
        playNote(oscARef.current, envARef.current, baseFrequency, setVibratingFundamental);
      }

      if (oscBRef.current && envBRef.current) {
        if (playAgainInnerTimeoutRef.current) clearTimeout(playAgainInnerTimeoutRef.current);
        playAgainInnerTimeoutRef.current = setTimeout(() => {
          if (challengeCompletedRef.current) return;
          playNote(oscBRef.current!, envBRef.current!, challengeFreq, setVibratingDivided);
          playAgainInnerTimeoutRef.current = null;
        }, 50);
      }
    }
    // Hide the retry feedback when listen again is pressed
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setShowRetryButton(false);
  }, [startAudio, baseFrequency, playNote, currentChallengeRatio]);

  // Listen for dialogue events to trigger actions automatically
  useEffect(() => {
    const handleDialogueEvent = (event: any) => {
      const { detail } = event;

      switch (detail.action) {
        case 'start_final_challenge':
          // Automatically start the final challenge when dialogue reaches this point
          if (!challengeCompletedRef.current) {
            if (startFinalTimeoutRef.current) clearTimeout(startFinalTimeoutRef.current);
            startFinalTimeoutRef.current = setTimeout(() => {
              startFinalChallenge();
              startFinalTimeoutRef.current = null;
            }, detail.delay || 500); // Reduced default delay
          }
          break;

        case 'play_challenge_audio':
          // Play the current challenge ratio again
          if (finalChallengeActive && currentChallengeRatio && !challengeCompletedRef.current) {
            const challengeFreq = baseFrequency / currentChallengeRatio.ratio;
            if (oscARef.current && envARef.current && oscBRef.current && envBRef.current) {
              playNote(oscARef.current, envARef.current, baseFrequency, setVibratingFundamental);
              if (playAgainInnerTimeoutRef.current) clearTimeout(playAgainInnerTimeoutRef.current);
              playAgainInnerTimeoutRef.current = setTimeout(() => {
                if (challengeCompletedRef.current) return;
                playNote(oscBRef.current!, envBRef.current!, challengeFreq, setVibratingDivided);
                playAgainInnerTimeoutRef.current = null;
              }, 50);
            }
          }
          break;

        case 'reset_challenge':
          // Reset the challenge state
          if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
            feedbackTimeoutRef.current = null;
          }
          setFinalChallengeActive(false);
          setCurrentChallengeRatio(null);
          setChallengeAttempts(0);
          setShowRetryButton(false);
          break;
      }
    };

    // Listen for dialogue-triggered events
    window.addEventListener('monochord_dialogue_action', handleDialogueEvent);

    return () => {
      window.removeEventListener('monochord_dialogue_action', handleDialogueEvent);
    };
  }, [
    startFinalChallenge,
    finalChallengeActive,
    currentChallengeRatio,
    baseFrequency,
    playNote,
    challengeAnsweredState,
    challengeCompleted,
  ]);

  // Check if current frequency ratio matches any predefined proportion
  const checkProportionMatch = useCallback(() => {
    const currentRatio = baseFrequency / dividedFrequency;
    const matchingTuning = TUNINGS.find((tuning) => Math.abs(tuning.ratio - currentRatio) < 0.01);
    setSelectedProportion(matchingTuning || null);
  }, [baseFrequency, dividedFrequency]);

  // Debounced effect for checking proportion matches (but not during final challenge)
  useEffect(() => {
    if (finalChallengeActive) {
      // Don't auto-select proportions during the final challenge
      return;
    }

    const timeoutId = setTimeout(() => {
      checkProportionMatch();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [baseFrequency, dividedFrequency, checkProportionMatch, finalChallengeActive]);

  const updateSliderBackground = useCallback((input: HTMLInputElement) => {
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    const percent = ((value - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(to right, #007bff ${percent}%, #949494 ${percent}%)`;
  }, []);

  useEffect(() => {
    const baseFrequencySlider = document.getElementById(`slider-baseFrequency`) as HTMLInputElement;
    const dividedFrequencySlider = document.getElementById(`slider-dividedFrequency`) as HTMLInputElement;
    if (baseFrequencySlider) {
      updateSliderBackground(baseFrequencySlider);
    }
    if (dividedFrequencySlider) {
      updateSliderBackground(dividedFrequencySlider);
    }
  }, [baseFrequency, dividedFrequency, updateSliderBackground]);

  // Map vertical position inside the string container to frequency
  const clientToFreq = useCallback(
    (clientY: number) => {
      const container = stringContainerRef.current;
      if (!container) return dividedFrequency;
      const rect = container.getBoundingClientRect();
      // y from top to bottom -> we want top = max freq, bottom = min freq
      const rel = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const freq = DIVIDED_FREQ_MAX - rel * (DIVIDED_FREQ_MAX - DIVIDED_FREQ_MIN);
      return Math.round(freq);
    },
    [DIVIDED_FREQ_MIN, DIVIDED_FREQ_MAX, dividedFrequency],
  );

  const onDrag = useCallback(
    async (e: MouseEvent) => {
      if (!draggingRef.current || !(e.buttons & 1)) return;
      e.preventDefault();
      const nextFreq = clientToFreq(e.clientY);
      setDividedFrequency(nextFreq);

      // Ensure audio is started
      await startAudio();

      if (oscBRef.current) {
        try {
          oscBRef.current.frequency.rampTo(nextFreq, 0.1);
        } catch (error) {
          console.error('Error updating divided frequency:', error);
        }
      }
    },
    [clientToFreq, startAudio],
  );

  const endDrag = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      draggingRef.current = false;

      // Remove document listeners
      document.removeEventListener('mousemove', onDrag as any);
      document.removeEventListener('mouseup', endDrag as any);
    },
    [onDrag],
  );

  const startDrag = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      const nextFreq = clientToFreq(e.clientY);
      setDividedFrequency(nextFreq);

      // Ensure audio is started
      await startAudio();

      if (oscBRef.current) {
        try {
          oscBRef.current.frequency.rampTo(nextFreq, 0.1);
        } catch (error) {
          console.error('Error updating divided frequency:', error);
        }
      }

      // Add document listeners for drag continuation
      document.addEventListener('mousemove', onDrag as any);
      document.addEventListener('mouseup', endDrag as any);
    },
    [clientToFreq, startAudio, onDrag, endDrag],
  );

  return (
    <div className="absolute top-4 left-4 right-4 bottom-4 bg-[#1F1816] text-base">
      <div className="grid grid-cols-2 gap-6 items-center p-6 mt-2">
        {/* Left Column: Monochord Strings */}
        <div className="col-span-1 relative">
          {/* Monochord Board Background */}
          <div
            className="absolute inset-x-0 -inset-y-20 bg-contain bg-center bg-no-repeat z-0"
            style={{
              backgroundImage: "url('assets/monochord/monochord_board.png')",
            }}
          ></div>

          {/* Left - Right Column Layout for Strings */}
          <div className="relative flex justify-center px-6 mb-2">
            {/* Base Frequency Elements */}
            <div className="flex-1 flex flex-col items-center">
              {/* Label */}
              <h3 id="base-frequency-label" className="text-blue-300 font-semibold text-lg text-center leading-tight max-w-20">
                {t('monochord.baseFrequency')}
              </h3>

              {/* Strings Container */}
              <div className="relative mb-2 z-20">
                {/* Left String */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleFundamentalClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFundamentalClick();
                      }
                    }}
                    className="relative cursor-pointer focus:outline-none group"
                    aria-labelledby="base-frequency-label"
                    aria-describedby="base-frequency-value"
                    title={t('monochord.fundamentalToneString')}
                  >
                    {/* Glow Effect - positioned behind string, same size and position */}
                    <img
                      src="assets/monochord/monochord_left_hover.png"
                      alt="Left string glow"
                      className={`absolute w-auto h-70 object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-0`}
                      style={{ left: '14px', top: '0' }}
                      draggable={false}
                    />
                    <img
                      src="assets/monochord/monochord_left.png"
                      alt="Left string"
                      className={`w-auto h-70 object-contain transition-all duration-200 ${
                        vibratingFundamental ? 'vibrating' : ''
                      } z-10 relative`}
                      draggable={false}
                    />
                  </button>
                  {/* Help hand */}
                  {showHelpLeft && (
                    <img
                      src="assets/monochord/help_cursor.png"
                      alt={t('monochord.helpHandLeft')}
                      className="absolute w-12 h-12 object-contain animate-pulse z-20"
                      style={{ left: '85%', top: '80px', transform: 'translateX(-50%)' }}
                      draggable={false}
                    />
                  )}
                </div>

                {/* Min/Max Labels for Left String */}
                <div className="absolute -left-8 top-12 bottom-12 flex flex-col justify-between text-sm text-blue-200 pointer-events-none" aria-label={t('monochord.baseFrequencyRange')}>
                  <span className="transform -translate-y-1" aria-hidden="true">1100 Hz</span>
                  <span className="transform translate-y-1" aria-hidden="true">20 Hz</span>
                </div>
              </div>

              {/* Frequency Spin button */}
              <div className="flex items-center">
                <div className="relative" role="presentation">
                  <img
                    src="assets/monochord/monochord_frequency.png"
                    alt=""
                    aria-hidden="true"
                    className="w-auto h-auto"
                    draggable={false}
                  />
                  {/* Frequency text overlay with spinbutton for accessibility */}
                  <div className="absolute inset-0 flex items-center justify-between px-4" role="presentation">
                    <div
                      id="base-frequency-value"
                      role="spinbutton"
                      aria-labelledby="base-frequency-label"
                      aria-valuenow={baseFrequency}
                      aria-valuemin={20}
                      aria-valuemax={1100}
                      aria-valuetext={`${baseFrequency.toFixed(2)} hertz`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setBaseFrequency((prev) => Math.min(prev + 10, 1100));
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setBaseFrequency((prev) => Math.max(prev - 10, 20));
                        } else if (e.key === 'Home') {
                          e.preventDefault();
                          setBaseFrequency(20);
                        } else if (e.key === 'End') {
                          e.preventDefault();
                          setBaseFrequency(1100);
                        } else if (e.key === 'PageUp') {
                          e.preventDefault();
                          setBaseFrequency((prev) => Math.min(prev + 100, 1100));
                        } else if (e.key === 'PageDown') {
                          e.preventDefault();
                          setBaseFrequency((prev) => Math.max(prev - 100, 20));
                        }
                      }}
                      className="text-blue-400 font-bold text-base whitespace-nowrap min-w-[80px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F1816] rounded px-1"
                    >
                      {baseFrequency.toFixed(2)} Hz
                    </div>
                    <div className="absolute -right-5 flex flex-col" role="presentation">
                      {/* Visual-only buttons that trigger the spinbutton value changes */}
                      <button
                        onClick={() => setBaseFrequency((prev) => Math.min(prev + 10, 1100))}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="text-blue-400 hover:text-blue-300 transition-colors absolute top-[-40px] left-[-80px] w-9 h-6"
                      >
                        <svg width="36" height="30" viewBox="0 0 24 24" fill="#60A5FA" aria-hidden="true">
                          <path d="M7 14l5-5 5 5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setBaseFrequency((prev) => Math.max(prev - 10, 20))}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="text-blue-400 hover:text-blue-300 transition-colors absolute top-[-14px] left-[-80px] w-9 h-6"
                      >
                        <svg width="36" height="30" viewBox="0 0 24 24" fill="#60A5FA" aria-hidden="true">
                          <path d="M7 10l5 5 5-5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Adjustable Frequency Elements */}
            <div className="flex-1 flex flex-col items-center">
              {/* Label */}
              <h3 id="adjustable-frequency-label" className="text-amber-300 font-semibold text-lg text-center leading-tight max-w-20">
                {t('monochord.adjustableFrequency')}
              </h3>

              {/* Strings Container - Button with Slider */}
              <div className="relative mb-4" ref={stringContainerRef}>
                {/* Right String with Slider */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <button
                      onClick={handleDividedClick}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleDividedClick();
                        }
                      }}
                      className="relative cursor-pointer focus:outline-none group"
                      aria-labelledby="adjustable-frequency-label"
                      aria-describedby="adjustable-frequency-value"
                      title={t('monochord.dividedStringTitle')}
                    >
                      {/* Glow Effect - positioned behind string, same size and position */}
                      <img
                        src="assets/monochord/monochord_right_hover.png"
                        alt="Right string glow"
                        className={`absolute w-auto h-70 object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-5`}
                        style={{ left: '14px', top: '0' }}
                        draggable={false}
                      />
                      {/* Yellow string should always be full; use indicator to control frequency */}
                      <img
                        src="assets/monochord/monochord_right.png"
                        alt="Right string"
                        className={`w-auto h-70 object-contain transition-all duration-200 ${
                          vibratingDivided ? 'vibrating' : ''
                        } z-10 relative`}
                        draggable={false}
                      />
                    </button>
                    {/* Help hand */}
                    {showHelpRight && (
                      <img
                        src="assets/monochord/help_cursor.png"
                        alt={t('monochord.helpHandRight')}
                        className="absolute w-12 h-12 object-contain animate-pulse z-20"
                        style={{ left: '78%', top: '80px', transform: 'translateX(-50%)' }}
                        draggable={false}
                      />
                    )}

                    {/* Indicator placed behind the string (visual only) */}
                    <div
                      ref={indicatorRef}
                      role="presentation"
                      className="absolute left-1/2 -translate-x-1/2 w-14 h-6 bg-[#FFF2CC] border-2 border-black rounded-md pointer-events-none z-0"
                      style={{ top: `${indicatorTop}px` }}
                    />
                    {/* Invisible interactive handle on top so dragging works even though indicator is behind the string */}
                    <div
                      role="slider"
                      aria-labelledby="adjustable-frequency-label"
                      aria-valuemin={DIVIDED_FREQ_MIN}
                      aria-valuemax={DIVIDED_FREQ_MAX}
                      aria-valuenow={Math.round(dividedFrequency)}
                      aria-valuetext={`${Number(dividedFrequency.toFixed(2)).toString()} Hz`}
                      tabIndex={0}
                      className="absolute left-1/2 -translate-x-1/2 w-16 h-8 z-30 cursor-grab opacity-0 pointer-events-auto"
                      style={{ top: `${indicatorTop}px` }}
                      onMouseDown={startDrag}
                      onKeyDown={async (e) => {
                        const step = 1;
                        let newFreq = dividedFrequency;
                        
                        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                          e.preventDefault();
                          newFreq = Math.min(dividedFrequency + step, DIVIDED_FREQ_MAX);
                        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                          e.preventDefault();
                          newFreq = Math.max(dividedFrequency - step, DIVIDED_FREQ_MIN);
                        } else if (e.key === 'PageUp') {
                          e.preventDefault();
                          newFreq = Math.min(dividedFrequency + step * 5, DIVIDED_FREQ_MAX);
                        } else if (e.key === 'PageDown') {
                          e.preventDefault();
                          newFreq = Math.max(dividedFrequency - step * 5, DIVIDED_FREQ_MIN);
                        } else if (e.key === 'Home') {
                          e.preventDefault();
                          newFreq = DIVIDED_FREQ_MAX;
                        } else if (e.key === 'End') {
                          e.preventDefault();
                          newFreq = DIVIDED_FREQ_MIN;
                        } else {
                          return;
                        }

                        setDividedFrequency(newFreq);

                        // Ensure audio is started
                        await startAudio();

                        if (oscBRef.current) {
                          try {
                            oscBRef.current.frequency.rampTo(newFreq, 0.1);
                          } catch (error) {
                            console.error('Error updating divided frequency:', error);
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Min/Max Labels for Right String */}
                <div className="absolute -right-8 top-12 bottom-12 flex flex-col justify-between text-sm text-amber-200 pointer-events-none" aria-label={t('monochord.adjustableFrequencyRange')}>
                  <span className="transform -translate-y-1" aria-hidden="true">{DIVIDED_FREQ_MAX} Hz</span>
                  <span className="transform translate-y-1" aria-hidden="true">{DIVIDED_FREQ_MIN} Hz</span>
                </div>
              </div>

              {/* Frequency value */}
              <div className="flex items-center">
                <p id="adjustable-frequency-value" className="text-amber-300 font-bold text-base whitespace-nowrap">
                  {dividedFrequency.toFixed(2)} Hz
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Play Both Button (absolutely positioned) */}
        <div className="absolute bottom-25 left-15 z-20">
          <button
            onClick={togglePlayPause}
            className="px-8 py-4 text-amber-100 transition-all duration-200 focus:outline-none bg-no-repeat bg-center bg-contain"
            style={{
              backgroundImage: "url('assets/buttons/wider_default.png')",
              backgroundSize: '100% 100%',
              width: '200px',
              height: '60px',
              fontSize: '18px',
              fontWeight: 'bold',
              position: 'relative',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundImage = "url('assets/buttons/wider_hover.png')";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundImage = "url('assets/buttons/wider_default.png')";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.backgroundImage = "url('assets/buttons/wider_pressed.png')";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.backgroundImage = "url('assets/buttons/wider_hover.png')";
            }}
            aria-label={isPlaying ? t('monochord.pauseAria') : t('monochord.playBothAria')}
          >
            {isPlaying ? t('monochord.pause') : t('monochord.playBoth')}
          </button>
        </div>

        {/* Right Column: Proportion Selection */}
        <div className="col-span-1 flex flex-col h-96">
          {/* Choose a Proportion */}
          <h2 id="choose-proportion-heading" className="text-lg font-semibold text-left mb-3" style={{ color: '#FFC517' }}>
            {t('monochord.chooseAProportion')}
          </h2>
          <ul 
            className="grid grid-cols-3 gap-1 w-full overflow-y-auto custom-scrollbar pr-2 flex-grow"
            aria-labelledby="choose-proportion-heading"
          >
            {TUNINGS.map((tuning, index) => (
              <li key={index}>
                <button
                  onClick={() => handleProportionClick(tuning)}
                  aria-label={`${t('monochord.proportion')} ${tuning.display} ${
                    selectedProportion?.display === tuning.display ? t('monochord.selected') : ''
                  }`}
                  className={`w-full h-full p-2 text-base rounded-md shadow-sm transition-all duration-200 border focus:outline-none bg-no-repeat bg-center ${
                    selectedProportion?.display === tuning.display
                      ? 'text-amber-900 cursor-default shadow-inner'
                      : 'text-amber-900'
                  }`}
                  style={{
                    backgroundImage:
                      selectedProportion?.display === tuning.display
                        ? "url('assets/buttons/pressed.png')"
                        : "url('assets/buttons/default.png')",
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProportion?.display !== tuning.display) {
                      e.currentTarget.style.backgroundImage = "url('assets/buttons/hover.png')";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProportion?.display !== tuning.display) {
                      e.currentTarget.style.backgroundImage = "url('assets/buttons/default.png')";
                    }
                  }}
                  onMouseDown={(e) => {
                    if (selectedProportion?.display !== tuning.display) {
                      e.currentTarget.style.backgroundImage = "url('assets/buttons/pressed.png')";
                    }
                  }}
                  onMouseUp={(e) => {
                    if (selectedProportion?.display !== tuning.display) {
                      e.currentTarget.style.backgroundImage = "url('assets/buttons/hover.png')";
                    }
                  }}
                >
                  {tuning.display}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Listen Again Button (absolutely positioned) with Mystery Harmony above */}
      {finalChallengeActive && !challengeAnsweredState && (
        <div
          className="absolute bottom-25 right-15 flex flex-col items-center"
          style={{ height: '100px', justifyContent: 'flex-end' }}
        >
          <h3 className="text-purple-400 text-lg font-semibold mb-2">{t('monochord.mysteryHarmony')}</h3>
          <button
            onClick={playMysteryHarmonyAgain}
            className="px-8 py-4 text-purple-100 transition-all duration-200 focus:outline-none bg-no-repeat bg-center bg-contain"
            style={{
              backgroundImage: "url('assets/buttons/wider_default.png')",
              backgroundSize: '100% 100%',
              width: '200px',
              height: '60px',
              fontSize: '18px',
              fontWeight: 'bold',
              position: 'relative',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundImage = "url('assets/buttons/wider_hover.png')";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundImage = "url('assets/buttons/wider_default.png')";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.backgroundImage = "url('assets/buttons/wider_pressed.png')";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.backgroundImage = "url('assets/buttons/wider_hover.png')";
            }}
            aria-label={t('monochord.listenAgainAria')}
          >
            {t('monochord.listenAgain')}
          </button>
        </div>
      )}

      {/* Centered feedback text when incorrect */}
      {showRetryButton && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center justify-center"
          style={{
            position: 'relative',
            left: '50%',
            top: '140px',
            transform: 'translateX(-50%)',
            minWidth: '200px',
          }}
        >
          <p className="text-red-400 text-lg font-semibold whitespace-nowrap">
            {t('monochord.incorrectFeedback')}
          </p>
        </div>
      )}
    </div>
  );
};

export default TheVirtualMonochord;
