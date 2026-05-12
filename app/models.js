const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true, trim: true },
  mobile:     { type: String, required: true, unique: true, trim: true },
  password:   { type: String, required: true },
  balance:    { type: Number, default: 1000 },
  bonus:      { type: Number, default: 50 },
  role:       { type: String, enum: ['user', 'admin'], default: 'user' },
  blocked:    { type: Boolean, default: false },
  referredBy: { type: String, default: '' },
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.checkPassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

const TxnSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: String,
  type:     { type: String, enum: ['deposit', 'withdrawal', 'bet', 'win', 'bonus'] },
  amount:   Number,
  status:   { type: String, default: 'completed' },
  note:     String,
}, { timestamps: true });

const BetSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username:    String,
  roundId:     String,
  amount:      Number,
  cashoutAt:   { type: Number, default: null },
  winAmount:   { type: Number, default: 0 },
  status:      { type: String, enum: ['active', 'won', 'lost', 'auto'], default: 'active' },
  panelId:     { type: Number, default: 1 },
  autoCashout: { type: Number, default: null },
  crashPoint:  { type: Number, default: null },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Txn  = mongoose.model('Txn', TxnSchema);
const Bet  = mongoose.model('Bet', BetSchema);

module.exports = { User, Txn, Bet };
