// Event emission utility for interactive components
export const emitEvent = (eventId: string, payload?: any) => {
  const customEvent = new CustomEvent('interactive-event', {
    detail: { eventId, payload }
  });
  window.dispatchEvent(customEvent);
};

// Helper to check if an event has been completed
export const hasCompletedEvent = (completedEvents: string[], eventId: string): boolean => {
  return completedEvents.includes(eventId);
};

// Helper to get all events required for a dialogue
export const getRequiredEvents = (dialogueEvents: Record<string, string> | undefined, dialogueIndex: number): string[] => {
  if (!dialogueEvents) return [];
  const eventIds = dialogueEvents[dialogueIndex.toString()];
  return eventIds ? eventIds.split(',').map(id => id.trim()) : [];
};

// Helper to check if all required events for a dialogue are completed
export const areAllEventsCompleted = (completedEvents: string[], requiredEvents: string[]): boolean => {
  return requiredEvents.every(eventId => completedEvents.includes(eventId));
};
