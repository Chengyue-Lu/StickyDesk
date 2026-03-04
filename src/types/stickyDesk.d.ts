import type { CreateNoteInput, Note, UpdateNoteInput } from './note';
import type { CreateFutureTaskInput, FutureTask } from './futureTask';
import type {
  AppSettings,
  NoteSortDirection,
  NoteSortField,
  ThemeId,
} from './settings';

type WindowBounds = {
  width: number;
  height: number;
  x: number;
  y: number;
};

type StickyDeskBridge = {
  version: string;
  platform: NodeJS.Platform;
  getIdleSeconds: () => Promise<number>;
  minimizeWindow: () => void;
  closeWindow: () => void;
  setWindowSize: (width: number, height: number) => Promise<WindowBounds | null>;
  setAlwaysOnTop: (value: boolean) => Promise<boolean>;
  isCursorInsideWindow: () => Promise<boolean>;
  setAutoFadeWhenInactive: (value: boolean) => Promise<AppSettings | null>;
  getSettings: () => Promise<AppSettings>;
  setTheme: (themeId: ThemeId) => Promise<AppSettings | null>;
  setUiScale: (value: number) => Promise<AppSettings | null>;
  setShellOpacity: (value: number) => Promise<AppSettings | null>;
  setNoteSort: (
    field: NoteSortField,
    direction: NoteSortDirection,
  ) => Promise<AppSettings | null>;
  listNotes: () => Promise<Note[]>;
  listFutureTasks: () => Promise<FutureTask[]>;
  createFutureTask: (input: CreateFutureTaskInput) => Promise<FutureTask>;
  deleteFutureTask: (id: string) => Promise<boolean>;
  createNote: (input: CreateNoteInput) => Promise<Note>;
  updateNote: (id: string, input: UpdateNoteInput) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<boolean>;
};

declare global {
  interface Window {
    stickyDesk?: StickyDeskBridge;
  }
}

export {};
