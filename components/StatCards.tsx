
import React from 'react';
import { Stats } from '../types';

interface Props {
  stats: Stats;
  t: any;
  extra?: {
      transit: number;
      stopped: number;
      remaining: number;
  };
}

const StatCards: React.FC<Props> = ({ stats, t, extra }) => {
  const cards = [
    { 
      label: t.tripsCount || "عدد النقلات", 
      value: stats.totalTrips, 
      unit: t.trip || "نقلة", 
      icon: 'fa-route', 
      color: 'indigo',
      borderColor: '#6366f1',
      lightBg: 'bg-indigo-50/50'
    },
    { 
      label: t.remaining || "الرصيد المتبقي", 
      value: extra?.remaining || 0, 
      unit: t.ton || "طن", 
      icon: 'fa-warehouse', 
      color: 'amber',
      borderColor: '#f59e0b',
      lightBg: 'bg-amber-50/50'
    },
    { 
      label: t.totalStopped || "أعطال وتوقف", 
      value: extra?.stopped || 0, 
      unit: t.ton || "طن", 
      icon: 'fa-ban', 
      color: 'red',
      borderColor: '#ef4444',
      lightBg: 'bg-red-50/50'
    },
    { 
      label: t.inTransit || "جاري التحميل", 
      value: extra?.transit || 0, 
      unit: t.ton || "طن", 
      icon: 'fa-truck-fast', 
      color: 'blue',
      borderColor: '#3b82f6',
      lightBg: 'bg-blue-50/50'
    },
    { 
      label: t.totalDone || "إجمالي المنفذ", 
      value: stats.totalWeight, 
      unit: t.ton || "طن", 
      icon: 'fa-check-double', 
      color: 'emerald',
      borderColor: '#10b981',
      lightBg: 'bg-emerald-50/50'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 mb-10">
      {cards.map((card, i) => (
        <div 
          key={i} 
          className="bg-white p-5 md:p-6 rounded-[35px] shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)] border-b-[5px] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between h-36 md:h-40 group relative overflow-hidden"
          style={{ borderBottomColor: card.borderColor }}
        >
          <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-10 ${card.lightBg}`}></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className={`w-10 h-10 md:w-12 md:h-12 ${card.lightBg} rounded-2xl flex items-center justify-center text-${card.color}-600 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-white`}>
              <i className={`fas ${card.icon} text-sm md:text-lg`}></i>
            </div>
            <p className="text-[10px] md:text-[11px] text-slate-500 font-black uppercase text-right leading-tight max-w-[90px]">
              {card.label}
            </p>
          </div>
          
          <div className="text-right relative z-10">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[10px] md:text-xs font-bold text-slate-400 order-2">{card.unit}</span>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 order-1">
                {card.value.toLocaleString()} 
              </h3>
            </div>
          </div>
        </div>
      ))}
      
      <style>{`
        .text-indigo-600 { color: #4f46e5; }
        .text-amber-600 { color: #d97706; }
        .text-red-600 { color: #dc2626; }
        .text-blue-600 { color: #2563eb; }
        .text-emerald-600 { color: #059669; }
      `}</style>
    </div>
  );
};

export default StatCards;
