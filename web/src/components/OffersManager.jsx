import React, { useState, useEffect } from 'react';
import { 
  Tag, Plus, Search, Edit3, Trash2, CheckCircle, 
  X, RefreshCw, Copy, Check, Percent, IndianRupee, Truck, ShieldAlert 
} from 'lucide-react';

export default function OffersManager() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderValue: '0',
    maxDiscount: '',
    isActive: true
  });

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/offers/admin');
      const data = await res.json();
      if (data.success) {
        setOffers(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch offers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      code: '',
      title: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderValue: '0',
      maxDiscount: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (offer) => {
    setEditingId(offer._id);
    setFormData({
      code: offer.code,
      title: offer.title,
      description: offer.description || '',
      discountType: offer.discountType || 'PERCENTAGE',
      discountValue: (offer.discountValue || '').toString(),
      minOrderValue: (offer.minOrderValue || '0').toString(),
      maxDiscount: offer.maxDiscount ? offer.maxDiscount.toString() : '',
      isActive: offer.isActive !== false
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.title.trim()) {
      alert('Please fill the promo code and title');
      return;
    }

    try {
      const url = editingId ? `/api/v1/offers/${editingId}` : '/api/v1/offers';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code.toUpperCase().trim(),
          title: formData.title.trim(),
          description: formData.description.trim(),
          discountType: formData.discountType,
          discountValue: Number(formData.discountValue) || 0,
          minOrderValue: Number(formData.minOrderValue) || 0,
          maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
          isActive: formData.isActive
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchOffers();
      } else {
        alert(data.message || 'Failed to save offer');
      }
    } catch (err) {
      alert('Error saving offer: ' + err.message);
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete promo code "${code}"?`)) return;

    try {
      const res = await fetch(`/api/v1/offers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchOffers();
      } else {
        alert(data.message || 'Failed to delete offer');
      }
    } catch (err) {
      alert('Error deleting offer: ' + err.message);
    }
  };

  const handleToggleStatus = async (offer) => {
    try {
      const res = await fetch(`/api/v1/offers/${offer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !offer.isActive })
      });
      const data = await res.json();
      if (data.success) {
        fetchOffers();
      }
    } catch (err) {
      console.error('Failed to toggle offer status:', err);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filtered = offers.filter(o =>
    o.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-fuchsia-600 mb-1 font-bold text-xs uppercase tracking-wider">
            <Tag size={16} />
            <span>Customer Promotions</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Offers & Promo Codes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Create percentage discounts, flat cashbacks and free delivery coupon codes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOffers}
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-sm"
            title="Refresh Offers"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="btn btn-primary py-2.5 px-4 font-bold text-xs flex items-center gap-2 rounded-xl shadow-md"
          >
            <Plus size={16} />
            <span>Create Promo Code</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search promo codes or offer titles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-[#28469E]"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 px-2 whitespace-nowrap">
          {filtered.length} Offers
        </div>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(offer => {
          const isPercent = offer.discountType === 'PERCENTAGE';
          const isFreeDelivery = offer.discountType === 'FREE_DELIVERY';

          return (
            <div
              key={offer._id}
              className={`bg-white rounded-2xl border ${
                offer.isActive ? 'border-slate-200' : 'border-slate-200/60 opacity-75'
              } p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden`}
            >
              {/* Top Accent Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                offer.isActive 
                  ? isFreeDelivery ? 'bg-emerald-500' : 'bg-gradient-to-r from-fuchsia-500 to-[#28469E]'
                  : 'bg-slate-300'
              }`}></div>

              <div>
                {/* Header with Promo Badge & Status Toggle */}
                <div className="flex items-center justify-between mb-3.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black bg-slate-100 border border-slate-200 text-[#1E3A8A] px-2.5 py-1 rounded-lg tracking-wider">
                      {offer.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(offer.code)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                      title="Copy code"
                    >
                      {copiedCode === offer.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(offer)}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider transition-colors ${
                      offer.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {offer.isActive ? 'Active' : 'Paused'}
                  </button>
                </div>

                {/* Offer Value Hero */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900">
                      {isFreeDelivery 
                        ? 'FREE DELIVERY'
                        : isPercent 
                          ? `${offer.discountValue}% OFF` 
                          : `₹${offer.discountValue} OFF`}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{offer.title}</h4>
                  {offer.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{offer.description}</p>
                  )}
                </div>

                {/* Eligibility Badges */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mb-4 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Min Order:</span>
                    <strong className="text-slate-700">₹{offer.minOrderValue || 0}</strong>
                  </div>
                  {isPercent && offer.maxDiscount && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Discount:</span>
                      <strong className="text-slate-700">₹{offer.maxDiscount}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400">
                  Type: <strong className="text-slate-600">{offer.discountType || 'PERCENTAGE'}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(offer)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-[#28469E] hover:border-blue-300 transition-colors shadow-sm"
                    title="Edit Offer"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(offer._id, offer.code)}
                    className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm"
                    title="Delete Offer"
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
          <Tag size={48} className="mx-auto text-slate-300 mb-3" />
          <h4 className="text-base font-bold text-slate-700">No promo offers found</h4>
          <p className="text-xs text-slate-400 mt-1">Create your first discount coupon to boost customer orders.</p>
          <button
            onClick={handleOpenAdd}
            className="btn btn-primary mt-4 text-xs font-bold py-2 px-4 rounded-xl"
          >
            <Plus size={15} /> Create Offer
          </button>
        </div>
      )}

      {/* Add / Edit Offer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingId ? 'Edit Promo Offer' : 'Create New Promo Offer'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure discount rules & minimum order threshold</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Promo Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SAVE20, KIRANA50"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="input-field font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="input-field"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Cash (₹)</option>
                    <option value="FREE_DELIVERY">Free Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Offer Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10% Off on Monthly Kiryana Grocery"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional terms or eligible customer information..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required={formData.discountType !== 'FREE_DELIVERY'}
                    placeholder={formData.discountType === 'PERCENTAGE' ? '15' : '50'}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="input-field"
                    disabled={formData.discountType === 'FREE_DELIVERY'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="200"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className="input-field"
                    disabled={formData.discountType !== 'PERCENTAGE'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Active Status
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
                  <span>{formData.isActive ? 'Coupon is Live & Redeemable' : 'Coupon is Paused / Inactive'}</span>
                </button>
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
                  {editingId ? 'Update Offer' : 'Save Promo Code'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
