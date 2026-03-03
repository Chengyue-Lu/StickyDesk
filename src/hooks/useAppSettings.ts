import { useEffect, useState } from 'react';
import type {
  AppSettings,
  NoteSortDirection,
  NoteSortField,
  ThemeId,
} from '../types/settings';

const DEFAULT_SETTINGS: AppSettings = {
  themeId: 'white',
  alwaysOnTop: false,
  window: {
    width: 360,
    height: 720,
  },
  noteSort: {
    field: 'createdAt',
    direction: 'desc',
  },
};

function applyTheme(themeId: ThemeId) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = themeId;
}

type UseAppSettingsResult = {
  settings: AppSettings;
  updateTheme: (themeId: ThemeId) => Promise<void>;
  updateAlwaysOnTop: (value: boolean) => Promise<boolean>;
  updateNoteSort: (
    field: NoteSortField,
    direction: NoteSortDirection,
  ) => Promise<void>;
};

export function useAppSettings(): UseAppSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    applyTheme(DEFAULT_SETTINGS.themeId);

    const loadSettings = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      if (typeof window.stickyDesk?.getSettings !== 'function') {
        applyTheme(DEFAULT_SETTINGS.themeId);
        return;
      }

      try {
        const nextSettings = await window.stickyDesk.getSettings();

        setSettings(nextSettings);
        applyTheme(nextSettings.themeId);
      } catch {
        applyTheme(DEFAULT_SETTINGS.themeId);
      }
    };

    void loadSettings();
  }, []);

  const updateTheme = async (themeId: ThemeId) => {
    if (typeof window.stickyDesk?.setTheme !== 'function') {
      setSettings((currentSettings) => ({
        ...currentSettings,
        themeId,
      }));
      applyTheme(themeId);
      return;
    }

    try {
      const nextSettings = await window.stickyDesk.setTheme(themeId);

      if (nextSettings) {
        setSettings(nextSettings);
        applyTheme(nextSettings.themeId);
        return;
      }
    } catch {
      // Fall back to local-only state so the UI still responds during bridge failures.
    }

    setSettings((currentSettings) => ({
      ...currentSettings,
      themeId,
    }));
    applyTheme(themeId);
  };

  const updateAlwaysOnTop = async (value: boolean): Promise<boolean> => {
    if (typeof window.stickyDesk?.setAlwaysOnTop !== 'function') {
      setSettings((currentSettings) => ({
        ...currentSettings,
        alwaysOnTop: value,
      }));
      return value;
    }

    try {
      const appliedValue = await window.stickyDesk.setAlwaysOnTop(value);

      setSettings((currentSettings) => ({
        ...currentSettings,
        alwaysOnTop: appliedValue,
      }));

      return appliedValue;
    } catch {
      setSettings((currentSettings) => ({
        ...currentSettings,
        alwaysOnTop: value,
      }));
      return value;
    }
  };

  const updateNoteSort = async (
    field: NoteSortField,
    direction: NoteSortDirection,
  ) => {
    if (typeof window.stickyDesk?.setNoteSort !== 'function') {
      setSettings((currentSettings) => ({
        ...currentSettings,
        noteSort: { field, direction },
      }));
      return;
    }

    try {
      const nextSettings = await window.stickyDesk.setNoteSort(field, direction);

      if (nextSettings) {
        setSettings(nextSettings);
        return;
      }
    } catch {
      // Fall through to local state.
    }

    setSettings((currentSettings) => ({
      ...currentSettings,
      noteSort: { field, direction },
    }));
  };

  return {
    settings,
    updateTheme,
    updateAlwaysOnTop,
    updateNoteSort,
  };
}
