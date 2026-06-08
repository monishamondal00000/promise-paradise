import React from 'react';

export default function ConfirmPopup({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <p className="text-dark text-sm mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-dark transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Confirm</button>
        </div>
      </div>
    </div>
  );
}
