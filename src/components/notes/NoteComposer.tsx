import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CreateNoteInput } from '../../types/note';

type NoteComposerProps = {
  onCreate: (input: CreateNoteInput) => Promise<void>;
  onCancel: () => void;
};

function NoteComposer({ onCreate, onCancel }: NoteComposerProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onCreate({
        title,
        content,
        tags: tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        pinned: isPinned,
      });
      setTitle('');
      setContent('');
      setTagsInput('');
      setIsPinned(false);
    } catch (error) {
      console.error('StickyDesk: failed to create note.', error);
      setSubmitError('Failed to save the note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="note-composer" aria-label="Create a new note">
      <div className="note-composer-head">
        <div>
          <p className="note-composer-eyebrow">New Note</p>
          <h2 className="note-composer-title">Quick capture</h2>
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
      <form className="note-composer-form" onSubmit={handleSubmit}>
        <label className="note-composer-field">
          <span>Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled note"
            disabled={isSubmitting}
            autoFocus
          />
        </label>
        <label className="note-composer-field">
          <span>Content</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write the main idea here"
            disabled={isSubmitting}
            rows={4}
          />
        </label>
        <label className="note-composer-field">
          <span>Tags</span>
          <input
            type="text"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="Comma separated"
            disabled={isSubmitting}
          />
        </label>
        <div className="note-composer-row">
          <label className="note-composer-toggle">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(event) => setIsPinned(event.target.checked)}
              disabled={isSubmitting}
            />
            <span>Pin to top</span>
          </label>
        </div>
        {submitError ? (
          <p className="note-composer-error" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="note-composer-actions">
          <button
            type="button"
            className="note-composer-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="note-composer-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Create Note'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default NoteComposer;
