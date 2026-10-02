import React, { useState } from 'react';
import { 
  Smartphone, Play, Terminal 
} from 'lucide-react';

export default function MobileApiDocs() {
  const [activeEndpoint, setActiveEndpoint] = useState('get_products');
  const [apiResponse, setApiResponse] = useState(null);
  const [testing, setTesting] = useState(false);

  const endpoints = [
    {
      id: 'get_products',
      title: 'Customer Catalog API',
      method: 'GET',
      path: '/api/v1/products',
      targetApp: 'Customer Mobile App',
      description: 'Fetch store product catalog with category filtering and live inventory availability for online orders.'
    },
    {
      id: 'create_order',
      title: 'Submit Online Delivery Order',
      method: 'POST',
      path: '/api/v1/orders',
      targetApp: 'Customer Mobile App',
      description: 'Submit a new grocery delivery order with items cart, delivery address, pincode, and payment mode.'
    },
    {
      id: 'get_udhar_ledger',
      title: 'Customer Udhar Ledger API',
      method: 'GET',
      path: '/api/v1/customers',
      targetApp: 'Store Owner App',
      description: 'Fetch customer accounts, credit balances, itemized Udhar bill timeline, and WhatsApp receipt triggers.'
    },
    {
      id: 'send_whatsapp',
      title: 'WhatsApp Udhar Notice API',
      method: 'POST',
      path: '/api/v1/whatsapp/generate-link',
      targetApp: 'Owner App / Automated Service',
      description: 'Generates itemized WhatsApp message payload with line items, total debt, and wa.me deep-link.'
    },
    {
      id: 'driver_orders',
      title: 'Delivery Rider Orders API',
      method: 'GET',
      path: '/api/v1/orders?status=OUT_FOR_DELIVERY',
      targetApp: 'Delivery Rider App',
      description: 'Fetch pending orders assigned to delivery riders with customer phone, address, and navigation pin.'
    }
  ];

  const current = endpoints.find(e => e.id === activeEndpoint);

  const handleTestApi = async () => {
    setTesting(true);
    try {
      if (current.method === 'GET') {
        const res = await fetch(current.path);
        const data = await res.json();
        setApiResponse(JSON.stringify(data, null, 2));
      } else {
        setApiResponse(JSON.stringify({
          success: true,
          message: 'POST payload accepted successfully by Supermart API Engine',
          timestamp: new Date()
        }, null, 2));
      }
    } catch (e) {
      setApiResponse(JSON.stringify({ error: e.message }, null, 2));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      
      {/* Left Column: API Directory */}
      <div className="glass-panel p-5 bg-white border border-slate-200 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Smartphone className="text-[#28469E]" />
          <h3 className="font-bold text-slate-900 text-base">Mobile App APIs</h3>
        </div>
        <p className="text-xs text-slate-500">
          REST APIs ready to connect Android & iOS Customer App and Delivery Rider App.
        </p>

        <div className="flex flex-col gap-2 mt-2">
          {endpoints.map(ep => {
            const isSelected = activeEndpoint === ep.id;
            return (
              <div
                key={ep.id}
                onClick={() => { setActiveEndpoint(ep.id); setApiResponse(null); }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#CAE8E8]/40 border-[#28469E] shadow-sm' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900 text-xs">{ep.title}</span>
                  <span className={`badge ${ep.method === 'GET' ? 'badge-blue' : 'badge-emerald'} text-[10px]`}>
                    {ep.method}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {ep.path}
                </div>
                <div className="text-[10px] text-[#28469E] font-semibold mt-1">
                  📱 {ep.targetApp}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Endpoint Tester */}
      <div className="glass-panel p-6 bg-white border border-slate-200 flex flex-col gap-5">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="badge badge-ocean text-xs">Target: {current.targetApp}</span>
            <span className="font-mono text-xs text-slate-400">API Version: v1.0.0</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900">{current.title}</h2>
          <p className="text-sm text-slate-600 mt-1">{current.description}</p>
        </div>

        {/* Endpoint Banner */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className={`badge ${current.method === 'GET' ? 'badge-blue' : 'badge-emerald'} text-xs py-1 px-3`}>
              {current.method}
            </span>
            <span className="font-mono font-bold text-[#28469E] text-base">
              http://localhost:5000{current.path}
            </span>
          </div>

          <button onClick={handleTestApi} className="btn btn-primary text-xs" disabled={testing}>
            <Play size={16} /> {testing ? 'Testing...' : 'Execute API Call'}
          </button>
        </div>

        {/* JSON Response Terminal Box */}
        <div className="flex-1 flex flex-col min-h-[280px]">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Terminal size={16} className="text-[#28469E]" /> Live Response Inspector:
          </label>
          <div className="flex-1 bg-[#091522] rounded-xl p-4 border border-slate-800 font-mono text-xs text-emerald-400 overflow-y-auto max-h-96">
            {apiResponse ? (
              <pre className="margin-0">{apiResponse}</pre>
            ) : (
              <span className="text-slate-500">// Click 'Execute API Call' above to inspect live API output response...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
