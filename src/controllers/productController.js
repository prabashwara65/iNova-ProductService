const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');

const productController = {
  // ============= PRODUCT CRUD =============

  // Get all products with inventory
  getAllProducts: async (req, res) => {
    try {
      const { page = 1, limit = 10, category, search } = req.query;
      
      const query = { isActive: true };
      if (category) query.category = category;
      if (search) {
        query.$text = { $search: search };
      }
      
      const products = await Product.find(query)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });
      
      // Get inventory for each product
      const productIds = products.map(p => p._id);
      const inventories = await Inventory.find({ 
        productId: { $in: productIds } 
      });
      
      // Map inventory to products
      const inventoryMap = {};
      inventories.forEach(inv => {
        inventoryMap[inv.productId] = inv;
      });
      
      const productsWithInventory = products.map(product => ({
        ...product.toObject(),
        inventory: inventoryMap[product._id] || {
          quantity: 0,
          reserved: 0,
          available: 0
        }
      }));
      
      const total = await Product.countDocuments(query);
      
      res.json({
        products: productsWithInventory,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get single product with inventory
  getProductById: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const inventory = await Inventory.findOne({ productId: product._id });
      
      res.json({
        ...product.toObject(),
        inventory: inventory || { quantity: 0, reserved: 0, available: 0 }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Create product with inventory
  createProduct: async (req, res) => {
    try {
      const { name, description, price, sku, category, brand, images, tags, initialStock = 0 } = req.body;
      
      // Check if SKU exists
      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
      
      // Create product
      const product = new Product({
        name,
        description,
        price,
        sku,
        category,
        brand,
        images,
        tags
      });
      
      await product.save();
      
      // Create inventory
      const inventory = new Inventory({
        productId: product._id,
        quantity: initialStock,
        location: req.body.location || 'Main Warehouse'
      });
      
      await inventory.save();
      
      // Create transaction for initial stock
      if (initialStock > 0) {
        await Transaction.create({
          productId: product._id,
          type: 'RESTOCK',
          quantity: initialStock,
          newQuantity: initialStock,
          note: 'Initial stock',
          createdBy: req.body.createdBy
        });
      }
      
      res.status(201).json({
        ...product.toObject(),
        inventory
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update product
  updateProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Delete product (soft delete)
  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ============= INVENTORY MANAGEMENT =============

  // Get inventory for a product
  getInventory: async (req, res) => {
    try {
      const inventory = await Inventory.findOne({ 
        productId: req.params.productId 
      }).populate('productId');
      
      if (!inventory) {
        return res.status(404).json({ error: 'Inventory not found' });
      }
      
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update inventory (add/remove stock)
  updateInventory: async (req, res) => {
    try {
      const { quantity, type, note } = req.body;
      const inventory = await Inventory.findOne({ 
        productId: req.params.productId 
      });
      
      if (!inventory) {
        return res.status(404).json({ error: 'Inventory not found' });
      }
      
      const previousQuantity = inventory.quantity;
      
      if (type === 'add') {
        await inventory.addStock(quantity);
      } else if (type === 'remove') {
        await inventory.removeStock(quantity);
      } else {
        inventory.quantity = quantity;
        await inventory.save();
      }
      
      // Create transaction record
      await Transaction.create({
        productId: req.params.productId,
        type: type === 'add' ? 'RESTOCK' : 'ADJUSTMENT',
        quantity,
        previousQuantity,
        newQuantity: inventory.quantity,
        note,
        createdBy: req.body.createdBy
      });
      
      res.json(inventory);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Reserve stock
  reserveStock: async (req, res) => {
    try {
      const { quantity, reference } = req.body;
      const inventory = await Inventory.findOne({ 
        productId: req.params.productId 
      });
      
      if (!inventory) {
        return res.status(404).json({ error: 'Inventory not found' });
      }
      
      await inventory.reserve(quantity);
      
      await Transaction.create({
        productId: req.params.productId,
        type: 'RESERVE',
        quantity,
        previousQuantity: inventory.reserved - quantity,
        newQuantity: inventory.reserved,
        reference,
        createdBy: req.body.createdBy
      });
      
      res.json(inventory);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Release reserved stock
  releaseStock: async (req, res) => {
    try {
      const { quantity, reference } = req.body;
      const inventory = await Inventory.findOne({ 
        productId: req.params.productId 
      });
      
      if (!inventory) {
        return res.status(404).json({ error: 'Inventory not found' });
      }
      
      await inventory.release(quantity);
      
      await Transaction.create({
        productId: req.params.productId,
        type: 'RELEASE',
        quantity,
        previousQuantity: inventory.reserved + quantity,
        newQuantity: inventory.reserved,
        reference,
        createdBy: req.body.createdBy
      });
      
      res.json(inventory);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Fulfill reserved stock (sale)
  fulfillStock: async (req, res) => {
    try {
      const { quantity, reference } = req.body;
      const inventory = await Inventory.findOne({ 
        productId: req.params.productId 
      });
      
      if (!inventory) {
        return res.status(404).json({ error: 'Inventory not found' });
      }
      
      await inventory.fulfill(quantity);
      
      await Transaction.create({
        productId: req.params.productId,
        type: 'SALE',
        quantity,
        previousQuantity: inventory.quantity + quantity,
        newQuantity: inventory.quantity,
        reference,
        createdBy: req.body.createdBy
      });
      
      res.json(inventory);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Check stock availability
  checkAvailability: async (req, res) => {
    try {
      const { quantity = 1 } = req.query;
      const inventory = await Inventory.findOne({ 
        productId: req.params.productId 
      });
      
      if (!inventory) {
        return res.json({ available: false, message: 'Product not found' });
      }
      
      res.json({
        productId: req.params.productId,
        requested: parseInt(quantity),
        available: inventory.available >= parseInt(quantity),
        currentAvailable: inventory.available,
        isLowStock: inventory.isLowStock,
        isOutOfStock: inventory.isOutOfStock
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get low stock products
  getLowStockProducts: async (req, res) => {
    try {
      const { threshold } = req.query;
      
      const inventories = await Inventory.find().populate('productId');
      
      const lowStock = inventories.filter(inv => {
        if (threshold) {
          return inv.available < parseInt(threshold);
        }
        return inv.isLowStock;
      });
      
      const products = lowStock.map(inv => ({
        product: inv.productId,
        inventory: {
          quantity: inv.quantity,
          reserved: inv.reserved,
          available: inv.available,
          threshold: inv.lowStockThreshold,
          location: inv.location
        }
      }));
      
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get inventory transactions
  getTransactions: async (req, res) => {
    try {
      const { productId } = req.params;
      const { limit = 50 } = req.query;
      
      const transactions = await Transaction.find({ productId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ============= UTILITY ROUTES =============

  // Get all categories
  getCategories: async (req, res) => {
    try {
      const categories = await Product.distinct('category');
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get inventory summary
  getInventorySummary: async (req, res) => {
    try {
      const inventories = await Inventory.find();
      
      const summary = {
        totalProducts: inventories.length,
        totalStock: inventories.reduce((sum, inv) => sum + inv.quantity, 0),
        totalReserved: inventories.reduce((sum, inv) => sum + inv.reserved, 0),
        totalAvailable: inventories.reduce((sum, inv) => sum + inv.available, 0),
        lowStockCount: inventories.filter(inv => inv.isLowStock).length,
        outOfStockCount: inventories.filter(inv => inv.isOutOfStock).length
      };
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = productController;