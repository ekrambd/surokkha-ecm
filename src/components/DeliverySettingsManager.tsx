import React, { useState, useEffect } from 'react';
import { EcomSettings, DeliveryMethodItem } from '../types';
import { dbService, DEFAULT_DELIVERY_METHODS } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { 
  Truck, 
  Check, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit3, 
  X
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { DeliveryAdvancedSettings } from './DeliveryAdvancedSettings';

export default function DeliverySettingsManager() {
  const [settings, setSettings] = useState<EcomSettings>({
    gtmId: '',
    deliveryChargeInsideDhaka: 80,
    deliveryChargeOutsideDhaka: 130,
    bkashNumber: '',
    nagadNumber: '',
    deliveryMethods: DEFAULT_DELIVERY_METHODS
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Filter
  const [logisticsFilter, setLogisticsFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Edit Delivery state
  const [editingDelivery, setEditingDelivery] = useState<DeliveryMethodItem | null>(null);
  const [isAddingDelivery, setIsAddingDelivery] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const data = await dbService.getEcomSettings();
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load delivery settings:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await dbService.saveEcomSettings(settings);
      setSaveSuccess(true);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Delivery settings saved!',
        message: 'The delivery method and charges have been successfully updated in the database.'
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving delivery settings:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'There was an error saving',
        message: 'There was a problem saving delivery settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deliveryMethods = settings.deliveryMethods || DEFAULT_DELIVERY_METHODS;
  const filteredDelivery = deliveryMethods.filter(dm => {
    if (logisticsFilter === 'active') return dm.status === 'Active';
    if (logisticsFilter === 'inactive') return dm.status === 'Inactive';
    return true;
  });

  const handleOpenAddDelivery = () => {
    setEditingDelivery({
      id: `dm-${Date.now()}`,
      title: 'New delivery method',
      status: 'Active',
      mode: 'Fixed',
      type: 'Fixed',
      minimumCharge: 0,
      maximumCharge: 0,
      deliveryCharge: 80,
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
    setIsAddingDelivery(true);
  };

  const handleSaveDeliveryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelivery) return;

    let updatedList: DeliveryMethodItem[];
    if (isAddingDelivery) {
      updatedList = [...deliveryMethods, editingDelivery];
    } else {
      updatedList = deliveryMethods.map(d => d.id === editingDelivery.id ? editingDelivery : d);
    }

    // Sync legacy delivery fields if inside/outside dhaka
    let insideCharge = settings.deliveryChargeInsideDhaka;
    let outsideCharge = settings.deliveryChargeOutsideDhaka;

    const lowerTitle = editingDelivery.title.toLowerCase();
    if (lowerTitle.includes('inside') || lowerTitle.includes('Dhaka') || lowerTitle.includes('City')) {
      insideCharge = editingDelivery.deliveryCharge;
    } else if (lowerTitle.includes('outside') || lowerTitle.includes('Outside')) {
      outsideCharge = editingDelivery.deliveryCharge;
    }

    const newSettings = { 
      ...settings, 
      deliveryMethods: updatedList,
      deliveryChargeInsideDhaka: insideCharge,
      deliveryChargeOutsideDhaka: outsideCharge
    };
    setSettings(newSettings);
    dbService.saveEcomSettings(newSettings);

    setEditingDelivery(null);
    setIsAddingDelivery(false);
    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Delivery method saved!',
      message: `"${editingDelivery.title}" successfulway has been updated।`
    });
  };

  const handleDeleteDelivery = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    const targetItem = deliveryMethods.find(d => d.id === deleteTargetId);
    const updatedList = deliveryMethods.filter(d => d.id !== deleteTargetId);
    const newSettings = { ...settings, deliveryMethods: updatedList };
    setSettings(newSettings);
    dbService.saveEcomSettings(newSettings);
    setDeleteTargetId(null);
    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Delivery method has been deleted',
      message: `"${targetItem?.title || 'method'}" successfulway list from has been deleted।`
    });
  };

  const handleToggleDeliveryStatus = (id: string) => {
    const updatedList = deliveryMethods.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: d.status === 'Active' ? ('Inactive' as const) : ('Active' as const),
          updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
      }
      return d;
    });
    const newSettings = { ...settings, deliveryMethods: updatedList };
    setSettings(newSettings);
    dbService.saveEcomSettings(newSettings);
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading delivery settings..." size="md" />
    );
  }

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto text-slate-800 pb-16">

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Delivery method And charge heTNs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Delivery area, alternative method and delivery rate con for customer checkoutfeegar
              </p>
            </div>
          </div>
        </div>

        {/* Global Save / Refresh Buttons */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            onClick={loadSettings}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">refresh</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-200">
                <Check className="h-4 w-4 text-emerald-300" />
                saved!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                save
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="my-6">
        <DeliveryAdvancedSettings settings={settings} onChange={setSettings} />
      </div>

      {/* Editor Modal for Delivery Method */}
      {editingDelivery && (
        <form onSubmit={handleSaveDeliveryForm} className="bg-white border-2 border-teal-200 p-6 rounded-3xl shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="h-5 w-5 text-teal-600" />
                <span>{editingDelivery.title || 'new delivery method'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Delivery area, charge And Define method conditions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingDelivery(null)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Title *</label>
              <input
                type="text"
                required
                value={editingDelivery.title}
                onChange={(e) => setEditingDelivery({ ...editingDelivery, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors font-medium"
                placeholder="For example: Cash on delivery within Dhaka"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Type *</label>
              <select
                value={editingDelivery.type}
                onChange={(e) => setEditingDelivery({ ...editingDelivery, type: e.target.value, mode: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors font-medium cursor-pointer"
              >
                <option value="Fixed">Fixedspecific charge</option>
                <option value="Weight based">Weight basedby weight</option>
                <option value="Percentage">Percentagepercentage</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Delivery Charge Tk. *</label>
              <input
                type="number"
                required
                value={editingDelivery.deliveryCharge}
                onChange={(e) => setEditingDelivery({ ...editingDelivery, deliveryCharge: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-slate-500 mt-1">This fee will be added when the customer selects this delivery area.</p>
            </div>

            {/* Status Toggle Block */}
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Status</h4>
                <p className="text-[11px] text-slate-500">Tick ​​to enable this method for customers at checkout.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingDelivery.status === 'Active'}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, status: e.target.checked ? 'Active' : 'Inactive' })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-3 text-xs font-bold text-slate-700">
                  {editingDelivery.status === 'Active'? 'Active' : 'inactive'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingDelivery(null)}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
            >
              canceled
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer"
            >
              save
            </button>
          </div>
        </form>
      )}

      {/* Delivery Methods Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-extrabold text-slate-900">Delivery method list</h3>
              <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold rounded-lg">
                {deliveryMethods.length} T method
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage all courier and delivery options used at checkout
            </p>
          </div>

          <button
            onClick={handleOpenAddDelivery}
            className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add new delivery method</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setLogisticsFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                logisticsFilter === f
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f === 'all' ? `${deliveryMethods.length}` : f === 'active' ? `active (${deliveryMethods.filter(d => d.status === 'Active').length})` : `idle (${deliveryMethods.filter(d => d.status === 'Inactive').length})`}
            </button>
          ))}
        </div>

        {/* Delivery Methods Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">No</th>
                <th className="px-4 py-3.5">Delivery method</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">charge</th>
                <th className="px-4 py-3.5">Update</th>
                <th className="px-4 py-3.5 text-right">action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredDelivery.map((dm, idx) => (
                <tr key={dm.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">{dm.title}</div>
                        <div className="text-[11px] text-slate-500">{dm.mode || 'Fixed'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleToggleDeliveryStatus(dm.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-transform hover:scale-105 ${
                        dm.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${dm.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                      <span>{ dm.status === 'Active' ? 'active' : 'inactive' }</span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-900 font-bold">
                    Tk.{dm.deliveryCharge}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                    {dm.updatedAt}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => {
                          setEditingDelivery(dm);
                          setIsAddingDelivery(false);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 cursor-pointer"
                        title="edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDelivery(dm.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 cursor-pointer"
                        title="delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDelivery.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    any Delivery method not found। Add new delivery method।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        type="danger"
        title="Delete delivery method?"
        message="Are you sure you want to permanently remove this delivery method from the list?"
        confirmText="Yes, delete it"
        cancelText="canceled"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
