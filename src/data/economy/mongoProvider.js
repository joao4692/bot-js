const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  description: { type: String, required: true },
});

const schema = new mongoose.Schema({
  key: String,
  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  lastDaily: { type: Number, default: 0 },
  lastPay: { type: Number, default: 0 },
  transactions: [transactionSchema],
});

const Model = mongoose.model("Economy", schema);

async function getUser(key) {
  let user = await Model.findOne({ key });
  if (!user) {
    user = await Model.create({ key });
  }
  return user;
}

async function saveUser(key, data) {
  await Model.updateOne({ key }, data);
}

module.exports = { getUser, saveUser };
