import type { CreateNoteInput, Note, UpdateNoteInput } from './note';

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
