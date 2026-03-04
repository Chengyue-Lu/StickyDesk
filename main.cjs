const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');

const NOTES_FILE_NAME = 'notes.json';
const SETTINGS_FILE_NAME = 'settings.json';
const MIN_WINDOW_WIDTH = 360;
const MIN_WINDOW_HEIGHT = 720;
const MAX_WINDOW_WIDTH = MIN_WINDOW_WIDTH * 3;
const MAX_WINDOW_HEIGHT = 2160;
const MIN_UI_SCALE = 1;
const MAX_UI_SCALE = 2;
const DEFAULT_THEME_ID = 'white';
const VALID_THEME_IDS = new Set(['white', 'yellow', 'blue', 'green', 'purple']);
const DEFAULT_NOTE_SORT_FIELD = 'createdAt';
const DEFAULT_NOTE_SORT_DIRECTION = 'desc';
const VALID_NOTE_SORT_FIELDS = new Set(['createdAt', 'updatedAt']);
const VALID_NOTE_SORT_DIRECTIONS = new Set(['desc', 'asc']);

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

function getSettingsFilePath() {
  return path.join(getDataDirectory(), SETTINGS_FILE_NAME);
}

function clampWindowWidth(value) {
  return Math.min(
    MAX_WINDOW_WIDTH,
    Math.max(MIN_WINDOW_WIDTH, Math.round(Number(value))),
  );
}

function clampWindowHeight(value) {
  return Math.min(
    MAX_WINDOW_HEIGHT,
    Math.max(MIN_WINDOW_HEIGHT, Math.round(Number(value))),
  );
}

function normalizeThemeId(value) {
  return VALID_THEME_IDS.has(value) ? value : DEFAULT_THEME_ID;
}

function clampUiScale(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return MIN_UI_SCALE;
  }

  const clampedValue = Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, numericValue));

  return Math.round(clampedValue * 10) / 10;
}

function normalizeNoteSortField(value) {
  return VALID_NOTE_SORT_FIELDS.has(value) ? value : DEFAULT_NOTE_SORT_FIELD;
}

function normalizeNoteSortDirection(value) {
  return VALID_NOTE_SORT_DIRECTIONS.has(value)
    ? value
    : DEFAULT_NOTE_SORT_DIRECTION;
}

function getDefaultSettings() {
  return {
    version: 1,
    themeId: DEFAULT_THEME_ID,
    uiScale: MIN_UI_SCALE,
    alwaysOnTop: false,
    window: {
      width: MIN_WINDOW_WIDTH,
      height: MIN_WINDOW_HEIGHT,
    },
    noteSort: {
      field: DEFAULT_NOTE_SORT_FIELD,
      direction: DEFAULT_NOTE_SORT_DIRECTION,
    },
  };
}

function normalizeSettingsRecord(settings) {
  const fallback = getDefaultSettings();
  const candidateWindow = settings?.window;

  return {
    version: 1,
    themeId: normalizeThemeId(settings?.themeId),
    uiScale: clampUiScale(settings?.uiScale),
    alwaysOnTop: Boolean(settings?.alwaysOnTop),
    window: {
      width:
        Number.isFinite(Number(candidateWindow?.width))
          ? clampWindowWidth(candidateWindow.width)
          : fallback.window.width,
      height:
        Number.isFinite(Number(candidateWindow?.height))
          ? clampWindowHeight(candidateWindow.height)
          : fallback.window.height,
    },
    noteSort: {
      field: normalizeNoteSortField(settings?.noteSort?.field),
      direction: normalizeNoteSortDirection(settings?.noteSort?.direction),
    },
  };
}

function writeSettingsFileSync(settings) {
  fs.writeFileSync(
    getSettingsFilePath(),
    JSON.stringify(settings, null, 2),
    'utf8',
  );
}

function ensureSettingsFileSync() {
  const settingsFilePath = getSettingsFilePath();

  if (fs.existsSync(settingsFilePath)) {
    return settingsFilePath;
  }

  writeSettingsFileSync(getDefaultSettings());

  return settingsFilePath;
}

function readSettingsFileSync() {
  const settingsFilePath = ensureSettingsFileSync();

  try {
    const rawValue = fs.readFileSync(settingsFilePath, 'utf8');
    const parsedValue = JSON.parse(rawValue);
    const normalizedSettings = normalizeSettingsRecord(parsedValue);

    writeSettingsFileSync(normalizedSettings);

    return normalizedSettings;
  } catch (error) {
    console.warn('StickyDesk: failed to read settings JSON, recreating defaults.');

    const defaultSettings = getDefaultSettings();
    writeSettingsFileSync(defaultSettings);

    return defaultSettings;
  }
}

