import type { CreateNoteInput, Note, UpdateNoteInput } from './note';
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
  getSettings: () => Promise<AppSettings>;
  setTheme: (themeId: ThemeId) => Promise<AppSettings | null>;
  setUiScale: (value: number) => Promise<AppSettings | null>;
  setNoteSort: (
    field: NoteSortField,
    direction: NoteSortDirection,
  ) => Promise<AppSettings | null>;
  listNotes: () => Promise<Note[]>;
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
