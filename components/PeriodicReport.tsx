import React, { useState, useMemo } from 'react';
import { Release, TransportRecord, OperationStatus } from '../types';
import { exportReportToExcel } from '../utils/excelExport';

interface Props {
  releases: Release[];
  records: TransportRecord[];
  t: any;
}

const PeriodicReport: React.FC<Props> = ({ releases, records, t }) => {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const reportData = useMemo(() => {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);

    const periodRecords = records.filter(r => {
      const d = new Date(r.date);
      return d >= from && d <= to;
    });

    const periodReleases = releases.filter(r => {
      const d = new Date(r.date);
      return d >= from && d <= to;
    });

    const totalReleased = periodReleases.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
    const totalAdded = periodRecords.reduce((sum, r) => r.status === OperationStatus.DONE ? sum + (r.weight || 0) : sum, 0);
    const totalStopped = periodRecords.reduce((sum, r) => r.status === OperationStatus.STOPPED ? sum + (r.weight || 0) : sum, 0);
    const totalTrips = periodRecords.length;

    const siteBreakdown: Record<string, { released: number; added: number; stopped: number; trips: number }> = {};
    
    periodReleases.forEach(r => {
      if (!siteBreakdown[r.siteName]) siteBreakdown[r.siteName] = { released: 0, added: 0, stopped: 0, trips: 0 };
      siteBreakdown[r.siteName].released += (r.totalQuantity || 0);
    });

    periodRecords.forEach(r => {
      if (!siteBreakdown[r.unloadingSite]) siteBreakdown[r.unloadingSite] = { released: 0, added: 0, stopped: 0, trips: 0 };
      if (r.status === OperationStatus.DONE) {
        siteBreakdown[r.unloadingSite].added += (r.weight || 0);
      } else if (r.status === OperationStatus.STOPPED) {
        siteBreakdown[r.unloadingSite].stopped += (r.weight || 0);
      }
      siteBreakdown[r.unloadingSite].trips += 1;
    });

    return { totalReleased, totalAdded, totalStopped, totalTrips, siteBreakdown, periodRecords };
  }, [releases, records, dateRange]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="bg-white p-6 rounded-[32px] shadow-sm border flex flex-col md:flex-row items-center justify-between gap-6 no-print">
        <div>
          <h2 className="text-xl font-black text-gray-800">{t.performanceReportTitle}</h2>
          <p className="text-xs text-gray-400 font-bold uppercase mt-1">{t.performanceReportSub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-2 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase">{t.from}:</span>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="bg-white border-none text-xs font-bold p-2 rounded-xl outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase">{t.to}:</span>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="bg-white border-none text-xs font-bold p-2 rounded-xl outline-none" />
          </div>
          <button onClick={() => exportReportToExcel(reportData, dateRange)} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95">
             <i className="fas fa-file-excel"></i> {t.export} Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-amber-500 text-white p-5 rounded-[32px] shadow-xl flex flex-col justify-between h-36">
          <span className="text-[10px] font-black uppercase tracking-widest">{t.releasedCol}</span>
          <div><span className="text-2xl font-black">{reportData.totalReleased.toLocaleString()}</span> <span className="text-[10px] font-bold">{t.ton}</span></div>
        </div>
        <div className="bg-indigo-600 text-white p-5 rounded-[32px] shadow-xl flex flex-col justify-between h-36">
          <span className="text-[10px] font-black uppercase tracking-widest">{t.totalExecuted}</span>
          <div><span className="text-2xl font-black">{reportData.totalAdded.toLocaleString()}</span> <span className="text-[10px] font-bold">{t.ton}</span></div>
        </div>
        <div className="bg-rose-600 text-white p-5 rounded-[32px] shadow-xl flex flex-col justify-between h-36">
          <span className="text-[10px] font-black uppercase tracking-widest">{t.stoppedCol}</span>
          <div><span className="text-2xl font-black">{reportData.totalStopped.toLocaleString()}</span> <span className="text-[10px] font-bold">{t.ton}</span></div>
        </div>
        <div className="bg-emerald-600 text-white p-5 rounded-[32px] shadow-xl flex flex-col justify-between h-36">
          <span className="text-[10px] font-black uppercase tracking-widest">{t.tripsCol}</span>
          <div><span className="text-2xl font-black">{reportData.totalTrips.toLocaleString()}</span> <span className="text-[10px] font-bold">{t.trip}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-black text-gray-800 flex items-center gap-2">{t.siteAnalysisTitle}</h3>
          <span className="text-[10px] text-gray-400 font-black uppercase">{t.siteAnalysisPeriod}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 border">{t.siteCol}</th>
                <th className="px-6 py-4 border">{t.releasedCol}</th>
                <th className="px-6 py-4 border">{t.addedCol}</th>
                <th className="px-6 py-4 border">{t.stoppedCol}</th>
                <th className="px-6 py-4 border">{t.tripsCol}</th>
                <th className="px-6 py-4 border">{t.completionRate}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {Object.entries(reportData.siteBreakdown).map(([site, rawData]) => {
                const data = rawData as any;
                const completion = data.released > 0 ? (data.added / data.released) * 100 : 0;
                return (
                  <tr key={site} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-black text-gray-800 border">{site}</td>
                    <td className="px-6 py-4 font-bold text-amber-600 border">{data.released.toLocaleString()} {t.ton}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600 border">{data.added.toLocaleString()} {t.ton}</td>
                    <td className="px-6 py-4 font-bold text-rose-600 border">{data.stopped.toLocaleString()} {t.ton}</td>
                    <td className="px-6 py-4 font-bold text-gray-600 border">{data.trips}</td>
                    <td className="px-6 py-4 border">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, completion)}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-gray-400">{completion.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {Object.keys(reportData.siteBreakdown).length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-300 italic font-bold">{t.noDataPeriod}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PeriodicReport;