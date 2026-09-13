// Ringkasan doang (tanpa `content`) buat list — konsisten sama pola
// projectTaskSummary di project.resource.js, biar list gak nge-fetch isi
// catatan yang gak ditampilin di situ.
const projectNoteSummary = (note) => ({
  id: note.id,
  projectId: note.projectId,
  title: note.title,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

const projectNoteResource = (note) => ({
  ...projectNoteSummary(note),
  content: note.content ?? null,
});

const projectNoteCollection = (notes) => notes.map(projectNoteSummary);

export { projectNoteCollection, projectNoteResource, projectNoteSummary };
