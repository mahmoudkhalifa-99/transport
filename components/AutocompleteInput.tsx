
import React, { useState, useRef, useEffect } from 'react';

export interface SuggestionItem {
  value: string | number;
  label: string;
  subLabel?: string;
}

interface Props {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: any) => void;
  suggestions: (string | number | SuggestionItem)[];
  placeholder: string;
  required?: boolean;
}

const AutocompleteInput: React.FC<Props> = ({ label, name, value, onChange, suggestions, placeholder, required }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const getLabel = (s: string | number | SuggestionItem) => 
    typeof s === 'object' && s !== null ? s.label : String(s);
    
  const getValue = (s: string | number | SuggestionItem) => 
    typeof s === 'object' && s !== null ? s.value : String(s);
    
  const getSubLabel = (s: string | number | SuggestionItem) => 
    typeof s === 'object' && s !== null ? s.subLabel : null;

  // تحويل القيمة الحالية إلى نص للتعامل معها بشكل آمن
  const stringValue = String(value || '');

  // إظهار كافة المقترحات إذا كان الحقل فارغاً، أو الفلترة بناءً على ما كتبه المستخدم
  const filtered = suggestions.filter(s => {
    if (!stringValue) return true;
    const itemValue = String(getValue(s)).toLowerCase();
    return itemValue.includes(stringValue.toLowerCase());
  }).slice(0, 30);

  useEffect(() => {
    const click = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  return (
    <div className="flex flex-col gap-2 relative" ref={ref}>
      <label className="text-[10px] font-black text-gray-400 uppercase px-2">{label}</label>
      <div className="relative group">
        <input 
          required={required} 
          autoComplete="off"
          type="text" 
          name={name} 
          value={value} 
          onChange={onChange} 
          onFocus={() => setShow(true)}
          placeholder={placeholder} 
          className="w-full bg-gray-50 p-4 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none transition-all pr-10 cursor-pointer" 
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-indigo-500 transition-colors">
            <i className={`fas ${show ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`}></i>
        </div>
      </div>
      
      {show && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white border border-gray-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-72 overflow-y-auto no-scrollbar">
          {filtered.length > 0 ? (
            filtered.map((s, i) => (
              <div 
                key={i} 
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ target: { name, value: getValue(s) }}); 
                  setShow(false); 
                }} 
                className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-none transition-colors group flex flex-col gap-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-sm text-gray-800 group-hover:text-indigo-600">{getLabel(s)}</span>
                  {getSubLabel(s) && (
                     <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                       {String(getSubLabel(s)).split('|')[0]}
                     </span>
                  )}
                </div>
                {getSubLabel(s) && (
                  <div className="text-[9px] font-bold text-gray-400 group-hover:text-indigo-400">
                    {String(getSubLabel(s)).includes('|') ? String(getSubLabel(s)).split('|')[1] : ''}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-300 italic text-xs font-bold">لا توجد نتائج مطابقة</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
