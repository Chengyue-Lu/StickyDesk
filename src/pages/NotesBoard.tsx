import { useEffect, useRef, useState } from 'react';
import FutureTasksPanel from '../components/notes/FutureTasksPanel';
import FutureTaskComposer from '../components/notes/FutureTaskComposer';
import NoteComposer from '../components/notes/NoteComposer';
import NotesFloatingStats from '../components/notes/NotesFloatingStats';
import NotesHero from '../components/notes/NotesHero';
import NotesEmptyState from '../components/notes/NotesEmptyState';
import NotesSection from '../components/notes/NotesSection';
import NoteList from '../components/notes/NoteList';
import NotesToolbar from '../components/notes/NotesToolbar';
import WindowOverlayControls from '../components/notes/WindowOverlayControls';
import { useActiveTime } from '../hooks/useActiveTime';
import { useAppSettings } from '../hooks/useAppSettings';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { useFutureTasks } from '../hooks/useFutureTasks';
import { useNotes } from '../hooks/useNotes';
import {
  closeDetachedModuleWindow,
  isCursorInsideWindow,
  isDetachedModuleWindowOpen,
  openDetachedModuleWindow,
  setMainWindowLayoutCompact,
  setWindowAlwaysOnTopLocal,
  triggerFocusReminder,
} from '../lib/desktopApi';
import type { CreateNoteInput } from '../types/note';
import type { AppSettings, ThemeId } from '../types/settings';

type DetachedModuleKind = 'notes' | 'tasks';

type NotesBoardProps = {
  detachedModule: DetachedModuleKind | null;
};

type DetachedModulePreferences = {
  themeId: ThemeId;
  alwaysOnTop: boolean;
};

type DetachedPreferencesStorage = Partial<
  Record<DetachedModuleKind, DetachedModulePreferences>
>;

const DETACHED_PREFERENCES_STORAGE_KEY = 'stickydesk.detached.preferences.v1';
const DEFAULT_NOTES_SORT_FIELD = 'createdAt';
const DEFAULT_NOTES_SORT_DIRECTION = 'desc';

function normalizeThemeId(value: unknown): ThemeId | null {
  if (
    value === 'white' ||
    value === 'yellow' ||
    value === 'blue' ||
    value === 'green' ||
    value === 'purple'
  ) {
    return value;
  }

  return null;
}

function readWindowSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function readDetachedBootPreferences(
  moduleKind: DetachedModuleKind | null,
): DetachedModulePreferences | null {
  if (!moduleKind) {
    return null;
  }

  const params = readWindowSearchParams();
  const queryTheme = normalizeThemeId(params.get('theme'));
  const queryAlwaysOnTop = params.get('alwaysOnTop');

  return {
    themeId: queryTheme ?? 'white',
    alwaysOnTop: queryAlwaysOnTop === '1' || queryAlwaysOnTop === 'true',
  };
}

