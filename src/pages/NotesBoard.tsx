import { useEffect, useState } from 'react';
import NoteComposer from '../components/notes/NoteComposer';
import NotesFloatingStats from '../components/notes/NotesFloatingStats';
import NotesHero from '../components/notes/NotesHero';
import NotesEmptyState from '../components/notes/NotesEmptyState';
import NotesSection from '../components/notes/NotesSection';
import NotesToolbar from '../components/notes/NotesToolbar';
import WindowOverlayControls from '../components/notes/WindowOverlayControls';
import { useActiveTime } from '../hooks/useActiveTime';
import { useAppSettings } from '../hooks/useAppSettings';
import { useNotes } from '../hooks/useNotes';
import type { CreateNoteInput } from '../types/note';

function NotesBoard() {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isVisualShellReady, setIsVisualShellReady] = useState(false);
  const {
    settings,
    updateTheme,
    updateAlwaysOnTop,
    updateNoteSort,
  } = useAppSettings();
  const {
    todayActiveSeconds,
    totalActiveSeconds,
    inactiveSeconds,
    isIdle,
    isTrackingAvailable,
    resetTodayActiveSeconds,
    resetTotalActiveSeconds,
  } = useActiveTime();
  const {
    notes,
    visibleNotes,
    visiblePinnedNotes,
    visibleRegularNotes,
    pinnedCount,
    searchQuery,
    setSearchQuery,
    isFiltering,
    addNote,
    editNote,
    removeNote,
  } = useNotes(settings.noteSort.field, settings.noteSort.direction);

  useEffect(() => {
    let isCancelled = false;
    let revealTimerId = 0;

    const frameId = window.requestAnimationFrame(() => {
      revealTimerId = window.setTimeout(() => {
        if (!isCancelled) {
          setIsVisualShellReady(true);
        }
      }, 120);
    });

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(frameId);

      if (revealTimerId) {
        window.clearTimeout(revealTimerId);
      }
    };
  }, []);

  async function handleCreateNote(input: CreateNoteInput) {
    await addNote(input);
    setSearchQuery('');
    setIsComposerOpen(false);
  }

  async function handleDeleteNote(id: string) {
    const wasDeleted = await removeNote(id);

    if (wasDeleted && expandedNoteId === id) {
      setExpandedNoteId(null);
    }

    return wasDeleted;
  }

  function handleToggleExpand(id: string) {
    setExpandedNoteId((currentValue) => (currentValue === id ? null : id));
  }

  return (
    <main className={isVisualShellReady ? 'app-shell' : 'app-shell app-shell-booting'}>
      <WindowOverlayControls
        settings={settings}
        onThemeChange={updateTheme}
        onAlwaysOnTopChange={updateAlwaysOnTop}
        onNoteSortChange={updateNoteSort}
      />
      <div className="app-scroll-region">
        <section className="workspace">
          <NotesHero
            todayActiveSeconds={todayActiveSeconds}
            totalActiveSeconds={totalActiveSeconds}
            inactiveSeconds={inactiveSeconds}
            isIdle={isIdle}
            isTrackingAvailable={isTrackingAvailable}
            onResetTodayActiveSeconds={resetTodayActiveSeconds}
            onResetTotalActiveSeconds={resetTotalActiveSeconds}
          />
          <NotesToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={visibleNotes.length}
            isFiltering={isFiltering}
            isComposerOpen={isComposerOpen}
            onToggleComposer={() => setIsComposerOpen((currentValue) => !currentValue)}
          />
          {isComposerOpen ? (
            <NoteComposer
              onCreate={handleCreateNote}
              onCancel={() => setIsComposerOpen(false)}
            />
          ) : null}
          {/* Search mode collapses the board into one result list; otherwise keep pinned and regular notes separate. */}
          {isFiltering ? (
            visibleNotes.length > 0 ? (
              <NotesSection
                title="Search Results"
                sectionId="search-results-title"
                notes={visibleNotes}
                expandedNoteId={expandedNoteId}
                onToggleExpand={handleToggleExpand}
                onDelete={handleDeleteNote}
                onUpdate={editNote}
              />
            ) : (
              <NotesEmptyState
                title="No matching notes"
                description="Try a different keyword. Search currently checks title, content, and tags."
              />
            )
          ) : (
            <>
              <NotesSection
                title="Pinned Notes"
                sectionId="pinned-notes-title"
                notes={visiblePinnedNotes}
                pinned
                expandedNoteId={expandedNoteId}
                onToggleExpand={handleToggleExpand}
                onDelete={handleDeleteNote}
                onUpdate={editNote}
              />
              <NotesSection
                title="All Notes"
                sectionId="all-notes-title"
                notes={visibleRegularNotes}
                expandedNoteId={expandedNoteId}
                onToggleExpand={handleToggleExpand}
                onDelete={handleDeleteNote}
                onUpdate={editNote}
              />
            </>
          )}
        </section>
      </div>
      <NotesFloatingStats totalNotes={notes.length} pinnedNotes={pinnedCount} />
    </main>
  );
}

export default NotesBoard;
