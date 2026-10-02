import React, { useState } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, CheckCircle, MapPin, 
  Phone, Sparkles, ArrowRight, ShieldCheck 
} from 'lucide-react';

export default function CustomerStorefront({ products, onOrderPlaced }) {
  const [cart, setCart] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('110001');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [orderSuccess, setOrderSuccess] = useState(null);

  const categories = [
    'ALL',
    'Grocery & Atta',
    'Dairy & Fresh',
    'Snacks & Drinks',
    'Personal Care',
    'Household & Cleaning',
    'Kitchenware',
    'Stationery'
  ];

  const filtered = products.filter(p => {
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
    if (searchTerm) {
      return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item._id === product._id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        copy[idx].total = copy[idx].quantity * copy[idx].price;
        return copy;
      } else {
        return [
          ...prev,
          {
            _id: product._id,
            productId: product._id,
            name: product.name,
            price: product.sellingPrice,
            quantity: 1,
            unit: product.unit || 'pcs',
            total: product.sellingPrice,
            imageUrl: product.imageUrl
          }
        ];
      }
    });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item._id === id) {
          const q = item.quantity + delta;
          if (q <= 0) return null;
          return { ...item, quantity: q, total: q * item.price };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const subtotal = cart.reduce((acc, i) => acc + i.total, 0);
  const deliveryFee = subtotal > 300 ? 0 : 30;
  const grandTotal = subtotal + deliveryFee;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        customerName,
        phone,
        deliveryAddress: address,
        pincode,
        items: cart,
        subtotal,
        deliveryFee,
        totalAmount: grandTotal,
        paymentMethod
      };

      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setOrderSuccess(data.data);
        setCart([]);
        setShowCheckout(false);
        if (onOrderPlaced) onOrderPlaced();
      }
    } catch (e) {
      alert('Error placing order: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Storefront Hero Banner */}
      <div className="glass-panel p-8 bg-gradient-to-br from-[#28469E] via-[#1E367D] to-[#0A0F1D] rounded-3xl text-white shadow-xl relative overflow-hidden border border-[#CAE8E8]/30">
        <div className="flex justify-between items-center flex-wrap gap-5 relative z-10">
          <div>
            <span className="badge badge-ocean mb-2.5">
              <Sparkles size={14} /> Local Supermart Express 30-Min Delivery
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Order Fresh Kiryana & Essentials Online
            </h1>
            <p className="text-[#CAE8E8] text-sm mt-2 max-w-xl">
              Get fresh groceries, daily milk, snacks, beverages & household products delivered directly to your doorstep.
            </p>
          </div>

          <button 
            onClick={() => setShowCheckout(true)}
            className="btn btn-ocean py-3.5 px-6 text-base shadow-lg"
            disabled={cart.length === 0}
          >
            <ShoppingBag size={22} />
            <span>Checkout Cart ({cart.length} items • ₹{grandTotal})</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto mt-6 pt-2 pb-1 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`btn whitespace-nowrap text-xs ${
                categoryFilter === cat ? 'btn-ocean' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filtered.map(product => (
          <div
            key={product._id}
            className="glass-panel p-4 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between hover:shadow-lg transition-all duration-200"
          >
            <div>
              <div className="h-36 rounded-xl overflow-hidden mb-3 bg-slate-100">
                <img
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="badge badge-blue text-[10px] mb-1">
                {product.category}
              </span>

              <h4 className="font-bold text-slate-900 text-sm mt-1">{product.name}</h4>
              <p className="text-xs text-slate-500">Pack size: {product.unit}</p>
            </div>

            <div className="mt-4 flex justify-between items-center pt-3 border-t border-slate-100">
              <div>
                <span className="text-lg font-black text-[#28469E]">₹{product.sellingPrice}</span>
                <span className="text-xs text-slate-400 line-through ml-1.5">₹{product.mrp}</span>
              </div>

              <button
                onClick={() => addToCart(product)}
                className="btn btn-primary text-xs py-1.5 px-3"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmitOrder} className="glass-panel w-full max-w-md p-6 bg-white border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="text-[#28469E]" /> Place Online Delivery Order
            </h3>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 max-h-40 overflow-y-auto">
              {cart.map(item => (
                <div key={item._id} className="flex justify-between text-xs mb-1 text-slate-700">
                  <span>{item.name} x {item.quantity}</span>
                  <span className="font-bold">₹{item.total}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-1.5 mt-1.5 flex justify-between text-sm font-black text-slate-900">
                <span>Total Amount:</span>
                <span className="text-[#28469E]">₹{grandTotal}</span>
              </div>
            </div>

            <input
              type="text"
              placeholder="Your Full Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input-field mb-2.5"
              required
            />
            <input
              type="text"
              placeholder="Mobile Phone Number (+91...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field mb-2.5"
              required
            />
            <textarea
              placeholder="Full Delivery Address (House No, Street, Landmark)..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-field mb-2.5 h-16"
              required
            />

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input-field mb-4"
            >
              <option value="COD">Cash on Delivery (COD)</option>
              <option value="ONLINE_UPI">Pay Online via UPI QR</option>
            </select>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">Confirm Order</button>
              <button type="button" onClick={() => setShowCheckout(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-sm p-6 bg-white border border-slate-200 text-center">
            <CheckCircle size={54} className="text-emerald-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-slate-900">Order Placed Successfully!</h3>
            <p className="text-xs text-slate-500 my-2">
              Order No: <strong className="text-slate-800">#{orderSuccess.orderNo}</strong>
            </p>
            <p className="text-xs text-slate-600">
              Our delivery rider will reach your address in ~30 mins.
            </p>
            <button onClick={() => setOrderSuccess(null)} className="btn btn-primary w-full mt-4">
              Back to Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
