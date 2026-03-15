import React, { useState } from 'react';
import { Star, Coins } from 'lucide-react';

export default function BonusModal({ kid, onConfirm, onClose }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div dir="rtl" className="bg-white p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl">
        <h3 className="font-bold text-lg sm:text-xl mb-1 flex items-center gap-2">
          <Star className="text-yellow-500 w-5 h-5" />בונוס מיוחד ל{kid.name}
        </h3>
        <p className="text-sm text-gray-500 mb-4">הוסף מטבעות בגין מאמץ מיוחד, עזרה, יום הולדת...</p>
        <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full p-3 border rounded-xl mb-3 text-center text-2xl font-bold" placeholder="כמה מטבעות?" autoFocus />
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full p-3 border rounded-xl mb-4" placeholder="סיבה (אופציונלי)" />
        <div className="flex gap-2">
          <button onClick={() => onConfirm(parseInt(amount) || 0, note)} disabled={!amount || parseInt(amount) < 1}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white font-bold p-3 rounded-xl transition-colors">
            הוסף <Coins className="inline w-4 h-4" />
          </button>
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-xl">ביטול</button>
        </div>
      </div>
    </div>
  );
}
