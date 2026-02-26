const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// ============= PRODUCT ROUTES =============

// GET routes
router.get('/', productController.getAllProducts);
router.get('/categories', productController.getCategories);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/inventory/summary', productController.getInventorySummary);
router.get('/:id', productController.getProductById);

// POST routes
router.post('/', productController.createProduct);

// PUT routes
router.put('/:id', productController.updateProduct);

// DELETE routes
router.delete('/:id', productController.deleteProduct);

// ============= INVENTORY ROUTES =============

// GET inventory
router.get('/:productId/inventory', productController.getInventory);
router.get('/:productId/availability', productController.checkAvailability);
router.get('/:productId/transactions', productController.getTransactions);

// POST inventory actions
router.post('/:productId/inventory/reserve', productController.reserveStock);
router.post('/:productId/inventory/release', productController.releaseStock);
router.post('/:productId/inventory/fulfill', productController.fulfillStock);

// PUT/PATCH inventory
router.patch('/:productId/inventory', productController.updateInventory);

module.exports = router;