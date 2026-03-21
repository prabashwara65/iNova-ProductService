const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['active', 'inactive', 'out_of_stock'],
      message: 'Status must be active, inactive, or out_of_stock'
    },
    default: 'active'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  imageUrl: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  }
}, {
  timestamps: true
});

productSchema.index({ productName: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
