import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Bell, CheckCircle, X, ExternalLink, Volume2, VolumeX, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SOCKET_URL } from '../config/api';

// Synthesize loud attention-grabbing Swiggy/Zomato style order bell sequence
const playContinuousChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const playTone = (freq, startTime, duration, gainVal = 0.4) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    // 3-tone bright ringing sequence: C5 -> E5 -> G5 -> C6
    playTone(523.25, now, 0.3, 0.45);        // C5
    playTone(659.25, now + 0.15, 0.35, 0.5);  // E5
    playTone(783.99, now + 0.30, 0.4, 0.55);  // G5
    playTone(1046.50, now + 0.48, 0.7, 0.6); // C6 (Bright finish)
  } catch (e) {
    console.warn('Audio chime could not play:', e);
  }
};

export default function AdminOrderNotifier({ onOrderReceived }) {
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const soundIntervalRef = useRef(null);
  const navigate = useNavigate();

  // Manage repeating sound loop while incomingOrder is active
  useEffect(() => {
    if (incomingOrder && soundEnabled) {
      // Play immediately
      playContinuousChime();

      // Repeat chime every 2.5 seconds like commercial store POS machines
      soundIntervalRef.current = setInterval(() => {
        playContinuousChime();
      }, 2500);
    } else {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    }

    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    };
  }, [incomingOrder, soundEnabled]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { path: '/socket.io' });

    socket.on('connect', () => {
      console.log('[Socket] Connected to real-time order stream:', socket.id);
    });

    socket.on('newOrder', (order) => {
      console.log('[Socket] New Order Received:', order);
      setIncomingOrder(order);
      if (onOrderReceived) {
        onOrderReceived(order);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [onOrderReceived]);

  const handleSilenceAndDismiss = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    setIncomingOrder(null);
  };

  const handleAcceptOrder = async () => {
    if (!incomingOrder?._id) return;
    setAccepting(true);
    try {
      await fetch(`/api/v1/orders/${incomingOrder._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' })
      });
      handleSilenceAndDismiss();
      navigate('/delivery');
    } catch (_e) {
      handleSilenceAndDismiss();
    } finally {
      setAccepting(false);
    }
  };

  if (!incomingOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-4 border-amber-400 relative transform transition-all scale-100 animate-in zoom-in-95">
        
        {/* Sound toggle & close */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-full transition-colors ${soundEnabled ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}
            title={soundEnabled ? 'Mute Alarm Sound' : 'Enable Alarm Sound'}
          >
            {soundEnabled ? <Volume2 size={20} className="animate-pulse" /> : <VolumeX size={20} />}
          </button>
          <button
            onClick={handleSilenceAndDismiss}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pulse Bell Icon & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-18 h-18 rounded-full bg-amber-100 border-4 border-amber-300 flex items-center justify-center mb-3 animate-bounce">
            <Bell size={36} className="text-amber-600 animate-wiggle" />
          </div>

          <span className="text-[11px] font-black tracking-widest uppercase px-3.5 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-300 mb-1">
            ⚡ 10-Minute Express Delivery Order
          </span>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            NEW ORDER RECEIVED!
          </h3>
          <p className="text-sm font-extrabold text-[#1E3A8A] mt-0.5">
            Order #{incomingOrder.orderNo}
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 my-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 font-semibold">Customer:</span>
            <span className="font-black text-slate-900 text-sm">{incomingOrder.customerName}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 font-semibold">Phone:</span>
            <span className="font-bold text-slate-900">+91 {incomingOrder.phone}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 font-semibold">Delivery Address:</span>
            <span className="font-bold text-slate-800 text-right max-w-[220px] truncate">
              {incomingOrder.deliveryAddress}
            </span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 font-semibold">Payment Mode:</span>
            <span className="font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              {incomingOrder.paymentMethod}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 text-sm font-extrabold">
            <span className="text-slate-700 font-bold">Total Bill:</span>
            <span className="text-[#1E3A8A] text-lg font-black">₹{incomingOrder.totalAmount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleAcceptOrder}
            disabled={accepting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 text-sm font-black flex items-center justify-center gap-2 rounded-2xl shadow-lg transition-transform active:scale-98"
          >
            <Check size={18} />
            <span>{accepting ? 'Accepting Order...' : 'ACCEPT ORDER & SILENCE ALARM'}</span>
          </button>

          <button
            onClick={() => {
              handleSilenceAndDismiss();
              navigate('/delivery');
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-[#F7C400] py-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl shadow-md transition-colors"
          >
            <span>View in Delivery Hub</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
