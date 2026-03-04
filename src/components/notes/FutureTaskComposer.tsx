import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CreateFutureTaskInput } from '../../types/futureTask';

type FutureTaskComposerProps = {
  onCreate: (input: CreateFutureTaskInput) => Promise<void>;
  onCancel: () => void;
};

function padTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

function buildDefaultDueAtInput(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);

  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(
    date.getDate(),
  )}T${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

function FutureTaskComposer({ onCreate, onCancel }: FutureTaskComposerProps) {
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState(buildDefaultDueAtInput);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const dueAtTimestamp = new Date(dueAt).getTime();

    if (!cleanTitle) {
      setSubmitError('Add a task title first.');
      return;
    }

    if (!Number.isFinite(dueAtTimestamp) || dueAtTimestamp <= Date.now()) {
      setSubmitError('Choose a future time.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onCreate({
        title: cleanTitle,
        dueAt,
      });
      setTitle('');
      setDueAt(buildDefaultDueAtInput());
    } catch (error) {
      console.error('StickyDesk: failed to create future task.', error);
      setSubmitError('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="future-task-composer-card" aria-label="Create a future task">
      <div className="note-composer-head">
        <div>
          <p className="note-composer-eyebrow">Future Task</p>
          <h2 className="note-composer-title">Schedule ahead</h2>
        </div>
        <button
          type="button"
          className="note-composer-dismiss"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Close
        </button>
      </div>
      <form className="future-task-composer-form" onSubmit={handleSubmit}>
        <label className="future-task-field">
          <span>Task</span>
          <input
            type="text"
            value={title}
            maxLength={80}
            placeholder="What should happen later?"
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSubmitting}
            autoFocus
          />
        </label>
        <label className="future-task-field">
          <span>Due</span>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={isSubmitting}
          />
        </label>
        {submitError ? (
          <p className="future-task-error" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="future-task-composer-actions">
          <button
            type="button"
            className="future-task-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="future-task-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Create Task'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default FutureTaskComposer;
