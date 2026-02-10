
import React, { useMemo, useState } from 'react';
import { Release, TransportRecord, OperationStatus, FactoryBalance } from '../types';
import { transportService } from '../firebase';
import { ToastType } from './Toast';

interface Props {
  releases: Release[];
  records: TransportRecord[];
  factoryBalances: FactoryBalance[];
  onNotify: (message: string, type: ToastType) => void;
  canEdit: boolean;
  lang: string;
  selectedMaterial: 'soy' | 'maize' | null;
}

const FactoryBalanceView: React.FC<Props> = ({ releases, records, factoryBalances, onNotify, canEdit, lang, selectedMaterial }) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempBalance, setTempBalance] = useState<Partial<FactoryBalance>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const activeMaterialName = selectedMaterial === 'soy' ? 'صويا' : 'ذرة';
  
  // تاريخ يوم أمس للمقارنة (الوارد للمصنع)
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const normalize = (s: string) => String(s || '').trim().replace(/\s+/g, ' ').replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه');

  const data = useMemo(() => {
    const summary: Record<string, any> = {};
    const allSites = new Set<string>();
    
    releases.forEach(r => allSites.add(normalize(r.siteName)));
    records.forEach(r => allSites.add(normalize(r.unloadingSite)));
    factoryBalances.forEach(f => allSites.add(normalize(f.siteName)));

    allSites.forEach(siteNorm => {
      if (!siteNorm) return;
      
      const originalName = releases.find(r => normalize(r.siteName) === siteNorm)?.siteName || 
                           records.find(r => normalize(r.unloadingSite) === siteNorm)?.unloadingSite || 
                           factoryBalances.find(f => normalize(f.siteName) === siteNorm)?.siteName || siteNorm;

      const key = `${siteNorm}||${activeMaterialName}`;
      const manual = factoryBalances.find(fb => 
        normalize(fb.siteName) === siteNorm && String(fb.goodsType || '').includes(activeMaterialName)
      );

      const totalReleased = releases
        .filter(r => normalize(r.siteName) === siteNorm && String(r.goodsType || '').includes(activeMaterialName))
        .reduce((sum, r) => sum + Number(r.totalQuantity || 0), 0);

      const totalArrivedCumulative = records
        .filter(r => normalize(r.unloadingSite) === siteNorm && String(r.goodsType || '').includes(activeMaterialName) && r.status === OperationStatus.DONE)
        .reduce((sum, r) => sum + Number(r.weight || 0), 0);

      const inTransit = records
        .filter(r => normalize(r.unloadingSite) === siteNorm && String(r.goodsType || '').includes(activeMaterialName) && r.status === OperationStatus.IN_PROGRESS)
        .reduce((sum, r) => sum + Number(r.weight || 0), 0);

      const stopped = records
        .filter(r => normalize(r.unloadingSite) === siteNorm && String(r.goodsType || '').includes(activeMaterialName) && r.status === OperationStatus.STOPPED)
        .reduce((sum, r) => sum + Number(r.weight || 0), 0);

      const yesterdayArrived = records
        .filter(r => normalize(r.unloadingSite) === siteNorm && 
                     String(r.goodsType || '').includes(activeMaterialName) && 
                     r.status === OperationStatus.DONE &&
                     String(r.date || '').split('T')[0] === yesterdayStr)
        .reduce((sum, r) => sum + Number(r.weight || 0), 0);

      const opening = manual?.openingBalance || 0;
      const spending = manual?.manualConsumption || 0;

      // حساب المتبقي بالميناء (قد يكون سالباً في حال تجاوز التحميل للإفراج)
      const portRemaining = totalReleased - totalArrivedCumulative - inTransit - stopped;

      // رصيد المصنع الحالي = رصيد بداية المدة + الوارد - الصرف
      const currentStock = (opening + yesterdayArrived) - spending;

      if (totalReleased > 0 || opening > 0 || totalArrivedCumulative > 0 || inTransit > 0 || Math.abs(currentStock) > 0.001) {
        summary[key] = {
          site: originalName,
          siteNorm,
          material: activeMaterialName,
          opening,
          spending,
          totalReleased,
          totalArrivedCumulative,
          yesterdayArrived,
          inTransit,
          portRemaining,
          currentStock
        };
      }
    });

    return Object.values(summary).sort((a, b) => a.site.localeCompare(b.site));
  }, [releases, records, factoryBalances, activeMaterialName, yesterdayStr]);

  const handleEdit = (item: any) => {
    if (!canEdit) return;
    setEditingKey(`${item.siteNorm}||${item.material}`);
    setTempBalance({
      siteName: item.site,
      goodsType: item.material,
      openingBalance: item.opening,
      manualConsumption: item.spending
    });
  };

  const handleSave = async () => {
    if (!tempBalance.siteName) return;
    setIsUpdating(true);
    try {
      await transportService.updateFactoryBalance(tempBalance as FactoryBalance);
      onNotify('تم تحديث البيانات بنجاح', 'success');
      setEditingKey(null);
    } catch (e) {
      onNotify('خطأ في الاتصال بالسيرفر', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 w-full overflow-hidden text-right font-['Cairo'] pb-20">
      <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-6 mb-8 px-4 no-print">
        <div className="flex flex-row-reverse items-center gap-5">
            <div className="w-12 h-12 bg-[#d97706] rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-industry text-xl"></i>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-800">رصيد المصانع والإفراجات - {activeMaterialName}</h2>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5 tracking-widest uppercase">تقرير الأرصدة والتحميلات اليومية</p>
            </div>
        </div>
        <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-black text-xs hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all">
            <i className="fas fa-print"></i> طباعة التقرير (A4 Landscape)
        </button>
      </div>

      <div className="bg-white rounded-[35px] shadow-2xl border border-slate-100 overflow-hidden mb-12 mx-2 print-shadow-none">
        <div className="bg-[#d97706] p-5 text-white flex justify-between items-center px-8">
           <div className="flex flex-row-reverse items-center gap-2">
              <span className="text-[10px] bg-black/10 px-2 py-0.5 rounded-md font-black no-print">{data.length} مواقع</span>
              <h3 className="font-black text-xl">بيان أرصدة وموقف تحميل {activeMaterialName}</h3>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b">
                <th className="p-5 text-slate-800 font-black border">الموقع</th>
                <th className="p-5 text-slate-500 font-bold border">رصيد البداية</th>
                <th className="p-5 text-amber-600 font-bold border no-print">إجمالي الإفراجات</th>
                <th className="p-5 text-slate-400 font-bold border no-print">المنفذ (المحمل)</th>
                <th className="p-5 text-blue-500 font-bold border">في الطريق (مؤكد وصول)</th>
                <th className="p-5 text-indigo-700 font-bold border">بالميناء (متبقي)</th>
                <th className="p-5 text-emerald-600 font-bold border">الوارد للمصنع</th>
                <th className="p-5 text-rose-500 font-bold border no-print">الصرف (يدوي)</th>
                <th className="p-5 text-slate-900 font-black text-base border">رصيد المصنع الحالي</th>
                {canEdit && <th className="p-5 text-slate-400 font-bold border no-print">إجراء</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {data.map((item, idx) => {
                const isEditing = editingKey === `${item.siteNorm}||${item.material}`;
                const isNegativePort = item.portRemaining < -0.001;
                const isNegativeStock = item.currentStock < -0.001;
                
                return (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-all group">
                    <td className="p-5 font-black text-slate-900 text-base border">{item.site}</td>
                    
                    <td className="p-5 border">
                      {isEditing ? (
                        <input type="number" step="0.001" value={tempBalance.openingBalance} onChange={e => setTempBalance({...tempBalance, openingBalance: Number(e.target.value)})} className="w-24 p-2 rounded-lg border-2 border-amber-200 text-center font-black outline-none" />
                      ) : <span className="text-slate-500 font-bold">{item.opening.toLocaleString(undefined, {minimumFractionDigits: 3})}</span>}
                    </td>

                    <td className="p-5 font-bold text-[#d97706] border no-print">{item.totalReleased.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="p-5 font-bold text-slate-700 border no-print">{item.totalArrivedCumulative.toLocaleString(undefined, {minimumFractionDigits: 3})}</td>
                    
                    <td className="p-5 font-bold text-blue-500 border">{item.inTransit.toLocaleString(undefined, {minimumFractionDigits: 3})}</td>
                    
                    <td className={`p-5 font-bold border transition-colors ${isNegativePort ? 'text-rose-600' : 'text-indigo-700'}`}>
                        {item.portRemaining.toLocaleString(undefined, {minimumFractionDigits: 3})}
                    </td>
                    
                    <td className="p-5 font-bold text-emerald-600 border">
                        {item.yesterdayArrived.toLocaleString(undefined, {minimumFractionDigits: 3})}
                    </td>

                    <td className="p-5 border no-print">
                      {isEditing ? (
                        <input type="number" step="0.001" value={tempBalance.manualConsumption} onChange={e => setTempBalance({...tempBalance, manualConsumption: Number(e.target.value)})} className="w-24 p-2 rounded-lg border-2 border-amber-200 text-center font-black outline-none" />
                      ) : <span className="text-rose-500 font-bold">{item.spending.toLocaleString(undefined, {minimumFractionDigits: 3})}</span>}
                    </td>

                    <td className={`p-5 font-black text-lg border transition-colors ${isNegativeStock ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.currentStock.toLocaleString(undefined, {minimumFractionDigits: 3})}
                    </td>

                    {canEdit && (
                      <td className="p-5 border no-print">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <button onClick={handleSave} className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center"><i className="fas fa-check"></i></button>
                            <button onClick={() => setEditingKey(null)} className="w-8 h-8 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center"><i className="fas fa-times"></i></button>
                          </div>
                        ) : (
                          <button onClick={() => handleEdit(item)} className="w-8 h-8 text-indigo-600 bg-indigo-50 rounded-lg flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                              <i className="fas fa-edit text-xs"></i>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FactoryBalanceView;
