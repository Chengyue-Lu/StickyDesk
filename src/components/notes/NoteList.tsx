import NoteCard from './NoteCard';
import type { Note, UpdateNoteInput } from '../../types/note';

type NoteListProps = {
  notes: Note[];
  pinned?: boolean;
  expandedNoteId: string | null;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, input: UpdateNoteInput) => Promise<Note | null>;
};

function NoteList({
  notes,
  pinned = false,
  expandedNoteId,
  onToggleExpand,
  onDelete,
  onUpdate,
}: NoteListProps) {
  return (
    <div className="notes-grid">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          pinned={pinned}
          isExpanded={expandedNoteId === note.id}
          onToggleExpand={onToggleExpand}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}

export default NoteList;
