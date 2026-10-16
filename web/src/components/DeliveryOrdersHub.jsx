import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Truck, Clock, CheckCircle, Package, User, Phone, MapPin, 
  ChevronRight, RefreshCw, AlertCircle, MessageSquare, ExternalLink, 
  X, Ban, Navigation, Search, Check, Filter 
} from 'lucide-react';

const STATUS_CONFIG = {
  PENDING: { 
    label: 'Pending', 
    textColor: 'text-amber-700', 
    bg: 'bg-amber-50', 
    border: 'border-amber-200', 
    nextLabel: 'Accept Order →', 
    nextStatus: 'ACCEPTED', 
    btnClass: 'bg-[#1E3A8A] hover:bg-[#1E367D] text-white' 
  },
  ACCEPTED: { 
    label: 'Accepted', 
    textColor: 'text-blue-700', 
    bg: 'bg-blue-50', 
    border: 'border-blue-200', 
    nextLabel: 'Dispatch Delivery →', 
    nextStatus: 'OUT_FOR_DELIVERY', 
    btnClass: 'bg-violet-600 hover:bg-violet-700 text-white' 
  },
  OUT_FOR_DELIVERY: { 
    label: 'Out for Delivery', 
    textColor: 'text-violet-700', 
    bg: 'bg-violet-50', 
    border: 'border-violet-200', 
    nextLabel: 'Mark Delivered ✓', 
    nextStatus: 'DELIVERED', 
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white' 
  },
  DELIVERED: { 
    label: 'Delivered', 
    textColor: 'text-emerald-700', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-200', 
    nextLabel: null 
  },
  CANCELLED: { 
    label: 'Cancelled', 
    textColor: 'text-rose-600', 
    bg: 'bg-rose-50', 
    border: 'border-rose-200', 
    nextLabel: null 
  },
};

const CANCELLATION_REASONS = [
  'Items out of stock',
  'Store closing / High order rush',
  'Customer requested cancellation',
  'Delivery address outside serviceable radius',
  'Customer unreachable / Invalid phone'
];

