import React, { useState, useEffect } from "react";
import type { DialogueQuestion } from "../../types/dialogue";
import { useTranslations } from "../../hooks/useTranslations";

interface InteractiveQuestionProps {
    question: DialogueQuestion;
    onAnswerSubmit: (answer: string | number, isCorrect: boolean) => void;
    isAnswered: boolean;
    submittedAnswer?: string | number;
    onAnswerChange?: (hasAnswer: boolean) => void;
    questionTextId?: string;
}

export const InteractiveQuestion: React.FC<InteractiveQuestionProps> = ({
    question,
    onAnswerSubmit,
    isAnswered,
    submittedAnswer,
    onAnswerChange,
    questionTextId,
}) => {
    const { t } = useTranslations();
    const [selectedAnswer, setSelectedAnswer] = useState<string | number>("");

    const handleNumericChange = (value: string) => {
        setSelectedAnswer(value);
        const hasAnswer = value.trim() !== "";
        onAnswerChange?.(hasAnswer);
    };

    const handleRadioChange = (value: string) => {
        setSelectedAnswer(value);
        onAnswerChange?.(true);
    };

    const handleSubmit = () => {
        if (!selectedAnswer && selectedAnswer !== 0) return;

        const isCorrect =
            question.type === "numeric"
                ? Number(selectedAnswer) === Number(question.correctAnswer)
                : selectedAnswer === question.correctAnswer;

        onAnswerSubmit(selectedAnswer, isCorrect);
    };

    // Expose handleSubmit to parent via a global function on window
    useEffect(() => {
        (window as any).triggerQuestionSubmit = handleSubmit;
        return () => {
            delete (window as any).triggerQuestionSubmit;
        };
    }, [selectedAnswer, question.correctAnswer]);

    const isCorrectAnswer =
        isAnswered &&
        (question.type === "numeric"
            ? Number(submittedAnswer) === Number(question.correctAnswer)
            : submittedAnswer === question.correctAnswer);

    return (
        <div className="interactive-question">
            {question.type === "numeric" && (
                <div className="question-numeric">
                    <div className="input-container-with-icon">
                        <input
                            type="number"
                            placeholder={
                                question.placeholder ||
                                t("common.enterYourAnswer")
                            }
                            value={selectedAnswer}
                            onChange={(e) =>
                                handleNumericChange(e.target.value)
                            }
                            disabled={isCorrectAnswer}
                            className="question-input-with-icon"
                            aria-labelledby={questionTextId}
                            aria-label={t("common.enterYourAnswer")}
                        />
                        {isAnswered && (
                            <div
                                className={`validation-icon-inside ${
                                    isCorrectAnswer ? "correct" : "incorrect"
                                }`}
                            >
                                {isCorrectAnswer ? (
                                    <img
                                        src="assets/check.png"
                                        alt={t("common.correctAlt")}
                                        className="check-icon-inside"
                                    />
                                ) : (
                                    <span className="x-icon-inside">✗</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {question.type === "radio" && question.options && (
                <div className="question-radio">
                    {question.options.map((option) => (
                        <div key={option.id} className="radio-option">
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="question-radio"
                                    value={option.id}
                                    checked={selectedAnswer === option.id}
                                    onChange={() =>
                                        handleRadioChange(option.id)
                                    }
                                    disabled={isCorrectAnswer}
                                    className="radio-input"
                                />
                                <span className="radio-text">
                                    {option.text}
                                </span>
                                {isAnswered &&
                                    submittedAnswer === option.id && (
                                        <div
                                            className={`validation-icon ${
                                                isCorrectAnswer
                                                    ? "correct"
                                                    : "incorrect"
                                            }`}
                                        >
                                            {isCorrectAnswer ? (
                                                <img
                                                    src="assets/check.png"
                                                    alt={t("common.correctAlt")}
                                                    className="check-icon"
                                                />
                                            ) : (
                                                <span className="x-icon">
                                                    ✗
                                                </span>
                                            )}
                                        </div>
                                    )}
                            </label>
                        </div>
                    ))}
                </div>
            )}

            {/* Remove the submit button since we use the dialogue navigation button */}
        </div>
    );
};
