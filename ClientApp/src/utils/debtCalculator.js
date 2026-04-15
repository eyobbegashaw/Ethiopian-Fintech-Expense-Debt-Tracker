export const calculateUserBalance = (expenses, settlements, userId) => {
    let balance = 0;
    
    // Calculate from expenses
    expenses.forEach(expense => {
      if (expense.paidBy._id === userId) {
        balance += expense.amount;
      }
         
      const userSplit = expense.splits.find(split => split.userId._id === userId);
      if (userSplit && !userSplit.isPaid) {
        balance -= userSplit.share;
      }
    });
    
    // Calculate from settlements
    settlements.forEach(settlement => {
      if (settlement.fromUser._id === userId) {
        balance -= settlement.amount;
      }
      if (settlement.toUser._id === userId) {
        balance += settlement.amount;
      }
    });
    
    return Math.round(balance * 100) / 100;
  };
  
  export const simplifyDebts = (balances) => {
    const debtors = [];
    const creditors = [];
    
    Object.entries(balances).forEach(([userId, balance]) => {
      if (balance > 0) {
        creditors.push({ userId, amount: balance });
      } else if (balance < 0) {
        debtors.push({ userId, amount: -balance });
      }
    });
    
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
      
      debtor.amount -= amount;
      creditor.amount -= amount;
      
      if (debtor.amount < 0.01) debtorIndex++;
      if (creditor.amount < 0.01) creditorIndex++;
    }
    
    return transactions;
  };
