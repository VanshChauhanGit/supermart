import React, { useState, useEffect } from 'react';
import { 
  Users, Wallet, ArrowDownRight, ArrowUpRight, MessageSquare, 
  Search, Plus, CheckCircle2, History, ChevronRight, Phone, Send, FileText,
  Edit3, Trash2, ShieldAlert, Filter, ShoppingBag
} from 'lucide-react';

export default function UdharManager({ customers, onRefreshCustomers, onOpenWhatsAppModal }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payNotes, setPayNotes] = useState('');

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustId, setEditingCustId] = useState(null);
  const [custName, setCustName] = useState('');
  const [custFatherName, setCustFatherName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCreditLimit, setCustCreditLimit] = useState(5000);
  const [custNotes, setCustNotes] = useState('');

  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerDetails(null);
      return;
    }
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/v1/customers/${selectedCustomerId}`);
        const data = await res.json();
        if (data.success) setCustomerDetails(data.data);
      } catch (e) {}
    };
    fetchDetails();
  }, [selectedCustomerId]);

  const filteredCustomers = customers.filter(c => {
    if (filterType === 'BORROWERS' && c.creditBalance <= 0) return false;
    if (filterType === 'CLEAR' && c.creditBalance > 0) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) || 
        (c.fatherName && c.fatherName.toLowerCase().includes(q)) ||
        c.phone.includes(q)
      );
    }
    return true;
  });

  const totalOutstandingUdhar = customers.reduce((acc, c) => acc + (c.creditBalance || 0), 0);
  const totalStorePurchases = customers.reduce((acc, c) => acc + (c.totalPurchases || 0), 0);

  const handleOpenAdd = () => {
    setEditingCustId(null);
    setCustName('');
    setCustFatherName('');
    setCustPhone('');
    setCustAddress('');
    setCustCreditLimit(5000);
    setCustNotes('');
    setShowCustomerModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustId(c._id);
    setCustName(c.name);
    setCustFatherName(c.fatherName || '');
    setCustPhone(c.phone);
    setCustAddress(c.address || '');
    setCustCreditLimit(c.creditLimit || 5000);
    setCustNotes(c.notes || '');
    setShowCustomerModal(true);
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer account?')) return;
    try {
      await fetch(`/api/v1/customers/${id}`, { method: 'DELETE' });
      setSelectedCustomerId(null);
      onRefreshCustomers();
    } catch (e) {}
  };

  const handleRecordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    try {
      const res = await fetch(`/api/v1/customers/${selectedCustomerId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          paymentMethod: payMethod,
          notes: payNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        setPayAmount('');
        setPayNotes('');
        onRefreshCustomers();
        const detailsRes = await fetch(`/api/v1/customers/${selectedCustomerId}`);
        const detailsData = await detailsRes.json();
        if (detailsData.success) setCustomerDetails(detailsData.data);
        if (data.data.whatsApp) {
          window.open(data.data.whatsApp.waUrl, '_blank');
        }
      }
    } catch (e) {}
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      const url = editingCustId ? `/api/v1/customers/${editingCustId}` : '/api/v1/customers';
      const method = editingCustId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: custName,
          fatherName: custFatherName,
          phone: custPhone,
          address: custAddress,
          creditLimit: Number(custCreditLimit),
          notes: custNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCustomerModal(false);
        onRefreshCustomers();
        if (editingCustId) {
          const detailsRes = await fetch(`/api/v1/customers/${editingCustId}`);
          const detailsData = await detailsRes.json();
          if (detailsData.success) setCustomerDetails(detailsData.data);
        }
      }
    } catch (e) {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
      
      {/* Left Column: Customer Directory */}
      <div className="glass-panel p-5 bg-white border border-slate-200 flex flex-col gap-4">
        
        {/* Total Metrics Header */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-500 font-semibold">Udhar Debt</div>
              <div className="text-xl font-black text-amber-600">₹{totalOutstandingUdhar.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-semibold">Total Lifetime Sales</div>
              <div className="text-xl font-black text-emerald-600">₹{totalStorePurchases.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* Search & Add Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, father's name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>
          <button onClick={handleOpenAdd} className="btn btn-primary px-3 text-xs">
            <Plus size={16} /> New
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterType('ALL')}
            className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'} flex-1 py-1 px-2 text-xs`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('BORROWERS')}
            className={`btn ${filterType === 'BORROWERS' ? 'btn-whatsapp' : 'btn-secondary'} flex-1 py-1 px-2 text-xs`}
          >
            Udhar ({customers.filter(c => c.creditBalance > 0).length})
          </button>
          <button
            onClick={() => setFilterType('CLEAR')}
            className={`btn ${filterType === 'CLEAR' ? 'btn-primary' : 'btn-secondary'} flex-1 py-1 px-2 text-xs`}
          >
            Clear
          </button>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto max-h-[540px] flex flex-col gap-2">
          {filteredCustomers.map(c => {
            const isSelected = selectedCustomerId === c._id;
            return (
              <div
                key={c._id}
                onClick={() => setSelectedCustomerId(c._id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#CAE8E8]/40 border-[#28469E] shadow-sm' 
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                    {c.fatherName && (
                      <div className="text-xs text-[#28469E] font-semibold">
                        S/O: {c.fatherName}
                      </div>
                    )}
                  </div>
                  <span className={`font-black text-sm ${c.creditBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ₹{c.creditBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span><Phone size={11} className="inline mr-1" /> +91-{c.phone}</span>
                  <span>Total Spent: <strong className="text-emerald-600">₹{(c.totalPurchases || 0).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Customer Details & Transaction Ledger */}
      <div className="glass-panel p-6 bg-white border border-slate-200 flex flex-col">
        {selectedCustomerId && customerDetails ? (
          <div>
            {/* Header Banner */}
            <div className="flex justify-between items-center pb-5 border-b border-slate-200 mb-5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900">{customerDetails.customer.name}</h2>
                  {customerDetails.customer.fatherName && (
                    <span className="badge badge-ocean text-xs">
                      S/O {customerDetails.customer.fatherName}
                    </span>
                  )}
                  <button onClick={() => handleOpenEdit(customerDetails.customer)} className="text-blue-600 hover:text-blue-800">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDeleteCustomer(customerDetails.customer._id)} className="text-rose-600 hover:text-rose-800">
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Phone: +91-{customerDetails.customer.phone} • Address: {customerDetails.customer.address || 'Local Resident'}
                </p>
              </div>

              <div className="flex gap-4 items-center">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Lifetime Purchased</div>
                  <div className="text-base font-extrabold text-emerald-600">
                    ₹{(customerDetails.customer.totalPurchases || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="text-right px-4 border-x border-slate-200">
                  <div className="text-xs text-slate-500">Pending Udhar Balance</div>
                  <div className={`text-xl font-black ${customerDetails.customer.creditBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ₹{customerDetails.customer.creditBalance.toLocaleString('en-IN')}
                  </div>
                </div>

                <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary text-xs">
                  <ArrowDownRight size={16} /> Record Payment
                </button>

                <button 
                  onClick={() => {
                    const cleanPhone = customerDetails.customer.phone.replace(/\D/g, '');
                    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                    const fatherText = customerDetails.customer.fatherName ? ` (S/O ${customerDetails.customer.fatherName})` : '';
                    const text = `🛍️ *SUPERMART Udhar Statement*\n👤 Customer: *${customerDetails.customer.name}*${fatherText}\n📅 Date: ${dateStr}\n💳 *Total Pending Udhar Balance: ₹${customerDetails.customer.creditBalance}*\n🛍️ Total Purchases Till Date: ₹${customerDetails.customer.totalPurchases || 0}\n\nPlease clear at your convenience via UPI/Cash. Thank you!`;
                    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
                  }} 
                  className="btn btn-whatsapp text-xs"
                >
                  <MessageSquare size={16} /> WhatsApp Notice
                </button>
              </div>
            </div>

            {/* Ledger Timeline */}
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <History className="text-[#28469E]" size={18} /> Itemized Udhar Purchase History & Ledger
            </h3>

            {customerDetails.transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No past transactions recorded for this customer.
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[500px] space-y-3">
                {customerDetails.transactions.map((tx) => {
                  const isCredit = tx.type === 'CREDIT_PURCHASE';
                  return (
                    <div key={tx._id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`badge ${isCredit ? 'badge-amber' : 'badge-emerald'}`}>
                            {isCredit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {isCredit ? 'UDHAR PURCHASE' : 'PAYMENT RECEIVED'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>

                        <div className={`text-base font-black ${isCredit ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {isCredit && tx.itemsSummary && tx.itemsSummary.length > 0 && (
                        <div className="bg-white rounded-lg p-2.5 mt-2 border border-slate-200 text-xs">
                          <div className="font-bold text-slate-700 mb-1">Purchased Items List:</div>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            {tx.itemsSummary.map((item, i) => (
                              <li key={i}>
                                {item.name} x {item.quantity} {item.unit || 'pcs'} — ₹{item.total || (item.price * item.quantity)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>Updated Balance: ₹{tx.newBalance}</span>
                        <span>{tx.notes}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20">
            <Users size={64} strokeWidth={1} className="mb-3 opacity-40" />
            <p className="text-base font-bold text-slate-700">Customer Directory & Udhar Book</p>
            <p className="text-xs text-slate-500">Select a customer account from the left panel to manage father's name, lifetime purchases & record payments.</p>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-sm p-6 bg-white border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Record Repayment Received</h3>
            <label className="text-xs font-semibold text-slate-700">Payment Amount (₹):</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="input-field mb-3 mt-1"
            />
            <label className="text-xs font-semibold text-slate-700">Payment Mode:</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="input-field mb-4 mt-1"
            >
              <option value="UPI">UPI / PhonePe / GPay</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handleRecordPayment} className="btn btn-primary flex-1">Submit Payment</button>
              <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveCustomer} className="glass-panel w-full max-w-md p-6 bg-white border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">{editingCustId ? 'Edit Customer Profile' : 'Add New Customer Profile'}</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Customer Full Name:</label>
                <input
                  type="text"
                  placeholder="Rajesh Kumar"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Father's Name (S/O):</label>
                <input
                  type="text"
                  placeholder="Sh. Ram Lal"
                  value={custFatherName}
                  onChange={(e) => setCustFatherName(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Mobile Phone:</label>
                <input
                  type="text"
                  placeholder="+91..."
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Credit Limit (₹):</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={custCreditLimit}
                  onChange={(e) => setCustCreditLimit(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <label className="text-xs font-semibold text-slate-700">Address / House No:</label>
            <input
              type="text"
              placeholder="Address"
              value={custAddress}
              onChange={(e) => setCustAddress(e.target.value)}
              className="input-field mb-3"
            />

            <label className="text-xs font-semibold text-slate-700">Notes:</label>
            <textarea
              placeholder="Notes..."
              value={custNotes}
              onChange={(e) => setCustNotes(e.target.value)}
              className="input-field mb-4 h-16"
            />

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">Save Profile</button>
              <button type="button" onClick={() => setShowCustomerModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
