
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { TransportRecord, Release } from '../types';

interface Props {
  records: TransportRecord[];
  releases: Release[];
  lang: 'ar' | 'en';
}

const AIInsights: React.FC<Props> = ({ records, releases, lang }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        بصفتك محلل بيانات خبير في نظام إدارة نقل الخامات، قم بتحليل البيانات التالية وقدم نصيحة واحدة ذكية ومختصرة جداً (سطر واحد):
        - عدد النقلات الحالية: ${records.length}
        - إجمالي عدد الإفراجات: ${releases.length}
        - تفاصيل النقلات: ${JSON.stringify(records.slice(0, 10).map(r => ({ site: r.unloadingSite, weight: r.weight, status: r.status })))}
        
        اللغة المطلوبة للرد: ${lang === 'ar' ? 'العربية' : 'الانجليزية'}.
        اجعل الرد مشجعاً ومهنياً.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setInsight(response.text || (lang === 'ar' ? 'البيانات مستقرة حالياً.' : 'Data is stable.'));
    } catch (error) {
      setInsight(lang === 'ar' ? 'جاهز لتحليل بياناتك القادمة!' : 'Ready to analyze your next data!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (records.length > 0) generateInsight();
  }, [records.length]);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-8 rounded-[40px] shadow-2xl border border-white/10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
      
      <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 ${loading ? 'bg-indigo-500 animate-pulse text-white' : 'bg-white/10 text-indigo-400 group-hover:scale-110'}`}>
          <i className={`fas ${loading ? 'fa-sync-alt fa-spin' : 'fa-brain'}`}></i>
        </div>
        
        <div className="flex-1 text-right">
          <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1">
            {lang === 'ar' ? 'رؤية الذكاء الاصطناعي' : 'AI Smart Insights'}
          </h4>
          <p className="text-white font-bold leading-relaxed">
            {loading ? (lang === 'ar' ? 'جاري تحليل الأنماط والبيانات...' : 'Analyzing patterns...') : insight}
          </p>
        </div>

        <button 
          onClick={generateInsight}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl text-[10px] font-black transition-all border border-white/5 active:scale-95"
        >
          {lang === 'ar' ? 'تحديث التحليل' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default AIInsights;
