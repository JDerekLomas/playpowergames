import { useState } from 'react';
import type { Dialogue } from '../types/dialogue';

export function useDialogue(dialogues: Dialogue[], onComplete?: () => void) {
  const [index, setIndex] = useState(0);
  const current = dialogues[index];
  const next = () => {
    if (index < dialogues.length - 1) {
      setIndex(i => i + 1);
    } else if (onComplete) {
      onComplete();
    }
  };
  return { current, index, next, done: index >= dialogues.length };
}
