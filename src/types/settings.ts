export type ThemeId = 'white' | 'yellow' | 'blue' | 'green' | 'purple';

export type NoteSortField = 'createdAt' | 'updatedAt';
export type NoteSortDirection = 'desc' | 'asc';

export type AppSettings = {
  themeId: ThemeId;
  uiScale: number;
  alwaysOnTop: boolean;
  window: {
    width: number;
    height: number;
  };
  noteSort: {
    field: NoteSortField;
    direction: NoteSortDirection;
  };
};
