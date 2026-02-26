const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['RESTOCK', 'SALE', 'ADJUSTMENT', 'RESERVE', 'RELEASE', 'RETURN'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousQuantity: Number,
  newQuantity: Number,
  reference: String,
  note: String,
  createdBy: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);