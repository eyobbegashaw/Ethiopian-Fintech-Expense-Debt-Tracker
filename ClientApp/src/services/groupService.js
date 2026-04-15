import api from './api';

export const groupService = {
  getGroups: async () => {
    const response = await api.get('/groups');
    return response.data;
  },
    
  getGroup: async (groupId) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  createGroup: async (groupData) => {
    const response = await api.post('/groups', groupData);
    return response.data;
  },

  updateGroup: async (groupId, groupData) => {
    const response = await api.put(`/groups/${groupId}`, groupData);
    return response.data;
  },

  deleteGroup: async (groupId) => {
    const response = await api.delete(`/groups/${groupId}`);
    return response.data;
  },

  addMember: async (groupId, userId, nickname = null) => {
    const response = await api.post(`/groups/${groupId}/members`, { userId, nickname });
    return response.data;
  },

  removeMember: async (groupId, userId) => {
    const response = await api.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
  },

  leaveGroup: async (groupId) => {
    const response = await api.delete(`/groups/${groupId}/leave`);
    return response.data;
  },

  makeAdmin: async (groupId, userId) => {
    const response = await api.put(`/groups/${groupId}/members/${userId}/make-admin`);
    return response.data;
  },
};

export default groupService;
