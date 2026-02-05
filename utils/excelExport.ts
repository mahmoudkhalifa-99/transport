
import * as XLSX from 'xlsx';
import { TransportRecord } from '../types';

/**
 * تصدير سجلات النقل الخام إلى ملف Excel شامل كافة الحقول
 */
export const exportToExcel = (data: TransportRecord[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
    // @google/genai fix: Removed properties that do not exist on TransportRecord interface
    'المسلسل': item.autoId,
    'التاريخ': item.date,
    'وقت الخروج': item.departureTime || '--:--',
    'مقاول النقل': item.contractorName || '',
    'رقم السيارة': item.carNumber || '',
    'اسم السائق': item.driverName || '',
    'رقم تليفون السائق': item.driverPhone || '',
    'مكان التحميل': item.loadingSite || '',
    'مكان التفريغ': item.unloadingSite || '',
    'رقم البوليصة': item.waybillNo || '',
    'رقم أمر التوريد': item.orderNo || '',
    'الوزن الكلي (طن)': item.weight || 0,
    'الحالة': item.status || '',
    'ملاحظات': item.notes || ''
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات النقل التفصيلية");
  XLSX.writeFile(workbook, `سجل_نقل_تفصيلي_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
};

/**
 * تصدير تقرير الأداء الدوري المجمع
 */
export const exportReportToExcel = (reportData: any, dateRange: { from: string, to: string }) => {
  const workbook = XLSX.utils.book_new();

  const summaryData = [
    { 'البيان': 'تاريخ التقرير من', 'القيمة': dateRange.from },
    { 'البيان': 'تاريخ التقرير إلى', 'القيمة': dateRange.to },
    { 'البيان': 'إجمالي الإفراجات خلال الفترة (طن)', 'القيمة': reportData.totalReleased },
    { 'البيان': 'إجمالي الكميات المنفذة (طن)', 'القيمة': reportData.totalAdded },
    { 'البيان': 'إجمالي الكميات المتوقفة (طن)', 'القيمة': reportData.totalStopped },
    { 'البيان': 'إجمالي عدد النقلات المنفذة', 'القيمة': reportData.totalTrips },
    { 'البيان': 'تاريخ استخراج التقرير', 'القيمة': new Date().toLocaleString('ar-EG') }
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summaryWs, "ملخص الأداء العام");

  const siteData = Object.entries(reportData.siteBreakdown).map(([site, data]: [string, any]) => ({
    'الموقع / المحطة': site,
    'إجمالي المفرج (طن)': data.released,
    'المنفذ فعلياً (طن)': data.added,
    'المتوقف / أعطال (طن)': data.stopped,
    'عدد النقلات': data.trips,
    'نسبة الإنجاز %': data.released > 0 ? ((data.added / data.released) * 100).toFixed(2) + '%' : '0%'
  }));
  const siteWs = XLSX.utils.json_to_sheet(siteData);
  XLSX.utils.book_append_sheet(workbook, siteWs, "تحليل المواقع");

  XLSX.writeFile(workbook, `تقرير_أداء_النقل_${dateRange.from}_إلى_${dateRange.to}.xlsx`);
};