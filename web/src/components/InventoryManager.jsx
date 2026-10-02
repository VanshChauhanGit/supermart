import React, { useState } from 'react';
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
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
  });

  const categories = [
    'ALL',
    'Grocery & Atta',
    'Dairy & Fresh',
    'Snacks & Drinks',
    'Personal Care',
    'Household & Cleaning',
    'Kitchenware',
    'Stationery',
    'General Merchandise'
  ];

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
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProdId(p._id);
    setFormData({ ...p });
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

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
                    <span className={`badge ${isLow ? 'badge-rose' : 'badge-emerald'}`}>
                      {p.stockQty} {p.unit} {isLow && '⚠️'}
                    </span>
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
                <div className="w-20 h-20 rounded-xl bg-white overflow-hidden border border-slate-300 flex-shrink-0 shadow-sm">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Image</div>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    type="url"
                    placeholder="Enter Product Image URL..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="input-field text-xs mb-2"
                    required
                  />
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
                <label className="text-xs font-semibold text-slate-700">Barcode SKU:</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="input-field"
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
