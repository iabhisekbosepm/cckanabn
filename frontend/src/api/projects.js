import client from './client';

export const projectsApi = {
  getAll: () => client.get('/projects').then(res => res.data),

  getById: (id) => client.get(`/projects/${id}`).then(res => res.data),

  create: (data) => client.post('/projects', data).then(res => res.data),

  update: (id, data) => client.put(`/projects/${id}`, data).then(res => res.data),

  delete: (id) => client.delete(`/projects/${id}`),

  getDashboard: () => client.get('/dashboard').then(res => res.data)
};
