import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function RejectModal({ chore, onConfirm, onClose }) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div dir="rtl" className="bg-white p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl">
        <h3 className="font-bold text-lg sm:text-xl mb-1 flex items-center gap-2">
          <X className="text-red-500 w-5 h-5" />דחיית מטלה
        </h3>
        <p className="text-gray-600 mb-1 font-bold truncate">{chore.title}</p>
        <p className="text-sm text-gray-500 mb-3">כתוב הסבר קצר לילד — הוא יראה את ההודעה</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full p-3 border rounded-xl mb-4 resize-none h-20 sm:h-24" placeholder="למשל: הספה לא מסודרת מספיק, נסה שוב" autoFocus />
        <div className="flex gap-2">
          <button onClick={() => onConfirm(note)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold p-3 rounded-xl transition-colors">שלח דחייה</button>
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-3 rounded-xl">ביטול</button>
        </div>
      </div>
    </div>
  );
}
