import client from './client';

export const heatmapApi = {
  // Get all tasks data for heatmap
  getData: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const query = params.toString();
    return client.get(`/dashboard/heatmap${query ? `?${query}` : ''}`).then(res => res.data);
  }
};
