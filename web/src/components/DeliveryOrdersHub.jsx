import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { 
  Truck, Clock, CheckCircle, Package, User, Phone, MapPin, 
  ChevronRight, RefreshCw, AlertCircle, MessageSquare, ExternalLink, 
  X, Ban, Navigation, Search, Check, Filter, Plus, Trash2, Key, ShieldCheck, Bike
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

  // Delivery Boys Fleet State
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loadingBoys, setLoadingBoys] = useState(false);
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [newBoy, setNewBoy] = useState({
    name: '',
    mobile: '',
    password: '',
    vehicleType: 'Bike',
    vehicleNumber: ''
  });
  const [savingBoy, setSavingBoy] = useState(false);
  const [fleetError, setFleetError] = useState('');
  const [fleetSuccess, setFleetSuccess] = useState('');

  // Dispatch & Rider Assignment Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [orderToDispatch, setOrderToDispatch] = useState(null);
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [dispatchError, setDispatchError] = useState('');
  const [dispatching, setDispatching] = useState(false);

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

  const fetchDeliveryBoys = async () => {
    setLoadingBoys(true);
    try {
      const res = await fetch('/api/v1/auth/admin/delivery-boys');
      const data = await res.json();
      if (data.success) {
        setDeliveryBoys(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch delivery boys:', e);
    } finally {
      setLoadingBoys(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDeliveryBoys();

    // Socket.io for live updates
    const socket = io(SOCKET_URL, { path: '/socket.io' });

    socket.on('newOrder', (newOrder) => {
      setOrders(prev => [newOrder, ...prev.filter(o => o._id !== newOrder._id)]);
      fetchDeliveryBoys();
    });

    socket.on('orderStatusUpdate', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      fetchDeliveryBoys();
    });

    return () => {
      socket.disconnect();
    };
  }, [statusFilter]);

  const handleUpdateStatus = async (id, nextStatus, notes = '', riderDetails = null) => {
    // If transitioning to OUT_FOR_DELIVERY and rider not provided, prompt dispatch modal
    if (nextStatus === 'OUT_FOR_DELIVERY' && !riderDetails) {
      const order = orders.find(o => o._id === id);
      if (order) {
        openDispatchModal(order);
        return;
      }
    }

    try {
      const payload = { status: nextStatus, notes };
      if (riderDetails) {
        if (riderDetails.riderName) payload.riderName = riderDetails.riderName;
        if (riderDetails.riderPhone) payload.riderPhone = riderDetails.riderPhone;
        if (riderDetails.deliveryBoyId) payload.deliveryBoyId = riderDetails.deliveryBoyId;
      }

      const res = await fetch(`/api/v1/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrders(prev => prev.map(o => o._id === id ? data.data : o));
        fetchDeliveryBoys();
        return true;
      } else {
        alert(data.message || 'Status update failed.');
        fetchOrders();
        return false;
      }
    } catch (e) {
      alert('Status update failed: ' + e.message);
      return false;
    }
  };

  const openDispatchModal = async (order) => {
    setOrderToDispatch(order);
    setSelectedRiderId('');
    setDispatchError('');
    setShowDispatchModal(true);
    await fetchDeliveryBoys();
  };

  const handleConfirmDispatch = async () => {
    if (!orderToDispatch) return;
    if (!selectedRiderId) {
      setDispatchError('Please choose an available delivery partner to assign this order.');
      return;
    }

    const selectedBoy = deliveryBoys.find(b => b._id === selectedRiderId);
    if (!selectedBoy) {
      setDispatchError('Selected rider could not be found.');
      return;
    }

    if (selectedBoy.isBusy) {
      setDispatchError(`${selectedBoy.name} is currently out delivering another order. Please select an available partner.`);
      return;
    }

    setDispatching(true);
    setDispatchError('');

    const success = await handleUpdateStatus(
      orderToDispatch._id, 
      'OUT_FOR_DELIVERY', 
      'Dispatched with rider', 
      {
        riderName: selectedBoy.name,
        riderPhone: selectedBoy.mobile,
        deliveryBoyId: selectedBoy._id
      }
    );

    setDispatching(false);
    if (success) {
      setShowDispatchModal(false);
      setOrderToDispatch(null);
    }
  };

  const openCancelModal = (order) => {
    setSelectedOrderToCancel(order);
    setCancelReason(CANCELLATION_REASONS[0]);
    setCustomReason('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrderToCancel) return;
    const finalReason = customReason.trim() ? customReason.trim() : cancelReason;
    const success = await handleUpdateStatus(
      selectedOrderToCancel._id,
      'CANCELLED',
      finalReason
    );
    if (success) {
      setShowCancelModal(false);
      setSelectedOrderToCancel(null);
    }
  };

  const handleCreateDeliveryBoy = async (e) => {
    e.preventDefault();
    setFleetError('');
    setFleetSuccess('');

    if (!newBoy.name.trim() || !newBoy.mobile.trim() || !newBoy.password.trim()) {
      setFleetError('Name, 10-digit mobile number, and password are required.');
      return;
    }

    if (newBoy.mobile.trim().length !== 10 || !/^\d+$/.test(newBoy.mobile.trim())) {
      setFleetError('Please provide a valid 10-digit mobile number.');
      return;
    }

    setSavingBoy(true);
    try {
      const res = await fetch('/api/v1/auth/admin/delivery-boys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBoy.name.trim(),
          mobile: newBoy.mobile.trim(),
          password: newBoy.password.trim(),
          vehicleType: newBoy.vehicleType,
          vehicleNumber: newBoy.vehicleNumber.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setFleetSuccess(`Delivery boy ${newBoy.name} created successfully! They can log in immediately.`);
        setNewBoy({
          name: '',
          mobile: '',
          password: '',
          vehicleType: 'Bike',
          vehicleNumber: ''
        });
        fetchDeliveryBoys();
      } else {
        setFleetError(data.message || 'Failed to create delivery boy.');
      }
    } catch (e) {
      setFleetError('Network error while creating delivery boy.');
    } finally {
      setSavingBoy(false);
    }
  };

  const handleDeleteDeliveryBoy = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove delivery boy "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/auth/admin/delivery-boys/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchDeliveryBoys();
      } else {
        alert(data.message || 'Could not delete delivery boy.');
      }
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
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
            onClick={() => { setShowFleetModal(true); fetchDeliveryBoys(); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 font-bold text-xs shadow-sm transition-all"
            title="Manage Delivery Boys Fleet"
          >
            <Bike size={16} />
            <span>Delivery Fleet</span>
            <span className="bg-violet-200 text-violet-800 text-[10px] px-2 py-0.5 rounded-full font-black">
              {deliveryBoys.length}
            </span>
          </button>

          <button 
            onClick={() => { fetchOrders(); fetchDeliveryBoys(); }} 
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

                  {/* Assigned Delivery Partner */}
                  {order.assignedDeliveryRider && (
                    <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-violet-800 flex items-center gap-1.5">
                        <Bike size={13} className="text-violet-600" />
                        <span>{order.assignedDeliveryRider}</span>
                        {order.riderPhone && <span className="text-slate-500 font-normal">({order.riderPhone})</span>}
                      </span>
                      {order.riderPhone && (
                        <a
                          href={`tel:+91${order.riderPhone}`}
                          className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 hover:bg-violet-200 text-[10px] font-bold flex items-center gap-1"
                          title="Call Assigned Delivery Partner"
                        >
                          <Phone size={10} /> Call
                        </a>
                      )}
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
        <div 
          onClick={() => setShowCancelModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 relative animate-in zoom-in-95 cursor-default"
          >
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

      {/* Dispatch & Rider Assignment Modal */}
      {showDispatchModal && orderToDispatch && (
        <div 
          onClick={() => setShowDispatchModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 relative animate-in zoom-in-95 max-h-[90vh] flex flex-col cursor-default"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-violet-700 font-black text-lg">
                <Bike size={22} />
                <span>Dispatch & Assign Delivery Partner</span>
              </div>
              <button
                onClick={() => { setShowDispatchModal(false); setOrderToDispatch(null); }}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Order Target Summary */}
            <div className="bg-violet-50/70 p-3.5 rounded-2xl border border-violet-100 mb-4 text-xs space-y-1 flex-shrink-0">
              <div className="flex justify-between items-center font-black text-violet-950">
                <span>Order #{orderToDispatch.orderNo}</span>
                <span className="text-emerald-700 font-extrabold text-sm">₹{orderToDispatch.totalAmount}</span>
              </div>
              <div className="text-slate-600 flex items-center gap-1">
                <User size={12} className="text-violet-600" />
                <span className="font-bold">{orderToDispatch.customerName}</span> · +91 {orderToDispatch.phone}
              </div>
              <div className="text-slate-500 line-clamp-1 flex items-center gap-1">
                <MapPin size={12} className="text-violet-600 flex-shrink-0" />
                <span>{orderToDispatch.deliveryAddress}</span>
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Select Available Delivery Partner
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowDispatchModal(false);
                  setShowFleetModal(true);
                }}
                className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1"
              >
                <Plus size={12} /> Add New Partner
              </button>
            </div>

            {dispatchError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2 flex-shrink-0">
                <AlertCircle size={15} />
                <span>{dispatchError}</span>
              </div>
            )}

            {/* Riders List */}
            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 mb-4">
              {loadingBoys ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" /> Checking fleet availability...
                </div>
              ) : deliveryBoys.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Bike size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-700 mb-1">No Delivery Partners Registered</p>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Add delivery boy accounts first so they can receive and deliver orders.
                  </p>
                  <button
                    onClick={() => {
                      setShowDispatchModal(false);
                      setShowFleetModal(true);
                    }}
                    className="btn btn-primary text-xs py-1.5 px-3"
                  >
                    Open Fleet Manager
                  </button>
                </div>
              ) : (
                deliveryBoys.map(boy => {
                  const isBusy = boy.isBusy;
                  const isSelected = selectedRiderId === boy._id;

                  return (
                    <div
                      key={boy._id}
                      onClick={() => {
                        if (!isBusy) {
                          setSelectedRiderId(boy._id);
                          setDispatchError('');
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all text-xs flex items-center justify-between ${
                        isBusy 
                          ? 'border-red-200 bg-red-50/40 opacity-70 cursor-not-allowed'
                          : isSelected
                            ? 'border-violet-600 bg-violet-50/70 ring-2 ring-violet-200 cursor-pointer shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                          isBusy ? 'bg-red-100 text-red-700' : isSelected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          <Bike size={16} />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center gap-2">
                            <span>{boy.name}</span>
                            {boy.vehicleNumber && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded uppercase">
                                {boy.vehicleNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            +91 {boy.mobile}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {isBusy ? (
                          <div className="space-y-0.5">
                            <span className="inline-block bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">
                              🔴 BUSY (Delivering)
                            </span>
                            {boy.activeOrder?.orderNo && (
                              <span className="text-[10px] text-slate-400 block font-semibold">
                                Order #{boy.activeOrder.orderNo}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isSelected 
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isSelected ? '✓ SELECTED' : '🟢 AVAILABLE'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setShowDispatchModal(false); setOrderToDispatch(null); }}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                disabled={!selectedRiderId || dispatching}
                className="btn bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {dispatching ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Bike size={15} />
                    <span>Confirm Dispatch & Assign 🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Fleet Management Modal */}
      {showFleetModal && (
        <div 
          onClick={() => { setShowFleetModal(false); setFleetError(''); setFleetSuccess(''); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl border border-slate-200 relative animate-in zoom-in-95 max-h-[92vh] flex flex-col cursor-default"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 text-violet-700 font-black text-xl">
                  <Bike size={24} />
                  <span>Delivery Fleet Management</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Store Owner Portal: Register delivery boy accounts and view live delivery availability
                </p>
              </div>
              <button
                onClick={() => { setShowFleetModal(false); setFleetError(''); setFleetSuccess(''); }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {fleetSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 flex-shrink-0">
                <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{fleetSuccess}</span>
              </div>
            )}

            {fleetError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2 flex-shrink-0">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                <span>{fleetError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto pr-1 flex-1">
              
              {/* Left Column: Registered Fleet List (7 cols) */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Registered Delivery Boys</span>
                    <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full">
                      {deliveryBoys.length}
                    </span>
                  </h4>
                  <button 
                    onClick={fetchDeliveryBoys}
                    className="text-[11px] text-violet-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={loadingBoys ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                {loadingBoys ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading fleet...</div>
                ) : deliveryBoys.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Bike size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">No delivery boys registered yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Use the registration form on the right to create login credentials for your delivery staff.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {deliveryBoys.map(boy => (
                      <div
                        key={boy._id}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm flex items-center justify-between hover:border-slate-300 transition-all text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                            boy.isBusy ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            <Bike size={18} />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center gap-2">
                              <span>{boy.name}</span>
                              {boy.isBusy ? (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                                  🔴 ON DELIVERY
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                                  🟢 AVAILABLE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                              <span>Phone: +91 {boy.mobile}</span>
                              {boy.vehicleNumber && (
                                <span className="text-slate-400">· {boy.vehicleNumber}</span>
                              )}
                            </div>
                            {boy.isBusy && boy.activeOrder?.orderNo && (
                              <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                                Delivering Order #{boy.activeOrder.orderNo}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteDeliveryBoy(boy._id, boy.name)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove Delivery Boy"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Register Form (5 cols) */}
              <div className="md:col-span-5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <form onSubmit={handleCreateDeliveryBoy} className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider mb-1">
                    <ShieldCheck size={16} className="text-violet-600" />
                    <span>Create Partner Account</span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Riders cannot self-register. Store Owner creates their account with phone and password. They will log in using these credentials.
                  </p>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={newBoy.name}
                      onChange={(e) => setNewBoy({ ...newBoy, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-violet-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">10-Digit Mobile Number (Login ID) *</label>
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-violet-600">
                      <span className="px-2.5 py-2 text-xs font-bold text-slate-400 bg-slate-100 border-r border-slate-200">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={newBoy.mobile}
                        onChange={(e) => setNewBoy({ ...newBoy, mobile: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 text-xs font-semibold focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Login Password *</label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newBoy.password}
                      onChange={(e) => setNewBoy({ ...newBoy, password: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-violet-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Vehicle No. (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. DL 01 AB 1234"
                      value={newBoy.vehicleNumber}
                      onChange={(e) => setNewBoy({ ...newBoy, vehicleNumber: e.target.value })}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-violet-600 uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingBoy}
                    className="w-full mt-2 btn bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {savingBoy ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Registering Partner...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={15} />
                        <span>Create Partner Account</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
