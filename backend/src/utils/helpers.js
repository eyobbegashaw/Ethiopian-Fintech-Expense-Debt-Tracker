exports.formatCurrency = (amount, currency = 'ETB') => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  exports.formatPhoneNumber = (phone) => {
    if (!phone) return '';
    if (phone.startsWith('+251')) return phone;
    if (phone.startsWith('0')) return `+251${phone.slice(1)}`;
    return `+251${phone}`;
  };
  
  exports.generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  
  exports.calculateAge = (birthDate) => {
    const diff = Date.now() - new Date(birthDate).getTime();
    const age = new Date(diff).getUTCFullYear() - 1970;
    return Math.abs(age);
  };