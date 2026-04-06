import api from './api';

export const friendService = {
  getFriends: async () => {
    const response = await api.get('/friends');
    return response.data;
  },

  getPendingRequests: async () => {
    const response = await api.get('/friends/requests');
    return response.data;
  },

  sendFriendRequest: async (phone, message = '') => {
    const response = await api.post('/friends/request', { phone, message });
    return response.data;
  },

  acceptFriendRequest: async (requestId) => {
    const response = await api.put(`/friends/request/${requestId}/accept`);
    return response.data;
  },

  rejectFriendRequest: async (requestId) => {
    const response = await api.delete(`/friends/request/${requestId}/reject`);
    return response.data;
  },

  removeFriend: async (friendId) => {
    const response = await api.delete(`/friends/${friendId}`);
    return response.data;
  },
};

export default friendService;