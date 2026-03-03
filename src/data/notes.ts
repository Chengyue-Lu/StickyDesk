import type { CreateNoteInput, Note, UpdateNoteInput } from '../types/note';
function getBridge() {
  if (typeof window === 'undefined' || !window.stickyDesk) {
    throw new Error('StickyDesk bridge is unavailable.');
  }

  return window.stickyDesk;
}

export async function loadNotes(): Promise<Note[]> {
  return getBridge().listNotes();
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  return getBridge().createNote(input);
}

export async function updateNote(
  id: string,
  input: UpdateNoteInput,
): Promise<Note | null> {
  return getBridge().updateNote(id, input);
}

export async function deleteNote(id: string): Promise<boolean> {
  return getBridge().deleteNote(id);
}
