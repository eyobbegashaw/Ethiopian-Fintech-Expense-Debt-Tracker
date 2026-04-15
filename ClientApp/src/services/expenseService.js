import api from './api';

export const expenseService = {
  addExpense: async (expenseData) => {
    const response = await api.post('/expenses', expenseData);
    return response.data;
  },
   
  getGroupExpenses: async (groupId, page = 1, limit = 20, category = null) => {
    const params = { page, limit };
    if (category) params.category = category;
    const response = await api.get(`/expenses/group/${groupId}`, { params });
    return response.data;
  },

  getExpenseById: async (expenseId) => {
    const response = await api.get(`/expenses/${expenseId}`);
    return response.data;
  },

  updateExpense: async (expenseId, expenseData) => {
    const response = await api.put(`/expenses/${expenseId}`, expenseData);
    return response.data;
  },

  deleteExpense: async (expenseId) => {
    const response = await api.delete(`/expenses/${expenseId}`);
    return response.data;
  },

  markSplitAsPaid: async (expenseId, userId, settlementId) => {
    const response = await api.put(`/expenses/${expenseId}/splits/${userId}/pay`, { settlementId });
    return response.data;
  },
};

export default expenseService;
