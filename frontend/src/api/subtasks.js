import client from './client';

export const subtasksApi = {
  // Get all subtasks for a task
  getByTaskId: (taskId) =>
    client.get(`/tasks/${taskId}/subtasks`).then(res => res.data),

  // Create a new subtask
  create: (taskId, title) =>
    client.post(`/tasks/${taskId}/subtasks`, { title }).then(res => res.data),

  // Update a subtask
  update: (id, data) =>
    client.put(`/subtasks/${id}`, data).then(res => res.data),

  // Toggle subtask completion
  toggle: (id) =>
    client.put(`/subtasks/${id}/toggle`).then(res => res.data),

  // Delete a subtask
  delete: (id) =>
    client.delete(`/subtasks/${id}`),

  // Reorder subtasks
  reorder: (taskId, subtaskIds) =>
    client.put(`/tasks/${taskId}/subtasks/reorder`, { subtaskIds }).then(res => res.data),

  // Get subtask stats
  getStats: (taskId) =>
    client.get(`/tasks/${taskId}/subtasks/stats`).then(res => res.data)
};
