export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
};

export type CreateNoteInput = {
  title: string;
  content: string;
  tags?: string[];
  pinned?: boolean;
};

export type UpdateNoteInput = Partial<
  Pick<Note, 'title' | 'content' | 'tags' | 'pinned'>
>;
