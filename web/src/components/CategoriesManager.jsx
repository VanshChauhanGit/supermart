import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Plus, Search, Edit3, Trash2, CheckCircle, 
  X, RefreshCw, Upload, Image as ImageIcon, Eye, Layers 
} from 'lucide-react';

const PRESET_IMAGES = [
  { label: 'Grocery & Atta', url: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&w=400&q=80' },
  { label: 'Electronics', url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80' },
  { label: 'Dairy & Fresh', url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80' },
  { label: 'Snacks & Drinks', url: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=400&q=80' },
  { label: 'Beauty & Care', url: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a?auto=format&fit=crop&w=400&q=80' },
  { label: 'Kids & Toys', url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=400&q=80' },
  { label: 'Household', url: 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?auto=format&fit=crop&w=400&q=80' },
  { label: 'Pharmacy', url: 'https://images.unsplash.com/photo-1584308666744-24d5e4a836eb?auto=format&fit=crop&w=400&q=80' }
];

export default function CategoriesManager({ products = [], onRefreshProducts }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    sortOrder: '1',
    isActive: true
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      imageUrl: PRESET_IMAGES[0].url,
      sortOrder: (categories.length + 1).toString(),
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingId(cat._id);
    setFormData({
      name: cat.name,
      imageUrl: cat.imageUrl || '',
      sortOrder: (cat.sortOrder || 1).toString(),
      isActive: cat.isActive !== false
    });
    setShowModal(true);
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
        alert(data.message || 'Image upload failed. You can use preset image or direct URL.');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const url = editingId ? `/api/v1/categories/${editingId}` : '/api/v1/categories';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
          sortOrder: Number(formData.sortOrder) || 1,
          isActive: formData.isActive
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchCategories();
        if (onRefreshProducts) onRefreshProducts();
      } else {
        alert(data.message || 'Failed to save category');
      }
    } catch (err) {
      alert('Error saving category: ' + err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      } else {
        alert(data.message || 'Failed to delete category');
      }
    } catch (err) {
      alert('Error deleting category: ' + err.message);
    }
  };

  // Get product count per category
  const getProductCount = (catName) => {
    if (!products) return 0;
    return products.filter(p => p.category?.toLowerCase() === catName?.toLowerCase()).length;
  };

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 mb-1 font-bold text-xs uppercase tracking-wider">
            <FolderOpen size={16} />
            <span>Catalog Organization</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Manage Product Categories
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Organize products into customer-facing departments with custom images and sort orders
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCategories}
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-sm"
            title="Refresh Categories"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="btn btn-primary py-2.5 px-4 font-bold text-xs flex items-center gap-2 rounded-xl shadow-md"
          >
            <Plus size={16} />
            <span>Add New Category</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search category name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-[#28469E]"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 px-2 whitespace-nowrap">
          {filtered.length} Categories
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filtered.map(cat => {
          const count = getProductCount(cat.name);
          return (
            <div
              key={cat._id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col group"
            >
              {/* Category Image Header */}
              <div className="h-36 bg-slate-100 relative overflow-hidden">
                <img
                  src={cat.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                
                {/* Sort Order & Status Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                    #{cat.sortOrder || 1}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm backdrop-blur-sm ${
                    cat.isActive !== false ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
                  }`}>
                    {cat.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* Product Count Tag */}
                <div className="absolute bottom-2.5 left-3 text-white">
                  <div className="text-xs font-black drop-shadow">{cat.name}</div>
                  <div className="text-[10px] text-white/80 font-semibold drop-shadow">
                    {count} {count === 1 ? 'Product' : 'Products'} listed
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-3.5 flex items-center justify-between border-t border-slate-100 bg-slate-50/50 mt-auto">
                <span className="text-[11px] font-bold text-slate-500">
                  Order: <strong className="text-slate-800">{cat.sortOrder || 1}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-[#28469E] hover:border-blue-300 transition-colors shadow-sm"
                    title="Edit Category"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id, cat.name)}
                    className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm"
                    title="Delete Category"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <FolderOpen size={48} className="mx-auto text-slate-300 mb-3" />
          <h4 className="text-base font-bold text-slate-700">No categories found</h4>
          <p className="text-xs text-slate-400 mt-1">Try a different search term or add your first category.</p>
          <button
            onClick={handleOpenAdd}
            className="btn btn-primary mt-4 text-xs font-bold py-2 px-4 rounded-xl"
          >
            <Plus size={15} /> Add Category
          </button>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingId ? 'Edit Category' : 'Create New Category'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure department details & banner</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grocery & Atta, Fresh Dairy, Snacks"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                      formData.isActive 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                        : 'bg-red-50 border-red-300 text-red-700'
                    }`}
                  >
                    <CheckCircle size={14} className={formData.isActive ? 'text-emerald-600' : 'text-red-400'} />
                    <span>{formData.isActive ? 'Active in Store' : 'Hidden / Inactive'}</span>
                  </button>
                </div>
              </div>

              {/* Image Selection / Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category Banner Image
                </label>
                
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="Paste image URL..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="input-field text-xs mb-1.5"
                    />
                    
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-[#28469E] hover:underline">
                      <Upload size={14} />
                      <span>{uploading ? 'Uploading...' : 'Upload Image from Computer'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>

                {/* Preset Fast Picker */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-1.5">Or choose a fast preset:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                        className={`text-left p-1.5 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                          formData.imageUrl === preset.url 
                            ? 'border-[#28469E] bg-blue-50 text-[#28469E] ring-2 ring-[#28469E]/20' 
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-10 object-cover rounded-lg" />
                        <span className="truncate w-full text-center">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs"
                >
                  {editingId ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
