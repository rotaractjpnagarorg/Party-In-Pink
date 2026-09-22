import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase.js';
import { DEFAULT_PIP5_CONFIG, type EventConfig, EventStatuses } from '@pip/shared';

interface EventContextValue {
  event: EventConfig;
  loading: boolean;
  error: string | null;
  isRegistrationOpen: boolean;
  isAnnounced: boolean;
  isPaused: boolean;
  isClosed: boolean;
  isEventDay: boolean;
  isCompleted: boolean;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [event, setEvent] = useState<EventConfig>(DEFAULT_PIP5_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEventConfig() {
      try {
        const docRef = doc(db, 'events', DEFAULT_PIP5_CONFIG.code);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists() && isMounted) {
          setEvent(snapshot.data() as EventConfig);
        }
      } catch (err) {
        console.warn('Could not load event config from Firestore, falling back to defaults:', err);
        if (isMounted) {
          setError('Operating in offline/cached configuration mode');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadEventConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  const value: EventContextValue = {
    event,
    loading,
    error,
    isRegistrationOpen: event.status === EventStatuses.REGISTRATION_OPEN,
    isAnnounced: event.status === EventStatuses.ANNOUNCED,
    isPaused: event.status === EventStatuses.REGISTRATION_PAUSED,
    isClosed: event.status === EventStatuses.REGISTRATION_CLOSED,
    isEventDay: event.status === EventStatuses.EVENT_DAY,
    isCompleted: event.status === EventStatuses.COMPLETED,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
};

export const useEvent = (): EventContextValue => {
  const context = useContext(EventContext);
  if (!context) {
    return {
      event: DEFAULT_PIP5_CONFIG,
      loading: false,
      error: null,
      isRegistrationOpen: DEFAULT_PIP5_CONFIG.status === EventStatuses.REGISTRATION_OPEN,
      isAnnounced: DEFAULT_PIP5_CONFIG.status === EventStatuses.ANNOUNCED,
      isPaused: DEFAULT_PIP5_CONFIG.status === EventStatuses.REGISTRATION_PAUSED,
      isClosed: DEFAULT_PIP5_CONFIG.status === EventStatuses.REGISTRATION_CLOSED,
      isEventDay: DEFAULT_PIP5_CONFIG.status === EventStatuses.EVENT_DAY,
      isCompleted: DEFAULT_PIP5_CONFIG.status === EventStatuses.COMPLETED,
    };
  }
  return context;
};
