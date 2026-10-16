import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Package, Tag, FolderOpen, Truck, Bell, 
  Server, Database, Wifi, LogOut, ChevronRight, Store, 
  Phone, MapPin, QrCode, CheckCircle, RefreshCw, Save 
} from 'lucide-react';

const MenuItem = ({ icon: Icon, iconBg, iconColor, title, subtitle, onClick, rightEl, danger }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl p-4 flex items-center justify-between border transition-all duration-200 ${
      danger ? 'border-red-100 hover:bg-red-50/50' : 'border-slate-100 hover:shadow-sm hover:border-slate-200'
    } ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center gap-3.5 flex-1 min-w-0">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold ${danger ? 'text-red-600' : 'text-slate-900'} truncate`}>
          {title}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
    {rightEl || (
      <div className="text-slate-400 flex-shrink-0">
        <ChevronRight size={16} />
      </div>
    )}
  </div>
);

export default function StoreProfile({ adminUser, onLogout }) {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('supermart_audio_notifications') !== 'false';
  });

  const [healthInfo, setHealthInfo] = useState({
    status: 'CHECKING',
    mongoState: 'STANDBY',
    system: 'Supermart POS Engine',
    timestamp: new Date().toISOString()
  });

  const [storeSettings, setStoreSettings] = useState(() => {
    const saved = localStorage.getItem('supermart_store_settings');
    return saved ? JSON.parse(saved) : {
      storeName: 'Apna Supermart & Kiryana Store',
      tagline: 'Fresh Groceries, Kiryana & Daily Essentials',
      phone: '9876543210',
      address: 'Main Market Road, Near Gandhi Chowk, Sector 12',
      pincode: '110001',
      upiId: 'supermart@upi',
      gstNumber: '07AAAAA0000A1Z5'
    };
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthInfo(data);
    } catch (e) {
      setHealthInfo({ status: 'OFFLINE', mongoState: 'DISCONNECTED', system: 'Error connecting' });
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleNotificationToggle = () => {
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    localStorage.setItem('supermart_audio_notifications', nextVal ? 'true' : 'false');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSavingSettings(true);
    localStorage.setItem('supermart_store_settings', JSON.stringify(storeSettings));
    setTimeout(() => {
      setSavingSettings(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Top Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Store Profile & Settings</h2>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">
          Manage your kiryana store configuration, admin credentials & device preferences
        </p>
      </div>

      {/* Store Owner Avatar Card */}
      <div className="bg-[#1E3A8A] rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-[#1E3A8A]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={36} className="text-white" />
          </div>
          <div>
            <span className="text-[10px] text-[#93C5FD] font-black uppercase tracking-widest block mb-1">
              STORE OWNER ADMIN
            </span>
            <h3 className="text-2xl font-black text-white">{adminUser?.name || adminUser?.username || 'Admin Owner'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-[#93C5FD] font-semibold">Super Admin · Active ERP Session</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to exit the Store Owner portal?')) {
              onLogout();
            }
          }}
          className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 self-start sm:self-auto"
        >
          <LogOut size={16} />
          <span>Logout Portal</span>
        </button>
      </div>

      {/* Store Details Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#28469E]">
              <Store size={20} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">Store Public Information</h4>
              <p className="text-xs text-slate-400">Printed on POS receipts and shown on digital invoices</p>
            </div>
          </div>

          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle size={14} /> Saved successfully
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Store Name
              </label>
              <input
                type="text"
                value={storeSettings.storeName}
                onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Helpline / WhatsApp Phone
              </label>
              <input
                type="text"
                value={storeSettings.phone}
                onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tagline / Sub-heading
            </label>
            <input
              type="text"
              value={storeSettings.tagline}
              onChange={(e) => setStoreSettings({ ...storeSettings, tagline: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Store Address
              </label>
              <input
                type="text"
                value={storeSettings.address}
                onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pincode
              </label>
              <input
                type="text"
                value={storeSettings.pincode}
                onChange={(e) => setStoreSettings({ ...storeSettings, pincode: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                UPI Virtual Payment Address (VPA)
              </label>
              <input
                type="text"
                placeholder="storename@okaxis"
                value={storeSettings.upiId}
                onChange={(e) => setStoreSettings({ ...storeSettings, upiId: e.target.value })}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                GSTIN / Trade Tax ID (Optional)
              </label>
              <input
                type="text"
                placeholder="07AAAAA0000A1Z5"
                value={storeSettings.gstNumber}
                onChange={(e) => setStoreSettings({ ...storeSettings, gstNumber: e.target.value })}
                className="input-field font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="btn btn-primary text-xs font-bold py-2.5 px-5 rounded-xl shadow-md flex items-center gap-2"
            >
              <Save size={16} />
              <span>{savingSettings ? 'Saving...' : 'Save Store Details'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Store Management Shortcuts */}
      <div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
          Store Management Quick Links
        </div>
        <div className="space-y-2.5">
          <MenuItem 
            icon={Package} 
            iconBg="bg-blue-50" 
            iconColor="text-[#1E3A8A]" 
            title="Manage Catalog & Stock" 
            subtitle="Add products, adjust stock stepper & barcodes" 
            onClick={() => navigate('/inventory')} 
          />
          <MenuItem 
            icon={Tag} 
            iconBg="bg-fuchsia-50" 
            iconColor="text-fuchsia-600" 
            title="Offers & Promo Codes" 
            subtitle="Create discounts, coupons and customer deals" 
            onClick={() => navigate('/offers')} 
          />
          <MenuItem 
            icon={FolderOpen} 
            iconBg="bg-sky-50" 
            iconColor="text-sky-600" 
            title="Manage Categories" 
            subtitle="Add & organize store product categories" 
            onClick={() => navigate('/categories')} 
          />
          <MenuItem 
            icon={Truck} 
            iconBg="bg-emerald-50" 
            iconColor="text-emerald-600" 
            title="Delivery Orders Hub" 
            subtitle="Accept, fulfill and dispatch customer orders" 
            onClick={() => navigate('/delivery')} 
          />
        </div>
      </div>

      {/* Preferences Section */}
      <div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
          Device & Sound Preferences
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Real-time Order Chime & Alert</div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {notificationsEnabled ? 'Chime sound & popup alert enabled for incoming orders' : 'Audio chime is muted'}
              </p>
            </div>
          </div>

          <button
            onClick={handleNotificationToggle}
            className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 ${
              notificationsEnabled ? 'bg-[#1E3A8A]' : 'bg-slate-200'
            }`}
          >
            <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
              notificationsEnabled ? 'translate-x-5.5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Server & Engine Connection Health */}
      <div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
          Server Connection
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Database Cluster</span>
                <span className="text-[11px] text-slate-400">MongoDB Atlas Cluster0</span>
              </div>
            </div>
            <span className="badge badge-emerald text-[10px]">
              {healthInfo.mongoState}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
                <Wifi size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Socket.io Real-Time Stream</span>
                <span className="text-[11px] text-slate-400">Port 5050 WebSocket Channel</span>
              </div>
            </div>
            <span className="badge badge-blue text-[10px]">
              CONNECTED
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400 font-medium">System Engine</span>
            <span className="text-xs font-bold text-slate-700">{healthInfo.system || 'Supermart POS Engine'}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
