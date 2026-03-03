import { useEffect, useState } from 'react';
import type {
  AppSettings,
  NoteSortDirection,
  NoteSortField,
  ThemeId,
} from '../../types/settings';

const MIN_WINDOW_WIDTH = 360;
const MIN_WINDOW_HEIGHT = 720;
const MAX_WINDOW_WIDTH = MIN_WINDOW_WIDTH * 3;
const MAX_WINDOW_HEIGHT = 2160;

const THEME_OPTIONS: Array<{
  id: ThemeId;
  label: string;
  swatchStart: string;
  swatchEnd: string;
  ringColor: string;
}> = [
  {
    id: 'white',
    label: 'White theme',
    swatchStart: '#ffffff',
    swatchEnd: '#dbe4f1',
    ringColor: '#cbd5e1',
  },
  {
    id: 'yellow',
    label: 'Yellow theme',
    swatchStart: '#fefce8',
    swatchEnd: '#fde68a',
    ringColor: '#facc15',
  },
  {
    id: 'blue',
    label: 'Blue theme',
    swatchStart: '#eff6ff',
    swatchEnd: '#bfdbfe',
    ringColor: '#60a5fa',
  },
  {
    id: 'green',
    label: 'Green theme',
    swatchStart: '#ecfdf5',
    swatchEnd: '#bbf7d0',
    ringColor: '#4ade80',
  },
  {
    id: 'purple',
    label: 'Purple theme',
    swatchStart: '#faf5ff',
    swatchEnd: '#e9d5ff',
    ringColor: '#c084fc',
  },
];

const SORT_FIELD_OPTIONS: Array<{
  value: NoteSortField;
  label: string;
}> = [
  {
    value: 'createdAt',
    label: 'Creation time',
  },
  {
    value: 'updatedAt',
    label: 'Modification time',
  },
];

type WindowOverlayControlsProps = {
  settings: AppSettings;
  onThemeChange: (themeId: ThemeId) => Promise<void>;
  onAlwaysOnTopChange: (value: boolean) => Promise<boolean>;
  onNoteSortChange: (
    field: NoteSortField,
    direction: NoteSortDirection,
  ) => Promise<void>;
};

function normalizeDimensionInput(
  value: string,
  minimum: number,
  maximum: number,
): number {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, parsedValue));
}