function persistWindowSettings(width, height) {
  const currentSettings = readSettingsFileSync();

  writeSettingsFileSync({
    ...currentSettings,
    window: {
      width: clampWindowWidth(width),
      height: clampWindowHeight(height),
    },
  });
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
  const appSettings = readSettingsFileSync();

  // Keep the desktop shell narrow so it behaves more like a sticky panel than a full app window.
  const mainWindow = new BrowserWindow({
    width: appSettings.window.width,
    height: appSettings.window.height,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    alwaysOnTop: appSettings.alwaysOnTop,
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
  mainWindow.on('resized', () => {
    const currentBounds = mainWindow.getBounds();

    persistWindowSettings(currentBounds.width, currentBounds.height);
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

  const loadRenderer = app.isPackaged
    ? mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
    : mainWindow.loadURL('http://127.0.0.1:5173');

  // Show the shell immediately instead of waiting for the renderer to finish booting.
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  if (!app.isPackaged) {
    // In development the renderer is served by Vite; in production we load the built HTML file.
    await loadRenderer;

    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  await loadRenderer;
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

    const requestedWidth = Math.round(Number(width));
    const requestedHeight = Math.round(Number(height));

    if (!Number.isFinite(requestedWidth) || !Number.isFinite(requestedHeight)) {
      return null;
    }

    const safeWidth = clampWindowWidth(requestedWidth);
    const safeHeight = clampWindowHeight(requestedHeight);

    const currentBounds = targetWindow.getBounds();

    targetWindow.setBounds({
      ...currentBounds,
      width: safeWidth,
      height: safeHeight,
    });

    const nextBounds = targetWindow.getBounds();
    persistWindowSettings(nextBounds.width, nextBounds.height);

    return nextBounds;
  });
  ipcMain.handle('window:set-always-on-top', (event, value) => {
    const targetWindow = getSenderWindow(event);

    if (!targetWindow) {
      return false;
    }

    targetWindow.setAlwaysOnTop(Boolean(value));
    const appliedValue = targetWindow.isAlwaysOnTop();
    const currentSettings = readSettingsFileSync();

    writeSettingsFileSync({
      ...currentSettings,
      alwaysOnTop: appliedValue,
    });

    return appliedValue;
  });
  ipcMain.handle('settings:get', () => {
    const settings = readSettingsFileSync();

    return {
      themeId: settings.themeId,
      uiScale: settings.uiScale,
      alwaysOnTop: settings.alwaysOnTop,
      window: settings.window,
      noteSort: settings.noteSort,
    };
  });
  ipcMain.handle('settings:set-theme', (_, themeId) => {
    const currentSettings = readSettingsFileSync();
    const nextSettings = {
      ...currentSettings,
      themeId: normalizeThemeId(themeId),
    };

    writeSettingsFileSync(nextSettings);

    return {
      themeId: nextSettings.themeId,
      uiScale: nextSettings.uiScale,
      alwaysOnTop: nextSettings.alwaysOnTop,
      window: nextSettings.window,
      noteSort: nextSettings.noteSort,
    };
  });
  ipcMain.handle('settings:set-ui-scale', (_, value) => {
    const currentSettings = readSettingsFileSync();
    const nextSettings = {
      ...currentSettings,
      uiScale: clampUiScale(value),
    };

    writeSettingsFileSync(nextSettings);

    return {
      themeId: nextSettings.themeId,
      uiScale: nextSettings.uiScale,
      alwaysOnTop: nextSettings.alwaysOnTop,
      window: nextSettings.window,
      noteSort: nextSettings.noteSort,
    };
  });
  ipcMain.handle('settings:set-note-sort', (_, field, direction) => {
    const currentSettings = readSettingsFileSync();
    const nextSettings = {
      ...currentSettings,
      noteSort: {
        field: normalizeNoteSortField(field),
        direction: normalizeNoteSortDirection(direction),
      },
    };

    writeSettingsFileSync(nextSettings);

    return {
      themeId: nextSettings.themeId,
      uiScale: nextSettings.uiScale,
      alwaysOnTop: nextSettings.alwaysOnTop,
      window: nextSettings.window,
      noteSort: nextSettings.noteSort,
    };
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
