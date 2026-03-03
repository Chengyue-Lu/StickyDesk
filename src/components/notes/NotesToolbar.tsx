type NotesToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  isFiltering: boolean;
  isComposerOpen: boolean;
  onToggleComposer: () => void;
};

function NotesToolbar({
  searchQuery,
  onSearchChange,
  resultCount,
  isFiltering,
  isComposerOpen,
  onToggleComposer,
}: NotesToolbarProps) {
  return (
    <section className="toolbar" aria-label="Notes toolbar">
      <button
        type="button"
        aria-label={isComposerOpen ? 'Close note composer' : 'Create a new note'}
        className={
          isComposerOpen
            ? 'toolbar-create-button toolbar-create-button-active'
            : 'toolbar-create-button'
        }
        onClick={onToggleComposer}
      >
        <span className="toolbar-create-glyph" aria-hidden="true">
          {isComposerOpen ? <>&times;</> : '+'}
        </span>
      </button>
      <label className="search-shell" htmlFor="notes-search-input">
        <input
          id="notes-search-input"
          className="search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title, content, or tag"
        />
      </label>
      <div className="toolbar-chip">
        {isFiltering ? `Showing ${resultCount} results` : 'Title + time view'}
      </div>
    </section>
  );
}

export default NotesToolbar;
