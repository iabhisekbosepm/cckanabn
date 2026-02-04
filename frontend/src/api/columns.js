import client from './client';

export const columnsApi = {
  getByProject: (projectId) =>
    client.get(`/projects/${projectId}/columns`).then(res => res.data),

  create: (projectId, data) =>
    client.post(`/projects/${projectId}/columns`, data).then(res => res.data),

  update: (id, data) =>
    client.put(`/columns/${id}`, data).then(res => res.data),

  reorder: (id, position) =>
    client.put(`/columns/${id}/reorder`, { position }).then(res => res.data),

  reorderAll: (projectId, columnIds) =>
    client.put(`/projects/${projectId}/columns/reorder`, { columnIds }).then(res => res.data),

  delete: (id) => client.delete(`/columns/${id}`)
};
