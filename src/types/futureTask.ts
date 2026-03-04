export type FutureTask = {
  id: string;
  title: string;
  dueAt: string;
  createdAt: string;
};

export type CreateFutureTaskInput = {
  title: string;
  dueAt: string;
};
