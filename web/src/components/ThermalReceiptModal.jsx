import React from 'react';
import { Printer, X, ShoppingBag } from 'lucide-react';

export default function ThermalReceiptModal({ isOpen, onClose, saleData }) {
  if (!isOpen || !saleData) return null;

  const handlePrint = () => {
    window.print();
  };

  const { invoiceNo, customerName, items, subtotal, discount, tax, totalAmount, paymentMode, createdAt } = saleData;

  const dateStr = new Date(createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="no-print" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        overflow: 'hidden'
      }}>
        {/* Modal Controls Top */}
        <div style={{
          padding: '16px 20px',
          background: '#0f172a',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <ShoppingBag size={20} color="#10b981" />
            <span>Store Receipt Preview</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Printable Thermal Receipt Receipt Body */}
        <div id="thermal-receipt-modal" style={{
          background: '#ffffff',
          color: '#000000',
          padding: '24px 20px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          maxHeight: '480px',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px dashed #000', paddingBottom: '12px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>SUPERMART</h2>
            <p style={{ margin: '2px 0', fontSize: '0.75rem' }}>All-in-One Kiryana & Departmental Store</p>
            <p style={{ margin: '2px 0', fontSize: '0.75rem' }}>Main Market, Sector 4 • Phone: +91-9876543210</p>
            <p style={{ margin: '2px 0', fontSize: '0.7rem' }}>GSTIN: 07AAAAA0000A1Z5</p>
          </div>

          {/* Bill Meta */}
          <div style={{ marginBottom: '12px', fontSize: '0.8rem', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Invoice: <strong>#{invoiceNo}</strong></span>
              <span>Mode: <strong>{paymentMode}</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span>Customer: <strong>{customerName || 'Walk-in'}</strong></span>
              <span>{dateStr}</span>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                <th style={{ padding: '4px 0' }}>Item</th>
                <th style={{ padding: '4px 0', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '4px 0', textAlign: 'right' }}>Rate</th>
                <th style={{ padding: '4px 0', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items && items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '6px 0', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.quantity} {item.unit || 'pcs'}</td>
                  <td style={{ textAlign: 'right' }}>₹{item.price}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{item.total || (item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ borderTop: '2px dashed #000', paddingTop: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Subtotal:</span>
              <span>₹{subtotal?.toLocaleString('en-IN')}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#047857' }}>
                <span>Discount Saved:</span>
                <span>-₹{discount?.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 800, fontSize: '1.1rem', borderTop: '1px solid #000', paddingTop: '6px' }}>
              <span>Grand Total:</span>
              <span>₹{totalAmount?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #000', fontSize: '0.75rem' }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Thank you for shopping with us!</p>
            <p style={{ margin: '2px 0' }}>Visit again for fresh & daily essentials.</p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ padding: '16px 20px', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', gap: '12px' }}>
          <button onClick={handlePrint} className="btn btn-primary" style={{ flex: 1 }}>
            <Printer size={18} /> Print Receipt
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
