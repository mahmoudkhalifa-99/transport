
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { transportService } from '../firebase';
import { MasterData, AppUser, UserRole } from '../types';
import { ToastType } from './Toast';
import { Language, translations } from '../utils/translations';

interface Props {
  currentData: MasterData;
  onLocalUpdate?: (newData: MasterData) => void;
  onRefresh?: () => void;
  onNotify?: (message: string, type: ToastType) => void;
  lang: Language;
  setLang: (l: Language) => void;
  zoom: number;
  setZoom: (z: number) => void;
  fontSizes: Record<string, number>;
  setFontSizes: (fs: any) => void;
  activeTab: string;
}

const MasterDataUpload: React.FC<Props> = ({ 
  currentData, onLocalUpdate, onRefresh, onNotify, lang, setLang, zoom, setZoom, fontSizes, setFontSizes, activeTab 
}) => {
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemValue, setNewItemValue] = useState('');
  
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState<AppUser>({ name: '', pin: '', role: 'viewer', allowedMaterials: 'الكل' });

  const [draftData, setDraftData] = useState<MasterData>(currentData);
  const [hasChanges, setHasChanges] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    if (!hasChanges) {
      setDraftData(currentData);
    }
  }, [currentData, hasChanges]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        const extractStrings = (keys: string[]) => Array.from(new Set(data.map(item => {
          for(let k of keys) if(item[k]) return String(item[k]).trim();
          return null;
        }).filter(Boolean))) as string[];
        const extractedUsers: AppUser[] = data.map(item => {
          const name = item['الاسم'] || item['Name'];
          const pin = item['PIN'] || item['pin'];
          if (!name || !pin) return null;
          return {
            name: String(name).trim(),
            pin: String(pin).trim(),
            role: (String(item['الصلاحية'] || item['role'] || 'viewer')).toLowerCase() as UserRole,
            allowedMaterials: item['الأصناف المسموحة'] || item['allowedMaterials'] || 'الكل'
          };
        }).filter(Boolean) as AppUser[];
        const newData: MasterData = {
          drivers: Array.from(new Set([...(draftData.drivers || []), ...extractStrings(['السائق', 'Driver'])])),
          cars: Array.from(new Set([...(draftData.cars || []), ...extractStrings(['السيارة', 'Car'])])),
          loadingSites: Array.from(new Set([...(draftData.loadingSites || []), ...extractStrings(['التحميل', 'Loading'])])),
          unloadingSites: Array.from(new Set([...(draftData.unloadingSites || []), ...extractStrings(['التفريغ', 'Unloading'])])),
          goodsTypes: Array.from(new Set([...(draftData.goodsTypes || []), ...extractStrings(['البضاعة', 'Goods'])])),
          orderNumbers: Array.from(new Set([...(draftData.orderNumbers || []), ...extractStrings(['أمر التوريد', 'Order'])])),
          contractors: Array.from(new Set([...(draftData.contractors || []), ...extractStrings(['المقاول', 'Contractor'])])),
          users: extractedUsers.length > 0 ? [...(draftData.users || []), ...extractedUsers] : (draftData.users || []),
          items: draftData.items || []
        };
        setDraftData(newData);
        setHasChanges(true);
        onNotify?.(lang === 'ar' ? 'تم دمج البيانات بنجاح' : 'Data merged successfully', 'info');
      } catch (err) {
        onNotify?.('Error loading file', 'error');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const removeItem = (category: keyof MasterData, itemToRemove: string) => {
    const list = draftData[category] as string[] || [];
    setDraftData({ ...draftData, [category]: list.filter(item => item !== itemToRemove) });
    setHasChanges(true);
  };

  const removeUser = (pin: string) => {
    setDraftData({ ...draftData, users: (draftData.users || []).filter(u => u.pin !== pin) });
    setHasChanges(true);
  };

  const handleManualAdd = (category: keyof MasterData) => {
    const val = newItemValue.trim();
    if (!val) return;
    const vals = val.split(/[,،]/).map(v => v.trim()).filter(Boolean);
    const list = draftData[category] as string[] || [];
    setDraftData({ ...draftData, [category]: Array.from(new Set([...list, ...vals])) });
    setNewItemValue('');
    setAddingTo(null);
    setHasChanges(true);
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.pin) {
        onNotify?.(lang === 'ar' ? 'يرجى إكمال بيانات المستخدم' : 'Please complete user data', 'warning');
        return;
    }
    const users = draftData.users || [];
    if (users.some(u => u.pin === String(newUser.pin).trim())) {
      onNotify?.(lang === 'ar' ? 'هذا الكود السري مسجل لمستخدم آخر' : 'This PIN is already in use', 'error');
      return;
    }
    setDraftData({ ...draftData, users: [...users, { ...newUser, pin: String(newUser.pin).trim() }] });
    setNewUser({ name: '', pin: '', role: 'viewer', allowedMaterials: 'الكل' });
    setShowUserForm(false);
    setHasChanges(true);
  };

  const saveAllChanges = async () => {
    setLoading(true);
    try {
      await transportService.saveMasterData(draftData);
      if (onLocalUpdate) onLocalUpdate(draftData);
      setHasChanges(false);
      if (onRefresh) onRefresh();
      onNotify?.(lang === 'ar' ? 'تم حفظ البيانات والمستخدمين بنجاح' : 'Users and data saved successfully', 'success');
    } catch (e) {
      onNotify?.('Error saving', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateViewFontSize = (view: string, delta: number) => {
    setFontSizes((prev: any) => ({
      ...prev,
      [view]: Math.min(24, Math.max(10, prev[view] + delta))
    }));
  };

  const applyFontSizeToAll = () => {
    const currentSize = fontSizes[activeTab] || 16;
    const newSizes: any = {};
    Object.keys(fontSizes).forEach(key => {
      newSizes[key] = currentSize;
    });
    setFontSizes(newSizes);
    onNotify?.(lang === 'ar' ? 'تم تعميم حجم الخط على كافة الأقسام' : 'Font size applied to all tabs', 'info');
  };

  const categories = useMemo(() => [
    { key: 'drivers' as keyof MasterData, label: t.drivers, count: draftData.drivers?.length || 0, icon: 'fa-user' },
    { key: 'cars' as keyof MasterData, label: t.cars, count: draftData.cars?.length || 0, icon: 'fa-car' },
    { key: 'contractors' as keyof MasterData, label: t.contractors, count: draftData.contractors?.length || 0, icon: 'fa-handshake' },
    { key: 'orderNumbers' as keyof MasterData, label: t.orders, count: draftData.orderNumbers?.length || 0, icon: 'fa-file-invoice' },
    { key: 'loadingSites' as keyof MasterData, label: t.loadingSites, count: draftData.loadingSites?.length || 0, icon: 'fa-map-pin' },
    { key: 'unloadingSites' as keyof MasterData, label: t.unloadingSites, count: draftData.unloadingSites?.length || 0, icon: 'fa-warehouse' },
    { key: 'goodsTypes' as keyof MasterData, label: t.goodsTypes, count: draftData.goodsTypes?.length || 0, icon: 'fa-box' },
  ], [draftData, t]);

  const viewNames = [
    { id: 'home', label: t.home },
    { id: 'dashboard', label: t.records },
    { id: 'add', label: t.addRecord },
    { id: 'releases', label: t.releases },
    { id: 'reports', label: t.reports },
    { id: 'settings', label: t.settings },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 mb-10 text-right">
      
      {/* إدارة المستخدمين */}
      <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-gray-100">
        <div className="flex flex-row-reverse justify-between items-center mb-8 gap-4">
          <div className="flex flex-row-reverse items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><i className="fas fa-users-cog text-xl"></i></div>
            <div className="text-right"><h3 className="text-xl font-black text-gray-800">إدارة مستخدمي المنصة</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">تحكم في صلاحيات الوصول والأقسام</p></div>
          </div>
          <button onClick={() => setShowUserForm(!showUserForm)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
            <i className={`fas ${showUserForm ? 'fa-times' : 'fa-user-plus'}`}></i> {showUserForm ? 'إلغاء' : 'إضافة مستخدم'}
          </button>
        </div>

        {showUserForm && (
            <div className="mb-10 p-6 bg-slate-50 rounded-[30px] border border-indigo-100 animate-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 px-2 uppercase">الاسم</label><input type="text" placeholder="الاسم" className="w-full p-3 rounded-xl border-none shadow-sm font-bold text-sm" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 px-2 uppercase">PIN</label><input type="text" placeholder="••••" className="w-full p-3 rounded-xl border-none shadow-sm font-mono font-bold text-sm text-center tracking-[0.5em]" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} /></div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 px-2 uppercase">الصلاحية</label>
                        <select className="w-full p-3 rounded-xl border-none shadow-sm font-bold text-sm outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                            <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 px-2 uppercase">الصنف</label>
                        <select className="w-full p-3 rounded-xl border-none shadow-sm font-bold text-sm outline-none" value={newUser.allowedMaterials} onChange={e => setNewUser({...newUser, allowedMaterials: e.target.value})}>
                            <option value="الكل">الكل</option><option value="صويا">صويا</option><option value="ذرة">ذرة</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end"><button onClick={handleAddUser} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black text-xs shadow-md hover:bg-emerald-700 transition-all">تأكيد الإضافة</button></div>
            </div>
        )}

        <div className="overflow-x-auto bg-white rounded-[30px] border border-gray-50">
            <table className="w-full text-center">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-gray-400">
                    <tr><th className="p-4">الاسم</th><th className="p-4">PIN</th><th className="p-4">الصلاحية</th><th className="p-4">الأصناف</th><th className="p-4">إجراء</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {(draftData.users || []).map((user, i) => (
                        <tr key={i} className="hover:bg-indigo-50/20 transition-colors">
                            <td className="p-4 font-black text-gray-700 text-sm">{user.name}</td>
                            <td className="p-4 font-mono font-bold text-indigo-600 text-sm">{user.pin}</td>
                            <td className="p-4"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${user.role === 'admin' ? 'bg-red-50 text-red-600' : user.role === 'editor' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{user.role}</span></td>
                            <td className="p-4 font-bold text-xs text-gray-500">{user.allowedMaterials}</td>
                            <td className="p-4"><button onClick={() => removeUser(user.pin)} className="text-red-300 hover:text-red-500"><i className="fas fa-trash-alt text-xs"></i></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Interface Preferences */}
      <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-gray-100">
        <div className="flex flex-row-reverse items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><i className="fas fa-desktop text-xl"></i></div>
          <div className="text-right"><h3 className="text-xl font-black text-gray-800">{t.interfacePrefs}</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">تخصيص الواجهة</p></div>
        </div>

        <div className="mb-8 p-6 bg-indigo-900 rounded-[30px] shadow-xl text-white flex flex-col md:flex-row-reverse items-center justify-between gap-4">
           <div className="flex flex-row-reverse items-center gap-4"><div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-amber-400"><i className="fas fa-font"></i></div><p className="text-sm font-black">{t.quickFontSize} (للإعدادات)</p></div>
           <div className="flex items-center gap-4 bg-white/10 p-2 rounded-2xl">
              <button onClick={() => updateViewFontSize('settings', -1)} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex items-center justify-center"><i className="fas fa-minus text-xs"></i></button>
              <span className="text-2xl font-black w-12 text-center">{fontSizes['settings'] || 14}</span>
              <button onClick={() => updateViewFontSize('settings', 1)} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex items-center justify-center"><i className="fas fa-plus text-xs"></i></button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-500 flex flex-row-reverse items-center gap-2"><i className="fas fa-globe text-indigo-400"></i> {t.language}</label>
              <div className="flex p-1 bg-gray-100 rounded-2xl">
                <button onClick={() => setLang('ar')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${lang === 'ar' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400'}`}>العربية</button>
                <button onClick={() => setLang('en')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${lang === 'en' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400'}`}>English</button>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-500 flex flex-row-reverse items-center gap-2"><i className="fas fa-expand text-indigo-400"></i> {t.zoom}</label>
              <div className="flex items-center gap-4 p-2 bg-gray-50 rounded-2xl">
                <button onClick={() => setZoom(Math.max(80, zoom - 5))} className="w-10 h-10 bg-white rounded-xl shadow-sm text-gray-400 hover:text-indigo-600 transition-colors"><i className="fas fa-minus text-xs"></i></button>
                <div className="flex-1 text-center font-black text-indigo-600">{zoom}%</div>
                <button onClick={() => setZoom(Math.min(120, zoom + 5))} className="w-10 h-10 bg-white rounded-xl shadow-sm text-gray-400 hover:text-indigo-600 transition-colors"><i className="fas fa-plus text-xs"></i></button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
             <div className="flex flex-row-reverse justify-between items-center mb-2"><label className="text-xs font-black text-gray-500 flex items-center gap-2"><i className="fas fa-font text-indigo-400"></i> {t.perPageFontSize}</label><button onClick={applyFontSizeToAll} className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"> {t.applyToAll}</button></div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-3xl max-h-[250px] overflow-y-auto no-scrollbar border border-gray-100">
                {viewNames.map(view => (
                  <div key={view.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex flex-row-reverse items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-600">{view.label}</span>
                    <div className="flex items-center gap-3">
                       <button onClick={() => updateViewFontSize(view.id, -1)} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><i className="fas fa-minus text-[8px]"></i></button>
                       <span className="text-xs font-black text-indigo-600 w-5 text-center">{fontSizes[view.id] || 16}</span>
                       <button onClick={() => updateViewFontSize(view.id, 1)} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:bg-green-50 hover:text-green-500 transition-colors"><i className="fas fa-plus text-[8px]"></i></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Master Data */}
      <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-gray-100">
        <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex flex-row-reverse items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><i className="fas fa-cog text-xl"></i></div>
            <div className="text-right"><h3 className="text-xl font-black text-gray-800">{t.masterDataTitle}</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.masterDataSub}</p></div>
          </div>
          {hasChanges && (
            <button onClick={saveAllChanges} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-2xl font-black shadow-xl animate-bounce flex items-center gap-3 transition-all">
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} {t.saveFinal}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="border-2 border-dashed border-gray-100 rounded-[32px] p-10 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-all bg-gray-50/30 group">
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" id="master-upload"/>
            <label htmlFor="master-upload" className="cursor-pointer w-full">
              <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center mb-4 shadow-sm mx-auto group-hover:scale-110 transition-transform"><i className="fas fa-file-excel text-2xl text-green-500"></i></div>
              <p className="text-sm font-black text-gray-700">{t.uploadExcel}</p>
            </label>
          </div>
          <div className="max-h-[500px] overflow-y-auto pr-2 no-scrollbar space-y-3">
            {categories.map((cat) => (
              <div key={cat.key} className="relative">
                <div className="flex gap-2">
                  <button onClick={() => setActiveDropdown(activeDropdown === cat.key ? null : cat.key)} className={`flex-1 flex flex-row-reverse items-center justify-between p-4 rounded-2xl transition-all border ${activeDropdown === cat.key ? 'bg-indigo-900 text-white' : 'bg-white border-gray-100'}`}>
                    <div className="flex flex-row-reverse items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-500"><i className={`fas ${cat.icon} text-sm`}></i></div><div className="text-right"><p className="text-[9px] font-black uppercase text-gray-400">{cat.label}</p><p className="text-xs font-black">{cat.count} {t.items}</p></div></div>
                    <i className={`fas fa-chevron-right text-[10px] ${activeDropdown === cat.key ? 'rotate-90' : ''}`}></i>
                  </button>
                  <button onClick={() => setAddingTo(addingTo === cat.key ? null : cat.key)} className="w-12 rounded-2xl border bg-white flex items-center justify-center text-amber-500"><i className={`fas ${addingTo === cat.key ? 'fa-times' : 'fa-plus'}`}></i></button>
                </div>
                {addingTo === cat.key && (
                  <div className="mt-2 bg-amber-50 p-3 rounded-2xl flex flex-row-reverse gap-2 z-10 relative">
                    <input autoFocus type="text" placeholder={t.name} className="flex-1 p-3 rounded-xl text-xs font-bold border outline-none text-right" value={newItemValue} onChange={(e) => setNewItemValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualAdd(cat.key)}/>
                    <button onClick={() => handleManualAdd(cat.key)} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black">{t.add}</button>
                  </div>
                )}
                {activeDropdown === cat.key && (
                  <div className="mt-2 bg-white border rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-20 relative divide-y divide-gray-50">
                    {(draftData[cat.key] as string[] || []).map((item, idx) => (
                      <div key={idx} className="flex flex-row-reverse items-center justify-between p-3 hover:bg-gray-50">
                        <span className="text-xs font-bold text-gray-700">{item}</span>
                        <button onClick={() => removeItem(cat.key, item)} className="text-red-300 hover:text-red-500"><i className="fas fa-times text-[10px]"></i></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDataUpload;
