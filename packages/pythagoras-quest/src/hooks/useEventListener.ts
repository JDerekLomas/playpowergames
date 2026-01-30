import { useEffect, useState } from 'react';

export interface EventPayload {
  [key: string]: any;
}

export const useEventListener = (eventName: string) => {
  const [payload, setPayload] = useState<EventPayload | null>(null);

  useEffect(() => {
    const handleEvent = (event: CustomEvent) => {
      setPayload(event.detail);
    };

    window.addEventListener(eventName, handleEvent as EventListener);

    return () => {
      window.removeEventListener(eventName, handleEvent as EventListener);
    };
  }, [eventName]);

  return { payload };
};
