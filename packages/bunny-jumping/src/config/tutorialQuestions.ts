import { Question } from '@k8-games/sdk';

// Default tutorial question
const DEFAULT_TUTORIAL_QUESTION: Question = {
  operand1: '1',
  operand2: '2',
  operator: '+',
  answer: '3',
  markers: '0,1,2,3,4,5',
  visibleMarkers: '0,1,2,3,4,5',
};

const TUTORIAL_QUESTIONS: Record<string, Question> = {
  gradeK_topic5: {
    operand1: '1',
    operand2: '2',
    operator: '+',
    answer: '3',
    markers: '0,1,2,3,4,5',
    visibleMarkers: '0,1,2,3,4,5',
  },
  gradeK_topic6: {
    operand1: '2',
    operand2: '3',
    operator: '+',
    answer: '5',
    markers: '0,1,2,3,4,5,6,7,8,9,10',
    visibleMarkers: '0,1,2,3,4,5,6,7,8,9,10',
  },
  grade1_topic3: {
    operand1: '3',
    operand2: '4',
    operator: '+',
    answer: '7',
    markers: '0,1,2,3,4,5,6,7,8,9,10',
    visibleMarkers: '0,1,2,3,4,5,6,7,8,9,10',
  },
  grade1_topic4: {
    operand1: '5',
    operand2: '2',
    operator: '-',
    answer: '3',
    markers: '0,1,2,3,4,5,6,7,8,9,10',
    visibleMarkers: '0,1,2,3,4,5,6,7,8,9,10',
  },
};

export function getTutorialQuestionForTopic(topic: string): Question {
  return TUTORIAL_QUESTIONS[topic] ?? DEFAULT_TUTORIAL_QUESTION;
}



