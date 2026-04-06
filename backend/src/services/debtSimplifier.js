/**
 * Debt Simplification Algorithm
 * Minimizes the number of transactions needed to settle all debts
 */

class DebtSimplifier {
    /**
     * Simplify debts between users
     * @param {Object} balances - { userId: balance }
     * @returns {Array} - [{ from, to, amount }]
     */
    static simplify(balances) {
      // Filter out zero balances
      const nonZeroBalances = Object.entries(balances)
        .filter(([_, balance]) => Math.abs(balance) > 0.01)
        .map(([userId, balance]) => ({ userId, balance }));
      
      if (nonZeroBalances.length === 0) return [];
      
      const debtors = []; // People who owe money (negative balance)
      const creditors = []; // People who are owed money (positive balance)
      
      nonZeroBalances.forEach(({ userId, balance }) => {
        if (balance < 0) {
          debtors.push({ userId, amount: -balance });
        } else {
          creditors.push({ userId, amount: balance });
        }
      });
      
      // Sort by amount (largest first)
      debtors.sort((a, b) => b.amount - a.amount);
      creditors.sort((a, b) => b.amount - a.amount);
      
      const transactions = [];
      let debtorIndex = 0;
      let creditorIndex = 0;
      
      while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
        const debtor = debtors[debtorIndex];
        const creditor = creditors[creditorIndex];
        
        const amount = Math.min(debtor.amount, creditor.amount);
        
        if (amount > 0.01) {
          transactions.push({
            from: debtor.userId,
            to: creditor.userId,
            amount: Math.round(amount * 100) / 100
          });
        }
        
        // Update remaining amounts
        debtor.amount -= amount;
        creditor.amount -= amount;
        
        // Move to next if settled
        if (debtor.amount < 0.01) debtorIndex++;
        if (creditor.amount < 0.01) creditorIndex++;
      }
      
      return transactions;
    }
    
    /**
     * Calculate net balances from expenses and settlements
     * @param {Array} expenses - List of expenses
     * @param {Array} settlements - List of settlements
     * @returns {Object} - Net balances
     */
    static calculateNetBalances(expenses, settlements) {
      const balances = {};
      
      // Process expenses
      expenses.forEach(expense => {
        // Person who paid gets positive balance
        balances[expense.paidBy.toString()] = (balances[expense.paidBy.toString()] || 0) + expense.amount;
        
        // People who owe get negative balance
        expense.splits.forEach(split => {
          if (!split.isPaid) {
            balances[split.userId.toString()] = (balances[split.userId.toString()] || 0) - split.share;
          }
        });
      });
      
      // Process settlements
      settlements.forEach(settlement => {
        balances[settlement.fromUser.toString()] = (balances[settlement.fromUser.toString()] || 0) - settlement.amount;
        balances[settlement.toUser.toString()] = (balances[settlement.toUser.toString()] || 0) + settlement.amount;
      });
      
      // Round to 2 decimal places
      for (const userId in balances) {
        balances[userId] = Math.round(balances[userId] * 100) / 100;
      }
      
      return balances;
    }
    
    /**
     * Get simplified view of who owes whom
     * @param {Array} expenses - List of expenses
     * @param {Array} settlements - List of settlements
     * @param {Array} members - List of group members with user details
     * @returns {Array} - Simplified debts with names
     */
    static getSimplifiedDebts(expenses, settlements, members) {
      const balances = this.calculateNetBalances(expenses, settlements);
      const transactions = this.simplify(balances);
      
      // Create a map for member names
      const memberMap = new Map();
      members.forEach(member => {
        const userId = member.userId._id || member.userId;
        memberMap.set(userId.toString(), {
          name: member.nickname || (member.userId.name || member.userId),
          phone: member.userId.phone
        });
      });
      
      return transactions.map(transaction => ({
        from: {
          id: transaction.from,
          name: memberMap.get(transaction.from)?.name || transaction.from,
          phone: memberMap.get(transaction.from)?.phone
        },
        to: {
          id: transaction.to,
          name: memberMap.get(transaction.to)?.name || transaction.to,
          phone: memberMap.get(transaction.to)?.phone
        },
        amount: transaction.amount
      }));
    }
    
    /**
     * Get user's simplified debts in a group
     * @param {Object} balances - Net balances
     * @param {String} userId - Current user ID
     * @returns {Object} - What user owes and is owed
     */
    static getUserDebts(balances, userId) {
      const userBalance = balances[userId] || 0;
      const debts = [];
      const credits = [];
      
      if (Math.abs(userBalance) < 0.01) {
        return { debts, credits, netBalance: 0 };
      }
      
      const transactions = this.simplify(balances);
      
      transactions.forEach(transaction => {
        if (transaction.from === userId) {
          debts.push({
            to: transaction.to,
            amount: transaction.amount
          });
        } else if (transaction.to === userId) {
          credits.push({
            from: transaction.from,
            amount: transaction.amount
          });
        }
      });
      
      return {
        debts,
        credits,
        netBalance: userBalance
      };
    }
  }
  
  module.exports = DebtSimplifier;