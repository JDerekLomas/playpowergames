import React, { useState, useEffect, useCallback, useRef } from 'react';
import { emitEvent } from '../../../utils/eventEmitter';
import { useTranslations } from '../../../hooks/useTranslations';
import { announceToScreenReader } from '@k8-games/sdk';

interface PebblePosition {
  row: number;
  col: number;
  id: number;
}

type Mode = 'even-odd' | 'squares' | 'tetractys' | 'build-and-guess';

const EvenOddVisualization: React.FC = () => {
  const { t } = useTranslations();
  const [evenCount, setEvenCount] = useState(10);
  const [oddCount, setOddCount] = useState(9);

  const generateNewNumbers = () => {
    // Generate random even number between 4-12
    const newEvenCount = Math.floor(Math.random() * 5) * 2 + 4; // 4, 6, 8, 10, 12
    // Generate random odd number between 3-11
    const newOddCount = Math.floor(Math.random() * 5) * 2 + 3; // 3, 5, 7, 9, 11

    setEvenCount(newEvenCount);
    setOddCount(newOddCount);

    announceToScreenReader(t('figurate.generateNewNumbersAnnouncement')
      .replace("{evenCount}", newEvenCount.toString())
      .replace("{oddCount}", newOddCount.toString()));
  };
  // Determine shared columns so both boards align; minimum 5 columns
  const columns = Math.max(5, Math.ceil(Math.max(evenCount, oddCount) / 2));

  const renderTwoRows = (count: number, color: string, showPlaceholder = false) => {
    const firstRowCount = Math.ceil(count / 2);
    const secondRowCount = Math.floor(count / 2);

    const firstRow = Array.from({ length: columns }, (_, i) => {
      if (i < firstRowCount)
        return (
          <div key={`f-${i}`} className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        );
      return <div key={`f-${i}`} style={{ width: 32 }} />;
    });

    const secondRow = Array.from({ length: columns }, (_, i) => {
      if (i < secondRowCount)
        return (
          <div key={`s-${i}`} className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        );
      if (showPlaceholder && i === secondRowCount)
        return (
          <div
            key={`s-p-${i}`}
            className="w-8 h-8 rounded-full border-2 border-dashed border-amber-400 flex-shrink-0"
          />
        );
      return <div key={`s-${i}`} style={{ width: 32 }} />;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>{firstRow}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>{secondRow}</div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-left space-y-2 mb-6">
        <h2 className="text-2xl font-bold text-white">{t('figurate.evenOddTitle')}</h2>
        <p className="text-base text-gray-300">{t('figurate.evenOddSubtitle')}</p>
      </div>

      {/* Generate New Numbers Button - Left aligned and bigger */}
      <div className="flex justify-start mb-8">
        <button
          onClick={generateNewNumbers}
          className="relative"
          style={{
            backgroundImage: 'url(assets/buttons/wider_default.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            width: '280px',
            height: '80px',
            border: 'none',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_default.png)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_pressed.png)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
          }}
        >
          <span className="text-white font-bold text-lg">{t('figurate.generateNewNumbers')}</span>
        </button>
      </div>

      {/* Side by side demonstration boards using proof_board.png */}
      <div className="flex justify-center gap-6 items-center">
        {/* Even Numbers Board */}
        <div className="relative">
          <div
            className="relative"
            style={{
              backgroundImage: 'url(assets/proof_board.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              width: '355px',
              height: '350px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px',
            }}
          >
            <div
              className="absolute inset-1 rounded-[6px] z-0"
              style={{
                backgroundColor: '#000000'
              }}
            />

            {/* Header (fixed) */}
            <div
              className="z-10 w-full"
              style={{
                minHeight: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <h3 className="text-xl font-bold text-white mb-2">{t('figurate.evenNumbers')}</h3>
              <p className="text-gray-300 text-sm">{t('figurate.evenDescription')}</p>
            </div>

            {/* Pebble area (center) - fixed two-row grid */}
            <div className="z-10 w-full flex-1 flex items-center justify-center" style={{ minHeight: 180 }}>
              <div style={{ width: '100%', boxSizing: 'border-box' }}>{renderTwoRows(evenCount, '#61C0FF')}</div>
            </div>

            {/* Footer (fixed) */}
            <div
              className="z-10 w-full"
              style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className="text-white font-bold">
                {evenCount} {t('figurate.pebbles')}
              </span>
            </div>
          </div>
        </div>

        {/* Odd Numbers Board */}
        <div className="relative">
          <div
            className="relative"
            style={{
              backgroundImage: 'url(assets/proof_board.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              width: '355px',
              height: '350px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px',
            }}
          >
            <div
              className="absolute inset-1 rounded-[6px] z-0"
              style={{
                backgroundColor: '#000000'
              }}
            />

            {/* Header (fixed) */}
            <div
              className="z-10 w-full"
              style={{
                minHeight: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <h3 className="text-xl font-bold text-white mb-2">{t('figurate.oddNumbers')}</h3>
              <p className="text-gray-300 text-sm">{t('figurate.oddDescription')}</p>
            </div>

            {/* Pebble area (center) - fixed two-row grid */}
            <div className="z-10 w-full flex-1 flex items-center justify-center" style={{ minHeight: 180 }}>
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                {renderTwoRows(oddCount, '#FFB700', true)}
              </div>
            </div>

            {/* Footer (fixed) */}
            <div
              className="z-10 w-full"
              style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className="text-white font-bold">
                {oddCount} {t('figurate.pebbles')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SquareVisualization: React.FC = () => {
  const { t } = useTranslations();
  const [currentSize, setCurrentSize] = useState(1);
  // Screen reader announcement counter
  const squareAnnouncementCountRef = useRef(0);

  // Event tracking state
  const [squareAddLayerCount, setSquareAddLayerCount] = useState(0);
  const [nineSquareCompleted, setNineSquareCompleted] = useState(false);

  const addLayer = () => {
    if (currentSize < 10) {
      setCurrentSize(currentSize + 1);
      // Track add layer button presses for nine square event
      const newCount = squareAddLayerCount + 1;
      setSquareAddLayerCount(newCount);

      // Emit event when user presses add layer at least 3 times
      if (newCount >= 2 && !nineSquareCompleted) {
        setNineSquareCompleted(true);
        emitEvent('monochord2_nine_square_completed', {
          action: 'add_layer_pressed',
          totalPresses: newCount,
          finalSize: currentSize + 1,
        });
      }
      // Announce updated pebble count
      const announcer = document.getElementById('aria-announcer');
      if (announcer) {
        squareAnnouncementCountRef.current += 1;
        const totalPebbles = (currentSize + 1) * (currentSize + 1);
        announcer.textContent = `${t('figurate.squareTool')}: ${t('figurate.pebbles')} ${totalPebbles}` + `${'\u200B'.repeat(squareAnnouncementCountRef.current)}`;
      }
    }
  };

  const resetSquare = () => {
    setCurrentSize(1);
    // Announce reset pebble count
    const announcer = document.getElementById('aria-announcer');
    if (announcer) {
      squareAnnouncementCountRef.current += 1;
      announcer.textContent = `${t('figurate.squareTool')}: ${t('figurate.pebbles')} ${1}` + `${'\u200B'.repeat(squareAnnouncementCountRef.current)}`;
    }
  };

  const getTotalPebbles = () => {
    return currentSize * currentSize;
  };

  const getEquationString = () => {
    return (
      <>
        {currentSize} × {currentSize} = <span style={{ color: '#FF00FB' }}>{getTotalPebbles()}</span>
      </>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-left space-y-2 mb-6">
        <h2 className="text-2xl font-bold text-white">{t('figurate.squareTitle')}</h2>
        <p className="text-base text-gray-300">{t('figurate.squareSubtitle')}</p>
      </div>

      {/* Single large proof board */}
      <div className="flex justify-center mb-8">
        <div
          className="relative"
          style={{
            backgroundImage: 'url(assets/proof_board.png)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            height: '600px',
            width: '800px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px',
          }}
        >
          <div
            className="absolute inset-2 rounded-[6px] z-0"
            style={{
              backgroundColor: '#000000'
            }}
          />
          {/* Top buttons placed inside the board */}
          <div className="absolute" style={{ top: 14, left: -30 }}>
            <button
              onClick={addLayer}
              className="relative"
              style={{
                backgroundImage: 'url(assets/buttons/default.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                width: '200px',
                height: '60px',
                border: 'none',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/default.png)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/pressed.png)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
              }}
            >
              <span className="text-white font-bold text-base">{t('figurate.addRow')}</span>
            </button>
          </div>

          <div className="absolute" style={{ top: 14, right: -7 }}>
            <button
              onClick={resetSquare}
              className="relative"
              style={{
                backgroundImage: 'url(assets/buttons/default.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                width: '150px',
                height: '60px',
                border: 'none',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/default.png)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/pressed.png)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
              }}
            >
              <span className="text-white font-bold text-base">{t('figurate.reset')}</span>
            </button>
          </div>

          {/* Square visualization */}
          <div className="z-10 flex-1 flex flex-col justify-center items-center">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${currentSize}, 1fr)` }}>
              {[...Array(currentSize * currentSize)].map((_, index) => {
                const row = Math.floor(index / currentSize);
                const col = index % currentSize;

                // Determine if this pebble is part of the newest L-shaped layer
                // L-shape consists of: bottom row OR rightmost column (but avoid double-counting corner)
                const isNewLayer = row === currentSize - 1 || col === currentSize - 1;

                return (
                  <div
                    key={index}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${currentSize === 1 || isNewLayer ? '' : 'bg-white'}`}
                    style={currentSize === 1 || isNewLayer ? { backgroundColor: '#FF00FB' } : {}}
                  >
                    {(currentSize === 1 || isNewLayer) && (
                      <span className="text-black font-bold text-[30px] leading-none translate-y-[-4px]">+</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom equation */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="bg-black bg-opacity-70 px-6 py-3 rounded-lg">
              <span className="text-white font-bold text-xl">{getEquationString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TetractysVisualization: React.FC = () => {
  const { t } = useTranslations();
  const [currentRows, setCurrentRows] = useState(1);
  // Screen reader announcement counter
  const triangleAnnouncementCountRef = useRef(0);

  // Event tracking state
  const [triangleAddRowCount, setTriangleAddRowCount] = useState(0);
  const [trianglePatternCompleted, setTrianglePatternCompleted] = useState(false);

  const addRow = () => {
    if (currentRows < 10) {
      setCurrentRows(currentRows + 1);
      // Track add row button presses for triangle pattern event
      const newCount = triangleAddRowCount + 1;
      setTriangleAddRowCount(newCount);

      // Emit event when user presses add row at least 4 times
      if (newCount >= 3 && !trianglePatternCompleted) {
        setTrianglePatternCompleted(true);
        emitEvent('monochord2_triangle_pattern_completed', {
          action: 'add_row_pressed',
          totalPresses: newCount,
          finalRows: currentRows + 1,
        });
      }
      // Announce updated pebble count
      const announcer = document.getElementById('aria-announcer');
      if (announcer) {
        triangleAnnouncementCountRef.current += 1;
        const totalPebbles = ((currentRows + 1) * (currentRows + 2)) / 2; // after increment
        announcer.textContent = `${t('figurate.triangularTool')}: ${t('figurate.pebbles')} ${totalPebbles}` + `${'\u200B'.repeat(triangleAnnouncementCountRef.current)}`;
      }
    }
  };

  const resetTriangle = () => {
    setCurrentRows(1);
    // Announce reset pebble count
    const announcer = document.getElementById('aria-announcer');
    if (announcer) {
      triangleAnnouncementCountRef.current += 1;
      const totalPebbles = (1 * (1 + 1)) / 2;
      announcer.textContent = `${t('figurate.triangularTool')}: ${t('figurate.pebbles')} ${totalPebbles}` + `${'\u200B'.repeat(triangleAnnouncementCountRef.current)}`;
    }
  };

  const getTotalPebbles = () => {
    return (currentRows * (currentRows + 1)) / 2;
  };

  const getEquationString = () => {
    const elements = [];
    for (let i = 1; i <= currentRows; i++) {
      if (i > 1) {
        elements.push(' + ');
      }
      if (i === currentRows) {
        elements.push(
          <span key={i} style={{ color: '#FF00FB' }}>
            {i}
          </span>,
        );
      } else {
        elements.push(<span key={i}>{i}</span>);
      }
    }
    elements.push(' = ' + getTotalPebbles());
    return <>{elements}</>;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-left space-y-2 mb-6">
        <h2 className="text-2xl font-bold text-white">{t('figurate.triangularTitle')}</h2>
        <p className="text-base text-gray-300">{t('figurate.triangularSubtitle')}</p>
      </div>

      {/* Single large proof board (match Square mode) */}
      <div className="flex justify-center mb-8">
        <div
          className="relative"
          style={{
            backgroundImage: 'url(assets/proof_board.png)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            height: '600px',
            width: '800px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px',
          }}
        >
          <div
            className="absolute inset-2 rounded-[6px] z-0"
            style={{
              backgroundColor: '#000000'
            }}
          />

          {/* Top buttons placed inside the board (same layout as Square) */}
          <div className="absolute" style={{ top: 14, left: -30 }}>
            <button
              onClick={addRow}
              className="relative"
              style={{
                backgroundImage: 'url(assets/buttons/default.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                width: '200px',
                height: '60px',
                border: 'none',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/default.png)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/pressed.png)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
              }}
            >
              <span className="text-white font-bold text-base">{t('figurate.addRow')}</span>
            </button>
          </div>

          <div className="absolute" style={{ top: 14, right: -7 }}>
            <button
              onClick={resetTriangle}
              className="relative"
              style={{
                backgroundImage: 'url(assets/buttons/default.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                width: '150px',
                height: '60px',
                border: 'none',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/default.png)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/pressed.png)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
              }}
            >
              <span className="text-white font-bold text-base">{t('figurate.reset')}</span>
            </button>
          </div>

          {/* Triangle visualization (smaller pebbles to avoid overflow) */}
          <div className="z-10 flex-1 flex flex-col justify-center items-center space-y-1">
            {[...Array(currentRows)].map((_, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1">
                {[...Array(rowIndex + 1)].map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${rowIndex === currentRows - 1 ? '' : 'bg-white'}`}
                    style={rowIndex === currentRows - 1 ? { backgroundColor: '#FF00FB' } : {}}
                  >
                    {(rowIndex === currentRows - 1) && (
                      <span className="text-black font-bold text-[30px] leading-none translate-y-[-4px]">+</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom equation */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="bg-black bg-opacity-70 px-6 py-3 rounded-lg">
              <span className="text-white font-bold text-xl">{getEquationString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BuildAndGuessVisualization: React.FC = () => {
  const { t } = useTranslations();
  const [targetNumber, setTargetNumber] = useState(16);
  const [triangleRows, setTriangleRows] = useState(1);
  const [squareSize, setSquareSize] = useState(1);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<'triangular' | 'square' | 'both' | 'neither' | null>(null);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);

  // Event tracking state for build and guess mode
  const [, setCorrectAnswersCount] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  // Attempts progress (max 5)
  const [attemptResults, setAttemptResults] = useState<boolean[]>([]);
  // Pool of remaining numbers to ensure uniqueness
  const remainingNumbersRef = useRef<number[] | null>(null);
  // Announcement counter for screen readers
  const announcementCountRef = useRef(0);
  const announceToSR = (msg: string) => {
    const announcer = document.getElementById('aria-announcer');
    if (!announcer) return;
    announcementCountRef.current += 1;
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = msg + `${'\u200B'.repeat(announcementCountRef.current)}`;
    }, 50);
  };

  const shuffle = (arr: number[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const generateNewNumber = () => {
    if (challengeCompleted) return; // stop after completion

    const possibleNumbers = [4, 9, 10, 15, 16, 21, 25, 28, 36, 45, 49, 50];

    // Initialize pool if needed
    if (!remainingNumbersRef.current || remainingNumbersRef.current.length === 0) {
      remainingNumbersRef.current = shuffle([...possibleNumbers]);
    }

    // Pop one number from the pool to ensure uniqueness per session
    const next = remainingNumbersRef.current!.pop()!;
    setTargetNumber(next);
    setFeedback(null); // Reset feedback when new number is generated
    setCorrectAnswer(null); // Reset correct answer highlight
    setButtonsDisabled(false); // Re-enable buttons

    // Determine the correct answer for the new number
    const triangular = isTriangular(next);
    const square = isSquare(next);

    let answer: 'triangular' | 'square' | 'both' | 'neither';
    if (triangular && square) answer = 'both';
    else if (triangular && !square) answer = 'triangular';
    else if (!triangular && square) answer = 'square';
    else answer = 'neither';

    setCorrectAnswer(answer);

  // Auto-announce the question prompt with the new number
  const questionText = t('figurate.buildAndGuessQuestion');
  announceToSR(`${questionText} ${next}`);
  };

  // Helper functions to check number properties
  const isTriangular = (n: number): boolean => {
    // A number is triangular if 8n + 1 is a perfect square
    const discriminant = 8 * n + 1;
    const sqrt = Math.sqrt(discriminant);
    return sqrt === Math.floor(sqrt);
  };

  const isSquare = (n: number): boolean => {
    const sqrt = Math.sqrt(n);
    return sqrt === Math.floor(sqrt);
  };

  const checkAnswer = (answer: 'triangular' | 'square' | 'both' | 'neither') => {
    if (buttonsDisabled || challengeCompleted) return; // Prevent spam clicking

    const triangular = isTriangular(targetNumber);
    const square = isSquare(targetNumber);

    let correct = false;
    if (answer === 'triangular' && triangular && !square) correct = true;
    else if (answer === 'square' && !triangular && square) correct = true;
    else if (answer === 'both' && triangular && square) correct = true;
    else if (answer === 'neither' && !triangular && !square) correct = true;

    setFeedback(correct ? 'correct' : 'incorrect');
    setButtonsDisabled(true); // Disable buttons during feedback

    // Screen reader announcement
    announcementCountRef.current += 1;
    const announcer = document.getElementById('aria-announcer');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => {
        if (correct) {
          announcer.textContent = `${t('common.correct')}${'\u200B'.repeat(announcementCountRef.current)}`;
          console.log('Announcing CORRECT');
        } else {
          // Announce incorrect and the correct answer
          let correctText = '';
          if (correctAnswer === 'both') correctText = t('figurate.answerBoth');
          else if (correctAnswer === 'triangular') correctText = t('figurate.answerTriangular');
          else if (correctAnswer === 'square') correctText = t('figurate.answerSquare');
          else if (correctAnswer === 'neither') correctText = t('figurate.answerNeither');
          announcer.textContent = `${t('common.incorrect')} — ${t('figurate.correctAnswerIs')} ${correctText}${'\u200B'.repeat(announcementCountRef.current)}`;
          console.log('Announcing INCORRECT with correct answer');
        }
      }, 50);
    }

    // Record attempt result (cap at 5) and complete after 5 attempts
    setAttemptResults((prev) => {
      if (prev.length >= 5) return prev;
      const next = [...prev, correct];
      if (correct) setCorrectAnswersCount((c) => c + 1);
      if (next.length === 5) {
        setChallengeCompleted(true);
        emitEvent('monochord2_challenge_completed', {
          action: 'attempts_complete',
          attempts: next,
          correctCount: next.filter(Boolean).length,
          targetNumber: targetNumber,
          answerGiven: answer,
        });
      } else {
        setTimeout(() => {
          generateNewNumber();
        }, 1200);
      }
      return next;
    });
  };

  // Generate initial number on mount
  useEffect(() => {
    // initialize unique pool and generate first number
    remainingNumbersRef.current = null;
    generateNewNumber();
  }, []);

  const addTriangleRow = () => {
    if (triangleRows < 10) {
      setTriangleRows(triangleRows + 1);
      // Announce updated triangular pebble count
      const announcer = document.getElementById('aria-announcer');
      if (announcer) {
        announcementCountRef.current += 1;
        const totalPebbles = ((triangleRows + 1) * (triangleRows + 2)) / 2;
        announcer.textContent = `${t('figurate.triangularTool')}: ${t('figurate.pebbles')} ${totalPebbles}` + `${'\u200B'.repeat(announcementCountRef.current)}`;
      }
    }
  };

  const resetTriangle = () => {
    setTriangleRows(1);
    // Announce reset triangular pebble count
    const announcer = document.getElementById('aria-announcer');
    if (announcer) {
      announcementCountRef.current += 1;
      const totalPebbles = (1 * (1 + 1)) / 2;
      announcer.textContent = `${t('figurate.triangularTool')}: ${t('figurate.pebbles')} ${totalPebbles}` + `${'\u200B'.repeat(announcementCountRef.current)}`;
    }
  };

  const addSquareLayer = () => {
    if (squareSize < 10) {
      setSquareSize(squareSize + 1);
      // Announce updated square pebble count
      const announcer = document.getElementById('aria-announcer');
      if (announcer) {
        announcementCountRef.current += 1;
        const totalPebbles = (squareSize + 1) * (squareSize + 1);
        announcer.textContent = `${t('figurate.squareTool')}: ${t('figurate.pebbles')} ${totalPebbles}` + `${'\u200B'.repeat(announcementCountRef.current)}`;
      }
    }
  };

  const resetSquare = () => {
    setSquareSize(1);
    // Announce reset square pebble count
    const announcer = document.getElementById('aria-announcer');
    if (announcer) {
      announcementCountRef.current += 1;
      const totalPebbles = 1 * 1;
      announcer.textContent = `${t('figurate.squareTool')}: ${t('figurate.pebbles')} ${totalPebbles}` + `${'\u200B'.repeat(announcementCountRef.current)}`;
    }
  };

  const getTrianglePebbles = () => {
    return (triangleRows * (triangleRows + 1)) / 2;
  };

  const getSquarePebbles = () => {
    return squareSize * squareSize;
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with top-right progress bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-left">
          <h2 className="text-2xl font-bold text-white">{t('figurate.buildAndGuessTitle')}</h2>
          <p className="text-base text-gray-300">{t('figurate.buildAndGuessInstructions')}</p>
        </div>
        <div 
          className="flex items-center" 
          role="group" 
          aria-label={t('common.progressIndicator')}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const attemptStatus = 
              attemptResults[i] === true 
                ? t('common.correct')
                : attemptResults[i] === false 
                ? t('common.incorrect')
                : t('common.pending');
            
            return (
              <React.Fragment key={i}>
                <div className="relative">
                  <div
                    className={`w-6 h-6 rounded-full border-2 border-[#FFC517] flex items-center justify-center bg-black`}
                    role="img"
                    aria-label={`${t('common.question')} ${i + 1}: ${attemptStatus}`}
                  >
                    {attemptResults[i] === true && <img src="assets/check.png" alt="" className="w-5 h-5" aria-hidden="true" />}
                    {attemptResults[i] === false && (
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                {i < 4 && <div className="w-6 h-0.5 bg-[#FFC517]" aria-hidden="true"></div>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Top 50% - Question and Answer Buttons */}
      <div className="flex-1 flex flex-col justify-center space-y-2 mb-2">
        {/* Question Card */}
        <div className="bg-black rounded-md p-3 text-center">
          <h3 id="build-and-guess-question" className="text-white text-xl mb-2">{t('figurate.buildAndGuessQuestion')}</h3>

          {/* Number Display */}
          <div
            className={`inline-block border-2 rounded-md px-6 py-3 mb-3 ${
              feedback === 'correct'
                ? 'border-green-500'
                : feedback === 'incorrect'
                ? 'border-red-500'
                : 'border-white'
            }`}
          >
            <span className="text-white text-4xl font-bold">{targetNumber}</span>
          </div>

          {/* Answer Buttons */}
          <div className="flex justify-center">
            <div role="group" aria-labelledby="build-and-guess-question" className="grid grid-cols-2 gap-2 max-w-lg">
              <button
                disabled={buttonsDisabled}
                className="relative"
                style={{
                  backgroundImage: 'url(assets/buttons/wider_default.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '200px',
                  height: '70px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  filter:
                    feedback === 'incorrect' && correctAnswer === 'triangular'
                      ? 'hue-rotate(90deg) brightness(1.2)'
                      : 'none',
                  transition: 'filter 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_default.png)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_pressed.png)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onClick={() => checkAnswer('triangular')}
              >
                <span className="text-white font-bold text-base">{t('figurate.answerTriangular')}</span>
              </button>

              <button
                disabled={buttonsDisabled}
                className="relative"
                style={{
                  backgroundImage: 'url(assets/buttons/wider_default.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '200px',
                  height: '70px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  filter:
                    feedback === 'incorrect' && correctAnswer === 'square'
                      ? 'hue-rotate(90deg) brightness(1.2)'
                      : 'none',
                  transition: 'filter 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_default.png)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_pressed.png)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onClick={() => checkAnswer('square')}
              >
                <span className="text-white font-bold text-base">{t('figurate.answerSquare')}</span>
              </button>

              <button
                disabled={buttonsDisabled}
                className="relative"
                style={{
                  backgroundImage: 'url(assets/buttons/wider_default.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '200px',
                  height: '70px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  filter:
                    feedback === 'incorrect' && correctAnswer === 'both'
                      ? 'hue-rotate(90deg) brightness(1.2)'
                      : 'none',
                  transition: 'filter 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_default.png)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_pressed.png)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onClick={() => checkAnswer('both')}
              >
                <span className="text-white font-bold text-base">{t('figurate.answerBoth')}</span>
              </button>

              <button
                disabled={buttonsDisabled}
                className="relative"
                style={{
                  backgroundImage: 'url(assets/buttons/wider_default.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '200px',
                  height: '70px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  filter:
                    feedback === 'incorrect' && correctAnswer === 'neither'
                      ? 'hue-rotate(90deg) brightness(1.2)'
                      : 'none',
                  transition: 'filter 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_default.png)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_pressed.png)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onClick={() => checkAnswer('neither')}
              >
                <span className="text-white font-bold text-base">{t('figurate.answerNeither')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 50% - Mini Tools */}
      <div className="flex-1 flex gap-6">
        {/* Triangular Tool */}
        <div className="flex-1">
          <div
            className="relative w-full"
            style={{
              backgroundImage: 'url(assets/proof_board.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              height: '330px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
            }}
          >
            <div
              className="absolute inset-1 rounded-[6px] z-0"
              style={{
                backgroundColor: '#000000'
              }}
            />

            {/* Header */}
            <div className="z-10 flex justify-between items-center mb-2">
              <h4 className="text-white font-bold text-base">{t('figurate.triangularTool')}</h4>
              <span className="text-white text-sm">
                {t('figurate.pebbles')}: {getTrianglePebbles()}
              </span>
            </div>

            {/* Triangle visualization */}
            <div className="z-10 flex-1 flex flex-col justify-center items-center space-y-1">
              {[...Array(triangleRows)].map((_, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1">
                  {[...Array(rowIndex + 1)].map((_, colIndex) => (
                    <div
                      key={colIndex}
                      className={`w-3 h-3 rounded-full flex items-center justify-center ${rowIndex === triangleRows - 1 ? '' : 'bg-white'}`}
                      style={rowIndex === triangleRows - 1 ? { backgroundColor: '#FF00FB' } : {}}
                    >
                      {(rowIndex === triangleRows - 1) && (
                        <span className="text-black font-bold text-[12px] leading-none translate-y-[-1.5px]">+</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-1 justify-center mt-2">
              <button
                onClick={addTriangleRow}
                className="relative flex items-center justify-center"
                aria-label={t('figurate.addRowToTriangularTool')}
                style={{
                  backgroundImage: 'url(assets/buttons/wider_default.png)',
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '120px',
                  height: '40px',
                  border: 'none',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_default.png)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_pressed.png)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
              >
                <span className="text-white font-bold text-sm">{t('figurate.addRow')}</span>
              </button>

              <button
                onClick={resetTriangle}
                className="relative flex items-center justify-center"
                aria-label={t('figurate.resetTriangularTool')}
                style={{
                  backgroundImage: 'url(assets/buttons/default.png)',
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '80px',
                  height: '40px',
                  border: 'none',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/default.png)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/pressed.png)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
                }}
              >
                <span className="text-white font-bold text-sm">{t('figurate.reset')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Square Tool */}
        {/* Square Tool */}
        <div className="flex-1">
          <div
            className="relative w-full"
            style={{
              backgroundImage: 'url(assets/proof_board.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              height: '330px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
            }}
          >
            <div
              className="absolute inset-1 rounded-[6px] z-0"
              style={{
                backgroundColor: '#000000'
              }}
            />

            {/* Header */}
            <div className="z-10 flex justify-between items-center mb-2">
              <h4 className="text-white font-bold text-base">{t('figurate.squareTool')}</h4>
              <span className="text-white text-sm">
                {t('figurate.pebbles')}: {getSquarePebbles()}
              </span>
            </div>

            {/* Square visualization */}
            <div className="z-10 flex-1 flex flex-col justify-center items-center">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${squareSize}, 1fr)` }}>
                {[...Array(squareSize * squareSize)].map((_, index) => {
                  const row = Math.floor(index / squareSize);
                  const col = index % squareSize;

                  // Determine if this pebble is part of the newest L-shaped layer
                  // L-shape consists of: bottom row OR rightmost column (but avoid double-counting corner)
                  const isNewLayer = row === squareSize - 1 || col === squareSize - 1;

                  return (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full flex items-center justify-center ${squareSize === 1 || isNewLayer ? '' : 'bg-white'}`}
                      style={squareSize === 1 || isNewLayer ? { backgroundColor: '#FF00FB' } : {}}
                    >
                      {(squareSize === 1 || isNewLayer) && (
                        <span className="text-black font-bold text-[12px] leading-none translate-y-[-1.5px]">+</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-1 justify-center mt-2">
              <button
                onClick={addSquareLayer}
                className="relative flex items-center justify-center"
                aria-label={t('figurate.addRowToSquareTool')}
                style={{
                  backgroundImage: 'url(assets/buttons/wider_default.png)',
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '120px',
                  height: '40px',
                  border: 'none',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_default.png)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_pressed.png)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/wider_hover.png)';
                }}
              >
                <span className="text-white font-bold text-sm">{t('figurate.addRow')}</span>
              </button>

              <button
                onClick={resetSquare}
                className="relative flex items-center justify-center"
                aria-label={t('figurate.resetSquareTool')}
                style={{
                  backgroundImage: 'url(assets/buttons/default.png)',
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '80px',
                  height: '40px',
                  border: 'none',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/default.png)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/pressed.png)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundImage = 'url(assets/buttons/hover.png)';
                }}
              >
                <span className="text-white font-bold text-sm">{t('figurate.reset')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EvenOddFigurate: React.FC = () => {
  const [mode, setMode] = useState<Mode>('even-odd');
  const [, setPebblePositions] = useState<PebblePosition[]>([]);
  const [feedback, setFeedback] = useState('');
  const [, setCurrentDialogueIndex] = useState(0);

  const reset = useCallback(() => {
    setPebblePositions([]);
    setFeedback('');
  }, []);

  // Auto-switch modes based on dialogue progression
  useEffect(() => {
    const handleModeSwitch = (event: any) => {
      const { detail } = event;
      if (detail.questId === 'monochord2' && detail.dialogueIndex !== undefined) {
        const index = detail.dialogueIndex;
        setCurrentDialogueIndex(index);
        let newMode: Mode;

        // Determine which mode should be active based on dialogue index
        if (index === 0) {
          newMode = 'even-odd';
        } else if (index === 1 || index === 2 || index === 3) {
          newMode = 'squares';
        } else if (index === 4 || index === 5) {
          newMode = 'tetractys';
        } else if (index === 6) {
          newMode = 'build-and-guess';
        } else {
          // Fallback for any other indices
          newMode = 'build-and-guess';
        }

        // Only switch if the mode is different to avoid unnecessary resets
        if (mode !== newMode) {
          setMode(newMode);
          reset();
        }
      }
    };

    window.addEventListener('dialogue_progress', handleModeSwitch);

    return () => {
      window.removeEventListener('dialogue_progress', handleModeSwitch);
    };
  }, [mode, reset]);

  const renderVisualization = () => {
    switch (mode) {
      case 'even-odd':
        return <EvenOddVisualization />;
      case 'squares':
        return <SquareVisualization />;
      case 'tetractys':
        return <TetractysVisualization />;
      case 'build-and-guess':
        return <BuildAndGuessVisualization />;
    }
  };

  return (
    <div
      className="absolute top-4 left-4 right-4 bottom-4 bg-[#1F1816] text-white p-8"
      role="region"
      aria-label="Figurate Numbers"
    >
      {/* Shared aria-live region for announcements */}
      <div id="aria-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div className="justify-start items-start overflow-hidden" role="none">
        <div className="mb-4">{renderVisualization()}</div>

        {feedback && mode !== 'build-and-guess' && (
          <div
            className={`text-center px-3 py-2 rounded-lg font-medium text-sm max-w-md ${
              feedback.includes('✓') ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
            }`}
          >
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvenOddFigurate;