function readDetachedPreferencesStorage(): DetachedPreferencesStorage {
  if (typeof window === 'undefined') {
    return {};
  }

  const rawValue = window.localStorage.getItem(DETACHED_PREFERENCES_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as DetachedPreferencesStorage;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function saveDetachedModulePreferences(
  moduleKind: DetachedModuleKind,
  preferences: DetachedModulePreferences,
) {
  if (typeof window === 'undefined') {
    return;
  }

  const currentStorage = readDetachedPreferencesStorage();
  const nextStorage: DetachedPreferencesStorage = {
    ...currentStorage,
    [moduleKind]: preferences,
  };

  window.localStorage.setItem(
    DETACHED_PREFERENCES_STORAGE_KEY,
    JSON.stringify(nextStorage),
  );
}

function resolveDetachedModulePreferences(
  moduleKind: DetachedModuleKind,
  appSettings: AppSettings,
): DetachedModulePreferences {
  const storage = readDetachedPreferencesStorage();
  const stored = storage[moduleKind];

  if (stored) {
    return {
      themeId: normalizeThemeId(stored.themeId) ?? appSettings.themeId,
      alwaysOnTop: Boolean(stored.alwaysOnTop),
    };
  }

  return {
    themeId: appSettings.themeId,
    alwaysOnTop: appSettings.alwaysOnTop,
  };
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const errorText = String(error).trim();

  if (errorText && errorText !== '[object Object]') {
    return errorText;
  }

  return fallback;
}

function NotesBoard({ detachedModule }: NotesBoardProps) {
  const isMainWindow = detachedModule === null;
  const [isPointerInsideShell, setIsPointerInsideShell] = useState(true);
  const [openComposer, setOpenComposer] = useState<'note' | 'future' | null>(
    null,
  );
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isVisualShellReady, setIsVisualShellReady] = useState(false);
  const [isNotesDetached, setIsNotesDetached] = useState(false);
  const [isTasksDetached, setIsTasksDetached] = useState(false);
  const [detachedThemeId, setDetachedThemeId] = useState<ThemeId>(() => {
    return readDetachedBootPreferences(detachedModule)?.themeId ?? 'white';
  });
  const [detachedAlwaysOnTop, setDetachedAlwaysOnTop] = useState<boolean>(() => {
    return readDetachedBootPreferences(detachedModule)?.alwaysOnTop ?? false;
  });
  const wasCompactLayoutRef = useRef<boolean | null>(null);
  const detachToggleLockRef = useRef<Record<DetachedModuleKind, boolean>>({
    notes: false,
    tasks: false,
  });
  const {
    session: focusSession,
    completedCount: completedFocusCount,
    startTimer,
    dismissTimer,
  } = useFocusTimer();
  const {
    settings,
    updateTheme,
    updateUiScale,
    updateShellOpacity,
    updateAlwaysOnTop,
    updateAutoFadeWhenInactive,
  } = useAppSettings();
  const {
    futureTasks,
    addFutureTask,
    removeFutureTask,
    toggleFutureTaskCompleted,
    editFutureTask,
  } = useFutureTasks();
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
    searchQuery,
    setSearchQuery,
    isFiltering,
    addNote,
    editNote,
    removeNote,
  } = useNotes(DEFAULT_NOTES_SORT_FIELD, DEFAULT_NOTES_SORT_DIRECTION);

  const showNotesPanel =
    detachedModule === 'notes' || (isMainWindow && !isNotesDetached);
  const showTasksPanel =
    detachedModule === 'tasks' || (isMainWindow && !isTasksDetached);
  const shouldShowSearchToolbar = showNotesPanel;
  const isMainCompactLayout =
    isMainWindow && !showNotesPanel && !showTasksPanel;

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

  useEffect(() => {
    let isDisposed = false;
    let pollTimerId = 0;

    if (!settings.autoFadeWhenInactive) {
      setIsPointerInsideShell(true);
      return () => {};
    }

    const syncPointerState = async () => {
      try {
        const nextIsInside = await isCursorInsideWindow();

        if (!isDisposed) {
          setIsPointerInsideShell(nextIsInside);
        }
      } catch {
        if (!isDisposed) {
          setIsPointerInsideShell(true);
        }
      }
    };

    void syncPointerState();
    pollTimerId = window.setInterval(() => {
      void syncPointerState();
    }, 160);

    return () => {
      isDisposed = true;

      if (pollTimerId) {
        window.clearInterval(pollTimerId);
      }
    };
  }, [settings.autoFadeWhenInactive]);

  useEffect(() => {
    const reminderTitle =
      focusSession?.phase === 'alerting' ? focusSession.content : null;

    if (!reminderTitle) {
      return;
    }

    let isDisposed = false;

    const runReminderTrigger = async () => {
      try {
        await triggerFocusReminder(reminderTitle);
      } finally {
        if (!isDisposed) {
          dismissTimer();
        }
      }
    };

    void runReminderTrigger();

    return () => {
      isDisposed = true;
    };
  }, [focusSession, dismissTimer]);

  useEffect(() => {
    if (openComposer === 'note' && !showNotesPanel) {
      setOpenComposer(null);
      return;
    }

    if (openComposer === 'future' && !showTasksPanel) {
      setOpenComposer(null);
    }
  }, [openComposer, showNotesPanel, showTasksPanel]);

  useEffect(() => {
    if (isMainWindow || !detachedModule) {
      return;
    }

    const bootPreferences = readDetachedBootPreferences(detachedModule);
    const storedPreferences = readDetachedPreferencesStorage()[detachedModule];

    const resolvedThemeId =
      normalizeThemeId(storedPreferences?.themeId) ??
      normalizeThemeId(bootPreferences?.themeId) ??
      settings.themeId;
    const resolvedAlwaysOnTop =
      typeof storedPreferences?.alwaysOnTop === 'boolean'
        ? storedPreferences.alwaysOnTop
        : bootPreferences?.alwaysOnTop ?? settings.alwaysOnTop;

    setDetachedThemeId(resolvedThemeId);
    setDetachedAlwaysOnTop(resolvedAlwaysOnTop);
  }, [detachedModule, isMainWindow, settings.alwaysOnTop, settings.themeId]);

  useEffect(() => {
    if (isMainWindow) {
      return;
    }

    document.documentElement.dataset.theme = detachedThemeId;
  }, [detachedThemeId, isMainWindow, settings]);

  useEffect(() => {
    if (isMainWindow || !detachedModule) {
      return;
    }

    void setWindowAlwaysOnTopLocal(detachedAlwaysOnTop).then((appliedValue) => {
      setDetachedAlwaysOnTop((currentValue) =>
        currentValue === appliedValue ? currentValue : appliedValue,
      );
    }).catch(() => {});
  }, [detachedAlwaysOnTop, detachedModule, isMainWindow]);

  useEffect(() => {
    if (isMainWindow || !detachedModule) {
      return;
    }

    saveDetachedModulePreferences(detachedModule, {
      themeId: detachedThemeId,
      alwaysOnTop: detachedAlwaysOnTop,
    });
  }, [detachedAlwaysOnTop, detachedModule, detachedThemeId, isMainWindow]);

  useEffect(() => {
    if (!isMainWindow) {
      return;
    }

    let isDisposed = false;

    const syncDetachedWindows = async () => {
      try {
        const [notesOpen, tasksOpen] = await Promise.all([
          isDetachedModuleWindowOpen('notes'),
          isDetachedModuleWindowOpen('tasks'),
        ]);

        if (!isDisposed) {
          setIsNotesDetached(notesOpen);
          setIsTasksDetached(tasksOpen);
        }
      } catch {
        // Ignore polling errors and keep current state.
      }
    };

    void syncDetachedWindows();
    const timerId = window.setInterval(() => {
      void syncDetachedWindows();
    }, 900);

    return () => {
      isDisposed = true;
      window.clearInterval(timerId);
    };
  }, [isMainWindow]);

  useEffect(() => {
    if (!isMainWindow) {
      return;
    }

    const shouldUseCompactLayout = !showNotesPanel && !showTasksPanel;

    if (wasCompactLayoutRef.current === shouldUseCompactLayout) {
      return;
    }

    wasCompactLayoutRef.current = shouldUseCompactLayout;

    void setMainWindowLayoutCompact(shouldUseCompactLayout).catch((error) => {
      console.error('StickyDesk: failed to apply main window layout mode.', error);
    });
  }, [isMainWindow, showNotesPanel, showTasksPanel]);

  async function handleCreateNote(input: CreateNoteInput) {
    await addNote(input);
    setSearchQuery('');
    setOpenComposer(null);
  }

  async function handleCreateFutureTask(input: {
    title: string;
    dueAt: string;
  }) {
    await addFutureTask(input);
    setOpenComposer(null);
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

  async function toggleDetachedModule(moduleKind: DetachedModuleKind) {
    if (detachToggleLockRef.current[moduleKind]) {
      return;
    }

    detachToggleLockRef.current[moduleKind] = true;
    const isDetached = await isDetachedModuleWindowOpen(moduleKind);

    try {
      if (isDetached) {
        await closeDetachedModuleWindow(moduleKind);

        if (moduleKind === 'notes') {
          setIsNotesDetached(false);
        } else {
          setIsTasksDetached(false);
        }
      } else {
        const detachedPreferences = resolveDetachedModulePreferences(
          moduleKind,
          settings,
        );
        await openDetachedModuleWindow(moduleKind, {
          themeId: detachedPreferences.themeId,
          shellOpacity: settings.shellOpacity,
          autoFadeWhenInactive: settings.autoFadeWhenInactive,
          alwaysOnTop: detachedPreferences.alwaysOnTop,
        });

        if (moduleKind === 'notes') {
          setIsNotesDetached(true);
        } else {
          setIsTasksDetached(true);
        }
      }
    } catch (error) {
      const message = toErrorMessage(
        error,
        `Failed to toggle ${moduleKind} detached window.`,
      );
      window.alert(message);
    } finally {
      try {
        const [notesOpen, tasksOpen] = await Promise.all([
          isDetachedModuleWindowOpen('notes'),
          isDetachedModuleWindowOpen('tasks'),
        ]);
        setIsNotesDetached(notesOpen);
        setIsTasksDetached(tasksOpen);
      } catch {
        // Keep current flags if state sync fails.
      }

      detachToggleLockRef.current[moduleKind] = false;
    }
  }

  async function handleToggleBothDetached() {
    if (detachToggleLockRef.current.notes || detachToggleLockRef.current.tasks) {
      return;
    }

    detachToggleLockRef.current.notes = true;
    detachToggleLockRef.current.tasks = true;

    const [notesOpen, tasksOpen] = await Promise.all([
      isDetachedModuleWindowOpen('notes'),
      isDetachedModuleWindowOpen('tasks'),
    ]);
    const shouldAttachBoth = notesOpen && tasksOpen;

    try {
      if (shouldAttachBoth) {
        await Promise.all([
          closeDetachedModuleWindow('notes'),
          closeDetachedModuleWindow('tasks'),
        ]);
        setIsNotesDetached(false);
        setIsTasksDetached(false);
        return;
      }

      if (!notesOpen) {
        const notesPreferences = resolveDetachedModulePreferences('notes', settings);
        await openDetachedModuleWindow('notes', {
          themeId: notesPreferences.themeId,
          shellOpacity: settings.shellOpacity,
          autoFadeWhenInactive: settings.autoFadeWhenInactive,
          alwaysOnTop: notesPreferences.alwaysOnTop,
        });
      }

      if (!tasksOpen) {
        const tasksPreferences = resolveDetachedModulePreferences('tasks', settings);
        await openDetachedModuleWindow('tasks', {
          themeId: tasksPreferences.themeId,
          shellOpacity: settings.shellOpacity,
          autoFadeWhenInactive: settings.autoFadeWhenInactive,
          alwaysOnTop: tasksPreferences.alwaysOnTop,
        });
      }

      setIsNotesDetached(true);
      setIsTasksDetached(true);
    } catch (error) {
      const message = toErrorMessage(error, 'Failed to toggle both modules.');
      window.alert(message);
    } finally {
      try {
        const [nextNotesOpen, nextTasksOpen] = await Promise.all([
          isDetachedModuleWindowOpen('notes'),
          isDetachedModuleWindowOpen('tasks'),
        ]);
        setIsNotesDetached(nextNotesOpen);
        setIsTasksDetached(nextTasksOpen);
      } catch {
        // Keep current flags if state sync fails.
      }

      detachToggleLockRef.current.notes = false;
      detachToggleLockRef.current.tasks = false;
    }
  }

  const isShowingNotesEmptyState = isFiltering
    ? visibleNotes.length === 0
    : notes.length === 0;

  const shellClassName = [
    'app-shell',
    isMainWindow ? '' : 'app-shell-module',
    settings.autoFadeWhenInactive ? 'app-shell-auto-fade' : '',
    settings.autoFadeWhenInactive && !isPointerInsideShell
      ? 'app-shell-auto-fade-inactive'
      : '',
    isVisualShellReady ? '' : 'app-shell-booting',
  ]
    .filter(Boolean)
    .join(' ');

  const workspaceClassName = [
    'workspace',
    isMainWindow
      ? shouldShowSearchToolbar
        ? ''
        : 'workspace-no-toolbar'
      : detachedModule === 'notes'
        ? 'workspace-module-notes'
        : 'workspace-module-tasks',
    isMainCompactLayout ? 'workspace-compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const boardClassName =
    showNotesPanel && showTasksPanel
      ? 'board-split-layout'
      : 'board-split-layout board-split-layout-single';

  const overlaySettings: AppSettings = isMainWindow
    ? settings
    : {
        ...settings,
        themeId: detachedThemeId,
        alwaysOnTop: detachedAlwaysOnTop,
      };

  const handleOverlayThemeChange = async (themeId: ThemeId) => {
    if (isMainWindow) {
      await updateTheme(themeId);
      return;
    }

    if (!detachedModule) {
      return;
    }

    setDetachedThemeId(themeId);
    saveDetachedModulePreferences(detachedModule, {
      themeId,
      alwaysOnTop: detachedAlwaysOnTop,
    });
  };

  const handleOverlayAlwaysOnTopChange = async (value: boolean) => {
    if (isMainWindow) {
      return updateAlwaysOnTop(value);
    }

    if (!detachedModule) {
      return value;
    }

    setDetachedAlwaysOnTop(value);
    saveDetachedModulePreferences(detachedModule, {
      themeId: detachedThemeId,
      alwaysOnTop: value,
    });

    return value;
  };

  const handleOverlayUiScaleChange = async (value: number) => {
    if (!isMainWindow) {
      return;
    }

    await updateUiScale(value);
  };

  const handleOverlayShellOpacityChange = async (value: number) => {
    if (!isMainWindow) {
      return;
    }

    await updateShellOpacity(value);
  };

  const handleOverlayAutoFadeChange = async (value: boolean) => {
    if (!isMainWindow) {
      return;
    }

    await updateAutoFadeWhenInactive(value);
  };

  return (
    <main className={shellClassName}>
      <div className="app-top-drag-zone" aria-hidden="true" data-tauri-drag-region />
      <WindowOverlayControls
        mode={isMainWindow ? 'main' : 'module'}
        settings={overlaySettings}
        showDetachControls={isMainWindow}
        isNotesDetached={isNotesDetached}
        isTasksDetached={isTasksDetached}
        onToggleNotesDetached={() => {
          void toggleDetachedModule('notes');
        }}
        onToggleTasksDetached={() => {
          void toggleDetachedModule('tasks');
        }}
        onToggleBothDetached={() => {
          void handleToggleBothDetached();
        }}
        onThemeChange={handleOverlayThemeChange}
        onUiScaleChange={handleOverlayUiScaleChange}
        onShellOpacityChange={handleOverlayShellOpacityChange}
        onAlwaysOnTopChange={handleOverlayAlwaysOnTopChange}
        onAutoFadeWhenInactiveChange={handleOverlayAutoFadeChange}
      />
      {openComposer ? (
        <div
          className="composer-backdrop"
          onClick={() => {
            setOpenComposer(null);
          }}
        >
          <div
            className="composer-dialog"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {openComposer === 'note' ? (
              <NoteComposer
                onCreate={handleCreateNote}
                onCancel={() => setOpenComposer(null)}
              />
            ) : (
              <FutureTaskComposer
                onCreate={handleCreateFutureTask}
                onCancel={() => setOpenComposer(null)}
              />
            )}
          </div>
        </div>
      ) : null}
      <div className="app-scroll-region">
        <section className={workspaceClassName}>
          {isMainWindow ? (
            <NotesHero
              todayActiveSeconds={todayActiveSeconds}
              totalActiveSeconds={totalActiveSeconds}
              inactiveSeconds={inactiveSeconds}
              isIdle={isIdle}
              isTrackingAvailable={isTrackingAvailable}
              onResetTodayActiveSeconds={resetTodayActiveSeconds}
              onResetTotalActiveSeconds={resetTotalActiveSeconds}
            />
          ) : null}
          {shouldShowSearchToolbar ? (
            <NotesToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              resultCount={visibleNotes.length}
              isFiltering={isFiltering}
            />
          ) : null}
          {showNotesPanel || showTasksPanel ? (
            <div className={boardClassName}>
              {showNotesPanel ? (
                <section className="notes-pane" aria-label="Notes panel">
                  <div className="notes-pane-head">
                    <div className="notes-pane-head-copy">
                      <h2 id="notes-pane-title">Notes</h2>
                      <p>Fast capture and quick editing</p>
                    </div>
                    <div className="notes-pane-head-actions">
                      <span className="section-count">{notes.length}</span>
                      <button
                        type="button"
                        className={
                          openComposer === 'note'
                            ? 'future-task-create-button future-task-create-button-active'
                            : 'future-task-create-button'
                        }
                        aria-label={
                          openComposer === 'note'
                            ? 'Close note composer'
                            : 'Create a new note'
                        }
                        onClick={() => {
                          setOpenComposer((currentValue) =>
                            currentValue === 'note' ? null : 'note',
                          );
                        }}
                      >
                        <span className="future-task-create-glyph" aria-hidden="true">
                          {openComposer === 'note' ? 'x' : '+'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div
                    className={
                      isShowingNotesEmptyState
                        ? 'notes-pane-scroll notes-pane-scroll-empty'
                        : 'notes-pane-scroll'
                    }
                  >
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
                    ) : notes.length > 0 ? (
                      <NoteList
                        notes={visibleNotes}
                        expandedNoteId={expandedNoteId}
                        onToggleExpand={handleToggleExpand}
                        onDelete={handleDeleteNote}
                        onUpdate={editNote}
                      />
                    ) : (
                      <NotesEmptyState
                        title="No notes yet"
                        description="Create one and it will appear here."
                      />
                    )}
                  </div>
                </section>
              ) : null}
              {showTasksPanel ? (
                <FutureTasksPanel
                  tasks={futureTasks}
                  isComposerOpen={openComposer === 'future'}
                  onToggleComposer={() => {
                    setOpenComposer((currentValue) =>
                      currentValue === 'future' ? null : 'future',
                    );
                  }}
                  onDelete={removeFutureTask}
                  onToggleCompleted={toggleFutureTaskCompleted}
                  onUpdate={editFutureTask}
                />
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
      {isMainWindow ? (
        <NotesFloatingStats
          totalItems={notes.length + futureTasks.length}
          completedFocusCount={completedFocusCount}
          focusSession={focusSession}
          onStartFocusTimer={startTimer}
          onDismissFocusTimer={dismissTimer}
        />
      ) : null}
    </main>
  );
}

export default NotesBoard;
