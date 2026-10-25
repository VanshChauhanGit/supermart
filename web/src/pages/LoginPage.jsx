import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, User, Eye, EyeOff, ShieldCheck, LogIn, AlertCircle, 
  Store, KeyRound, CheckCircle2, ShieldAlert 
} from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleOwnerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Map to dedicated Store Owner Login API
      const res = await fetch('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: identifier.trim(),
          mobile: identifier.trim(),
          password: password.trim() 
        })
      });

      const data = await res.json();

      if (data.success && data.data) {
        localStorage.setItem('supermart_admin_user', JSON.stringify(data.data));
        if (data.token) {
          localStorage.setItem('supermart_admin_token', data.token);
        }
        if (onLoginSuccess) {
          onLoginSuccess(data.data);
        }
        navigate('/dashboard');
      } else {
        setErrorMsg(data.message || 'Invalid Store Owner credentials');
      }
    } catch (e) {
      // Fallback network attempt
      try {
        const fallbackRes = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier.trim(), password: password.trim() })
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && fallbackData.data) {
          localStorage.setItem('supermart_admin_user', JSON.stringify(fallbackData.data));
          if (onLoginSuccess) onLoginSuccess(fallbackData.data);
          navigate('/dashboard');
          return;
        }
      } catch (err) {}

      setErrorMsg('Connection failed. Please ensure the backend server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-5 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-10 left-10 w-80 h-80 rounded-full bg-[#CAE8E8]/40 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#1E3A8A]/10 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 transition-all">
        
        {/* Header Branding */}
        <div className="bg-[#1E3A8A] p-8 text-center text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-black/10">
            <ShieldCheck size={36} className="text-[#93C5FD]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#93C5FD] bg-white/10 px-3 py-1 rounded-full border border-white/15 inline-block mb-2">
            Store Owner Portal
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">SUPERMART ADMIN</h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Kiryana Billing, Inventory & Digital Udhar Ledger
          </p>
        </div>

        {/* Security Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200/70 px-5 py-2.5 flex items-center gap-2 text-[11px] text-amber-800 font-semibold">
          <ShieldAlert size={15} className="text-amber-600 flex-shrink-0" />
          <span>Restricted Portal: Access reserved strictly for Store Owners & Admins.</span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleOwnerSubmit} className="p-7 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2 font-medium animate-in fade-in">
              <AlertCircle size={18} className="flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Username / Mobile Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Owner Username or Mobile:
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="admin or 9999999999"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input-field pl-11 text-sm font-semibold"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Owner Password:
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-11 pr-11 text-sm font-semibold"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn bg-[#1E3A8A] hover:bg-[#1E367D] text-white text-sm py-3.5 rounded-xl shadow-md shadow-[#1E3A8A]/25 font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-2 transition-all hover:-translate-y-0.5"
          >
            {isSubmitting ? (
              <span>Authenticating Owner...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Enter Owner Portal</span>
              </>
            )}
          </button>

          {/* Footer Customer App Notice */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              Are you a customer? Please use the <strong className="text-slate-700">Supermart Customer App</strong> on mobile to browse catalog & place home delivery orders.
            </p>
          </div>
        </form>

      </div>
    </div>
  );
}
