
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

  // تحديد المادة المطلوبة بناءً على القسم المختار
  const activeMaterialName = selectedMaterial === 'soy' ? 'صويا' : 'ذرة';

  const data = useMemo(() => {
    const summary: Record<string, any> = {};

    // استخراج المواقع المرتبطة فقط بالقسم الحالي
    const allSites = new Set<string>();
    releases.forEach(r => allSites.add(String(r.siteName).trim()));
    records.forEach(r => allSites.add(String(r.unloadingSite).trim()));

    allSites.forEach(site => {
      // معالجة المادة النشطة فقط في هذا القسم
      const material = activeMaterialName;
      const key = `${site}||${material}`;
      
      const manual = factoryBalances.find(fb => 
        fb.siteName === site && String(fb.goodsType).includes(material)
      );

      const totalReleased = releases
        .filter(r => String(r.siteName).trim() === site && String(r.goodsType).includes(material))
        .reduce((sum, r) => sum + Number(r.totalQuantity || 0), 0);

      const totalArrived = records
        .filter(r => String(r.unloadingSite).trim() === site && String(r.goodsType).includes(material) && r.status === OperationStatus.DONE)
        .reduce((sum, r) => sum + Number(r.weight || 0), 0);

      const inTransit = records
        .filter(r => String(r.unloadingSite).trim() === site && String(r.goodsType).includes(material) && r.status === OperationStatus.IN_PROGRESS)
        .reduce((sum, r) => sum + Number(r.weight || 0), 0);

      const opening = manual?.openingBalance || 0;
      const spending = manual?.manualConsumption || 0;

      const releaseRemaining = totalReleased - totalArrived - inTransit;
      const factoryStock = opening + totalArrived - spending;

      // لا تظهر المواقع التي ليس لها أي بيانات (إفراج أو رصيد أو حركة)
      if (totalReleased > 0 || opening > 0 || totalArrived > 0 || inTransit > 0) {
        summary[key] = {
          site,
          material,
          opening,
          spending,
          totalReleased,
          totalArrived,
          inTransit,
          releaseRemaining,
          factoryStock
        };
      }
    });

    return Object.values(summary);
  }, [releases, records, factoryBalances, activeMaterialName]);

  const handleEdit = (item: any) => {
    if (!canEdit) return;
    setEditingKey(`${item.site}||${item.material}`);
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
      onNotify('تم تحديث الرصيد بنجاح', 'success');
      setEditingKey(null);
    } catch (e) {
      onNotify('فشل في التحديث', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const TableSection = ({ title, items, colorClass }: { title: string, items: any[], colorClass: string }) => (
    <div className="bg-white rounded-[30px] md:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden mb-8 md:mb-10 w-full">
      <div className={`p-4 md:p-6 border-b flex justify-between items-center ${colorClass} text-white`}>
        <h3 className="font-black text-lg md:text-xl">{title}</h3>
        <span className="text-[9px] md:text-[10px] font-bold opacity-80 uppercase tracking-widest">{items.length} مواقع</span>
      </div>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-center border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
              <th className="p-4 md:p-5">الموقع</th>
              <th className="p-4 md:p-5">رصيد البداية</th>
              <th className="p-4 md:p-5">إجمالي الإفراجات</th>
              <th className="p-4 md:p-5">تم تحميله (المنفذ)</th>
              <th className="p-4 md:p-5">في الطريق (الجاري)</th>
              <th className="p-4 md:p-5">متبقي الإفراج (بالميناء)</th>
              <th className="p-4 md:p-5">الوارد للمصنع</th>
              <th className="p-4 md:p-5">الصرف (يدوي)</th>
              <th className="p-4 md:p-5">رصيد المصنع الحالي</th>
              {canEdit && <th className="p-4 md:p-5">إجراء</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {items.map((item, idx) => {
              const isEditing = editingKey === `${item.site}||${item.material}`;
              return (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 md:p-5 font-black text-slate-800 bg-slate-50/20">{item.site}</td>
                  <td className="p-4 md:p-5 font-bold">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={tempBalance.openingBalance} 
                        onChange={e => setTempBalance({...tempBalance, openingBalance: Number(e.target.value)})}
                        className="w-20 p-2 rounded-lg border border-indigo-200 text-center font-black outline-none"
                      />
                    ) : (
                      <span className="text-slate-400">{item.opening.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="p-4 md:p-5 font-bold text-amber-600">
                    {item.totalReleased.toLocaleString()}
                  </td>
                  <td className="p-4 md:p-5 font-bold text-slate-600">
                    {item.totalArrived.toLocaleString()}
                  </td>
                  <td className="p-4 md:p-5 font-black text-blue-500 bg-blue-50/20">
                    {item.inTransit.toLocaleString()}
                  </td>
                  <td className="p-4 md:p-5 font-black text-indigo-600 bg-indigo-50/10">
                    {item.releaseRemaining.toLocaleString()}
                  </td>
                  <td className="p-4 md:p-5 font-bold text-emerald-600">
                    {item.totalArrived.toLocaleString()}
                  </td>
                  <td className="p-4 md:p-5 font-bold">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={tempBalance.manualConsumption} 
                        onChange={e => setTempBalance({...tempBalance, manualConsumption: Number(e.target.value)})}
                        className="w-20 p-2 rounded-lg border border-indigo-200 text-center font-black outline-none"
                      />
                    ) : (
                      <span className="text-rose-500">{item.spending.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="p-4 md:p-5 font-black text-slate-900 bg-slate-100/30">
                    {item.factoryStock.toLocaleString()}
                  </td>
                  {canEdit && (
                    <td className="p-4 md:p-5">
                      {isEditing ? (
                        <div className="flex gap-2 justify-center">
                           <button disabled={isUpdating} onClick={handleSave} className="bg-emerald-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-sm hover:bg-emerald-700 transition-all"><i className="fas fa-check text-xs"></i></button>
                           <button onClick={() => setEditingKey(null)} className="bg-slate-100 text-slate-400 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm hover:bg-slate-200 transition-all"><i className="fas fa-times text-xs"></i></button>
                        </div>
                      ) : (
                        <button onClick={() => handleEdit(item)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                          <i className="fas fa-edit"></i>
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
  );

  return (
    <div className="animate-in fade-in duration-700 w-full overflow-hidden">
      <div className="flex flex-row-reverse items-center gap-4 mb-8">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 ${selectedMaterial === 'soy' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
          <i className="fas fa-industry text-xl"></i>
        </div>
        <div className="text-right">
          <h2 className="text-xl md:text-2xl font-black text-slate-800">رصيد المصانع والإفراجات - قسم {activeMaterialName}</h2>
          <div className="space-y-1 mt-1">
            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                <span className="text-indigo-600 ml-2">متبقي الإفراج = إجمالي الإفراج - تم تحميله - في الطريق</span>
                <span className="hidden md:inline">|</span>
                <span className="text-emerald-600 mr-2 block md:inline">رصيد المصنع = بداية المده + المنفذ - الصرف</span>
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <TableSection 
          title={`تقرير أرصدة ${activeMaterialName}`} 
          items={data} 
          colorClass={selectedMaterial === 'soy' ? 'bg-emerald-600' : 'bg-amber-600'} 
        />
      </div>
    </div>
  );
};

export default FactoryBalanceView;
