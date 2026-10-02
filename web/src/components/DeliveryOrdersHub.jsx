import React, { useState, useEffect } from 'react';
import { 
  Truck, Clock, CheckCircle, Package, User, Phone, MapPin, 
  ChevronRight, RefreshCw, AlertCircle 
} from 'lucide-react';

export default function DeliveryOrdersHub() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/orders?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/v1/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          riderName: newStatus === 'OUT_FOR_DELIVERY' ? 'Ramesh Delivery Rider' : undefined
        })
      });
      const data = await res.json();
      if (data.success) fetchOrders();
    } catch (e) {}
  };

  const getStatusBadgeClass = (st) => {
    switch (st) {
      case 'PENDING': return 'badge-amber';
      case 'ACCEPTED': return 'badge-blue';
      case 'OUT_FOR_DELIVERY': return 'badge-amber';
      case 'DELIVERED': return 'badge-emerald';
      default: return 'badge-rose';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Banner & Status Tabs */}
      <div className="glass-panel p-5 bg-white border border-slate-200">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Truck className="text-[#28469E]" /> Online Delivery Orders Hub
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Fulfill local home delivery orders placed via Customer App or Website
            </p>
          </div>

          <button onClick={fetchOrders} className="btn btn-secondary text-xs">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4">
          {['ALL', 'PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn text-xs py-1.5 px-3.5 ${
                statusFilter === st ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orders.map(order => (
          <div key={order._id} className="glass-panel p-5 bg-white border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-100">
                <div>
                  <span className="font-extrabold text-base text-[#28469E]">#{order.orderNo}</span>
                  <span className="text-[11px] text-slate-400 block">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Customer Details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3.5 text-xs text-slate-700 space-y-1">
                <div className="font-bold text-slate-900">
                  <User size={13} className="inline mr-1 text-[#28469E]" /> {order.customerName}
                </div>
                <div className="text-slate-500">
                  <Phone size={13} className="inline mr-1 text-slate-400" /> +91-{order.phone}
                </div>
                <div className="text-slate-600">
                  <MapPin size={13} className="inline mr-1 text-slate-400" /> {order.deliveryAddress} ({order.pincode})
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-500 mb-1.5">Order Items:</div>
                <div className="space-y-1 text-xs text-slate-700">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.name} x {item.quantity} {item.unit || 'pcs'}</span>
                      <span className="font-bold">₹{item.total || (item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Total & Actions */}
            <div className="pt-3 border-t border-slate-100 mt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-500">Payment: <strong className="text-slate-800">{order.paymentMethod}</strong></span>
                <span className="text-lg font-black text-[#28469E]">₹{order.totalAmount}</span>
              </div>

              <div className="flex gap-2">
                {order.status === 'PENDING' && (
                  <button 
                    onClick={() => handleUpdateStatus(order._id, 'ACCEPTED')}
                    className="btn btn-primary w-full text-xs" 
                  >
                    Accept Order
                  </button>
                )}
                {order.status === 'ACCEPTED' && (
                  <button 
                    onClick={() => handleUpdateStatus(order._id, 'OUT_FOR_DELIVERY')}
                    className="btn btn-primary w-full text-xs" 
                  >
                    Out for Delivery
                  </button>
                )}
                {order.status === 'OUT_FOR_DELIVERY' && (
                  <button 
                    onClick={() => handleUpdateStatus(order._id, 'DELIVERED')}
                    className="btn btn-whatsapp w-full text-xs" 
                  >
                    Mark as Delivered
                  </button>
                )}
                {order.status === 'DELIVERED' && (
                  <div className="text-center text-emerald-600 text-xs font-bold w-full py-1">
                    <CheckCircle size={16} className="inline mr-1" /> Delivered
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
