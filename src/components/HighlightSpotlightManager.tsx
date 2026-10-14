import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Save, 
  Package, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Type,
  ArrowRight
} from 'lucide-react';
import { Product, EcomSettings, HighlightSpotlightSettings } from '../types';
import { dbService } from '../lib/dbService';
import { DEFAULT_HIGHLIGHT_SPOTLIGHT_SETTINGS } from '../lib/constants';

interface HighlightSpotlightManagerProps {
  products: Product[];
  onSettingsUpdated?: () => void;
}

export default function HighlightSpotlightManager({ products, onSettingsUpdated }: HighlightSpotlightManagerProps) {
  const [ecomSettings, setEcomSettings] = useState<EcomSettings | null>(null);
  const [highlight, setHighlight] = useState<HighlightSpotlightSettings>(DEFAULT_HIGHLIGHT_SPOTLIGHT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Extract unique categories from products
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    if (ecomSettings?.categories) {
      ecomSettings.categories.forEach(c => set.add(c));
    }
    return Array.from(set);
  }, [products, ecomSettings]);

  // Load Settings from Firestore
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const settings = await dbService.getEcomSettings();
        setEcomSettings(settings);
        if (settings.highlightSpotlight) {
          setHighlight({
            ...DEFAULT_HIGHLIGHT_SPOTLIGHT_SETTINGS,
            ...settings.highlightSpotlight
          });
        }
      } catch (err) {
        console.error('Failed to load highlight spotlight settings:', err);
        setErrorMsg('Failed to load settings from database.');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  // Selected Target Product Details
  const selectedProduct = useMemo(() => {
    if (!highlight.productId) return products[0] || null;
    return products.find(p => p.id === highlight.productId) || products[0] || null;
  }, [products, highlight.productId]);

  // Auto-fill from Product
  const handleAutoFillFromProduct = () => {
    if (!selectedProduct) return;
    setHighlight(prev => ({
      ...prev,
      title: selectedProduct.title,
      subtitle: selectedProduct.description ? selectedProduct.description.slice(0, 160) + '...' : prev.subtitle,
      badgeTag: selectedProduct.category ? `${selectedProduct.category.toUpperCase()} HIGHLIGHT` : prev.badgeTag,
      buttonText: 'EXPLORE NOW'
    }));
  };

  // Auto-fill from Category
  const handleAutoFillFromCategory = (catName: string) => {
    const prodsInCat = products.filter(p => p.category?.toLowerCase() === catName.toLowerCase());
    setHighlight(prev => ({
      ...prev,
      categoryName: catName,
      badgeTag: `${catName.toUpperCase()} COLLECTION`,
      title: `Discover Our Premium ${catName} Series`,
      subtitle: `Explore top-rated formulations crafted specifically for our ${catName} collection. (${prodsInCat.length} products available)`,
      buttonText: 'VIEW COLLECTION'
    }));
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      const current = await dbService.getEcomSettings();
      const updated: EcomSettings = {
        ...current,
        highlightSpotlight: {
          ...highlight,
          productId: highlight.targetType === 'product' ? (highlight.productId || selectedProduct?.id || '') : '',
          categoryName: highlight.targetType === 'category' ? (highlight.categoryName || categoryOptions[0] || '') : ''
        }
      };

      await dbService.saveEcomSettings(updated);
      setEcomSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      onSettingsUpdated?.();
    } catch (err: any) {
      console.error('Failed to save highlight spotlight settings:', err);
      setErrorMsg(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-medium text-slate-500">Loading Highlight Spotlight settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans max-w-6xl pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 ring-4 ring-teal-500/5">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Highlight Spotlight (Highlight Product / Category)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              The specific one on the home pageT PRoDuct or category This section to focus and promoteT confeegar
            </p>
          </div>
        </div>

        {/* Enable / Disable Switch */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700">
            {highlight.enabled ? 'Active' : 'Disabled'}
          </span>
          <button
            type="button"
            onClick={() => setHighlight(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              highlight.enabled ? 'bg-teal-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                highlight.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Highlight Spotlight settings successfully saved and updated on store page!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        
        {/* Card 1: Select Target Type (Product or Category) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              the target Type election (Focus Target)
            </h2>
          </div>

          {/* Toggle Product vs Category */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHighlight(prev => ({ ...prev, targetType: 'product' }))}
              className={`py-3.5 px-4 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs cursor-pointer transition-all ${
                highlight.targetType === 'product'
                  ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Highlight Product</span>
            </button>

            <button
              type="button"
              onClick={() => setHighlight(prev => ({ ...prev, targetType: 'category' }))}
              className={`py-3.5 px-4 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs cursor-pointer transition-all ${
                highlight.targetType === 'category'
                  ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Highlight Category</span>
            </button>
          </div>

          {/* If Product Mode */}
          {highlight.targetType === 'product' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Target pRoSelect the duct:
                </label>
                <button
                  type="button"
                  onClick={handleAutoFillFromProduct}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-fill Product Details
                </button>
              </div>
              <select
                value={highlight.productId || ''}
                onChange={(e) => {
                  const pid = e.target.value;
                  const prod = products.find(p => p.id === pid);
                  setHighlight(prev => ({
                    ...prev,
                    productId: pid,
                    title: prod?.title || prev.title
                  }));
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all cursor-pointer"
              >
                {products.length === 0 ? (
                  <option value="">No products found</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (price: Tk.{p.price.toLocaleString()})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* If Category Mode */}
          {highlight.targetType === 'category' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                the target category select:
              </label>
              <select
                value={highlight.categoryName || ''}
                onChange={(e) => {
                  const cat = e.target.value;
                  handleAutoFillFromCategory(cat);
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all cursor-pointer"
              >
                {categoryOptions.length === 0 ? (
                  <option value="">No categories found</option>
                ) : (
                  categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>

        {/* Card 2: Presentation Text & Badge */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Type className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">Title and description text</h2>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Header Badge Tag:</label>
            <input
              type="text"
              value={highlight.badgeTag || ''}
              onChange={(e) => setHighlight(prev => ({ ...prev, badgeTag: e.target.value }))}
              placeholder="e.g. BRANDINI SEOUL TOWER / FEATURED SERIES"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Section Title:</label>
            <input
              type="text"
              value={highlight.title || ''}
              onChange={(e) => setHighlight(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Welcome to Brandini Co., Ltd. Seoul Headquarters"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Description:</label>
            <textarea
              rows={3}
              value={highlight.subtitle || ''}
              onChange={(e) => setHighlight(prev => ({ ...prev, subtitle: e.target.value }))}
              placeholder="e.g. Please stay in touch with us so we can serve you more."
              className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-teal-500 focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Button Label:</label>
            <input
              type="text"
              value={highlight.buttonText || 'JOIN NOW'}
              onChange={(e) => setHighlight(prev => ({ ...prev, buttonText: e.target.value }))}
              placeholder="JOIN NOW / EXPLORE NOW"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-teal-500 focus:outline-none uppercase"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}
