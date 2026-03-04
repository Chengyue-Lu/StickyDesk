type NotesEmptyStateProps = {
  title: string;
  description: string;
};

function NotesEmptyState({ title, description }: NotesEmptyStateProps) {
  return (
    <div className="notes-empty-state" aria-live="polite">
      <p>{title}</p>
      <span>{description}</span>
    </div>
  );
}

export default NotesEmptyState;
