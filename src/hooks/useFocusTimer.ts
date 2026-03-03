import { useEffect, useMemo, useRef, useState } from 'react';

const REMINDER_DURATION_MS = 60_000;
const TIMER_TICK_MS = 1_000;

export type FocusTimerPhase = 'idle' | 'running' | 'alerting' | 'finished';

export type FocusTimerSession = {
  content: string;
  durationSeconds: number;
  remainingSeconds: number;
  phase: FocusTimerPhase;
};

type RunningTimerSession = {
  content: string;
  durationSeconds: number;
  endsAt: number;
  alertEndsAt: number | null;
  remainingSeconds: number;
  phase: Exclude<FocusTimerPhase, 'idle'>;
};

type StartFocusTimerInput = {
  content: string;
  durationSeconds: number;
};

type UseFocusTimerResult = {
  session: FocusTimerSession | null;
  completedCount: number;
  startTimer: (input: StartFocusTimerInput) => void;
  dismissTimer: () => void;
};

function buildPublicSession(
  activeSession: RunningTimerSession | null,
): FocusTimerSession | null {
  if (!activeSession) {
    return null;
  }

  return {
    content: activeSession.content,
    durationSeconds: activeSession.durationSeconds,
    remainingSeconds: activeSession.remainingSeconds,
    phase: activeSession.phase,
  };
}

export function useFocusTimer(): UseFocusTimerResult {
  const [activeSession, setActiveSession] = useState<RunningTimerSession | null>(
    null,
  );
  const [completedCount, setCompletedCount] = useState(0);
  const previousPhaseRef = useRef<FocusTimerPhase>('idle');

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    if (activeSession.phase === 'finished') {
      return;
    }

    const timerId = window.setInterval(() => {
      setActiveSession((currentSession) => {
        if (!currentSession) {
          return null;
        }

        if (currentSession.phase === 'running') {
          const nextRemainingSeconds = Math.max(
            0,
            Math.ceil((currentSession.endsAt - Date.now()) / 1000),
          );

          if (nextRemainingSeconds > 0) {
            return {
              ...currentSession,
              remainingSeconds: nextRemainingSeconds,
            };
          }

          return {
            ...currentSession,
            remainingSeconds: 0,
            phase: 'alerting',
            alertEndsAt: Date.now() + REMINDER_DURATION_MS,
          };
        }

        if (
          currentSession.phase === 'alerting' &&
          currentSession.alertEndsAt !== null
        ) {
          if (Date.now() >= currentSession.alertEndsAt) {
            return {
              ...currentSession,
              phase: 'finished',
              alertEndsAt: null,
            };
          }
        }

        return currentSession;
      });
    }, TIMER_TICK_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [activeSession]);

  useEffect(() => {
    const currentPhase = activeSession?.phase ?? 'idle';

    if (previousPhaseRef.current === 'running' && currentPhase === 'alerting') {
      setCompletedCount((currentValue) => currentValue + 1);
    }

    previousPhaseRef.current = currentPhase;
  }, [activeSession]);

  const session = useMemo(() => buildPublicSession(activeSession), [activeSession]);

  const startTimer = (input: StartFocusTimerInput) => {
    const cleanContent = input.content.trim();
    const safeDurationSeconds = Math.max(1, Math.floor(input.durationSeconds));

    if (!cleanContent) {
      return;
    }

    setActiveSession({
      content: cleanContent,
      durationSeconds: safeDurationSeconds,
      endsAt: Date.now() + safeDurationSeconds * 1000,
      alertEndsAt: null,
      remainingSeconds: safeDurationSeconds,
      phase: 'running',
    });
  };

  const dismissTimer = () => {
    setActiveSession(null);
  };

  return {
    session,
    completedCount,
    startTimer,
    dismissTimer,
  };
}
