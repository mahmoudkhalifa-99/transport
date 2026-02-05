
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { transportService } from './firebase';
import { TransportRecord, MasterData, Release, AppUser, OperationStatus, FactoryBalance } from './types';
import TransportForm from './components/TransportForm';
import SoyTransportForm from './components/SoyTransportForm';
import SiteBalancesDashboard from './components/SiteBalancesDashboard';
import FactoryBalanceView from './components/FactoryBalanceView';
import ReleasesManager from './components/ReleasesManager';
import PeriodicReport from './components/PeriodicReport';
import MasterDataUpload from './components/MasterDataUpload';
import AIInsights from './components/AIInsights';
import RecordsDashboard from './components/RecordsDashboard';
import Toast, { ToastType } from './components/Toast';
import { translations, Language } from './utils/translations';

type ViewType = 'home' | 'summary' | 'dashboard' | 'factory_balance' | 'add' | 'releases' | 'reports' | 'ai' | 'settings';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('appUser');
      return (saved && saved !== 'null') ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  
  const [records, setRecords] = useState<TransportRecord[]>(() => {
    const saved = localStorage.getItem('records_cache');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [releases, setReleases] = useState<Release[]>(() => {
    const saved = localStorage.getItem('releases_cache');
    return saved ? JSON.parse(saved) : [];
  });

  const [factoryBalances, setFactoryBalances] = useState<FactoryBalance[]>(() => {
    const saved = localStorage.getItem('factoryBalances_cache');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [masterData, setMasterData] = useState<MasterData>(() => {
    const cached = localStorage.getItem('masterData_cache');
    const defaultData = { 
      drivers: [], cars: [], loadingSites: [], unloadingSites: [], 
      goodsTypes: [], orderNumbers: [], contractors: [], users: [], items: [] 
    };
    if (cached) {
      try { return { ...defaultData, ...JSON.parse(cached) }; } catch (e) { return defaultData; }
    }
    return defaultData;
  });
  
  const [activeTab, setActiveTab] = useState<ViewType>('home');
  const [selectedMaterial, setSelectedMaterial] = useState<'soy' | 'maize' | null>(null);
  const [lang, setLang] = useState<Language>('ar');
  const [pin, setPin] = useState('');
  const [editingRecord, setEditingRecord] = useState<TransportRecord | null>(null);
  
  const [zoom, setZoom] = useState(100);
  const [fontSizes, setFontSizes] = useState<Record<string, number>>({
    home: 16, summary: 16, dashboard: 14, factory_balance: 14, add: 16, releases: 14, reports: 14, ai: 15, settings: 14
  });

  const [connectionStatus, setConnectionStatus] = useState<'online' | 'syncing' | 'offline'>('online');
  const SYNC_INTERVAL_SEC = 5;
  const [syncCountdown, setSyncCountdown] = useState(SYNC_INTERVAL_SEC);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean; id: number }>({
    message: '', type: 'info', isVisible: false, id: 0
  });

  const hideToast = useCallback(() => { setToast(prev => ({ ...prev, isVisible: false })); }, []);
  const notify = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true, id: Date.now() });
  }, []);

  const t = translations[lang];
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setConnectionStatus('syncing');
    try {
      const data = await transportService.getAllData();
      if (data.transports) setRecords(data.transports);
      if (data.releases) setReleases(data.releases);
      if (data.factoryBalances) setFactoryBalances(data.factoryBalances);
      if (data.masterData) setMasterData(data.masterData);
      setConnectionStatus('online');
    } catch (e: any) { setConnectionStatus('offline'); } finally { 
      isFetchingRef.current = false;
      setIsInitialLoading(false);
      setSyncCountdown(SYNC_INTERVAL_SEC);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!currentUser) return;
    const timer = setInterval(() => {
      setSyncCountdown(prev => {
        if (prev <= 1) { fetchData(); return SYNC_INTERVAL_SEC; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentUser, fetchData]);

  useEffect(() => { (document.documentElement.style as any).zoom = `${zoom}%`; }, [zoom]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputPin = pin.trim();
    if (!inputPin) return;
    const users = masterData.users || [];
    const user = users.find(u => String(u.pin).trim() === inputPin);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('appUser', JSON.stringify(user));
      setPin('');
      if (user.allowedMaterials === 'صويا') setSelectedMaterial('soy');
      else if (user.allowedMaterials === 'ذرة') setSelectedMaterial('maize');
      notify(`مرحباً ${user.name}`, 'success');
    } else { notify('PIN غير صحيح', 'error'); }
  };

  const handleAddRecord = async (newRecord: TransportRecord) => {
    try {
      setRecords(prev => [newRecord, ...prev]);
      setActiveTab('dashboard');
      notify('تم تسجيل النقلة بنجاح وجاري المزامنة مع السيرفر...', 'success');
      await transportService.addRecord(newRecord);
      setConnectionStatus('online');
    } catch (err) {
      notify('فشل المزامنة مع السيرفر، تم الحفظ محلياً', 'warning');
      setConnectionStatus('offline');
    }
  };

  const handleUpdateRecord = async (updatedRecord: TransportRecord) => {
    try {
      setRecords(prev => prev.map(r => r.autoId === updatedRecord.autoId ? updatedRecord : r));
      setActiveTab('dashboard');
      notify('تم تحديث البيانات بنجاح', 'success');
      await transportService.updateRecord(updatedRecord);
      setConnectionStatus('online');
    } catch (err) {
      notify('فشل تحديث السيرفر', 'error');
      setConnectionStatus('offline');
    }
  };

  const handleStatusChange = async (record: TransportRecord, newStatus: OperationStatus) => {
    const updatedRecord = { ...record, status: newStatus };
    try {
      // تحديث محلي فوري
      setRecords(prev => prev.map(r => r.autoId === record.autoId ? updatedRecord : r));
      notify(`تم تغيير الحالة إلى: ${newStatus}`, 'info');
      // إرسال للسيرفر
      await transportService.updateRecord(updatedRecord);
      setConnectionStatus('online');
    } catch (err) {
      notify('فشل تحديث الحالة على السيرفر', 'error');
      setConnectionStatus('offline');
    }
  };

  const filteredRecords = useMemo(() => {
    if (!selectedMaterial) return [];
    const keyword = selectedMaterial === 'soy' ? 'صويا' : 'ذرة';
    return records.filter(r => String(r.goodsType).includes(keyword));
  }, [records, selectedMaterial]);

  const filteredReleases = useMemo(() => {
    if (!selectedMaterial) return [];
    const keyword = selectedMaterial === 'soy' ? 'صويا' : 'ذرة';
    return releases.filter(r => String(r.goodsType).includes(keyword));
  }, [releases, selectedMaterial]);

  const handleDeleteRecord = async (id: string, goodsType: string) => {
    if (window.confirm('هل تريد حذف هذا السجل نهائياً؟')) {
      try {
        setRecords(prev => prev.filter(r => r.autoId !== id));
        await transportService.deleteRecord(id, goodsType);
        notify('تم حذف السجل بنجاح', 'success');
      } catch (err) {
        notify('فشل في عملية الحذف على السيرفر', 'error');
      }
    }
  };

  const handleEditRecord = (record: TransportRecord) => {
    setEditingRecord(record);
    setActiveTab('add');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-['Cairo']">
        <Toast {...toast} onClose={hideToast} />
        <div className="w-full max-w-sm">
          <form onSubmit={handleLogin} className="bg-white p-12 rounded-[50px] border border-slate-200 text-center shadow-2xl shadow-slate-200/50 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-indigo-600 rounded-[28px] flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-indigo-500/20">
              <i className={`fas ${isInitialLoading ? 'fa-spinner fa-spin' : 'fa-shield-alt'} text-3xl`}></i>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">منصة النقل الذكي</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-8 tracking-widest">تأمين الوصول بالرمز السري</p>
            <input 
              type="password" 
              inputMode="numeric" 
              value={pin} 
              onChange={e => setPin(e.target.value)} 
              placeholder="••••" 
              className="w-full p-5 rounded-3xl bg-slate-50 text-slate-800 text-center text-4xl outline-none focus:ring-2 ring-indigo-500 mb-8 font-mono tracking-[0.4em] border border-slate-100" 
            />
            <button disabled={isInitialLoading} className="w-full bg-indigo-600 p-5 rounded-3xl text-white font-black text-lg hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  if (!selectedMaterial) {
    const isAllowedSoy = currentUser.allowedMaterials === 'صويا' || currentUser.allowedMaterials === 'الكل';
    const isAllowedMaize = currentUser.allowedMaterials === 'ذرة' || currentUser.allowedMaterials === 'الكل';
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 font-['Cairo']">
        <Toast {...toast} onClose={hideToast} />
        <div className="text-center mb-16 animate-in slide-in-from-top duration-700">
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">مرحباً، {currentUser.name}</h2>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">اختر القسم للمتابعة</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {isAllowedSoy && (
            <button onClick={() => setSelectedMaterial('soy')} className="bg-white p-12 rounded-[50px] border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-center group shadow-xl relative overflow-hidden">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-6 group-hover:scale-110 transition-transform"><i className="fas fa-leaf text-3xl"></i></div>
              <span className="text-2xl font-black block text-slate-800">قسم الصويا</span>
            </button>
          )}
          {isAllowedMaize && (
            <button onClick={() => setSelectedMaterial('maize')} className="bg-white p-12 rounded-[50px] border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 transition-all text-center group shadow-xl relative overflow-hidden">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-6 group-hover:scale-110 transition-transform"><i className="fas fa-wheat-awn text-3xl"></i></div>
              <span className="text-2xl font-black block text-slate-800">قسم الذرة</span>
            </button>
          )}
        </div>
        <button onClick={() => { setCurrentUser(null); localStorage.removeItem('appUser'); }} className="mt-16 text-slate-400 hover:text-rose-500 transition-colors text-xs font-black flex items-center gap-2"><i className="fas fa-power-off"></i> تسجيل الخروج</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-['Cairo'] text-right flex flex-col" style={{ fontSize: `${fontSizes[activeTab]}px` }}>
      <Toast {...toast} onClose={hideToast} />
      <div className="flex flex-col min-h-screen">
        <header className={`p-4 sticky top-0 z-50 text-white shadow-lg no-print ${selectedMaterial === 'soy' ? 'bg-emerald-600' : 'bg-amber-600'} flex justify-between items-center transition-all w-full`}>
          <button onClick={() => setSelectedMaterial(null)} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0"><i className="fas fa-chevron-right"></i></button>
          <div className="flex flex-col items-center gap-1 flex-1 px-4 text-center">
            <h1 className="text-lg md:text-xl font-black tracking-tight mb-0.5 animate-in slide-in-from-top duration-700">حركة نقل الخامات الرئيسية</h1>
            <span className="text-[8px] font-black tracking-widest opacity-80">تحديث: {syncCountdown}ث | {connectionStatus === 'online' ? 'متصل' : 'مزامنة'}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black text-lg border border-white/20 shadow-inner">{currentUser?.name?.[0] || 'U'}</div>
          </div>
        </header>

        <nav className="bg-white border-b border-slate-100 sticky top-[72px] z-40 px-4 shadow-sm no-print w-full overflow-hidden">
          <div className="max-w-7xl mx-auto flex gap-2 py-3 overflow-x-auto no-scrollbar">
            {[
              { id: 'home', label: 'أرصدة الموانئ', icon: 'fa-anchor' },
              { id: 'summary', label: 'موقف الإفراجات', icon: 'fa-chart-pie' },
              { id: 'dashboard', label: 'السجلات', icon: 'fa-list-ul' },
              { id: 'factory_balance', label: 'رصيد المصانع', icon: 'fa-industry' },
              { id: 'add', label: 'إضافة نقلة', icon: 'fa-plus-circle', hide: currentUser?.role === 'viewer' },
              { id: 'releases', label: 'الإفراجات', icon: 'fa-file-invoice-dollar', hide: currentUser?.role === 'viewer' },
              { id: 'reports', label: 'التقارير', icon: 'fa-chart-line' },
              { id: 'ai', label: 'AI', icon: 'fa-brain' },
              { id: 'settings', label: 'الإعدادات', icon: 'fa-sliders', hide: currentUser?.role !== 'admin' }
            ].filter(tab => !tab.hide).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as ViewType)} className={`px-4 py-3 rounded-2xl text-[11px] font-black flex items-center gap-2.5 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                <i className={`fas ${tab.icon}`}></i> {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="p-4 md:p-8 flex-1 w-full max-w-7xl mx-auto">
          {(activeTab === 'home' || activeTab === 'summary') && (
            <SiteBalancesDashboard 
              releases={filteredReleases} 
              records={filteredRecords} 
              factoryBalances={factoryBalances}
              t={t} lang={lang} 
              selectedMaterial={selectedMaterial}
              showOnlySummary={activeTab === 'summary'}
            />
          )}
          {activeTab === 'dashboard' && (
            <RecordsDashboard 
              records={filteredRecords}
              canEdit={currentUser.role !== 'viewer'}
              onDelete={handleDeleteRecord}
              onEdit={handleEditRecord}
              onStatusChange={handleStatusChange}
              selectedMaterial={selectedMaterial}
              t={t}
            />
          )}
          {activeTab === 'factory_balance' && (
             <FactoryBalanceView 
               releases={filteredReleases}
               records={filteredRecords}
               factoryBalances={factoryBalances}
               onNotify={notify}
               canEdit={currentUser.role !== 'viewer'}
               lang={lang}
               selectedMaterial={selectedMaterial}
             />
          )}
          {activeTab === 'add' && (
            selectedMaterial === 'soy' ? 
            <SoyTransportForm 
              editRecord={editingRecord} 
              existingData={filteredRecords} 
              masterData={masterData} 
              releases={filteredReleases} 
              t={t} 
              lang={lang} 
              onOptimisticAdd={handleAddRecord}
              onOptimisticUpdate={handleUpdateRecord}
              onNotify={notify}
              onCancel={() => {setActiveTab('dashboard'); setEditingRecord(null);}} 
            /> :
            <TransportForm 
              editRecord={editingRecord} 
              existingData={filteredRecords} 
              masterData={masterData} 
              releases={filteredReleases} 
              t={t} 
              lang={lang} 
              selectedMaterial={selectedMaterial} 
              onOptimisticAdd={handleAddRecord}
              onOptimisticUpdate={handleUpdateRecord}
              onNotify={notify}
              onCancel={() => {setActiveTab('dashboard'); setEditingRecord(null);}} 
            />
          )}
          {activeTab === 'releases' && <ReleasesManager releases={filteredReleases} records={filteredRecords} masterData={masterData} t={t} lang={lang} selectedMaterial={selectedMaterial} onRefresh={fetchData} currentUser={currentUser!} />}
          {activeTab === 'reports' && <PeriodicReport releases={filteredReleases} records={filteredRecords} t={t} />}
          {activeTab === 'ai' && <AIInsights records={filteredRecords} releases={filteredReleases} lang={lang} />}
          {activeTab === 'settings' && <MasterDataUpload currentData={masterData} lang={lang} setLang={setLang} onRefresh={fetchData} zoom={zoom} setZoom={setZoom} fontSizes={fontSizes} setFontSizes={setFontSizes} activeTab="settings" />}
        </main>
      </div>
    </div>
  );
};

export default App;
