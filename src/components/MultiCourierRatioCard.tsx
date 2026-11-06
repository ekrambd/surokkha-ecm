import React from 'react';
import { CustomerCourierRatio } from '../lib/courierFraudService';
import { RefreshCw, ExternalLink, ShieldCheck, AlertTriangle, XCircle, Package } from 'lucide-react';

interface Props {
  ratio: CustomerCourierRatio | null;
  isLoading: boolean;
  onRefresh: () => void;
  onViewDetails?: () => void;
}

export function MultiCourierRatioCard({ ratio, isLoading, onRefresh, onViewDetails }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="font-extrabold text-xs text-slate-800">কুরিয়ার যাচাই</span>
          <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
        </div>
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs">
          <p>কুরিয়ার রেকর্ড লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  const hasHistory = ratio?.hasHistory ?? false;
  const successPercent = hasHistory ? (ratio ? ratio.successRatio : 0) : 0;
  const returnPercent = hasHistory ? (ratio ? ratio.returnRatio : 0) : 0;
  const totalParcels = hasHistory ? (ratio ? ratio.totalParcels : '০') : '০';
  const deliveredCount = hasHistory ? (ratio ? ratio.deliveredParcels : 0) : 0;
  const returnCount = hasHistory ? (ratio ? ratio.returnedParcels : 0) : 0;

  const sf = ratio?.courierBreakdown?.steadfast;
  const pt = ratio?.courierBreakdown?.pathao;
  const rx = ratio?.courierBreakdown?.redx;
  const bp = ratio?.courierBreakdown?.merchantNetwork;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs font-sans text-xs">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <span className="font-extrabold text-xs text-slate-900">কুরিয়ার যাচাই</span>
        <div className="flex items-center gap-2 text-[11px] font-bold">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              বিস্তারিত
            </button>
          )}
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {/* Main Score Banner */}
      <div className="pt-3 pb-2">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">
              {hasHistory ? `${successPercent}%` : '০%'}
            </span>
            <span className="text-slate-400">•</span>
            <span className={`font-black text-xs ${
              !hasHistory ? 'text-slate-500' :
              successPercent >= 80 ? 'text-emerald-700' :
              successPercent >= 50 ? 'text-amber-700' : 'text-rose-700'
            }`}>
              {ratio?.riskLabel || (hasHistory ? (successPercent >= 80 ? 'উচ্চ আস্থা' : 'মাঝারি ঝুঁকি') : 'নতুন কাস্টমার (রেকর্ড নেই)')}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {hasHistory ? `${totalParcels}টি পার্সেল` : '০টি পার্সেল'}
          </span>
        </div>

        {/* Dual Progress Bar (Green / Orange) */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
          {hasHistory ? (
            <>
              <div 
                className="bg-[#00A86B] h-full rounded-l-full transition-all duration-500"
                style={{ width: `${successPercent}%` }}
              />
              <div 
                className="bg-[#F7A800] h-full rounded-r-full transition-all duration-500"
                style={{ width: `${returnPercent}%` }}
              />
            </>
          ) : (
            <div className="w-full h-full bg-slate-200/70" />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-2 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-slate-700">
            <span className={`w-1.5 h-1.5 rounded-full ${hasHistory && deliveredCount > 0 ? 'bg-[#00A86B]' : 'bg-slate-300'}`} />
            <span>{deliveredCount} ডেলিভারড</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${hasHistory && returnCount > 0 ? 'bg-[#F7A800]' : 'bg-slate-300'}`} />
            <span>{returnCount} রিটার্ন</span>
          </span>
        </div>
      </div>

      {/* Breakdown per Courier Partner (Steadfast, Pathao, RedX, বিপণী) */}
      <div className="divide-y divide-slate-100 mt-2 border-t border-slate-100">
        
        {/* Steadfast */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center font-black text-[9px] border border-teal-200">
              SF
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs">Steadfast</p>
              <p className="text-[10px] text-slate-400">
                {sf?.badge || 'অফিসিয়াল API'}
              </p>
            </div>
          </div>
          <div className="text-right">
            {sf?.hasHistory ? (
              <>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {sf.delivered}/{sf.total}
                </span>
                <span className="text-[11px] font-bold text-slate-500 ml-1">
                  ({sf.successRate}%)
                </span>
                {sf.returned > 0 && (
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">{sf.returned}টি রিটার্ন</p>
                )}
              </>
            ) : (
              <span className="font-mono font-bold text-xs text-slate-400">০ পার্সেল</span>
            )}
          </div>
        </div>

        {/* Pathao */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center font-black text-[9px] border border-red-200">
              PT
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs">Pathao</p>
              <p className="text-[10px] text-slate-400">
                {pt?.hasHistory ? 'অফিসিয়াল কানেক্টেড' : 'কানেক্টেড পার্টনার'}
              </p>
            </div>
          </div>
          <div className="text-right">
            {pt?.hasHistory ? (
              <>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {pt.delivered}/{pt.total}
                </span>
                <span className="text-[11px] font-bold text-slate-500 ml-1">
                  ({pt.successRate}%)
                </span>
              </>
            ) : (
              <span className="font-mono font-bold text-xs text-slate-400">০ পার্সেল</span>
            )}
          </div>
        </div>

        {/* RedX */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center font-black text-[8px]">
              REDX
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs">RedX</p>
              <p className="text-[10px] text-slate-400">কানেক্টেড পার্টনার</p>
            </div>
          </div>
          <div className="text-right">
            {rx?.hasHistory ? (
              <>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {rx.delivered}/{rx.total}
                </span>
                <span className="text-[11px] font-bold text-slate-500 ml-1">
                  ({rx.successRate}%)
                </span>
              </>
            ) : (
              <span className="font-mono font-bold text-xs text-slate-400">০ পার্সেল</span>
            )}
          </div>
        </div>

        {/* Shostirbazar Network (Internal Store Server History) */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-[9px] border border-emerald-200">
              {bp?.code || 'SB'}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs">{bp?.name || 'Shostirbazar Network'}</p>
              <p className="text-[10px] text-slate-400">{bp?.badge || 'সার্ভার হিস্ট্রি'}</p>
            </div>
          </div>
          <div className="text-right">
            {bp?.hasHistory ? (
              <>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {bp.delivered}/{bp.total}
                </span>
                <span className="text-[11px] font-bold text-slate-500 ml-1">
                  ({bp.successRate}%)
                </span>
                {bp.returned > 0 && (
                  <p className="text-[10px] text-rose-600 font-bold mt-0.5">{bp.returned}টি রিটার্ন</p>
                )}
              </>
            ) : (
              <span className="font-mono font-bold text-xs text-slate-400">০ পার্সেল</span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
