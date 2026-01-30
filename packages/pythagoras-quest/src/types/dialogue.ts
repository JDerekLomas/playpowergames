// Dialogue & quest-related types

export interface QuestionOption {
  id: string;
  text: string;
}

export interface DialogueQuestion {
  type: 'numeric' | 'radio';
  correctAnswer: string | number;
  options?: QuestionOption[]; // Only used for radio type
  placeholder?: string; // Only used for numeric type
}

export interface Dialogue {
  speaker: string;
  text: string;
  avatar?: string;
  question?: DialogueQuestion;
}

export interface QuestConfig {
  id: string;
  title: string;
  type: 'single' | 'split';
  dialogues: Dialogue[];
  gameComponent?: React.ComponentType;
}

export interface Quests {
  [key: string]: QuestConfig;
}
