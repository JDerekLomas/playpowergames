import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from '../../../hooks/useTranslations';
import { emitEvent } from '../../../utils/eventEmitter';

// Configurable Pythagorean triples
const PYTHAGOREAN_TRIPLES = [
  { distance: 9, height: 12, ladder: 15 },
  { distance: 5, height: 12, ladder: 13 },
  { distance: 8, height: 15, ladder: 17 },
  { distance: 6, height: 8, ladder: 10 },
  { distance: 12, height: 16, ladder: 20 },
  { distance: 15, height: 20, ladder: 25 },
  { distance: 7, height: 24, ladder: 25 },
  { distance: 3, height: 4, ladder: 5 },
];

const LadderProblem: React.FC = () => {
  const { t } = useTranslations();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const questionRef = useRef<HTMLParagraphElement | null>(null);

  // Helper function to render text with proper square root notation
  const renderMathText = (text: string) => {
    // Helper: render occurrences of ² as visual ² + screen-reader " square"
    const renderWithSup2 = (str: string): React.ReactNode[] => {
      const parts = str.split('²');
      const nodes: React.ReactNode[] = [];
      parts.forEach((chunk, i) => {
        if (chunk) nodes.push(chunk);
        if (i < parts.length - 1) {
          nodes.push(
            <span key={`sup2-v-${i}`} aria-hidden="true">
              ²
            </span>,
          );
          nodes.push(
            <span key={`sup2-sr-${i}`} className="sr-only">
              {' '}
              square
            </span>,
          );
        }
      });
      return nodes.length ? nodes : [str];
    };

    // Look for √(...) pattern and replace with proper JSX, preserving ² handling inside
    const parts = text.split(/√\(([^)]+)\)/);
    if (parts.length === 1) {
      return renderWithSup2(text);
    }

    const result: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Even indices are regular text but may contain ²
        if (parts[i]) result.push(...renderWithSup2(parts[i]));
      } else {
        // Odd indices are the content inside √(...)
        result.push(
          <span key={`sqrt-${i}`} style={{ whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '1.2em' }}>√</span>
            <span style={{ textDecoration: 'overline' }}>{renderWithSup2(parts[i])}</span>
          </span>,
        );
      }
    }
    return result;
  };
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [targetTriple, setTargetTriple] = useState(PYTHAGOREAN_TRIPLES[0]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [completedQuestions, setCompletedQuestions] = useState<boolean[]>(new Array(6).fill(false));
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  const [shuffledOptions, setShuffledOptions] = useState<any[]>([]);
  // Store the selected answers for each completed question to preserve check marks
  const [selectedAnswers, setSelectedAnswers] = useState<(number | string | null)[]>(new Array(6).fill(null));
  const announcementCountRef = useRef(0);
  const announceQuestion = (q: string) => {
  const announcer = document.getElementById('aria-announcer') || document.getElementById('ladder-problem-announcer');
    if (!announcer) return;
    announcementCountRef.current += 1;
    announcer.textContent = '';
    setTimeout(() => {
      const invisibleSuffix = '\u200B'.repeat(announcementCountRef.current);
      announcer.textContent = q + invisibleSuffix;
    }, 50);
  };

  // Initialize with random triple on component mount
  useEffect(() => {
    const randomTriple = PYTHAGOREAN_TRIPLES[Math.floor(Math.random() * PYTHAGOREAN_TRIPLES.length)];
    setTargetTriple(randomTriple);
  }, []);

  // Sync question index with dialogue progression (indices 0-5)
  useEffect(() => {
    const handleDialogueProgress = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      // Only respond when the ladder quest is active
      if (detail?.questId !== 'ladder') return;
      const idx = typeof detail?.dialogueIndex === 'number' ? detail.dialogueIndex : 0;
      const clamped = Math.max(0, Math.min(5, idx));
      setCurrentQuestionIndex(clamped);
      // Clear selection state when dialogue changes
      setSelectedAnswer(null);
      setIsCorrect(null);
      // Focus in panel and announce the new question text automatically
      setTimeout(() => {
        if (questionRef.current) questionRef.current.focus();
        const { question } = getCurrentQuestionForIndex(clamped);
        if (question) announceQuestion(question);
      }, 0);
    };
    window.addEventListener('dialogue_progress', handleDialogueProgress as EventListener);
    return () => {
      window.removeEventListener('dialogue_progress', handleDialogueProgress as EventListener);
    };
  }, []);

  // Helper to get question text for a specific index without relying on shuffledOptions state
  const getCurrentQuestionForIndex = (index: number) => {
    const heightSquared = targetTriple.height * targetTriple.height;
    const distanceSquared = targetTriple.distance * targetTriple.distance;
    const sum = heightSquared + distanceSquared;
    switch (index) {
      case 0:
        return { question: t('ladderProblem.questions.question1') };
      case 1:
        return { question: t('ladderProblem.questions.question2') };
      case 2:
        return { question: t('ladderProblem.questions.question3') };
      case 3:
        return { question: t('ladderProblem.questions.question4') };
      case 4:
        return {
          question: t('ladderProblem.questions.question5')
            .replace('{heightSquared}', heightSquared.toString())
            .replace('{distanceSquared}', distanceSquared.toString()),
        };
      case 5:
        return { question: t('ladderProblem.questions.question6').replace('{sum}', sum.toString()) };
      default:
        return { question: '' };
    }
  };

  // Announce question on mount and when computed question changes due to targetTriple change
  useEffect(() => {
    const { question } = getCurrentQuestionForIndex(currentQuestionIndex);
    // Focus question first so SR context stays in panel, then announce
    setTimeout(() => {
      if (questionRef.current) questionRef.current.focus();
      if (question) announceQuestion(question);
    }, 0);
  }, [currentQuestionIndex, targetTriple]);

  // Helper function to shuffle array
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Generate options for current question and shuffle them when question changes
  useEffect(() => {
    const heightSquared = targetTriple.height * targetTriple.height;
    const distanceSquared = targetTriple.distance * targetTriple.distance;
    const sum = heightSquared + distanceSquared;

    let options: any[] = [];

    switch (currentQuestionIndex) {
      case 0:
        options = [
          { value: targetTriple.ladder, text: t('ladderProblem.options.theLadder') },
          {
            value: targetTriple.height,
            text: t('ladderProblem.options.theHeight').replace('{height}', targetTriple.height.toString()),
          },
          {
            value: targetTriple.distance,
            text: t('ladderProblem.options.theGroundDistance').replace(
              '{distance}',
              targetTriple.distance.toString(),
            ),
          },
          { value: 0, text: t('ladderProblem.options.allSidesEqual') },
        ];
        break;
      case 1:
        options = [
          { value: 'a² + b² = c²', text: t('ladderProblem.options.pythagoreanEquation') },
          { value: 'a + b = c', text: t('ladderProblem.options.additionEquation') },
          { value: 'a² + c² = b²', text: t('ladderProblem.options.wrongEquation1') },
          { value: 'b² + c² = a²', text: t('ladderProblem.options.wrongEquation2') },
        ];
        break;
      case 2:
        options = [
          { value: heightSquared, text: heightSquared.toString() },
          { value: heightSquared + 20, text: (heightSquared + 20).toString() },
          { value: heightSquared - 24, text: Math.max(0, heightSquared - 24).toString() },
          { value: targetTriple.height, text: targetTriple.height.toString() },
        ];
        break;
      case 3:
        options = [
          { value: distanceSquared, text: distanceSquared.toString() },
          { value: distanceSquared + 5, text: (distanceSquared + 5).toString() },
          { value: distanceSquared + 30, text: (distanceSquared + 30).toString() },
          { value: targetTriple.distance, text: targetTriple.distance.toString() },
        ];
        break;
      case 4:
        options = [
          { value: sum, text: sum.toString() },
          { value: sum - 4, text: (sum - 4).toString() },
          { value: sum + 16, text: (sum + 16).toString() },
          { value: sum + 6, text: (sum + 6).toString() },
        ];
        break;
      case 5:
        options = [
          { value: targetTriple.ladder, text: targetTriple.ladder.toString() },
          { value: targetTriple.ladder + 2, text: (targetTriple.ladder + 2).toString() },
          { value: targetTriple.ladder - 2, text: (targetTriple.ladder - 2).toString() },
          { value: targetTriple.ladder + 3, text: (targetTriple.ladder + 3).toString() },
        ];
        break;
    }

    setShuffledOptions(shuffleArray(options));
  }, [currentQuestionIndex, targetTriple]);

  // Handler functions
  const handleAnswerSelect = (answer: number | string) => {
    setSelectedAnswer(answer);
    let correct = false;

    // Determine correct answer based on current question
    switch (currentQuestionIndex) {
      case 0: // Which side is the hypotenuse?
        correct = answer === targetTriple.ladder;
        break;
      case 1: // Which equation correctly represents the problem?
        correct = answer === 'a² + b² = c²';
        break;
      case 2: // What is the square of the wall height?
        correct = answer === targetTriple.height * targetTriple.height;
        break;
      case 3: // What is the square of the moat width?
        correct = answer === targetTriple.distance * targetTriple.distance;
        break;
      case 4: // Add the two squares
        correct =
          answer === targetTriple.height * targetTriple.height + targetTriple.distance * targetTriple.distance;
        break;
      case 5: // What number squared equals the sum?
        correct = answer === targetTriple.ladder;
        break;
      default:
        correct = false;
    }

    setIsCorrect(correct);

    if (correct) {
      // Announce "Correct" for screen readers
      announcementCountRef.current += 1;
      const announcer = document.getElementById('aria-announcer');
      if (announcer) {
        // Force change by clearing and setting with invisible character repeated
        announcer.textContent = '';
        setTimeout(() => {
          // Add zero-width spaces based on count to make content unique but invisible
          const invisibleSuffix = '\u200B'.repeat(announcementCountRef.current);
          announcer.textContent = `${t('common.correct')}${invisibleSuffix}`;
          console.log('Announcing CORRECT');
        }, 50);
      }
      
      // Mark current question as completed
      const newCompletedQuestions = [...completedQuestions];
      newCompletedQuestions[currentQuestionIndex] = true;
      setCompletedQuestions(newCompletedQuestions);

      // Store the selected answer for this question to preserve check marks
      const newSelectedAnswers = [...selectedAnswers];
      newSelectedAnswers[currentQuestionIndex] = answer;
      setSelectedAnswers(newSelectedAnswers);

      // Emit step completion event to enable Next in the dialogue UI
      emitEvent(`ladder_step_${currentQuestionIndex}_completed`, {
        questionIndex: currentQuestionIndex + 1,
        ladder: targetTriple.ladder,
        distance: targetTriple.distance,
        height: targetTriple.height,
        selectedAnswer: answer,
        correct: true,
      });
      // Emit legacy per-question answered event for tracking/analytics
      emitEvent('ladder_question_answered', {
        questionIndex: currentQuestionIndex + 1,
        ladder: targetTriple.ladder,
        distance: targetTriple.distance,
        height: targetTriple.height,
        selectedAnswer: answer,
        correct: true,
      });

      // On final step, also emit overall completion and reveal c
      if (currentQuestionIndex === 5) {
        setQuizCompleted(true);
        emitEvent('ladder_challenge_completed', {
          totalQuestions: 6,
          completed: true,
        });
      }
    } else {
      // Announce "Incorrect" for screen readers
      announcementCountRef.current += 1;
      const announcer = document.getElementById('aria-announcer');
      if (announcer) {
        // Force change by clearing and setting with invisible character repeated
        announcer.textContent = '';
        setTimeout(() => {
          // Add zero-width spaces based on count to make content unique but invisible
          const invisibleSuffix = '\u200B'.repeat(announcementCountRef.current);
          announcer.textContent = `${t('common.incorrect')}${invisibleSuffix}`;
          console.log('Announcing INCORRECT');
        }, 50);
      }
      
      // If incorrect, reset after 2 seconds to allow retry
      setTimeout(() => {
        setSelectedAnswer(null);
        setIsCorrect(null);
      }, 2000);
    }
  };

  // Get current question content
  const getCurrentQuestion = () => {
    const heightSquared = targetTriple.height * targetTriple.height;
    const distanceSquared = targetTriple.distance * targetTriple.distance;
    const sum = heightSquared + distanceSquared;

    switch (currentQuestionIndex) {
      case 0:
        return {
          question: t('ladderProblem.questions.question1'),
          options: shuffledOptions,
        };
      case 1:
        return {
          question: t('ladderProblem.questions.question2'),
          options: shuffledOptions,
        };
      case 2:
        return {
          question: t('ladderProblem.questions.question3'),
          options: shuffledOptions,
        };
      case 3:
        return {
          question: t('ladderProblem.questions.question4'),
          options: shuffledOptions,
        };
      case 4:
        return {
          question: t('ladderProblem.questions.question5')
            .replace('{heightSquared}', heightSquared.toString())
            .replace('{distanceSquared}', distanceSquared.toString()),
          options: shuffledOptions,
        };
      case 5:
        return {
          question: t('ladderProblem.questions.question6').replace('{sum}', sum.toString()),
          options: shuffledOptions,
        };
      default:
        return { question: '', options: [] };
    }
  };

  return (
    <div
      className="absolute top-4 left-4 right-4 bottom-4 bg-[#1F1816] p-6 overflow-y-auto"
      ref={rootRef}
      tabIndex={-1}
    >
      {/* Local announcer fallback */}
      <div id="ladder-problem-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
      {/* Progress Bar - Left aligned and smaller */}
      <div className="flex items-center mb-6">
        <div 
          className="flex items-center" 
          role="group" 
          aria-label={t('common.progressIndicator')}
        >
          {[1, 2, 3, 4, 5, 6].map((circleIndex) => {
            const questionStatus = completedQuestions[circleIndex - 1] 
              ? t('common.correct')
              : t('common.pending');
            
            return (
              <React.Fragment key={circleIndex}>
                <div className="relative">
                  <div
                    className={`w-6 h-6 rounded-full border-2 border-[#FFC517] flex items-center justify-center ${
                      completedQuestions[circleIndex - 1] ? 'bg-[#FFC517]' : 'bg-black'
                    }`}
                    role="img"
                    aria-label={`${t('common.question')} ${circleIndex}: ${questionStatus}`}
                  >
                    {completedQuestions[circleIndex - 1] && (
                      <img src="assets/check.png" alt="" className="w-5 h-5" aria-hidden="true" />
                    )}
                  </div>
                </div>
                {circleIndex < 6 && <div className="w-6 h-0.5 bg-[#FFC517]" aria-hidden="true"></div>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Question Text */}
      <div className="text-left mb-6">
        <p className="text-white text-lg">
          {t('ladderProblem.setupInstructions')
            .replace('{height}', targetTriple.height.toString())
            .replace('{distance}', targetTriple.distance.toString())}
        </p>
      </div>

      {/* Values Display */}
      <div className="mb-5">
        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center bg-[#0F0B08] font-bold rounded-md px-4 py-2">
            <span className="text-[#FF5900]">
              {t('ladderProblem.heightOnWall')} {` ${targetTriple.height} ${t('ladderProblem.feet')}`}
            </span>
          </div>
          <div className="inline-flex items-center bg-[#0F0B08] font-bold rounded-md px-4 py-2">
            <span className="text-[#61C0FF]">
              {t('ladderProblem.distanceFromWall')} {` ${targetTriple.distance} ${t('ladderProblem.feet')}`}
            </span>
          </div>
          <div className="inline-flex items-center bg-[#0F0B08] font-bold rounded-md px-4 py-2">
            <span className="text-[#FFE100]">
              {t('ladderProblem.ladderLength')}{' '}
              {quizCompleted ? ` ${targetTriple.ladder} ${t('ladderProblem.feet')}` : ' ?'}
            </span>
          </div>
        </div>
      </div>

      {/* Board Images - Equal height with questions and ladder visualization */}
      <div className="flex justify-center items-center gap-2 h-[450px]">
        {/* Question Board */}
        <div className="relative w-[650px] h-[470px] -ml-2">
          <img src="assets/ladder/question_board.png" alt="" aria-hidden="true" className="w-full h-full object-fill" />
          <div className="absolute inset-0 flex flex-col">
            {/* Question Area */}
            <div className="flex-shrink-0 h-25 flex items-center justify-center px-2 pt-4 pb-0">
              <p
                id="ladder-question"
                className="text-lg text-white text-center leading-snug max-w-[420px]"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                }}
                ref={questionRef}
                tabIndex={-1}
              >
                {renderMathText(getCurrentQuestion().question)}
              </p>
            </div>

            {/* Divider Line */}
            <div className="mx-8 mb-8">
              <div className="h-px bg-[#4B360699]"></div>
            </div>

            {/* Options Area */}
            <div className="flex-1 px-6 pb-6">
              <div role="group" aria-labelledby="ladder-question" className="space-y-2 max-w-lg mx-auto flex flex-col items-center">
                {getCurrentQuestion().options.map((option, idx) => {
                  const isCurrentlySelected = selectedAnswer === option.value;
                  const isCurrentlyCorrect = isCurrentlySelected && isCorrect !== null;

                  // Check if this question was previously completed and this was the correct answer
                  const isQuestionCompleted = completedQuestions[currentQuestionIndex];
                  const wasPreviouslySelected = selectedAnswers[currentQuestionIndex] === option.value;
                  const isPreviouslyCorrect = isQuestionCompleted && wasPreviouslySelected;

                  // Show result either for current selection or previous completion
                  const showResult = isCurrentlyCorrect || isPreviouslyCorrect;
                  const isCorrectAnswer = (isCurrentlyCorrect && isCorrect) || isPreviouslyCorrect;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(option.value)}
                      disabled={isCorrect !== null || quizCompleted || isQuestionCompleted}
                      className={`w-[85%] mx-auto p-2 rounded-md text-left transition-all flex items-center space-x-3 relative z-10 ${
                        isCorrect !== null || isQuestionCompleted ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      style={{
                        backgroundColor: '#0F0B08',
                        borderColor: showResult ? (isCorrectAnswer ? '#00FF08' : '#FF3B3A') : '#533A28',
                        borderWidth: 1,
                        borderStyle: 'solid',
                      }}
                    >
                      {/* Radio Button Circle */}
                      <div className="w-6 h-6 rounded-full border-2 border-[#FFB700] flex items-center justify-center flex-shrink-0">
                        {showResult && isCorrectAnswer && (
                          <img src="assets/check.png" alt="" className="w-6 h-6" aria-hidden="true" />
                        )}
                        {showResult && !isCorrectAnswer && (
                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Option Text */}
                      <span className="text-white text-base">{renderMathText(option.text)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Ladder Board */}
        <div className="relative w-[400px] h-[460px] -mt-2">
          <img src="assets/ladder/ladder_board.png" alt="" aria-hidden="true" className="w-full h-full object-fill" />
          {/* Static ladder visualisation overlay */}
          <img
            src="assets/ladder/ladder_visualisation.png"
            alt={t('ladderProblem.ladderVisualisationAria')}
            className="absolute inset-0 w-[60%] h-[60%] ml-14 mt-14 object-contain pointer-events-none"
          />
          {/* Labels overlay */}
          <div className="absolute inset-0">
            {/* Left (Y-axis) label - rotated */}
            <div className="absolute left-[35px] top-[260px] text-[#FF5900] text-md transform -rotate-90 origin-left">
              wall height = {targetTriple.height} ft
            </div>
            {/* Bottom (X-axis) label */}
            <div className="absolute left-[80px] bottom-[105px] text-[#61C0FF] text-md">
              moat width = {targetTriple.distance} ft
            </div>
            {/* Hypotenuse label in yellow */}
            <div className="absolute right-[20px] top-[180px] text-[#FFE100] text-xl font-bold">
              {quizCompleted ? `c = ${targetTriple.ladder} ft` : 'c = ?'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LadderProblem;
