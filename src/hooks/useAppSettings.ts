import { useEffect, useState } from 'react';
import type {
  AppSettings,
  NoteSortDirection,
  NoteSortField,
  ThemeId,
} from '../types/settings';

const DEFAULT_SETTINGS: AppSettings = {
  themeId: 'white',
  uiScale: 1,
  shellOpacity: 1,
  alwaysOnTop: false,
  autoFadeWhenInactive: true,
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

function applyUiScale(value: number) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty('--ui-scale', String(value));
}

function applyShellOpacity(value: number) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty('--shell-opacity', String(value));
}

function normalizeUiScale(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.uiScale;
  }

  const clampedValue = Math.min(2, Math.max(1, value));

  return Math.round(clampedValue * 10) / 10;
}

function normalizeShellOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.shellOpacity;
  }

  const clampedValue = Math.min(1, Math.max(0.2, value));

  return Math.round(clampedValue * 100) / 100;
}

function normalizeSettings(
  value: Partial<AppSettings> | null | undefined,
): AppSettings {
  return {
    themeId: value?.themeId ?? DEFAULT_SETTINGS.themeId,
    uiScale: normalizeUiScale(value?.uiScale ?? DEFAULT_SETTINGS.uiScale),
    shellOpacity: normalizeShellOpacity(
      value?.shellOpacity ?? DEFAULT_SETTINGS.shellOpacity,
    ),
    alwaysOnTop: Boolean(value?.alwaysOnTop),
    autoFadeWhenInactive:
      typeof value?.autoFadeWhenInactive === 'boolean'
        ? value.autoFadeWhenInactive
        : DEFAULT_SETTINGS.autoFadeWhenInactive,
    window: {
      width:
        typeof value?.window?.width === 'number'
          ? value.window.width
          : DEFAULT_SETTINGS.window.width,
      height:
        typeof value?.window?.height === 'number'
          ? value.window.height
          : DEFAULT_SETTINGS.window.height,
    },
    noteSort: {
      field: value?.noteSort?.field ?? DEFAULT_SETTINGS.noteSort.field,
      direction: value?.noteSort?.direction ?? DEFAULT_SETTINGS.noteSort.direction,
    },
  };
}

type UseAppSettingsResult = {
  settings: AppSettings;
  updateTheme: (themeId: ThemeId) => Promise<void>;
  updateUiScale: (value: number) => Promise<void>;
  updateShellOpacity: (value: number) => Promise<void>;
  updateAlwaysOnTop: (value: boolean) => Promise<boolean>;
  updateAutoFadeWhenInactive: (value: boolean) => Promise<void>;
  updateNoteSort: (
    field: NoteSortField,
    direction: NoteSortDirection,
  ) => Promise<void>;
};

export function useAppSettings(): UseAppSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    applyTheme(DEFAULT_SETTINGS.themeId);
    applyUiScale(DEFAULT_SETTINGS.uiScale);
    applyShellOpacity(DEFAULT_SETTINGS.shellOpacity);

    const loadSettings = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      if (typeof window.stickyDesk?.getSettings !== 'function') {
        applyTheme(DEFAULT_SETTINGS.themeId);
        applyUiScale(DEFAULT_SETTINGS.uiScale);
        applyShellOpacity(DEFAULT_SETTINGS.shellOpacity);
        return;
      }

      try {
        const nextSettings = normalizeSettings(await window.stickyDesk.getSettings());

        setSettings(nextSettings);
        applyTheme(nextSettings.themeId);
        applyUiScale(nextSettings.uiScale);
        applyShellOpacity(nextSettings.shellOpacity);
      } catch {
        applyTheme(DEFAULT_SETTINGS.themeId);
        applyUiScale(DEFAULT_SETTINGS.uiScale);
        applyShellOpacity(DEFAULT_SETTINGS.shellOpacity);
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
      const nextSettings = normalizeSettings(
        await window.stickyDesk.setTheme(themeId),
      );

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

  const updateUiScale = async (value: number) => {
    const nextValue = normalizeUiScale(value);

    setSettings((currentSettings) => ({
      ...currentSettings,
      uiScale: nextValue,
    }));
    applyUiScale(nextValue);

    if (typeof window.stickyDesk?.setUiScale !== 'function') {
      return;
    }

    try {
      const nextSettings = normalizeSettings(
        await window.stickyDesk.setUiScale(nextValue),
      );

      if (nextSettings) {
        setSettings(nextSettings);
        applyUiScale(nextSettings.uiScale);
        return;
      }
    } catch {
      // Fall through to local state.
    }

    setSettings((currentSettings) => ({
      ...currentSettings,
      uiScale: nextValue,
    }));
    applyUiScale(nextValue);
  };

  const updateShellOpacity = async (value: number) => {
    const nextValue = normalizeShellOpacity(value);

    setSettings((currentSettings) => ({
      ...currentSettings,
      shellOpacity: nextValue,
    }));
    applyShellOpacity(nextValue);

    if (typeof window.stickyDesk?.setShellOpacity !== 'function') {
      return;
    }

    try {
      const nextSettings = normalizeSettings(
        await window.stickyDesk.setShellOpacity(nextValue),
      );

      if (nextSettings) {
        setSettings(nextSettings);
        applyShellOpacity(nextSettings.shellOpacity);
        return;
      }
    } catch {
      // Fall through to local state.
    }

    setSettings((currentSettings) => ({
      ...currentSettings,
      shellOpacity: nextValue,
    }));
    applyShellOpacity(nextValue);
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

  const updateAutoFadeWhenInactive = async (value: boolean) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      autoFadeWhenInactive: value,
    }));

    if (typeof window.stickyDesk?.setAutoFadeWhenInactive !== 'function') {
      return;
    }

    try {
      const nextSettings = normalizeSettings(
        await window.stickyDesk.setAutoFadeWhenInactive(value),
      );

      if (nextSettings) {
        setSettings(nextSettings);
        return;
      }
    } catch {
      // Fall through to local state.
    }

    setSettings((currentSettings) => ({
      ...currentSettings,
      autoFadeWhenInactive: value,
    }));
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
      const nextSettings = normalizeSettings(
        await window.stickyDesk.setNoteSort(field, direction),
      );

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
    updateUiScale,
    updateShellOpacity,
    updateAlwaysOnTop,
    updateAutoFadeWhenInactive,
    updateNoteSort,
  };
}
