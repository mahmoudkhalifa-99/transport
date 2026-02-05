
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { OperationStatus, TransportRecord, MasterData, Release } from '../types';
import AutocompleteInput, { SuggestionItem } from './AutocompleteInput';
import { ToastType } from './Toast';
import { Language } from '../utils/translations';

const formatCarPlate = (val: string) => {
  const clean = val.replace(/\s+/g, '');
  let formatted = '';
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const next = clean[i + 1];
    const isLetter = /[a-zA-Z\u0600-\u06FF]/.test(char);
    const isDigit = /[0-9]/.test(char);
    formatted += char;
    if (next) {
      const nextIsLetter = /[a-zA-Z\u0600-\u06FF]/.test(next);
      if (isLetter) formatted += ' ';
      else if (isDigit && nextIsLetter) formatted += ' ';
    }
  }
  return formatted;
};

interface Props {
  existingData: TransportRecord[];
  masterData: MasterData;
  releases: Release[];
  editRecord?: TransportRecord | null;
  onOptimisticAdd?: (record: TransportRecord) => void;
  onOptimisticUpdate?: (record: TransportRecord) => void;
  onRefresh?: () => void;
  onNotify?: (message: string, type: ToastType) => void;
  onCancel?: () => void;
  t: any;
  lang: Language;
}

