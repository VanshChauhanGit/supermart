const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Seed Categories in memory
let memoryCategories = [
  { _id: 'cat_1', name: 'Grocery', imageUrl: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&w=400&q=80', isActive: true, sortOrder: 1 },
  { _id: 'cat_2', name: 'Electronics', imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80', isActive: true, sortOrder: 2 },
  { _id: 'cat_3', name: 'Beauty', imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a?auto=format&fit=crop&w=400&q=80', isActive: true, sortOrder: 3 },
  { _id: 'cat_4', name: 'Gifting', imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80', isActive: true, sortOrder: 4 },
  { _id: 'cat_5', name: 'Kids', imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=400&q=80', isActive: true, sortOrder: 5 },
  { _id: 'cat_6', name: 'Decor', imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80', isActive: true, sortOrder: 6 },
  { _id: 'cat_7', name: 'Pharmacy', imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5e4a836eb?auto=format&fit=crop&w=400&q=80', isActive: true, sortOrder: 7 },
];

const seedCategories = async () => {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      await Category.insertMany(memoryCategories.map(({_id, ...rest}) => rest));
      console.log('[Seed] MongoDB Categories collection populated.');
    }
  } catch (e) {
    // Memory mode active
  }
};
seedCategories();

// GET all categories
router.get('/', async (req, res) => {
  try {
    let categories;
    try {
      categories = await Category.find().sort({ sortOrder: 1 });
    } catch (e) {
      categories = memoryCategories.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Add Category
router.post('/', async (req, res) => {
  try {
    const { name, imageUrl, isActive, sortOrder } = req.body;
    let newCat;
    try {
      newCat = await Category.create({ name, imageUrl, isActive, sortOrder });
    } catch (e) {
      newCat = { _id: 'cat_' + Date.now(), name, imageUrl, isActive, sortOrder, createdAt: new Date() };
      memoryCategories.push(newCat);
    }
    res.status(201).json({ success: true, message: 'Category created', data: newCat });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT Update Category
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let updated;
    try {
      updated = await Category.findByIdAndUpdate(id, req.body, { new: true });
    } catch (e) {
      const idx = memoryCategories.findIndex(c => c._id === id);
      if (idx !== -1) {
        memoryCategories[idx] = { ...memoryCategories[idx], ...req.body, updatedAt: new Date() };
        updated = memoryCategories[idx];
      }
    }
    res.json({ success: true, message: 'Category updated', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE Category
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    try {
      await Category.findByIdAndDelete(id);
    } catch (e) {
      memoryCategories = memoryCategories.filter(c => c._id !== id);
    }
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
