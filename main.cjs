const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');

const NOTES_FILE_NAME = 'notes.json';

function getSenderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function padTimePart(value) {
  return String(value).padStart(2, '0');
}

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = padTimePart(date.getMonth() + 1);
  const day = padTimePart(date.getDate());
  const hours = padTimePart(date.getHours());
  const minutes = padTimePart(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}:00`;
}

function createSeedTimestamp(daysAgo, hours, minutes) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setDate(date.getDate() - daysAgo);

  return formatTimestamp(date);
}

function getDefaultNotes() {
  return [
    {
      id: 'note-1',
      title: 'Build the notes MVP first',
      content:
        'Keep the first iteration focused on note CRUD, tags, and a simple search flow. Delay tasks and floating widgets until the base note experience is stable.',
      tags: ['mvp', 'notes', 'setup'],
      createdAt: createSeedTimestamp(2, 8, 15),
      updatedAt: createSeedTimestamp(0, 9, 30),
      pinned: true,
    },
    {
      id: 'note-2',
      title: 'Daily study checklist',
      content:
        'Review the React shell code, list the next files to create, and verify the app still starts after each small UI change.',
      tags: ['study', 'review'],
      createdAt: createSeedTimestamp(1, 20, 45),
      updatedAt: createSeedTimestamp(0, 11, 10),
    },
    {
      id: 'note-3',
      title: 'Storage direction',
      content:
        'Use static demo data now. Move to local JSON or localStorage before introducing SQLite or full-text search.',
      tags: ['storage', 'future'],
      createdAt: createSeedTimestamp(5, 10, 5),
      updatedAt: createSeedTimestamp(1, 18, 40),
    },
  ];
}

function getStorageRootDirectory() {
  if (!app.isPackaged) {
    return __dirname;
  }

  return process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
}

function getDataDirectory() {
  const dataDirectory = path.join(getStorageRootDirectory(), 'data');

  fs.mkdirSync(dataDirectory, { recursive: true });

  return dataDirectory;
}

function getNotesFilePath() {
  return path.join(getDataDirectory(), NOTES_FILE_NAME);
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeTitle(value, fallback = 'Untitled note') {
  const normalizedValue = normalizeString(value, '').trim();

  return normalizedValue || fallback;
}

function normalizeTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function isValidTimestamp(value) {
  return (
    typeof value === 'string' &&
    Number.isFinite(new Date(value).getTime())
  );
}

function normalizeNoteRecord(note, index) {
  if (!note || typeof note !== 'object') {
    return null;
  }

  const fallbackTimestamp = formatTimestamp(new Date());
  const createdAt = isValidTimestamp(note.createdAt)
    ? note.createdAt
    : fallbackTimestamp;
  const updatedAt = isValidTimestamp(note.updatedAt)
    ? note.updatedAt
    : createdAt;

  return {
    id:
      typeof note.id === 'string' && note.id.trim()
        ? note.id
        : `note-${index + 1}-${randomUUID()}`,
    title: normalizeTitle(note.title),
    content: normalizeString(note.content),
    tags: normalizeTags(note.tags),
    createdAt,
    updatedAt,
    pinned: Boolean(note.pinned),
  };
}

function normalizeNotesCollection(notes) {
  return notes
    .map((note, index) => normalizeNoteRecord(note, index))
    .filter(Boolean);
}

async function writeNotesFile(notes) {
  const payload = {
    version: 1,
    notes,
  };

  await fs.promises.writeFile(
    getNotesFilePath(),
    JSON.stringify(payload, null, 2),
    'utf8',
  );
}

async function ensureNotesFile() {
  const notesFilePath = getNotesFilePath();

  if (fs.existsSync(notesFilePath)) {
    return notesFilePath;
  }

  await writeNotesFile(getDefaultNotes());

  return notesFilePath;
}

async function readNotesFile() {
  const notesFilePath = await ensureNotesFile();

  try {
    const rawValue = await fs.promises.readFile(notesFilePath, 'utf8');
    const parsedValue = JSON.parse(rawValue);
    const candidateNotes = Array.isArray(parsedValue)
      ? parsedValue
      : Array.isArray(parsedValue?.notes)
        ? parsedValue.notes
        : null;

    if (!candidateNotes) {
      throw new Error('Invalid notes payload.');
    }

    const normalizedNotes = normalizeNotesCollection(candidateNotes);
    await writeNotesFile(normalizedNotes);

    return normalizedNotes;
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn('StickyDesk: failed to read notes JSON, recreating defaults.');
    }

    const defaultNotes = getDefaultNotes();
    await writeNotesFile(defaultNotes);

    return defaultNotes;
  }
}

function createNoteRecord(input) {
  const timestamp = formatTimestamp(new Date());

  return {
    id: randomUUID(),
    title: normalizeTitle(input.title),
    content: normalizeString(input.content),
    tags: normalizeTags(input.tags),
    createdAt: timestamp,
    updatedAt: timestamp,
    pinned: Boolean(input.pinned),
  };
}

function updateNoteRecord(note, input) {
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(input, key);
  const nextTitle = hasOwn('title')
    ? normalizeTitle(input.title, note.title)
    : note.title;
  const nextContent = hasOwn('content')
    ? normalizeString(input.content)
    : note.content;
  const nextTags = hasOwn('tags') ? normalizeTags(input.tags) : note.tags;
  const nextPinned = hasOwn('pinned') ? Boolean(input.pinned) : note.pinned;
  const didContentFieldsChange =
    nextTitle !== note.title ||
    nextContent !== note.content ||
    nextTags.length !== note.tags.length ||
    nextTags.some((tag, index) => tag !== note.tags[index]);

  return {
    ...note,
    title: nextTitle,
    content: nextContent,
    tags: nextTags,
    pinned: nextPinned,
    updatedAt: didContentFieldsChange
      ? formatTimestamp(new Date())
      : note.updatedAt,
  };
}

async function createWindow() {
  // Keep the desktop shell narrow so it behaves more like a sticky panel than a full app window.
  const mainWindow = new BrowserWindow({
    width: 440,
    height: 980,
    minWidth: 360,
    minHeight: 640,
    show: false,
    frame: false,
    resizable: true,
    thickFrame: true,
    transparent: true,
    backgroundColor: '#00000052',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error(
        `StickyDesk: renderer failed to load (${errorCode}) ${errorDescription} -> ${validatedURL}`,
      );

      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
    },
  );

  if (!app.isPackaged) {
    // In development the renderer is served by Vite; in production we load the built HTML file.
    await mainWindow.loadURL('http://127.0.0.1:5173');

    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }

    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  await mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
}

app.whenReady().then(() => {
  // Renderer polls this lightweight bridge instead of importing Electron APIs directly.
  ipcMain.handle('activity:get-idle-seconds', () =>
    powerMonitor.getSystemIdleTime(),
  );
  ipcMain.on('window:minimize', (event) => {
    getSenderWindow(event)?.minimize();
  });
  ipcMain.on('window:close', (event) => {
    getSenderWindow(event)?.close();
  });
  ipcMain.handle('window:set-size', (event, width, height) => {
    const targetWindow = getSenderWindow(event);

    if (!targetWindow) {
      return null;
    }

    const safeWidth = Math.min(760, Math.max(360, Math.round(Number(width))));
    const safeHeight = Math.min(1400, Math.max(640, Math.round(Number(height))));

    if (!Number.isFinite(safeWidth) || !Number.isFinite(safeHeight)) {
      return null;
    }

    const currentBounds = targetWindow.getBounds();

    targetWindow.setBounds({
      ...currentBounds,
      width: safeWidth,
      height: safeHeight,
    });

    return targetWindow.getBounds();
  });
  ipcMain.handle('window:set-always-on-top', (event, value) => {
    const targetWindow = getSenderWindow(event);

    if (!targetWindow) {
      return false;
    }

    targetWindow.setAlwaysOnTop(Boolean(value));

    return targetWindow.isAlwaysOnTop();
  });
  ipcMain.handle('notes:list', async () => readNotesFile());
  ipcMain.handle('notes:create', async (_, input) => {
    const currentNotes = await readNotesFile();
    const nextNote = createNoteRecord(input ?? {});
    const nextNotes = [nextNote, ...currentNotes];

    await writeNotesFile(nextNotes);

    return nextNote;
  });
  ipcMain.handle('notes:update', async (_, id, input) => {
    const currentNotes = await readNotesFile();
    const targetIndex = currentNotes.findIndex((note) => note.id === id);

    if (targetIndex < 0) {
      return null;
    }

    const nextNote = updateNoteRecord(currentNotes[targetIndex], input ?? {});
    const nextNotes = currentNotes.map((note, index) =>
      index === targetIndex ? nextNote : note,
    );

    await writeNotesFile(nextNotes);

    return nextNote;
  });
  ipcMain.handle('notes:delete', async (_, id) => {
    const currentNotes = await readNotesFile();
    const nextNotes = currentNotes.filter((note) => note.id !== id);
    const wasDeleted = nextNotes.length !== currentNotes.length;

    if (!wasDeleted) {
      return false;
    }

    await writeNotesFile(nextNotes);

    return true;
  });

  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
