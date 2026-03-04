import { useEffect, useMemo, useState } from 'react';
import type { FutureTask } from '../../types/futureTask';

const DELETE_CONFIRM_TIMEOUT_MS = 2200;

type FutureTasksPanelProps = {
  tasks: FutureTask[];
  isComposerOpen: boolean;
  onToggleComposer: () => void;
  onDelete: (id: string) => Promise<boolean>;
};

function formatCountdown(dueAt: string, nowTimestamp: number): string {
  const deltaMs = new Date(dueAt).getTime() - nowTimestamp;

  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return 'Due now';
  }

  const totalSeconds = Math.floor(deltaMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

function FutureTasksPanel({
  tasks,
  isComposerOpen,
  onToggleComposer,
  onDelete,
}: FutureTasksPanelProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [removingTaskId, setRemovingTaskId] = useState<string | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (!confirmingDeleteId) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setConfirmingDeleteId((currentValue) =>
        currentValue === confirmingDeleteId ? null : currentValue,
      );
    }, DELETE_CONFIRM_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [confirmingDeleteId]);

  useEffect(() => {
    if (
      confirmingDeleteId &&
      !tasks.some((task) => task.id === confirmingDeleteId)
    ) {
      setConfirmingDeleteId(null);
    }
  }, [confirmingDeleteId, tasks]);

  const taskRows = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        countdown: formatCountdown(task.dueAt, nowTimestamp),
      })),
    [nowTimestamp, tasks],
  );

  async function handleDeleteTask(id: string) {
    if (removingTaskId === id) {
      return;
    }

    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }

    setRemovingTaskId(id);
    setConfirmingDeleteId(null);

    try {
      await onDelete(id);
    } catch (error) {
      console.error('StickyDesk: failed to delete future task.', error);
    } finally {
      setRemovingTaskId(null);
    }
  }

  return (
    <section className="future-tasks-pane" aria-labelledby="future-tasks-title">
      <div className="future-tasks-head">
        <div className="future-tasks-head-copy">
          <h2 id="future-tasks-title">Future Tasks</h2>
          <p>Independent long-range countdown list</p>
        </div>
        <div className="future-tasks-head-actions">
          <span className="section-count">{tasks.length}</span>
          <button
            type="button"
            className={
              isComposerOpen
                ? 'future-task-create-button future-task-create-button-active'
                : 'future-task-create-button'
            }
            aria-label={
              isComposerOpen ? 'Close future task composer' : 'Create future task'
            }
            onClick={onToggleComposer}
          >
            <span className="future-task-create-glyph" aria-hidden="true">
              {isComposerOpen ? 'x' : '+'}
            </span>
          </button>
        </div>
      </div>
      <div className="future-tasks-scroll" role="list" aria-label="Future task list">
        {taskRows.length > 0 ? (
          <div className="future-tasks-grid">
            {taskRows.map((task) => (
              <article key={task.id} className="future-task-row" role="listitem">
                <div className="future-task-copy">
                  <strong className="future-task-title">{task.title}</strong>
                  <span className="future-task-time">{task.countdown}</span>
                </div>
                <button
                  type="button"
                  className={
                    confirmingDeleteId === task.id
                      ? 'future-task-remove future-task-remove-confirm'
                      : 'future-task-remove'
                  }
                  aria-label={
                    confirmingDeleteId === task.id
                      ? `Confirm remove ${task.title}`
                      : `Remove ${task.title}`
                  }
                  onClick={() => {
                    void handleDeleteTask(task.id);
                  }}
                  disabled={removingTaskId === task.id}
                >
                  {removingTaskId === task.id ? (
                    '...'
                  ) : confirmingDeleteId === task.id ? (
                    '!'
                  ) : (
                    <span className="future-task-remove-glyph" aria-hidden="true">
                      &#128465;
                    </span>
                  )}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="future-tasks-empty">
            <p>No future tasks yet</p>
            <span>Add one and it will count down here.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default FutureTasksPanel;
