const Product = require('../models/Product');

const generateSku = (productName = 'product') => {
  const slug = String(productName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${(slug || 'PRODUCT').toUpperCase()}-${randomSuffix}`;
};

const buildProductPayload = (body) => {
  const payload = {};
  const normalizedBody = {
    ...body,
    productName: body.productName ?? body.name,
    imageUrl: body.imageUrl ?? body.image,
    sku: body.sku
  };
  const allowedFields = ['productName', 'sku', 'category', 'status', 'price', 'stock', 'imageUrl', 'description'];

  allowedFields.forEach((field) => {
    if (normalizedBody[field] !== undefined) {
      payload[field] = normalizedBody[field];
    }
  });

  if (payload.status) {
    payload.status = String(payload.status).toLowerCase();
  }

  if (payload.productName) {
    payload.productName = String(payload.productName).trim();
  }

  if (payload.sku) {
    payload.sku = String(payload.sku).trim().toUpperCase();
  }

  if (payload.category) {
    payload.category = String(payload.category).trim();
  }

  if (payload.imageUrl) {
    payload.imageUrl = String(payload.imageUrl).trim();
  }

  if (payload.description) {
    payload.description = String(payload.description).trim();
  }

  if (payload.price !== undefined) {
    payload.price = Number(payload.price);
  }

  if (payload.stock !== undefined) {
    payload.stock = Number(payload.stock);
  }

  return payload;
};

const productController = {
  getAllProducts: async (req, res) => {
    try {
      const { status, search } = req.query;
      const query = {};

      if (status) {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { productName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ];
      }

      const products = await Product.find(query).sort({ createdAt: -1 });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getProductById: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createProduct: async (req, res) => {
    try {
      const payload = buildProductPayload(req.body);

      if (!payload.sku) {
        payload.sku = generateSku(payload.productName);
      }

      const product = await Product.create(payload);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        buildProductPayload(req.body),
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

  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = productController;
