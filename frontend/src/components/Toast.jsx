import React, { useState, useEffect } from 'react';

let toastId = 0;
let listeners = [];

export function showToast(message, type = 'success') {
  const id = ++toastId;
  listeners.forEach(fn => fn({ id, message, type }));
  return id;
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 4000);
    };
    listeners.push(handler);
    return () => { listeners = listeners.filter(fn => fn !== handler); };
  }, []);

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500'
  };

  return (
    <div className="fixed top-20 right-4 z-[100] space-y-3 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="animate-slideIn bg-white rounded-xl shadow-2xl border border-gray-100 p-4 flex items-center gap-3"
        >
          <div className={`w-8 h-8 ${colors[toast.type]} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
            {icons[toast.type]}
          </div>
          <p className="text-sm text-dark font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            className="text-gray-400 hover:text-dark text-lg"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