export default function DeliveryOrdersHub() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Cancel Modal State
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' ? '/api/v1/orders' : `/api/v1/orders?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Socket.io for live updates
    const socket = io('/', { path: '/socket.io' });

    socket.on('newOrder', (newOrder) => {
      setOrders(prev => [newOrder, ...prev.filter(o => o._id !== newOrder._id)]);
    });

    socket.on('orderStatusUpdate', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
    });

    return () => {
      socket.disconnect();
    };
  }, [statusFilter]);

  const handleUpdateStatus = async (id, nextStatus, notes = '') => {
    try {
      const res = await fetch(`/api/v1/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: nextStatus, 
          notes,
          riderName: nextStatus === 'OUT_FOR_DELIVERY' ? 'Store Delivery Rider' : undefined
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrders(prev => prev.map(o => o._id === id ? data.data : o));
      } else {
        fetchOrders();
      }
    } catch (e) {
      alert('Status update failed: ' + e.message);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrderToCancel) return;
    const finalReason = customReason.trim() ? customReason.trim() : cancelReason;

    await handleUpdateStatus(selectedOrderToCancel._id, 'CANCELLED', finalReason);
    setShowCancelModal(false);
    setSelectedOrderToCancel(null);
    setCustomReason('');
  };

  const openCancelModal = (order) => {
    setSelectedOrderToCancel(order);
    setCancelReason(CANCELLATION_REASONS[0]);
    setCustomReason('');
    setShowCancelModal(true);
  };

  const openWhatsApp = (order) => {
    const cleanPhone = (order.phone || '').replace(/\D/g, '');
    const text = `Hello ${order.customerName}, your Supermart order #${order.orderNo} (₹${order.totalAmount}) is currently ${order.status.replace(/_/g, ' ')}. Thank you for shopping with us!`;
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const openMaps = (order) => {
    if (order.location?.latitude && order.location?.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.location.latitude},${order.location.longitude}`, '_blank');
    } else {
      const query = encodeURIComponent(`${order.deliveryAddress} ${order.pincode || ''}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        order.orderNo?.toLowerCase().includes(q) ||
        order.customerName?.toLowerCase().includes(q) ||
        order.phone?.includes(q) ||
        order.deliveryAddress?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const activeCount = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner & Status Tabs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 mb-1 font-bold text-xs uppercase tracking-wider">
            <Truck size={16} />
            <span>Real-Time Order Fulfillment</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Delivery Orders Hub
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
                {pendingCount} New Pending
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Accept, dispatch & fulfill home delivery orders placed from Customer Mobile App and Web Storefront
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchOrders} 
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-sm"
            title="Refresh Orders"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'PENDING', label: 'Pending', count: orders.filter(o => o.status === 'PENDING').length },
              { id: 'ACCEPTED', label: 'Accepted', count: orders.filter(o => o.status === 'ACCEPTED').length },
              { id: 'OUT_FOR_DELIVERY', label: 'Dispatched', count: orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length },
              { id: 'DELIVERED', label: 'Delivered', count: orders.filter(o => o.status === 'DELIVERED').length },
              { id: 'CANCELLED', label: 'Cancelled' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-[#1E3A8A] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-slate-400">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'} listed
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order #, customer name, phone number or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-[#28469E]"
          />
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.map(order => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
          const isPending = order.status === 'PENDING';
          const isAccepted = order.status === 'ACCEPTED';
          const isDispatched = order.status === 'OUT_FOR_DELIVERY';
          const isDelivered = order.status === 'DELIVERED';
          const isCancelled = order.status === 'CANCELLED';

          return (
            <div 
              key={order._id} 
              className={`bg-white rounded-2xl border ${
                isPending ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200/90'
              } p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
            >
              <div>
                {/* Order No & Status Badge */}
                <div className="flex justify-between items-start mb-3 pb-2.5 border-b border-slate-100">
                  <div>
                    <span className="font-black text-base text-[#1E3A8A]">
                      #{order.orderNo}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-medium mt-0.5">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Customer Details Box */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 mb-3.5 text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <User size={13} className="text-[#1E3A8A]" />
                      {order.customerName}
                    </span>
                    <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      {order.paymentMethod || 'COD'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      +91 {order.phone}
                    </span>
                    
                    {/* Fast Customer Triggers */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:+91${order.phone}`}
                        className="p-1 rounded-md bg-blue-50 text-[#1E3A8A] hover:bg-blue-100 transition-colors"
                        title="Call Customer"
                      >
                        <Phone size={12} />
                      </a>
                      <button
                        onClick={() => openWhatsApp(order)}
                        className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="WhatsApp Customer"
                      >
                        <MessageSquare size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="text-slate-600 flex items-start gap-1.5 pt-0.5">
                    <MapPin size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2 flex-1">
                      {order.deliveryAddress} {order.pincode ? `(${order.pincode})` : ''}
                    </span>
                    <button
                      onClick={() => openMaps(order)}
                      className="text-[#1E3A8A] hover:underline flex-shrink-0 text-[11px] font-bold flex items-center gap-0.5 ml-1"
                      title="Open Google Maps Route"
                    >
                      <Navigation size={11} />
                      <span>{order.location?.latitude ? 'GPS Map' : 'Map'}</span>
                    </button>
                  </div>

                  {/* GPS Doorstep Coordinates */}
                  {order.location?.latitude && (
                    <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        📍 GPS Pinned: {order.location.latitude.toFixed(3)}, {order.location.longitude.toFixed(3)}
                      </span>
                      {order.location.landmark && (
                        <span className="text-slate-500 font-medium truncate max-w-[150px]">
                          Ref: {order.location.landmark}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Customer 4-Digit Handover OTP */}
                  {order.deliveryOtp && (
                    <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-500">
                        Customer Delivery OTP:
                      </span>
                      <span className="font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 tracking-wider">
                        {order.deliveryOtp}
                      </span>
                    </div>
                  )}
                </div>

                {/* Order Items List */}
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Order Items ({order.items?.length || 0})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-700 pb-1 border-b border-slate-50 last:border-0">
                        <span className="truncate flex-1 pr-2">
                          {item.name} <strong className="text-slate-500">× {item.quantity}</strong>
                        </span>
                        <span className="font-bold text-slate-900 whitespace-nowrap">
                          ₹{item.total || (item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.cancellationReason && (
                    <div className="mt-2.5 p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
                      <strong>Cancellation Reason:</strong> {order.cancellationReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Total & Action Pipeline */}
              <div className="pt-3 border-t border-slate-100 mt-2">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-xs text-slate-500 font-medium">Order Total:</span>
                  <span className="text-xl font-black text-[#1E3A8A]">₹{order.totalAmount}</span>
                </div>

                <div className="flex items-center gap-2">
                  {cfg.nextLabel && (
                    <button
                      onClick={() => handleUpdateStatus(order._id, cfg.nextStatus)}
                      className={`btn w-full text-xs font-bold py-2.5 rounded-xl shadow-sm ${cfg.btnClass}`}
                    >
                      {cfg.nextLabel}
                    </button>
                  )}

                  {!isDelivered && !isCancelled && (
                    <button
                      onClick={() => openCancelModal(order)}
                      className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors flex-shrink-0"
                      title="Cancel / Reject Order"
                    >
                      <Ban size={15} />
                    </button>
                  )}

                  {isDelivered && (
                    <div className="w-full py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle size={15} /> Order Delivered
                    </div>
                  )}

                  {isCancelled && (
                    <div className="w-full py-2 bg-red-50 rounded-xl border border-red-200 text-center text-red-600 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Ban size={15} /> Order Cancelled
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Truck size={48} className="mx-auto text-slate-300 mb-3" />
          <h4 className="text-base font-bold text-slate-700">No delivery orders found</h4>
          <p className="text-xs text-slate-400 mt-1">
            New orders from customer mobile app or website will appear here in real time.
          </p>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && selectedOrderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 relative animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-rose-600 font-black text-base">
                <Ban size={20} />
                <span>Cancel Order #{selectedOrderToCancel.orderNo}</span>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3.5">
              Select the reason why you are cancelling this order. The customer will be informed.
            </p>

            <div className="space-y-2 mb-4">
              {CANCELLATION_REASONS.map((r, idx) => (
                <label 
                  key={idx} 
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    cancelReason === r ? 'border-rose-300 bg-rose-50 text-rose-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                    className="text-rose-600"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Or Custom Reason (Optional):
              </label>
              <input
                type="text"
                placeholder="Type specific explanation..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="input-field text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowCancelModal(false)}
                className="btn btn-secondary text-xs"
              >
                Dismiss
              </button>
              <button
                onClick={handleConfirmCancel}
                className="btn btn-danger text-xs font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
