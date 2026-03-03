import { useEffect, useState } from 'react';
import {
  createNote,
  deleteNote,
  loadNotes,
  updateNote,
} from '../data/notes';
import {
  filterNotes,
  getPinnedNotes,
  getRegularNotes,
} from '../lib/noteSelectors';
import type { CreateNoteInput, Note, UpdateNoteInput } from '../types/note';

type UseNotesResult = {
  notes: Note[];
  visibleNotes: Note[];
  visiblePinnedNotes: Note[];
  visibleRegularNotes: Note[];
  pinnedCount: number;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isFiltering: boolean;
  addNote: (input: CreateNoteInput) => Promise<Note>;
  editNote: (id: string, input: UpdateNoteInput) => Promise<Note | null>;
  removeNote: (id: string) => Promise<boolean>;
};

export function useNotes(): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Guard against setting state after unmount while the async notes loader resolves.
    let active = true;

    void loadNotes()
      .then((items) => {
        if (active) {
          setNotes(items);
        }
      })
      .catch((error) => {
        console.error('StickyDesk: failed to load notes.', error);
      });

    return () => {
      active = false;
    };
  }, []);

  // Keep the hook return value fully derived so the page component stays focused on layout only.
  const visibleNotes = filterNotes(notes, searchQuery);
  const isFiltering = searchQuery.trim().length > 0;

  async function addNote(input: CreateNoteInput): Promise<Note> {
    const nextNote = await createNote(input);

    setNotes((currentNotes) => [nextNote, ...currentNotes]);

    return nextNote;
  }

  async function editNote(
    id: string,
    input: UpdateNoteInput,
  ): Promise<Note | null> {
    const nextNote = await updateNote(id, input);

    if (!nextNote) {
      return null;
    }

    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === id ? nextNote : note)),
    );

    return nextNote;
  }

  async function removeNote(id: string): Promise<boolean> {
    const wasDeleted = await deleteNote(id);

    if (!wasDeleted) {
      return false;
    }

    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));

    return true;
  }

  return {
    notes,
    visibleNotes,
    visiblePinnedNotes: getPinnedNotes(visibleNotes),
    visibleRegularNotes: getRegularNotes(visibleNotes),
    pinnedCount: getPinnedNotes(notes).length,
    searchQuery,
    setSearchQuery,
    isFiltering,
    addNote,
    editNote,
    removeNote,
  };
}