const SoyTransportForm: React.FC<Props> = ({ existingData = [], masterData, releases = [], editRecord, onOptimisticAdd, onOptimisticUpdate, onNotify, onCancel, t }) => {
  const initialFormState: Partial<TransportRecord> = {
    date: new Date().toISOString().split('T')[0],
    departureTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    status: OperationStatus.IN_PROGRESS,
    weight: 0,
    carNumber: '',
    driverName: '',
    driverPhone: '',
    goodsType: 'صويا',
    orderNo: '',
    contractorName: '',
    waybillNo: '',
    unloadingSite: '',
    notes: ''
  };

  const [formData, setFormData] = useState<Partial<TransportRecord>>(initialFormState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editRecord) setFormData(editRecord);
    else setFormData(initialFormState);
  }, [editRecord]);

  const availableBalance = useMemo(() => {
    if (!formData.unloadingSite || !formData.orderNo) return null;
    const relevantReleases = releases.filter(rel => 
      String(rel.siteName || '').trim() === String(formData.unloadingSite).trim() &&
      String(rel.orderNo || '').trim() === String(formData.orderNo).trim()
    );
    if (relevantReleases.length === 0) return 0;
    const totalReleased = relevantReleases.reduce((sum, r) => sum + Number(r.totalQuantity || 0), 0);
    const totalConsumed = (existingData || []).filter(r => 
      String(r.unloadingSite || '').trim() === String(formData.unloadingSite).trim() &&
      String(r.orderNo || '').trim() === String(formData.orderNo).trim() &&
      r.autoId !== editRecord?.autoId
    ).reduce((sum, r) => sum + Number(r.weight || 0), 0);
    return Math.max(0, totalReleased - totalConsumed);
  }, [formData.unloadingSite, formData.orderNo, releases, existingData, editRecord]);

  const isWeightValid = availableBalance === null || formData.weight === 0 || (formData.weight || 0) <= (availableBalance + 0.1);

  const carSuggestions = useMemo(() => Array.from(new Set([...(masterData.cars || []), ...(existingData || []).map(r => r.carNumber)])), [existingData, masterData]);
  const driverSuggestions = useMemo(() => Array.from(new Set([...(masterData.drivers || []), ...(existingData || []).map(r => r.driverName)])), [existingData, masterData]);
  const contractorSuggestions = useMemo(() => Array.from(new Set([...(masterData.contractors || []), ...(existingData || []).map(r => r.contractorName || '')])), [existingData, masterData]);
  const unloadingSuggestions = useMemo(() => Array.from(new Set([...(masterData.unloadingSites || []), ...(existingData || []).map(r => r.unloadingSite)])), [existingData, masterData]);

  const orderSuggestions: SuggestionItem[] = useMemo(() => {
    if (!formData.unloadingSite) return [];
    const siteReleases = releases.filter(rel => String(rel.siteName || '').trim() === String(formData.unloadingSite).trim());
    
    const grouped: Record<string, { total: number, date: string }> = {};
    siteReleases.forEach(rel => {
      const o = String(rel.orderNo);
      if (!grouped[o]) grouped[o] = { total: 0, date: String(rel.date || '').split('T')[0] };
      grouped[o].total += Number(rel.totalQuantity || 0);
      if (new Date(rel.date) > new Date(grouped[o].date)) {
        grouped[o].date = String(rel.date || '').split('T')[0];
      }
    });

    return Object.keys(grouped).map(orderNo => ({
      value: orderNo,
      label: `أمر توريد: ${orderNo}`,
      subLabel: `الكمية المتاحة: ${grouped[orderNo].total.toLocaleString()} طن`
    }));
  }, [formData.unloadingSite, releases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWeightValid) { onNotify?.(t.insufficientBalance, 'error'); return; }
    setLoading(true);
    try {
      if (editRecord) {
        onOptimisticUpdate?.(formData as TransportRecord);
      } else {
        const autoId = `SOY-${Math.floor(1000 + Math.random() * 8999)}-${Date.now().toString().slice(-4)}`;
        const newRecord = { ...formData, autoId } as TransportRecord;
        onOptimisticAdd?.(newRecord);
      }
      setFormData(initialFormState);
      if (onCancel) onCancel();
    } catch (error) {
      onNotify?.('خطأ في المزامنة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = useCallback((e: any) => {
    const { name, value } = e.target;
    let finalValue: any = value;
    if (e.target.type === 'number') finalValue = Number(value);
    if (name === 'carNumber') finalValue = formatCarPlate(value);

    if (name === 'unloadingSite') {
        setFormData(prev => ({ ...prev, [name]: finalValue, orderNo: '' }));
    } else {
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="bg-white p-6 md:p-12 rounded-[40px] shadow-2xl border border-gray-100 relative overflow-hidden animate-in fade-in duration-700">
        <div className="flex flex-row-reverse justify-between items-center mb-12">
          <div className="text-right">
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{editRecord ? 'تعديل نقلة صويا' : 'تسجيل نقلة صويا جديدة'}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">تحديث فوري بالكاش</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8">
            <div className="flex flex-col gap-2"><label className="text-xs font-black text-slate-500 uppercase text-right">{t.date}</label><input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold outline-none" /></div>
            <div className="flex flex-col gap-2">
               <label className="text-xs font-black text-slate-500 uppercase text-right">حالة النقلة</label>
               <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold outline-none">
                  <option value={OperationStatus.IN_PROGRESS}>جاري التنفيذ</option>
                  <option value={OperationStatus.DONE}>تمت (وصلت)</option>
                  <option value={OperationStatus.STOPPED}>متوقفة / عطل</option>
               </select>
            </div>
            <AutocompleteInput label="رقم السيارة" name="carNumber" value={formData.carNumber || ''} onChange={handleChange} suggestions={carSuggestions} placeholder="أ ب ج 123" required />
            <AutocompleteInput label="السائق" name="driverName" value={formData.driverName || ''} onChange={handleChange} suggestions={driverSuggestions} placeholder="الاسم" required />
            <div className="flex flex-col gap-2"><label className="text-xs font-black text-slate-500 uppercase text-right">هاتف السائق</label><input required type="tel" name="driverPhone" value={formData.driverPhone} onChange={handleChange} placeholder="05xxxxxxxxx" className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold outline-none" /></div>
            
            <AutocompleteInput label="موقع التعتيق" name="unloadingSite" value={formData.unloadingSite || ''} onChange={handleChange} suggestions={unloadingSuggestions} placeholder="موقع التعتيق" required />
            <AutocompleteInput 
                label="رقم أمر التوريد" 
                name="orderNo" 
                value={formData.orderNo || ''} 
                onChange={handleChange} 
                suggestions={orderSuggestions} 
                placeholder={formData.unloadingSite ? "اختر التوريد" : "اختر الموقع أولاً"} 
                required 
            />

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                {availableBalance !== null && <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">المتاح: {availableBalance.toLocaleString()}</span>}
                <label className="text-xs font-black text-slate-500 uppercase text-right">الوزن الصافي (طن)</label>
              </div>
              <input required type="number" step="0.01" name="weight" value={formData.weight || ''} onChange={handleChange} className={`w-full p-5 rounded-2xl font-black outline-none border-2 transition-all ${!isWeightValid ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-transparent'}`} />
            </div>
            <AutocompleteInput label="مقاول النقل" name="contractorName" value={formData.contractorName || ''} onChange={handleChange} suggestions={contractorSuggestions} placeholder="مقاول النقل" required />
            <div className="flex flex-col gap-2"><label className="text-xs font-black text-slate-500 uppercase text-right">رقم البوليصة</label><input required type="text" name="waybillNo" value={formData.waybillNo} onChange={handleChange} className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold outline-none" /></div>
          </div>
          
          <div className="flex flex-col gap-2">
             <label className="text-xs font-black text-slate-500 uppercase text-right">ملاحظات</label>
             <textarea name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="ملاحظات..." className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold outline-none min-h-[100px] resize-none" />
          </div>

          <div className="flex flex-row-reverse justify-between items-center pt-12 border-t border-slate-50 no-print">
            <button disabled={loading || !isWeightValid} type="submit" className="px-12 md:px-32 py-5 rounded-[26px] font-black text-base shadow-2xl transition-all active:scale-95 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} {editRecord ? 'تعديل السجل' : 'اعتماد وحفظ فوري'}
            </button>
            <button type="button" onClick={onCancel} className="bg-slate-100 text-slate-500 px-12 py-5 rounded-[26px] font-black hover:bg-slate-200 transition-all">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SoyTransportForm;
