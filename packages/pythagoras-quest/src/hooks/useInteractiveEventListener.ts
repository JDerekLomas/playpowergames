import { useEffect } from 'react';
import { useGameContext } from '../context/GameContext';

interface EventPayload {
  eventId: string;
  payload?: any;
}

export const useInteractiveEventListener = () => {
  const { state, setState } = useGameContext();

  useEffect(() => {
    const handleEvent = (event: CustomEvent) => {
      const { eventId, payload }: EventPayload = event.detail;
      
      // Only add if not already completed
      if (!state.completedEvents?.includes(eventId)) {
        setState(prevState => ({
          ...prevState,
          completedEvents: [...(prevState.completedEvents || []), eventId]
        }));
        
        console.log(`Event completed: ${eventId}`, payload);
      }
    };

    window.addEventListener('interactive-event', handleEvent as EventListener);

    return () => {
      window.removeEventListener('interactive-event', handleEvent as EventListener);
    };
  }, [state.completedEvents, setState]);

  return {
    completedEvents: state.completedEvents || []
  };
};
