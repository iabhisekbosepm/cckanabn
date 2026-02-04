import client from './client';

export const attachmentsApi = {
  // Get all attachments for a task
  getByTaskId: (taskId) =>
    client.get(`/tasks/${taskId}/attachments`).then(res => res.data),

  // Create a new attachment
  create: (taskId, { title, url }) =>
    client.post(`/tasks/${taskId}/attachments`, { title, url }).then(res => res.data),

  // Update an attachment
  update: (id, data) =>
    client.put(`/attachments/${id}`, data).then(res => res.data),

  // Delete an attachment
  delete: (id) =>
    client.delete(`/attachments/${id}`)
};
