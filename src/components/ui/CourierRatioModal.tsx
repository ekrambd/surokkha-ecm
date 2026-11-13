import React, { useState } from 'react';
import { 
  ShieldCheck, Package, Phone, X, Sparkles, RefreshCw, 
  ShieldAlert, Search, AlertCircle
} from 'lucide-react';
import { CustomerCourierRatio } from '../../lib/courierFraudService';

interface CourierRatioModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratio: CustomerCourierRatio | null;
  customerName?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSearchPhone?: (phone: string) => void;
}

export const CourierRatioModal: React.FC<CourierRatioModalProps> = ({
  isOpen,
  onClose,
  ratio,
  customerName,
  isLoading,
  onRefresh,
  onSearchPhone
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'check' | 'recent' | 'report'>('check');
  const [inputPhone, setInputPhone] = useState(ratio?.phone || '');

  const deliveryRate = ratio?.deliveryRatio !== undefined ? ratio.deliveryRatio : (ratio?.successRatio ?? 0);
  const cancelledRate = ratio?.cancellationRatio !== undefined ? ratio.cancellationRatio : (ratio?.returnRatio ?? 0);
  const volumeDisplay = ratio?.volumeRange || ratio?.totalParcels || '10+';
  const reportCount = ratio?.totalReports !== undefined ? ratio.totalReports : (ratio?.fraudReports ?? 0);

  // SVG Gauge calculations matching Steadfast Portal
  const radius = 42;
  const circumference = Math.PI * radius; // 131.95
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, deliveryRate)) / 100) * circumference;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPhone.trim() && onSearchPhone) {
      onSearchPhone(inputPhone.trim());
    } else if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-[#F8FAFC] rounded-3xl border border-slate-200/90 shadow-2xl max-w-2xl w-full overflow-hidden animate-scaleUp">
        
        {/* Top Header: Matching Steadfast Portal */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00A86B]/10 text-[#00A86B] flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-[#00A86B]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Delivery Risk Check</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Card 1: Customer Phone Number Input Field */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <label className="block text-xs font-semibold text-slate-600">
              Customer phone number
            </label>
            <form onSubmit={handleSearch} className="flex items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="Customer phone, e.g. 01712345678"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00A86B] focus:border-[#00A86B] transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-[#00A86B] hover:bg-[#00925c] text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Check</span>
              </button>
            </form>
            <p className="text-[11px] text-slate-400">
              Bangla digits and +880 numbers work too.
            </p>
          </div>

          {/* Card 2: Steadfast Result Card (Pixel-Perfect to Steadfast Screenshot) */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#00A86B] animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">Steadfast Ratio যাচাই করা হচ্ছে...</p>
              <p className="text-xs text-slate-400">অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন</p>
            </div>
          ) : ratio ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              
              {/* Phone Header */}
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold font-mono text-slate-900 tracking-wide">
                  {ratio.phone}
                </span>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Delivery Stats with Semi-Circle Gauge */}
              <div className="flex items-center gap-12 py-2">
                
                {/* SVG Gauge */}
                <div className="relative flex flex-col items-center justify-center">
                  <svg width="150" height="85" viewBox="0 0 100 55" className="overflow-visible">
                    {/* Background Arc */}
                    <path
                      d="M 8 50 A 42 42 0 0 1 92 50"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    {/* Value Arc */}
                    <path
                      d="M 8 50 A 42 42 0 0 1 92 50"
                      fill="none"
                      stroke="#00C48C"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="text-center -mt-9">
                    <span className="text-3xl font-black text-[#00A86B] font-mono leading-none block">
                      {deliveryRate}%
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
                      Delivered
                    </span>
                  </div>
                </div>

                {/* Percentage Labels */}
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#00A86B] font-mono">{deliveryRate}%</span>
                    <span className="text-sm font-semibold text-slate-600">Delivered</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#E53E3E] font-mono">{cancelledRate}%</span>
                    <span className="text-sm font-semibold text-slate-600">Cancelled</span>
                  </div>
                </div>

              </div>

              {/* Parcel Volume & Merchant Reports Boxes */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Parcel Volume Card */}
                <div className="bg-[#EBF3FF] border border-[#D0E2FF] rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-[#0043CE] text-xs font-bold uppercase tracking-wider mb-2">
                    <Package className="w-4 h-4" />
                    <span>PARCEL VOLUME</span>
                  </div>
                  <div className="text-3xl font-black text-[#0043CE] font-mono">
                    {volumeDisplay}
                  </div>
                  {ratio.volumeBand && (
                    <span className="text-[10px] text-[#0043CE]/70 font-semibold uppercase tracking-wider">
                      {ratio.volumeBand} band
                    </span>
                  )}
                </div>

                {/* Merchant Reports Card */}
                <div className="bg-[#F8F9FA] border border-slate-200/80 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    <span>MERCHANT REPORTS</span>
                  </div>
                  <div className={`text-3xl font-black font-mono ${reportCount > 0 ? 'text-[#E53E3E]' : 'text-slate-800'}`}>
                    {reportCount}
                  </div>
                  {ratio.fraudCategories && ratio.fraudCategories.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ratio.fraudCategories.map((cat, idx) => (
                        <span key={idx} className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Clarification Notice */}
              <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
                The ratio counts finished parcels to this number across all merchants: delivered against cancelled. Parcels still on the way are not counted.
              </p>

              {/* Recommendation Box */}
              <div className="rounded-xl p-3.5 bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex items-start gap-2.5 text-xs">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-0.5">
                  <span className="font-bold">কুরিয়ার পরামর্শ:</span>
                  <p className="font-medium text-slate-700 leading-relaxed">{ratio.recommendation}</p>
                </div>
              </div>

            </div>
          ) : null}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
