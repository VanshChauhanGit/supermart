
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ShieldCheck, LogIn, AlertCircle, ShoppingBag, Phone, UserCheck } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('ADMIN'); // 'ADMIN' | 'CUSTOMER'

  // Admin state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('supermart123');
  const [showPassword, setShowPassword] = useState(false);

  // Customer state
  const [custName, setCustName] = useState('Vansh Chauhan');
  const [custPhone, setCustPhone] = useState('9876543210');
  const [custFatherName, setCustFatherName] = useState('Rajesh Chauhan');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('supermart_admin_user', JSON.stringify(data.data));
        onLoginSuccess(data.data);
        navigate('/pos');
      } else {
        setErrorMsg(data.message || 'Invalid Username or Password');
      }
    } catch (e) {
      setErrorMsg('Connection error: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/customers/login-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: custName,
          phone: custPhone,
          fatherName: custFatherName
        })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('supermart_customer_user', JSON.stringify(data.data));
        // Redirect to storefront page
        navigate('/storefront');
      } else {
        setErrorMsg(data.message || 'Failed to authenticate customer session');
      }
    } catch (e) {
      const fallbackUser = { name: custName, phone: custPhone, fatherName: custFatherName, creditBalance: 0 };
      localStorage.setItem('supermart_customer_user', JSON.stringify(fallbackUser));
      navigate('/storefront');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex items-center justify-center p-5 relative overflow-hidden">
      {/* Soft Background Accents */}
      <div className="absolute top-12 left-12 w-72 h-72 rounded-full bg-[#CAE8E8]/60 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-12 right-12 w-96 h-96 rounded-full bg-[#28469E]/10 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-0 overflow-hidden shadow-2xl border border-slate-200 z-10 rounded-3xl">
        {/* Header */}
        <div className="bg-[#28469E] p-7 text-center border-b border-[#CAE8E8]/30">
          <div className="w-16 h-16 rounded-2xl bg-[#CAE8E8] flex items-center justify-center text-[#28469E] mx-auto mb-3 shadow-md border-2 border-white/40">
            <ShoppingBag size={34} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">SUPERMART</h1>
          <p className="text-xs text-[#CAE8E8] mt-1 font-semibold uppercase tracking-wider">Enterprise Kiryana POS & Udhar System</p>
        </div>

        {/* Tab Selector Pill Bar */}
        <div className="bg-slate-100 p-1.5 flex gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => { setActiveTab('ADMIN'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'ADMIN' 
                ? 'bg-[#28469E] text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <ShieldCheck size={16} /> Store Owner Admin
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('CUSTOMER'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'CUSTOMER' 
                ? 'bg-[#28469E] text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <UserCheck size={16} /> Customer Portal
          </button>
        </div>

        {/* Tab 1: ADMIN LOGIN FORM */}
        {activeTab === 'ADMIN' ? (
          <form onSubmit={handleAdminSubmit} className="p-7 bg-white">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs mb-5 flex items-center gap-2 font-medium">
                <AlertCircle size={18} /> {errorMsg}
              </div>
            )}

            <div className="bg-slate-50 border border-dashed border-slate-200 p-3.5 rounded-xl text-xs text-slate-600 mb-5">
              🔑 <strong>Admin Access Credentials:</strong><br />
              Username: <code className="text-[#28469E] font-bold">admin</code> • Password: <code className="text-[#28469E] font-bold">supermart123</code>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Admin Username:</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-11 text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Admin Password:</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11 text-sm font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn btn-primary text-sm py-3.5 shadow-lg uppercase font-black tracking-wide"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : <><LogIn size={18} /> Authenticate Admin Portal ➔</>}
            </button>
          </form>
        ) : (

          /* TAB 2: CUSTOMER LOGIN FORM */
          <form onSubmit={handleCustomerSubmit} className="p-7 bg-white">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs mb-5 flex items-center gap-2 font-medium">
                <AlertCircle size={18} /> {errorMsg}
              </div>
            )}

            <div className="bg-[#CAE8E8]/40 border border-[#96C7C7]/60 p-3 rounded-xl text-xs text-[#1E367D] mb-5 font-semibold">
              🛍️ Shop Kiryana online & check your personal Udhar bill statement.
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Full Name:</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Vansh Chauhan"
                  className="input-field pl-11 text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Father's Name (Udhar Account):</label>
              <div className="relative">
                <UserCheck size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={custFatherName}
                  onChange={(e) => setCustFatherName(e.target.value)}
                  placeholder="e.g. Rajesh Chauhan"
                  className="input-field pl-11 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">10-Digit Mobile Phone:</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="tel"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="9876543210"
                  className="input-field pl-11 text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn btn-primary text-sm py-3.5 shadow-lg uppercase font-black tracking-wide"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Connecting...' : <><LogIn size={18} /> Enter Customer Storefront ➔</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
