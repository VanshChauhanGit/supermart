import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Barcode, ShoppingCart, Plus, Minus, Trash2, CreditCard, 
  Wallet, QrCode, UserCheck, MessageSquare, Printer, CheckCircle, 
  Sparkles, RefreshCw, AlertCircle, Phone
} from 'lucide-react';

export default function POSBilling({ products, customers, onRefreshProducts, onSaleComplete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerFatherName, setNewCustomerFatherName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH'); // CASH, UPI, CARD, UDHAR
  const [discountAmount, setDiscountAmount] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current) barcodeRef.current.focus();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchTerm.toLowerCase();
    const matches = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.barcode.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(matches);
  }, [searchTerm, products]);

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const code = barcodeInput.trim();
    const found = products.find(p => p.barcode === code);
    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      alert(`Product with barcode ${code} not found in inventory!`);
    }
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item._id === product._id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += 1;
        updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            _id: product._id,
            productId: product._id,
            barcode: product.barcode,
            name: product.name,
            price: product.sellingPrice,
            quantity: 1,
            unit: product.unit || 'pcs',
            total: product.sellingPrice,
            stockQty: product.stockQty,
            imageUrl: product.imageUrl
          }
        ];
      }
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item._id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty, total: newQty * item.price };
        }
        return item;
      });
    });
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item._id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setSelectedCustomerId('');
    setPaymentMode('CASH');
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const grandTotal = Math.max(0, subtotal - Number(discountAmount));

  const selectedCustomer = customers.find(c => c._id === selectedCustomerId);

  const handleFinalizeBill = async () => {
    if (cart.length === 0) {
      alert('Cart is empty! Please add products to bill.');
      return;
    }

    if (paymentMode === 'UDHAR' && !selectedCustomerId && !newCustomerPhone) {
      alert('Please select or enter a Customer name and phone number for Udhar (Credit) purchase!');
      return;
    }

    setIsProcessing(true);

    try {
      let custId = selectedCustomerId;
      let custName = selectedCustomer ? selectedCustomer.name : newCustomerName;
      let custPhone = selectedCustomer ? selectedCustomer.phone : newCustomerPhone;

      if (paymentMode === 'UDHAR' && !selectedCustomerId && newCustomerPhone) {
        const cRes = await fetch('/api/v1/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCustomerName || 'Udhar Customer',
            fatherName: newCustomerFatherName,
            phone: newCustomerPhone
          })
        });
        const cData = await cRes.json();
        if (cData.success) {
          custId = cData.data._id;
          custName = cData.data.name;
          custPhone = cData.data.phone;
        }
      }

      const salePayload = {
        customerId: custId || null,
        customerName: custName || 'Walk-in Customer',
        customerPhone: custPhone || '',
        items: cart,
        subtotal,
        discount: Number(discountAmount),
        tax: 0,
        totalAmount: grandTotal,
        paymentMode
      };

      const res = await fetch('/api/v1/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });

      const data = await res.json();
      if (data.success) {
        onSaleComplete(data.data, data.whatsAppNotice);
        clearCart();
        onRefreshProducts();
      } else {
        alert('Sale Error: ' + data.error);
      }
    } catch (e) {
      alert('Network Error while saving bill: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/* Left Column: Product Search & Cart Table */}
      <div className="flex flex-col gap-6">
        
        {/* Top Search & Barcode Bar */}
        <div className="glass-panel p-5 bg-white border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 items-center">
            
            {/* Search Input */}
            <div className="relative">
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by Name, Barcode or Category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-11"
                />
              </div>

              {/* Search Results Dropdown with Product Images */}
              {searchResults.length > 0 && (
                <div className="absolute top-[105%] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map(prod => (
                    <div
                      key={prod._id}
                      onClick={() => addToCart(prod)}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                          <img
                            src={prod.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{prod.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>SKU: {prod.barcode}</span>
                            <span>•</span>
                            <span className="badge badge-blue text-[9px] py-0 px-1.5">{prod.category}</span>
                            <span>•</span>
                            <span className={prod.stockQty <= prod.reorderLevel ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                              Stock: {prod.stockQty} {prod.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-extrabold text-[#28469E] text-base">₹{prod.sellingPrice}</div>
                        <div className="text-xs text-slate-400 line-through">MRP ₹{prod.mrp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Barcode size={18} className="absolute left-3.5 top-3 text-[#28469E]" />
              <input
                ref={barcodeRef}
                type="text"
                placeholder="Scan Barcode SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="input-field pl-11 border-[#28469E]"
              />
            </form>
          </div>
        </div>

        {/* Cart Table Container */}
        <div className="glass-panel p-5 bg-white border border-slate-200 flex-1 flex flex-col min-h-[420px]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="text-[#28469E]" size={20} /> Current Billing Cart ({cart.length} items)
            </h3>
            {cart.length > 0 && (
              <button onClick={clearCart} className="btn btn-secondary text-rose-600 text-xs py-1.5 px-3">
                <Trash2 size={14} /> Clear Cart
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
              <ShoppingCart size={64} strokeWidth={1} className="mb-3 opacity-40" />
              <p className="text-base font-bold text-slate-700">Billing Cart is Empty</p>
              <p className="text-xs text-slate-500">Scan product barcode or search item above to start billing</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                    <th className="py-3 px-3">Product Item</th>
                    <th className="py-3 px-3 text-center">Unit Price</th>
                    <th className="py-3 px-3 text-center">Quantity</th>
                    <th className="py-3 px-3 text-right">Total</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map(item => (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                            <img
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-400">SKU: {item.barcode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        ₹{item.price}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200">
                          <button onClick={() => updateQuantity(item._id, -1)} className="text-slate-600 hover:text-slate-900 p-0.5">
                            <Minus size={14} />
                          </button>
                          <span className="font-extrabold text-slate-800 text-xs min-w-[28px]">{item.quantity} {item.unit}</span>
                          <button onClick={() => updateQuantity(item._id, 1)} className="text-[#28469E] hover:text-[#1E367D] p-0.5">
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-[#28469E] text-base">
                        ₹{item.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button onClick={() => removeFromCart(item._id)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Checkout & Payment Settlement */}
      <div className="glass-panel p-6 bg-white border border-slate-200 flex flex-col gap-5">
        <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
          Checkout & Settlement
        </h3>

        {/* Customer Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Customer (Required for Udhar Credit):
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="input-field mb-2"
          >
            <option value="">-- Walk-in / Cash Customer --</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>
                {c.name} {c.fatherName ? `(S/O ${c.fatherName})` : ''} - Bal: ₹{c.creditBalance} | Spent: ₹{c.totalPurchases || 0}
              </option>
            ))}
          </select>

          {paymentMode === 'UDHAR' && !selectedCustomerId && (
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
              <div className="text-xs text-amber-800 font-bold mb-2">
                Enter Udhar Customer Details:
              </div>
              <input
                type="text"
                placeholder="Customer Name (e.g. Rajesh Kumar)"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="input-field mb-2 text-xs"
              />
              <input
                type="text"
                placeholder="Father's Name (S/O Sh. Ram Lal)"
                value={newCustomerFatherName}
                onChange={(e) => setNewCustomerFatherName(e.target.value)}
                className="input-field mb-2 text-xs"
              />
              <input
                type="text"
                placeholder="Mobile Number (+91...)"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="input-field text-xs"
              />
            </div>
          )}
        </div>

        {/* Payment Modes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Payment Mode:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setPaymentMode('CASH')}
              className={`btn ${paymentMode === 'CASH' ? 'btn-primary' : 'btn-secondary'} justify-start`}
            >
              <Wallet size={18} /> Cash
            </button>
            <button
              onClick={() => setPaymentMode('UPI')}
              className={`btn ${paymentMode === 'UPI' ? 'btn-primary' : 'btn-secondary'} justify-start`}
            >
              <QrCode size={18} /> UPI / QR
            </button>
            <button
              onClick={() => setPaymentMode('CARD')}
              className={`btn ${paymentMode === 'CARD' ? 'btn-primary' : 'btn-secondary'} justify-start`}
            >
              <CreditCard size={18} /> Card
            </button>
            <button
              onClick={() => setPaymentMode('UDHAR')}
              className={`btn ${paymentMode === 'UDHAR' ? 'btn-whatsapp' : 'btn-secondary'} justify-start`}
            >
              <MessageSquare size={18} /> Udhar (Credit)
            </button>
          </div>
        </div>

        {paymentMode === 'UDHAR' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-amber-600 flex-shrink-0" />
            <span>Completing bill will update debt & prompt <strong>Itemized WhatsApp Receipt</strong>.</span>
          </div>
        )}

        {/* Summary Breakdown */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-slate-500">Discount Saved:</span>
            <div className="flex items-center gap-1 w-24">
              <span className="text-xs text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="input-field py-1 px-2 text-xs text-right"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-900">Net Payable:</span>
            <span className="text-2xl font-black text-[#28469E]">₹{grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleFinalizeBill}
          className="w-full btn btn-primary py-3.5 text-base mt-auto shadow-md"
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing Bill...' : <><CheckCircle size={22} /> Complete & Print Bill (₹{grandTotal.toLocaleString('en-IN')})</>}
        </button>
      </div>
    </div>
  );
}
