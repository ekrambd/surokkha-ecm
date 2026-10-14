import React from 'react';
import { EcomSettings } from '../types';

interface Props {
  settings: EcomSettings;
  onChange: (newSettings: EcomSettings) => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DeliveryAdvancedSettings({ settings, onChange }: Props) {
  const handleSettingChange = (key: keyof EcomSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  const toggleDay = (day: string) => {
    const days = settings.deliveryDays || [];
    if (days.includes(day)) {
      handleSettingChange('deliveryDays', days.filter(d => d !== day));
    } else {
      handleSettingChange('deliveryDays', [...days, day]);
    }
  };

  const setCutoffTime = (day: string, time: string) => {
    const times = { ...(settings.deliveryCutoffTimes || {}) };
    times[day] = time;
    handleSettingChange('deliveryCutoffTimes', times);
  };

  return (
    <div className="space-y-6">
      {/* Delivery Charge Block */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-extrabold text-slate-900 mb-6">Delivery Charge</h3>
        
        <div className="space-y-4">
          {/* Inside Dhaka */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Inside Dhaka</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Regular</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.deliveryChargeInsideDhaka || 0}
                    onChange={e => handleSettingChange('deliveryChargeInsideDhaka', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Express</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.deliveryChargeInsideExpress || 0}
                    onChange={e => handleSettingChange('deliveryChargeInsideExpress', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Outside Dhaka */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Outside Dhaka</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Regular</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.deliveryChargeOutsideDhaka || 0}
                    onChange={e => handleSettingChange('deliveryChargeOutsideDhaka', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Express</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.deliveryChargeOutsideExpress || 0}
                    onChange={e => handleSettingChange('deliveryChargeOutsideExpress', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Free Delivery */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center mb-4">
              <h4 className="text-sm font-bold text-slate-800 mr-4">Free Delivery</h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!settings.freeDeliveryEnabled}
                  onChange={(e) => handleSettingChange('freeDeliveryEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#52c41a]"></div>
              </label>
            </div>
            
            {settings.freeDeliveryEnabled && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Minimum Purchase Value:</label>
                <div className="flex max-w-xs">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.freeDeliveryMinPurchase || 0}
                    onChange={e => handleSettingChange('freeDeliveryMinPurchase', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delivery Day & Cut Time */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row gap-6 md:gap-12">
        <h3 className="text-base font-extrabold text-slate-900 md:w-1/4">Delivery Day & Cut Time</h3>
        
        <div className="flex-1 bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-6">
          {/* Delivery Days */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-4">Delivery Days</h4>
            <div className="flex flex-wrap gap-4">
              {DAYS.map(day => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    (settings.deliveryDays || []).includes(day)
                      ? 'bg-[#52c41a] border-[#52c41a]' 
                      : 'bg-white border-slate-300'
                  }`}>
                    {(settings.deliveryDays || []).includes(day) && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{day}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Cutoff Times */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-4">Cutoff Times</h4>
            <div className="space-y-3 max-w-sm">
              {DAYS.map(day => {
                const isActive = (settings.deliveryDays || []).includes(day);
                return (
                  <div key={day} className={`flex items-center justify-between ${isActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <label className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isActive ? 'bg-[#52c41a] border-[#52c41a]' : 'bg-white border-slate-300'
                      }`}>
                        {isActive && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-24">{day}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Cut Off Time:</span>
                      <input 
                        type="time" 
                        value={(settings.deliveryCutoffTimes || {})[day] || '18:00'}
                        onChange={e => setCutoffTime(day, e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-teal-500 w-28"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
