import React from 'react';
import { renderMathSR } from '../../utils/mathA11y';
import type { Dialogue } from '../../types/dialogue';
import { InteractiveQuestion } from './InteractiveQuestion';

interface DialogueBoxProps {
  dialogues: Dialogue[];
  currentIndex: number;
  onComplete?: () => void;
  onTypingStart?: () => void;
  onTypingComplete?: () => void;
  disableTyping?: boolean;
  showOnlyCurrent?: boolean;
  className?: string;
  onQuestionAnswer?: (dialogueIndex: number, answer: string | number, isCorrect: boolean) => void;
  questionStates?: Record<number, { answer: string | number; isCorrect: boolean }>;
  onAnswerChange?: (dialogueIndex: number, hasAnswer: boolean) => void;
  speakerHeadingLevel?: 1 | 2 | 3 | 4 | 5 | 6; // Allow customizing heading level
}

interface DialogueItemProps {
  dialogue: Dialogue;
  isCurrent: boolean;
  onTypingStart?: () => void;
  onTypingComplete?: () => void;
  disableTyping?: boolean;
  dialogueIndex?: number;
  onQuestionAnswer?: (dialogueIndex: number, answer: string | number, isCorrect: boolean) => void;
  questionState?: { answer: string | number; isCorrect: boolean };
  onAnswerChange?: (dialogueIndex: number, hasAnswer: boolean) => void;
  speakerHeadingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

const DialogueItem: React.FC<DialogueItemProps> = ({
  dialogue,
  isCurrent,
  onTypingStart,
  onTypingComplete,
  disableTyping = false,
  dialogueIndex,
  onQuestionAnswer,
  questionState,
  onAnswerChange,
  speakerHeadingLevel = 2
}) => {
  const [displayedText, setDisplayedText] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const onTypingStartRef = React.useRef(onTypingStart);
  const onTypingCompleteRef = React.useRef(onTypingComplete);
  
  // Generate unique ID for question text association
  const questionTextId = React.useMemo(
    () => `dialogue-text-${dialogueIndex}-${Date.now()}`,
    [dialogueIndex]
  );

  // Safety check for dialogue
  if (!dialogue || !dialogue.text) {
    return (
      <div className="dialogue-container-item">
        <div className="dialogue-header">
          <div className="avatar-circle">
            <div className="avatar-placeholder">?</div>
          </div>
          {React.createElement(`h${speakerHeadingLevel}`, { className: 'dialogue-speaker' }, 'Loading...')}
        </div>
        <div className="dialogue-text">
          <p>Loading dialogue...</p>
        </div>
      </div>
    );
  }

  // Update refs when callbacks change
  React.useEffect(() => {
    onTypingStartRef.current = onTypingStart;
    onTypingCompleteRef.current = onTypingComplete;
  }, [onTypingStart, onTypingComplete]);

  React.useEffect(() => {
    if (isCurrent) {
      if (disableTyping) {
        // Show full text immediately
        setDisplayedText(dialogue.text);
        setIsTyping(false);
        onTypingStartRef.current?.();
        onTypingCompleteRef.current?.();
      } else {
        // Do typing animation
        setDisplayedText('');
        setIsTyping(true);
        onTypingStartRef.current?.(); // Call when typing starts
        let i = 0;
        const timer = setInterval(() => {
          if (i < dialogue.text.length) {
            setDisplayedText(dialogue.text.slice(0, i + 1));
            i++;
          } else {
            setIsTyping(false);
            clearInterval(timer);
            onTypingCompleteRef.current?.(); // Call when typing ends
          }
        }, 50);

        return () => clearInterval(timer);
      }
    }
  }, [dialogue.text, isCurrent, disableTyping]);

  return (
    <div className="dialogue-container-item">
      <div className="dialogue-header">
        <div className="avatar-circle">
          {dialogue.avatar ? (
            <img src={dialogue.avatar} alt="" aria-hidden="true" />
          ) : (
            <div className="avatar-placeholder">{dialogue.speaker.charAt(0)}</div>
          )}
        </div>
        {React.createElement(`h${speakerHeadingLevel}`, { className: 'dialogue-speaker' }, dialogue.speaker)}
      </div>
      <div className="dialogue-text">
        <p id={questionTextId}>
          {renderMathSR(displayedText)}
          {isCurrent && isTyping && <span className="typing-indicator">|</span>}
        </p>
      </div>
      {dialogue.question && isCurrent && (
        <InteractiveQuestion
          question={dialogue.question}
          onAnswerSubmit={(answer, isCorrect) => {
            if (onQuestionAnswer && dialogueIndex !== undefined) {
              onQuestionAnswer(dialogueIndex, answer, isCorrect);
            }
          }}
          isAnswered={!!questionState}
          submittedAnswer={questionState?.answer}
          onAnswerChange={(hasAnswer) => {
            if (onAnswerChange && dialogueIndex !== undefined) {
              onAnswerChange(dialogueIndex, hasAnswer);
            }
          }}
          questionTextId={questionTextId}
        />
      )}
    </div>
  );
};

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  dialogues,
  currentIndex,
  onComplete,
  onTypingStart,
  onTypingComplete,
  disableTyping = false,
  showOnlyCurrent = false,
  className = '',
  onQuestionAnswer,
  questionStates = {},
  onAnswerChange,
  speakerHeadingLevel = 2
}) => {
  React.useEffect(() => {
    if (currentIndex >= dialogues.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, dialogues.length, onComplete]);

  // Split view now uses the same stacked rendering as main-character scenes

  return (
    <div className={`dialogue-stack ${className}`}>
      {showOnlyCurrent ? (
        <DialogueItem
          dialogue={dialogues[currentIndex]}
          isCurrent={true}
          onTypingStart={onTypingStart}
          onTypingComplete={onTypingComplete}
          disableTyping={disableTyping}
          dialogueIndex={currentIndex}
          onQuestionAnswer={onQuestionAnswer}
          questionState={questionStates[currentIndex]}
          onAnswerChange={onAnswerChange}
          speakerHeadingLevel={speakerHeadingLevel}
        />
      ) : (
        dialogues.slice(0, currentIndex + 1).map((dialogue, index) => (
          <DialogueItem
            key={index}
            dialogue={dialogue}
            isCurrent={index === currentIndex}
            onTypingStart={index === currentIndex ? onTypingStart : undefined}
            onTypingComplete={index === currentIndex ? onTypingComplete : undefined}
            disableTyping={disableTyping}
            dialogueIndex={index}
            onQuestionAnswer={onQuestionAnswer}
            questionState={questionStates[index]}
            onAnswerChange={onAnswerChange}
            speakerHeadingLevel={speakerHeadingLevel}
          />
        ))
      )}
    </div>
  );
};