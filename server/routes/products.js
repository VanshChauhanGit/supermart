const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { initialProducts } = require('../config/seedData');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
  try {
    const parts = imageUrl.split('/');
    const fileWithExt = parts.pop();
    const folderIdx = parts.indexOf('upload');
    if (folderIdx !== -1) {
       let startIdx = folderIdx + 1;
       if (parts[startIdx] && parts[startIdx].match(/^v\d+$/)) {
         startIdx++;
       }
       const folderPath = parts.slice(startIdx).join('/');
       const publicId = folderPath ? `${folderPath}/${fileWithExt.split('.')[0]}` : fileWithExt.split('.')[0];
       await cloudinary.uploader.destroy(publicId);
       console.log('Deleted from cloudinary:', publicId);
    }
  } catch (err) {
    console.error('Error deleting from cloudinary:', err);
  }
};

// Local in-memory state store fallback for maximum resilience
let memoryProducts = [...initialProducts.map((p, idx) => ({ ...p, _id: `prod_${idx + 1}`, createdAt: new Date() }))];

// Seed DB if empty
const seedProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany(initialProducts);
      console.log('[Seed] MongoDB Products collection populated.');
    }
  } catch (e) {
    // Memory mode active
  }
};
seedProducts();

// GET all products
router.get('/', async (req, res) => {
  try {
    const { category, search, lowStock } = req.query;
    let query = {};

    if (category && category !== 'ALL') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { subCategory: { $regex: search, $options: 'i' } }
      ];
    }

    let products;
    try {
      products = await Product.find(query).sort({ updatedAt: -1 });
    } catch (dbErr) {
      // Fallback to memoryProducts
      products = memoryProducts.filter(p => {
        if (category && category !== 'ALL' && p.category !== category) return false;
        if (search) {
          const s = search.toLowerCase();
          const matchName = p.name.toLowerCase().includes(s);
          const matchBarcode = p.barcode.toLowerCase().includes(s);
          if (!matchName && !matchBarcode) return false;
        }
        if (lowStock === 'true') {
          if (p.stockQty > p.reorderLevel) return false;
        }
        return true;
      });
    }

    if (lowStock === 'true' && Array.isArray(products) && products.length > 0 && products[0].toObject) {
      products = products.filter(p => p.stockQty <= p.reorderLevel);
    }

    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET product by Barcode or ID
router.get('/barcode/:barcode', async (req, res) => {
  try {
    let product;
    try {
      product = await Product.findOne({ barcode: req.params.barcode });
    } catch (e) {
      product = memoryProducts.find(p => p.barcode === req.params.barcode);
    }
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found with barcode: ' + req.params.barcode });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Add Product
router.post('/', async (req, res) => {
  try {
    const { barcode, name, category, subCategory, unit, purchasePrice, mrp, sellingPrice, stockQty, reorderLevel, imageUrl } = req.body;

    let newProd;
    try {
      newProd = await Product.create({
        barcode: barcode || 'BAR_' + Date.now(),
        name,
        category: category || 'Grocery',
        subCategory: subCategory || 'General',
        unit: unit || 'pcs',
        purchasePrice: Number(purchasePrice) || 0,
        mrp: Number(mrp) || Number(sellingPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stockQty: Number(stockQty) || 0,
        reorderLevel: Number(reorderLevel) || 5,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
      });
    } catch (e) {
      newProd = {
        _id: 'prod_' + Date.now(),
        barcode: barcode || 'BAR_' + Date.now(),
        name,
        category: category || 'Grocery',
        subCategory: subCategory || 'General',
        unit: unit || 'pcs',
        purchasePrice: Number(purchasePrice) || 0,
        mrp: Number(mrp) || Number(sellingPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stockQty: Number(stockQty) || 0,
        reorderLevel: Number(reorderLevel) || 5,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
        createdAt: new Date()
      };
      memoryProducts.unshift(newProd);
    }

    res.status(201).json({ success: true, message: 'Product created successfully', data: newProd });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT Update Product
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let updated;
    
    // Get old product to check if image changed
    let oldProduct;
    try { oldProduct = await Product.findById(id); } catch (e) {
      oldProduct = memoryProducts.find(p => p._id === id);
    }

    try {
      updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
    } catch (e) {
      const idx = memoryProducts.findIndex(p => p._id === id);
      if (idx !== -1) {
        memoryProducts[idx] = { ...memoryProducts[idx], ...req.body, updatedAt: new Date() };
        updated = memoryProducts[idx];
      }
    }
    
    if (oldProduct && updated && oldProduct.imageUrl !== updated.imageUrl) {
      await deleteFromCloudinary(oldProduct.imageUrl);
    }

    res.json({ success: true, message: 'Product updated', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE Product
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    let oldProduct;
    try { oldProduct = await Product.findById(id); } catch(e) {
      oldProduct = memoryProducts.find(p => p._id === id);
    }

    try {
      await Product.findByIdAndDelete(id);
    } catch (e) {
      memoryProducts = memoryProducts.filter(p => p._id !== id);
    }
    
    if (oldProduct && oldProduct.imageUrl) {
      await deleteFromCloudinary(oldProduct.imageUrl);
    }

    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
