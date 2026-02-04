import client from './client';

export const tasksApi = {
  getByColumn: (columnId) =>
    client.get(`/columns/${columnId}/tasks`).then(res => res.data),

  getById: (id) =>
    client.get(`/tasks/${id}`).then(res => res.data),

  create: (columnId, data) =>
    client.post(`/columns/${columnId}/tasks`, data).then(res => res.data),

  update: (id, data) =>
    client.put(`/tasks/${id}`, data).then(res => res.data),

  move: (id, columnId, position) =>
    client.put(`/tasks/${id}/move`, { columnId, position }).then(res => res.data),

  reorder: (columnId, taskIds) =>
    client.put(`/columns/${columnId}/tasks/reorder`, { taskIds }).then(res => res.data),

  delete: (id) => client.delete(`/tasks/${id}`),

  // Labels
  addLabel: (taskId, labelId) =>
    client.post(`/tasks/${taskId}/labels/${labelId}`).then(res => res.data),

  removeLabel: (taskId, labelId) =>
    client.delete(`/tasks/${taskId}/labels/${labelId}`).then(res => res.data),

  // Bulk import
  previewImport: (text) =>
    client.post('/preview', { text }).then(res => res.data),

  bulkImport: (projectId, text) =>
    client.post(`/projects/${projectId}/import`, { text }).then(res => res.data),

  // Notes
  getNotes: (taskId) =>
    client.get(`/tasks/${taskId}/notes`).then(res => res.data),

  createNote: (taskId, content, author = 'User') =>
    client.post(`/tasks/${taskId}/notes`, { content, author }).then(res => res.data),

  updateNote: (noteId, content) =>
    client.put(`/notes/${noteId}`, { content }).then(res => res.data),

  deleteNote: (noteId) =>
    client.delete(`/notes/${noteId}`).then(res => res.data),

  // Activity
  getActivity: (taskId, limit = 50) =>
    client.get(`/tasks/${taskId}/activity`, { params: { limit } }).then(res => res.data)
};
