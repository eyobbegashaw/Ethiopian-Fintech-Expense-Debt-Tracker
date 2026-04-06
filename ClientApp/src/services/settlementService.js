import api from './api';

export const settlementService = {
  createSettlement: async (settlementData) => {
    const response = await api.post('/settlements', settlementData);
    return response.data;
  },

  getGroupSettlements: async (groupId) => {
    const response = await api.get(`/settlements/group/${groupId}`);
    return response.data;
  },

  getPaymentOptions: async (groupId, userId) => {
    const response = await api.get(`/settlements/payment-options/${groupId}/${userId}`);
    return response.data;
  },

  getSettlementById: async (settlementId) => {
    const response = await api.get(`/settlements/${settlementId}`);
    return response.data;
  },

  updateSettlement: async (settlementId, settlementData) => {
    const response = await api.put(`/settlements/${settlementId}`, settlementData);
    return response.data;
  },

  deleteSettlement: async (settlementId) => {
    const response = await api.delete(`/settlements/${settlementId}`);
    return response.data;
  },
};

export default settlementService;