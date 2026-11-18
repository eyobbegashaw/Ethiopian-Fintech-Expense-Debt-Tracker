const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { normalizeEthiopianPhone, isValidEthiopianPhone } = require('../utils/phoneUtils');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: function() {
      const p = this.phone || '';
      return p.length >= 4 ? `User ${p.slice(-4)}` : 'User';
    },
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    set: normalizeEthiopianPhone,
    validate: {
      validator: isValidEthiopianPhone,
      message: 'Phone number must start with 09 or 07 and have 10 digits (e.g. 0912345678 or 0712345678)'
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    set: v => (v === '' || v === null || v === undefined ? undefined : v)
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  telebirrLinked: {
    type: Boolean,
    default: false
  },
  telebirrPhone: String,
  cbeLinked: {
    type: Boolean,
    default: false
  },
  cbeAccount: String,
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  settings: {
    currency: {
      type: String,
      default: 'ETB'
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'am']
    },
    notifications: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark']
    },
    calendar: {
      type: String,
      default: 'ethiopian',
      enum: ['ethiopian', 'gregorian']
    },
    timeFormat: {
      type: String,
      default: '12h',
      enum: ['12h', '24h']
    }
  },
  pushToken: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// To JSON transform
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
