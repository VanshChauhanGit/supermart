import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, Edit3, Trash2, 
  Download, Upload, Barcode, CheckCircle, ExternalLink, Image as ImageIcon 
} from 'lucide-react';

export default function InventoryManager({ products, onRefreshProducts }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [searchDropdownResults, setSearchDropdownResults] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProdId, setEditingProdId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleAdjustStock = async (item, delta) => {
    const newQty = Math.max(0, (item.stockQty || 0) + delta);
    try {
      await fetch(`/api/v1/products/${item._id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      });
      if (onRefreshProducts) onRefreshProducts();
    } catch (e) {
      console.error('Failed to adjust stock:', e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
      } else {
        alert(data.message || 'Image upload failed. You can paste an image URL or choose a preset.');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const generateBarcode = () => {
    const code = '890' + Math.floor(1000000000 + Math.random() * 9000000000);
    setFormData(prev => ({ ...prev, barcode: code }));
  };

  const sampleImages = [
    { label: 'Atta / Flours', url: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&w=400&q=80' },
    { label: 'Milk / Dairy', url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80' },
    { label: 'Edible Oil', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80' },
    { label: 'Noodles / Snacks', url: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=400&q=80' },
    { label: 'Detergents', url: 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?auto=format&fit=crop&w=400&q=80' },
    { label: 'Tea / Drinks', url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=400&q=80' }
  ];

  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category: 'Grocery & Atta',
    subCategory: 'General',
    unit: 'pcs',
    purchasePrice: '',
    mrp: '',
    sellingPrice: '',
    stockQty: '',
    reorderLevel: 5,
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    images: [],
    variants: [],
    description: ''
  });

  const [newImageInput, setNewImageInput] = useState('');

  const [categories, setCategories] = useState([
    'ALL',
    'Grocery & Atta',
    'Dairy & Fresh',
    'Snacks & Drinks',
    'Personal Care',
    'Household & Cleaning',
    'Kitchenware',
    'Stationery',
    'General Merchandise'
  ]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const catNames = data.data.filter(c => c.isActive !== false).map(c => c.name);
        setCategories(['ALL', ...new Set(catNames)]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    if (!val.trim()) {
      setSearchDropdownResults([]);
      return;
    }
    const q = val.toLowerCase();
    const matches = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.barcode.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    ).slice(0, 6);
    setSearchDropdownResults(matches);
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (filterLowStock && p.stockQty > p.reorderLevel) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q);
    }
    return true;
  });

  const lowStockCount = products.filter(p => p.stockQty <= p.reorderLevel).length;

  const handleOpenAdd = () => {
    setEditingProdId(null);
    setNewImageInput('');
    setFormData({
      barcode: '890' + Math.floor(1000000000 + Math.random() * 9000000000),
      name: '',
      category: 'Grocery & Atta',
      subCategory: 'General',
      unit: 'pcs',
      purchasePrice: '',
      mrp: '',
      sellingPrice: '',
      stockQty: 20,
      reorderLevel: 5,
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
      images: [],
      variants: [],
      description: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProdId(p._id);
    setNewImageInput('');
    setFormData({
      ...p,
      images: Array.isArray(p.images) ? [...p.images] : [],
      variants: Array.isArray(p.variants) ? p.variants.map(v => ({ ...v })) : [],
      description: p.description || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product from inventory?')) return;
    try {
      await fetch(`/api/v1/products/${id}`, { method: 'DELETE' });
      onRefreshProducts();
    } catch (e) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      alert('Seller must upload or provide a Product Image URL!');
      return;
    }
    try {
      const url = editingProdId ? `/api/v1/products/${editingProdId}` : '/api/v1/products';
      const method = editingProdId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice) || 0,
        mrp: Number(formData.mrp) || Number(formData.sellingPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        stockQty: Number(formData.stockQty) || 0,
        reorderLevel: Number(formData.reorderLevel) || 5,
        images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : [],
        variants: (formData.variants || [])
          .filter(v => v.label && v.label.trim())
          .map(v => ({
            label: v.label.trim(),
            mrp: Number(v.mrp) || Number(v.sellingPrice) || 0,
            sellingPrice: Number(v.sellingPrice) || 0,
            stockQty: Number(v.stockQty) || 0,
            unitPrice: v.unitPrice || ''
          })),
        description: formData.description || ''
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        onRefreshProducts();
      }
    } catch (e) {}
  };

  const handleExportCSV = () => {
    const headers = ['Barcode', 'Name', 'Category', 'Unit', 'PurchasePrice', 'MRP', 'SellingPrice', 'StockQty', 'ReorderLevel', 'ImageURL'];
    const rows = products.map(p => [
      p.barcode,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.unit,
      p.purchasePrice,
      p.mrp,
      p.sellingPrice,
      p.stockQty,
      p.reorderLevel,
      p.imageUrl
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `supermart_catalog_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Controls Bar */}
      <div className="glass-panel p-5 bg-white border border-slate-200">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Package className="text-[#28469E]" /> Store Catalog & Inventory
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Total Products: <strong className="text-slate-800">{products.length}</strong> • Low Stock Items: <span className={lowStockCount > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>{lowStockCount}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`btn ${filterLowStock ? 'btn-danger' : 'btn-secondary'} text-xs`}
            >
              <AlertTriangle size={16} /> Low Stock Alerts ({lowStockCount})
            </button>
            <button onClick={handleExportCSV} className="btn btn-secondary text-xs">
              <Download size={16} /> Export Catalog CSV
            </button>
            <button onClick={handleOpenAdd} className="btn btn-primary text-xs">
              <Plus size={18} /> Add New Product
            </button>
          </div>
        </div>

        {/* Search Bar with Live Image Autocomplete */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4 mt-4">
          <div className="relative">
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Start typing to search product by name or barcode..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="input-field pl-11"
              />
            </div>

            {/* Live Autocomplete Results Dropdown */}
            {searchDropdownResults.length > 0 && (
              <div className="absolute top-[105%] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {searchDropdownResults.map(p => (
                  <div
                    key={p._id}
                    onClick={() => { setSearchTerm(p.name); setSearchDropdownResults([]); }}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                        <img src={p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                        <div className="text-[11px] text-slate-500">
                          SKU: {p.barcode} • Stock: <span className="font-bold text-emerald-600">{p.stockQty} {p.unit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-[#28469E] text-sm">₹{p.sellingPrice}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="glass-panel p-5 bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
              <th className="py-3 px-3">Barcode SKU</th>
              <th className="py-3 px-3">Product Item</th>
              <th className="py-3 px-3">Department</th>
              <th className="py-3 px-3 text-right">Cost Price</th>
              <th className="py-3 px-3 text-right">MRP</th>
              <th className="py-3 px-3 text-right">Selling Price</th>
              <th className="py-3 px-3 text-center">Stock Quantity</th>
              <th className="py-3 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map(p => {
              const isLow = p.stockQty <= p.reorderLevel;
              return (
                <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono text-xs text-[#28469E] font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Barcode size={16} /> {p.barcode}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                        <img
                          src={p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div>{p.name}</div>
                        <div className="text-xs text-slate-400 font-normal">{p.subCategory || 'General'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="badge badge-blue">{p.category}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">₹{p.purchasePrice}</td>
                  <td className="py-3 px-3 text-right text-slate-400 line-through">₹{p.mrp}</td>
                  <td className="py-3 px-3 text-right font-extrabold text-[#28469E] text-base">₹{p.sellingPrice}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => handleAdjustStock(p, -1)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold flex items-center justify-center text-xs shadow-xs border border-slate-200 transition-colors"
                        title="Decrease Stock (-1)"
                      >
                        -
                      </button>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-black min-w-[3.5rem] text-center ${
                        isLow ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-slate-800'
                      }`}>
                        {p.stockQty} {p.unit}
                      </span>
                      <button
                        onClick={() => handleAdjustStock(p, 1)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold flex items-center justify-center text-xs shadow-xs border border-slate-200 transition-colors"
                        title="Increase Stock (+1)"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex gap-2">
                      <button onClick={() => handleOpenEdit(p)} className="text-blue-600 hover:text-blue-800">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(p._id)} className="text-rose-600 hover:text-rose-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal with Mandatory Image Upload */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="glass-panel w-full max-w-xl p-6 bg-white border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">{editingProdId ? 'Edit Product Catalog Item' : 'Add New Product to Catalog'}</h3>
            
            {/* Product Image Selection & Live Preview */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <ImageIcon size={16} className="text-[#28469E]" /> Seller Product Image (Required):
              </label>
              
              <div className="flex gap-4 items-center">
                <div className="w-20 h-24 rounded-xl bg-white overflow-hidden border border-slate-300 flex-shrink-0 shadow-sm aspect-[4/5]">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Image</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      placeholder="Enter Product Image URL..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="input-field text-xs flex-1"
                      required
                    />
                    <label className="btn btn-secondary text-xs px-3 py-1 cursor-pointer whitespace-nowrap flex items-center gap-1.5 font-bold">
                      <Upload size={14} />
                      <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  <div className="text-[11px] text-slate-500 mb-1.5 font-semibold">Or click a sample preset image:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sampleImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: img.url })}
                        className="badge badge-ocean text-[9px] cursor-pointer hover:bg-[#CAE8E8]"
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Barcode SKU:</label>
                  <button
                    type="button"
                    onClick={generateBarcode}
                    className="text-[10px] text-[#28469E] font-bold hover:underline"
                  >
                    🎲 Generate New
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="input-field font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Product Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Department Category:</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field"
                >
                  {categories.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Unit Type:</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="input-field"
                >
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="g">g (Grams)</option>
                  <option value="ltr">ltr (Liters)</option>
                  <option value="pack">pack (Packet)</option>
                  <option value="box">box (Box)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Cost Price (₹):</label>
                <input
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">MRP (₹):</label>
                <input
                  type="number"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Selling Price (₹):</label>
                <input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Current Stock Qty:</label>
                <input
                  type="number"
                  value={formData.stockQty}
                  onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Low Stock Alert Level:</label>
                <input
                  type="number"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700">Product Description:</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field mt-1"
                rows={2}
                placeholder="Product description and details..."
              />
            </div>

            {/* Additional Images */}
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Additional Product Images ({formData.images?.length || 0}):
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={newImageInput}
                  onChange={(e) => setNewImageInput(e.target.value)}
                  placeholder="Paste image URL..."
                  className="input-field text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newImageInput.trim()) {
                      setFormData(prev => ({
                        ...prev,
                        images: [...(prev.images || []), newImageInput.trim()]
                      }));
                      setNewImageInput('');
                    }
                  }}
                  className="btn btn-secondary text-xs px-3"
                >
                  + Add Image
                </button>
              </div>

              {formData.images && formData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.images.map((imgUrl, idx) => (
                    <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 group">
                      <img src={imgUrl} alt={`extra-${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Options / Variants */}
            <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block">
                    Product Options / Variants ({formData.variants?.length || 0}):
                  </label>
                  <p className="text-[10px] text-slate-400">e.g. 500g, 1kg, 2L with different prices and stock</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      variants: [
                        ...(prev.variants || []),
                        { label: '', mrp: '', sellingPrice: '', stockQty: 10, unitPrice: '' }
                      ]
                    }));
                  }}
                  className="btn btn-secondary text-xs px-2.5 py-1"
                >
                  + Add Option
                </button>
              </div>

              {formData.variants && formData.variants.length > 0 ? (
                <div className="space-y-2">
                  {formData.variants.map((variant, vIdx) => (
                    <div key={vIdx} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Option #{vIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              variants: prev.variants.filter((_, i) => i !== vIdx)
                            }));
                          }}
                          className="text-rose-500 font-bold hover:underline"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Option Label:</label>
                          <input
                            type="text"
                            placeholder="e.g. 1 kg, 500 g"
                            value={variant.label}
                            onChange={(e) => {
                              const updated = [...formData.variants];
                              updated[vIdx].label = e.target.value;
                              setFormData({ ...formData, variants: updated });
                            }}
                            className="input-field text-xs py-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Unit Price Hint:</label>
                          <input
                            type="text"
                            placeholder="e.g. ₹19.7/100 ml"
                            value={variant.unitPrice || ''}
                            onChange={(e) => {
                              const updated = [...formData.variants];
                              updated[vIdx].unitPrice = e.target.value;
                              setFormData({ ...formData, variants: updated });
                            }}
                            className="input-field text-xs py-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Selling Price (₹):</label>
                          <input
                            type="number"
                            value={variant.sellingPrice}
                            onChange={(e) => {
                              const updated = [...formData.variants];
                              updated[vIdx].sellingPrice = e.target.value;
                              setFormData({ ...formData, variants: updated });
                            }}
                            className="input-field text-xs py-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">MRP (₹):</label>
                          <input
                            type="number"
                            value={variant.mrp}
                            onChange={(e) => {
                              const updated = [...formData.variants];
                              updated[vIdx].mrp = e.target.value;
                              setFormData({ ...formData, variants: updated });
                            }}
                            className="input-field text-xs py-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Stock Qty:</label>
                          <input
                            type="number"
                            value={variant.stockQty}
                            onChange={(e) => {
                              const updated = [...formData.variants];
                              updated[vIdx].stockQty = e.target.value;
                              setFormData({ ...formData, variants: updated });
                            }}
                            className="input-field text-xs py-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No variants added. Base price & stock will be used.</p>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">Save Product Catalog Item</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
