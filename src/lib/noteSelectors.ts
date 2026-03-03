import type { Note } from '../types/note';
import type { NoteSortDirection, NoteSortField } from '../types/settings';

export function getPinnedNotes(notes: Note[]): Note[] {
  return notes.filter((note) => note.pinned);
}

export function getRegularNotes(notes: Note[]): Note[] {
  return notes.filter((note) => !note.pinned);
}

export function filterNotes(notes: Note[], searchQuery: string): Note[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return notes;
  }

  return notes.filter((note) => {
    // Search intentionally stays on the fields the note model keeps today.
    const searchableFields = [
      note.title,
      note.content,
      ...note.tags,
    ];

    return searchableFields.some((field) =>
      field.toLowerCase().includes(normalizedQuery),
    );
  });
}

function getSortableTimestamp(note: Note, field: NoteSortField): number {
  const parsedValue = Date.parse(note[field]);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function sortNotes(
  notes: Note[],
  field: NoteSortField,
  direction: NoteSortDirection,
): Note[] {
  const sortedNotes = [...notes].sort((leftNote, rightNote) => {
    const leftTimestamp = getSortableTimestamp(leftNote, field);
    const rightTimestamp = getSortableTimestamp(rightNote, field);

    if (leftTimestamp === rightTimestamp) {
      return rightNote.title.localeCompare(leftNote.title);
    }

    return rightTimestamp - leftTimestamp;
  });

  if (direction === 'asc') {
    sortedNotes.reverse();
  }

  return sortedNotes;
}
