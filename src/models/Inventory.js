const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Quantity cannot be negative']
  },
  reserved: {
    type: Number,
    default: 0,
    min: [0, 'Reserved cannot be negative']
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: [0, 'Threshold cannot be negative']
  },
  reorderPoint: {
    type: Number,
    default: 10
  },
  location: {
    type: String,
    default: 'Main Warehouse'
  },
  supplier: {
    name: String,
    contact: String,
    email: String
  },
  lastRestocked: Date,
  notes: String
}, {
  timestamps: true
});

// Virtual for available stock
inventorySchema.virtual('available').get(function() {
  return this.quantity - this.reserved;
});

// Virtual for low stock status
inventorySchema.virtual('isLowStock').get(function() {
  return this.available < this.lowStockThreshold;
});

// Virtual for out of stock status
inventorySchema.virtual('isOutOfStock').get(function() {
  return this.available <= 0;
});

// Method to check if enough stock
inventorySchema.methods.hasStock = function(amount) {
  return this.available >= amount;
};

// Method to add stock
inventorySchema.methods.addStock = async function(amount) {
  this.quantity += amount;
  this.lastRestocked = new Date();
  return this.save();
};

// Method to remove stock
inventorySchema.methods.removeStock = async function(amount) {
  if (this.quantity < amount) {
    throw new Error('Insufficient stock');
  }
  this.quantity -= amount;
  return this.save();
};

// Method to reserve stock
inventorySchema.methods.reserve = async function(amount) {
  if (!this.hasStock(amount)) {
    throw new Error('Insufficient available stock');
  }
  this.reserved += amount;
  return this.save();
};

// Method to release reserved stock
inventorySchema.methods.release = async function(amount) {
  if (this.reserved < amount) {
    throw new Error('Cannot release more than reserved');
  }
  this.reserved -= amount;
  return this.save();
};

// Method to fulfill reserved stock (sale)
inventorySchema.methods.fulfill = async function(amount) {
  if (this.reserved < amount) {
    throw new Error('Cannot fulfill more than reserved');
  }
  this.quantity -= amount;
  this.reserved -= amount;
  return this.save();
};

module.exports = mongoose.model('Inventory', inventorySchema);