function WindowOverlayControls({
  settings,
  onThemeChange,
  onAlwaysOnTopChange,
  onNoteSortChange,
}: WindowOverlayControlsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [windowWidthInput, setWindowWidthInput] = useState(
    String(settings.window.width),
  );
  const [windowHeightInput, setWindowHeightInput] = useState(
    String(settings.window.height),
  );

  useEffect(() => {
    setWindowWidthInput(String(settings.window.width));
    setWindowHeightInput(String(settings.window.height));
  }, [settings.window.height, settings.window.width]);

  const handleToggleSettings = () => {
    setIsSettingsOpen((currentValue) => !currentValue);
  };

  const handleApplyWindowSize = async () => {
    if (typeof window.stickyDesk?.setWindowSize !== 'function') {
      return;
    }

    const requestedWidth = normalizeDimensionInput(
      windowWidthInput,
      MIN_WINDOW_WIDTH,
      MAX_WINDOW_WIDTH,
    );
    const requestedHeight = normalizeDimensionInput(
      windowHeightInput,
      MIN_WINDOW_HEIGHT,
      MAX_WINDOW_HEIGHT,
    );
    const appliedBounds = await window.stickyDesk.setWindowSize(
      requestedWidth,
      requestedHeight,
    );

    if (appliedBounds) {
      setWindowWidthInput(String(appliedBounds.width));
      setWindowHeightInput(String(appliedBounds.height));
      return;
    }

    setWindowWidthInput(String(requestedWidth));
    setWindowHeightInput(String(requestedHeight));
  };

  const handleToggleAlwaysOnTop = async () => {
    void onAlwaysOnTopChange(!settings.alwaysOnTop);
  };

  const handleToggleSortDirection = () => {
    const nextDirection: NoteSortDirection =
      settings.noteSort.direction === 'desc' ? 'asc' : 'desc';

    void onNoteSortChange(settings.noteSort.field, nextDirection);
  };

  const handleMinimize = () => {
    window.stickyDesk?.minimizeWindow?.();
  };

  const handleClose = () => {
    window.stickyDesk?.closeWindow?.();
  };

  return (
    <div className="window-overlay">
      <div className="window-control-cluster" aria-label="Window controls">
        <button
          type="button"
          aria-label="Open settings"
          className={
            isSettingsOpen
              ? 'window-control-button window-control-button-active'
              : 'window-control-button'
          }
          onClick={handleToggleSettings}
        >
          <span className="window-control-glyph" aria-hidden="true">
            &#9881;
          </span>
        </button>
        <button
          type="button"
          aria-label="Minimize window"
          className="window-control-button"
          onClick={handleMinimize}
        >
          <span className="window-control-glyph" aria-hidden="true">
            &minus;
          </span>
        </button>
        <button
          type="button"
          aria-label="Close window"
          className="window-control-button window-control-button-danger"
          onClick={handleClose}
        >
          <span className="window-control-glyph" aria-hidden="true">
            &times;
          </span>
        </button>
      </div>
      <section
        className={
          isSettingsOpen
            ? 'settings-popover settings-popover-open'
            : 'settings-popover'
        }
        aria-hidden={!isSettingsOpen}
        aria-label="Window settings"
      >
        <div className="settings-group">
          <p className="settings-group-label">Window Size</p>
          <p className="settings-group-hint">
            Width {MIN_WINDOW_WIDTH}-{MAX_WINDOW_WIDTH}px · Height{' '}
            {MIN_WINDOW_HEIGHT}-{MAX_WINDOW_HEIGHT}px
          </p>
          <form
            className="settings-size-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleApplyWindowSize();
            }}
          >
            <div className="settings-size-inputs">
              <label className="settings-size-field">
                <span>Width</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_WINDOW_WIDTH}
                  max={MAX_WINDOW_WIDTH}
                  step={1}
                  value={windowWidthInput}
                  onChange={(event) => {
                    setWindowWidthInput(event.target.value);
                  }}
                />
              </label>
              <label className="settings-size-field">
                <span>Height</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_WINDOW_HEIGHT}
                  max={MAX_WINDOW_HEIGHT}
                  step={1}
                  value={windowHeightInput}
                  onChange={(event) => {
                    setWindowHeightInput(event.target.value);
                  }}
                />
              </label>
            </div>
            <button type="submit" className="settings-size-apply">
              Apply Size
            </button>
          </form>
        </div>
        <div className="settings-group">
          <p className="settings-group-label">Window Layer</p>
          <button
            type="button"
            className={
              settings.alwaysOnTop
                ? 'settings-toggle-button settings-toggle-button-active'
                : 'settings-toggle-button'
            }
            onClick={handleToggleAlwaysOnTop}
          >
            <span>Always on Top</span>
            <strong>{settings.alwaysOnTop ? 'On' : 'Off'}</strong>
          </button>
        </div>
        <div className="settings-group">
          <p className="settings-group-label">Color Theme</p>
          <div
            className="settings-theme-options"
            role="radiogroup"
            aria-label="Color theme"
          >
            {THEME_OPTIONS.map((themeOption) => (
              <button
                key={themeOption.id}
                type="button"
                role="radio"
                aria-label={themeOption.label}
                aria-checked={settings.themeId === themeOption.id}
                className={
                  settings.themeId === themeOption.id
                    ? 'settings-theme-button settings-theme-button-active'
                    : 'settings-theme-button'
                }
                style={{
                  background: `linear-gradient(160deg, ${themeOption.swatchStart}, ${themeOption.swatchEnd})`,
                  borderColor: themeOption.ringColor,
                }}
                onClick={() => {
                  void onThemeChange(themeOption.id);
                }}
              />
            ))}
          </div>
        </div>
        <div className="settings-group">
          <p className="settings-group-label">Sort Rule</p>
          <div className="settings-sort-row">
            <label className="settings-sort-select-shell">
              <span className="settings-sort-label">Sort by</span>
              <select
                className="settings-sort-select"
                value={settings.noteSort.field}
                onChange={(event) => {
                  void onNoteSortChange(
                    event.target.value as NoteSortField,
                    settings.noteSort.direction,
                  );
                }}
              >
                {SORT_FIELD_OPTIONS.map((sortOption) => (
                  <option key={sortOption.value} value={sortOption.value}>
                    {sortOption.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="settings-sort-direction"
              aria-label={
                settings.noteSort.direction === 'desc'
                  ? 'Newest to oldest'
                  : 'Oldest to newest'
              }
              title={
                settings.noteSort.direction === 'desc'
                  ? 'Newest to oldest'
                  : 'Oldest to newest'
              }
              onClick={handleToggleSortDirection}
            >
              <span className="settings-sort-direction-glyph" aria-hidden="true">
                {settings.noteSort.direction === 'desc' ? '↓' : '↑'}
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default WindowOverlayControls;
