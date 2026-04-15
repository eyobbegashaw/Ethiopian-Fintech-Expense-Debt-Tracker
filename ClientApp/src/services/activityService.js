import api from './api';

export const activityService = {
  getActivities: async (filter = 'all', page = 1, limit = 50) => {
    const response = await api.get('/activities', {
      params: { filter, page, limit }
    });
    return response.data;
  },
     
  getGroupActivities: async (groupId, page = 1, limit = 50) => {
    const response = await api.get(`/activities/group/${groupId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  getUserActivities: async (userId, page = 1, limit = 50) => {
    const response = await api.get(`/activities/user/${userId}`, {
      params: { page, limit }
    });
    return response.data;
  },
};

export default activityService;
