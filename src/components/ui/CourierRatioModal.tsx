import React from 'react';
import { 
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2, 
  Truck, Package, Phone, X, Sparkles, RefreshCw, AlertCircle, ShieldAlert
} from 'lucide-react';
import { CustomerCourierRatio } from '../../lib/courierFraudService';

interface CourierRatioModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratio: CustomerCourierRatio | null;
  customerName?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const CourierRatioModal: React.FC<CourierRatioModalProps> = ({
  isOpen,
  onClose,
  ratio,
  customerName,
  isLoading,
  onRefresh
}) => {
  if (!isOpen || !ratio) return null;

  const isSafe = ratio.riskLevel === 'safe';
  const isMedium = ratio.riskLevel === 'medium';
  const isHigh = ratio.riskLevel === 'high';

  const deliveryRate = ratio.deliveryRatio !== undefined ? ratio.deliveryRatio : ratio.successRatio;
  const cancelledRate = ratio.cancellationRatio !== undefined ? ratio.cancellationRatio : ratio.returnRatio;
  const volumeDisplay = ratio.volumeRange || ratio.totalParcels || '10+';
  const reportCount = ratio.totalReports !== undefined ? ratio.totalReports : (ratio.fraudReports ?? 0);

  // SVG Gauge calculations
  // Semi-circle radius = 42, circumference = PI * 42 = 131.95
  const radius = 42;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, deliveryRate)) / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200/60">
              <ShieldCheck className="w-5 h-5 text-[#00A86B]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full inline-block">
                Steadfast Delivery Risk Check
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {customerName || 'Customer Delivery Check'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* Steadfast Native Card Style (Exact match to Steadfast Dashboard) */}
          <div className="border border-slate-200/80 rounded-2xl p-5 bg-white shadow-2xs space-y-5">
            {/* Phone Number Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg tracking-wide font-mono">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{ratio.phone}</span>
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
                  <span>Refresh</span>
                </button>
              )}
            </div>

            {/* Gauge & Delivered vs Cancelled breakdown */}
            <div className="flex items-center justify-around py-1">
              {/* Semi-Circle SVG Speedometer */}
              <div className="relative flex flex-col items-center justify-center">
                <svg width="120" height="70" viewBox="0 0 100 60" className="overflow-visible">
                  {/* Background Arc */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Value Arc */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#00C48C"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="text-center -mt-7">
                  <span className="text-2xl font-black text-[#00A86B] font-mono leading-none block">
                    {deliveryRate}%
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                    Delivered
                  </span>
                </div>
              </div>

              {/* Status Percentages */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#00A86B] font-mono">{deliveryRate}%</span>
                  <span className="text-xs font-bold text-slate-600">Delivered</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#E53E3E] font-mono">{cancelledRate}%</span>
                  <span className="text-xs font-bold text-slate-600">Cancelled</span>
                </div>
              </div>
            </div>

            {/* Bottom 2 Cards: Parcel Volume & Merchant Reports */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Parcel Volume */}
              <div className="bg-[#EBF3FF] border border-[#D0E2FF] rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-[#0043CE] text-[11px] font-bold uppercase tracking-wider mb-1">
                  <Package className="w-3.5 h-3.5" />
                  <span>Parcel Volume</span>
                </div>
                <div className="text-2xl font-black text-[#0043CE] font-mono">
                  {volumeDisplay}
                </div>
              </div>

              {/* Merchant Reports */}
              <div className="bg-[#F8F9FA] border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                  <span>Merchant Reports</span>
                </div>
                <div className={`text-2xl font-black font-mono ${reportCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {reportCount}
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation Box */}
          <div className={`rounded-xl p-3.5 border flex items-start gap-2.5 text-xs ${
            isSafe ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' :
            isMedium ? 'bg-amber-50/70 border-amber-200 text-amber-950' :
            'bg-rose-50/70 border-rose-200 text-rose-950'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-current" />
            <div className="space-y-0.5">
              <span className="font-bold">কুরিয়ার পরামর্শ:</span>
              <p className="font-medium text-slate-700 leading-relaxed">{ratio.recommendation}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
