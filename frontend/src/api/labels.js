import client from './client';

export const labelsApi = {
  getAll: () =>
    client.get('/labels').then(res => res.data),

  create: (data) =>
    client.post('/labels', data).then(res => res.data),

  update: (id, data) =>
    client.put(`/labels/${id}`, data).then(res => res.data),

  delete: (id) =>
    client.delete(`/labels/${id}`)
};
