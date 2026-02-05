
import React, { useState, useMemo } from 'react';
import { TransportRecord, OperationStatus } from '../types';

interface Props {
  records: TransportRecord[];
  onEdit?: (record: TransportRecord) => void;
  onDelete?: (id: string, goodsType: string) => void;
  onStatusChange?: (record: TransportRecord, newStatus: OperationStatus) => void;
  canEdit: boolean;
  t: any;
  selectedMaterial: 'soy' | 'maize' | null;
}

// دالة مساعدة لتنسيق التاريخ
const formatDate = (dateStr: string) => {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

const RecordsDashboard: React.FC<Props> = ({ records, onEdit, onDelete, onStatusChange, canEdit, t, selectedMaterial }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');

  const filteredRecords = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return records.filter(r => {
      const carNum = String(r.carNumber || '').toLowerCase();
      const drName = String(r.driverName || '').toLowerCase();
      const ordNo = String(r.orderNo || '').toLowerCase();
      const wbNo = String(r.waybillNo || '').toLowerCase();

      const matchesSearch = 
        carNum.includes(searchLower) || 
        drName.includes(searchLower) || 
        ordNo.includes(searchLower) ||
        wbNo.includes(searchLower);
      
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchesSite = filterSite === 'all' || String(r.unloadingSite).trim() === filterSite;
      
      return matchesSearch && matchesStatus && matchesSite;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, searchTerm, filterStatus, filterSite]);

  const uniqueSites = useMemo(() => Array.from(new Set(records.map(r => String(r.unloadingSite || '').trim()))).filter(Boolean), [records]);

  const stats = useMemo(() => {
    return {
      totalWeight: filteredRecords.reduce((s, r) => r.status === OperationStatus.DONE ? s + Number(r.weight || 0) : s, 0),
      totalTrips: filteredRecords.length,
      inProgress: filteredRecords.filter(r => r.status === OperationStatus.IN_PROGRESS).length,
      stopped: filteredRecords.filter(r => r.status === OperationStatus.STOPPED).length,
    };
  }, [filteredRecords]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-right">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الوزن المنفذ', value: stats.totalWeight, unit: 'طن', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'fa-weight-hanging' },
          { label: 'عدد النقلات الكلي', value: stats.totalTrips, unit: 'نقلة', color: 'text-slate-800', bg: 'bg-slate-100', icon: 'fa-route' },
          { label: 'نقلات قيد التنفيذ', value: stats.inProgress, unit: 'سيارة', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'fa-truck-moving' },
          { label: 'توقف / أعطال', value: stats.stopped, unit: 'حالة', color: 'text-rose-600', bg: 'bg-rose-50', icon: 'fa-exclamation-triangle' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} p-6 rounded-[35px] border border-white shadow-sm hover:shadow-md transition-all`}>
            <div className="flex justify-between items-center mb-4 flex-row-reverse">
              <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${s.color} shadow-sm border border-slate-50`}>
                <i className={`fas ${s.icon}`}></i>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
            </div>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[9px] font-bold text-slate-400">{s.unit}</span>
              <span className={`text-2xl font-black ${s.color}`}>{s.value.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 p-6 rounded-[40px] shadow-sm flex flex-col lg:flex-row-reverse items-center justify-between gap-6">
        <div className="relative w-full lg:w-96 group">
          <input 
            type="text" 
            placeholder="بحث برقم السيارة، السائق، أو الطلب..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-slate-800 text-sm font-bold pr-12 outline-none focus:ring-2 ring-indigo-500/20 transition-all placeholder:text-slate-400 text-right"
          />
          <i className="fas fa-search absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-row-reverse">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-slate-800 text-xs font-black outline-none focus:ring-2 ring-indigo-500/20"
          >
            <option value="all">كل الحالات</option>
            <option value={OperationStatus.DONE}>تم التنفيذ</option>
            <option value={OperationStatus.IN_PROGRESS}>جاري التنفيذ</option>
            <option value={OperationStatus.STOPPED}>متوقفة</option>
          </select>

          <select 
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-slate-800 text-xs font-black outline-none focus:ring-2 ring-indigo-500/20"
          >
            <option value="all">كل المواقع</option>
            {uniqueSites.map(site => <option key={site} value={site}>{site}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="p-6">التاريخ</th>
                <th className="p-6">السيارة والسائق</th>
                <th className="p-6">الموقع / المورد</th>
                <th className="p-6">أمر التوريد</th>
                <th className="p-6">الوزن</th>
                <th className="p-6">الحالة</th>
                {canEdit && <th className="p-6">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="flex flex-col items-center">
                      <span className="text-slate-800 font-black text-sm">{formatDate(r.date)}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{r.departureTime && !r.departureTime.includes('1899') ? r.departureTime : '--:--'}</span>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-slate-800 font-black text-sm">{r.carNumber}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{r.driverName}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col items-center">
                      <span className="text-slate-700 font-bold text-xs">{r.unloadingSite}</span>
                      <span className="text-[9px] text-slate-400">{r.contractorName}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-black">#{r.orderNo}</span>
                  </td>
                  <td className="p-6">
                    <span className="text-lg font-black text-slate-800">{r.weight} <span className="text-[9px] font-bold text-slate-400">طن</span></span>
                  </td>
                  <td className="p-6">
                    {canEdit ? (
                      <select
                        value={r.status}
                        onChange={(e) => onStatusChange?.(r, e.target.value as OperationStatus)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black outline-none border-2 cursor-pointer transition-all ${
                          r.status === OperationStatus.DONE ? 'bg-emerald-50 text-emerald-600 border-emerald-100 focus:border-emerald-300' :
                          r.status === OperationStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600 border-blue-100 focus:border-blue-300' :
                          'bg-rose-50 text-rose-600 border-rose-100 focus:border-rose-300'
                        }`}
                      >
                        <option value={OperationStatus.DONE}>تمت (وصلت)</option>
                        <option value={OperationStatus.IN_PROGRESS}>جاري التنفيذ</option>
                        <option value={OperationStatus.STOPPED}>متوقفة / عطل</option>
                      </select>
                    ) : (
                      <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-2 ${
                        r.status === OperationStatus.DONE ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        r.status === OperationStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          r.status === OperationStatus.DONE ? 'bg-emerald-500' :
                          r.status === OperationStatus.IN_PROGRESS ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'
                        }`}></span>
                        {r.status}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="p-6">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit?.(r)} className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center shadow-sm"><i className="fas fa-edit text-xs"></i></button>
                        <button onClick={() => onDelete?.(r.autoId, r.goodsType)} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm"><i className="fas fa-trash-alt text-xs"></i></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="p-24 text-center text-slate-300 italic font-bold">لا توجد سجلات تطابق البحث المختار</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecordsDashboard;
