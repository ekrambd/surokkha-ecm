import React, { useState, useEffect } from 'react';
import { EcomSettings, AboutPageSettings } from '../types';
import { dbService } from '../lib/dbService';
import { DEFAULT_ABOUT_SETTINGS } from '../lib/constants';
import { compressImage } from '../lib/imageUtils';
import { uploadDataUrlToStorage } from '../lib/storageService';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { 
  Save, Upload, Image as ImageIcon, FileText, Type, X
} from 'lucide-react';

export default function AboutUsManager() {
  const [settings, setSettings] = useState<AboutPageSettings>(DEFAULT_ABOUT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const ecom: EcomSettings = await dbService.getEcomSettings();
        if (ecom?.aboutSettings) {
          const loaded = ecom.aboutSettings;
          const merged: AboutPageSettings = {
            ...DEFAULT_ABOUT_SETTINGS,
            ...loaded,
            title: loaded.title || loaded.heroTitle || DEFAULT_ABOUT_SETTINGS.title,
            subtitle: loaded.subtitle || loaded.heroSubtitle || DEFAULT_ABOUT_SETTINGS.subtitle,
            content: loaded.content || [
              loaded.storyParagraph1,
              loaded.storyParagraph2,
              loaded.storyParagraph3
            ].filter(Boolean).join('\n\n') || DEFAULT_ABOUT_SETTINGS.content,
            image: loaded.image || loaded.heroImage || DEFAULT_ABOUT_SETTINGS.image
          };
          setSettings(merged);
        } else {
          setSettings(DEFAULT_ABOUT_SETTINGS);
        }
      } catch (err) {
        console.error('Failed to load about settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const compressed = await compressImage(file, 1400, 0.85);
      const downloadUrl = await uploadDataUrlToStorage(compressed, `about_banner_${Date.now()}`);
      setSettings(prev => ({ ...prev, image: downloadUrl, heroImage: downloadUrl }));
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Image upload complete',
        message: 'Banner image uploaded successfully.'
      });
    } catch (uploadErr) {
      console.error('Image upload failed:', uploadErr);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Upload failed',
        message: 'Failed to upload image. Please check the size.'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Save handler
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const currentEcom = await dbService.getEcomSettings();

      const updatedAboutSettings: AboutPageSettings = {
        ...currentEcom.aboutSettings,
        ...settings,
        title: settings.title || 'about us',
        subtitle: settings.subtitle || '',
        content: settings.content || '',
        image: settings.image || '',
        heroTitle: settings.title || 'about us',
        heroSubtitle: settings.subtitle || '',
        heroImage: settings.image || '',
        storyParagraph1: settings.content || ''
      };

      await dbService.saveEcomSettings({
        ...currentEcom,
        aboutSettings: updatedAboutSettings
      });

      window.dispatchEvent(new CustomEvent('ecom-settings-updated'));

      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Saved successfully',
        message: 'About us page information has been successfully saved.'
      });
    } catch (err: any) {
      console.error('Save failed:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save failed',
        message: 'There was a problem saving content. Try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Loading information about us...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
            <FileText className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">about us</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Enter your store contact and description with a simple text editor।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                save
              </>
            )}
          </button>
        </div>
      </div>

      {/* SIMPLE CLEAN FORM */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        
        {/* 1. Page Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            ShiRoname <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Type className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              placeholder="about us"
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* 2. Subtitle / Tagline */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Sub-ShRoname or tagline
          </label>
          <input
            type="text"
            value={settings.subtitle || ''}
            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
            placeholder="Trusted destination for premium quality and authentic products"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
          />
        </div>

        {/* 3. Main Text Editor / Content */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              about us details <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {(settings.content || '').length} letters
            </span>
          </div>
          <textarea
            rows={12}
            value={settings.content || ''}
            onChange={(e) => setSettings({ ...settings, content: e.target.value })}
            placeholder="Enter details about your company or store here..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-sans resize-y"
          />
          <p className="text-[11px] text-slate-400">
            💡 TPos: perT One in the middle to separate paragraphsT Enter a blank line।
          </p>
        </div>

        {/* 4. Banner / Cover Image (Optional) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            banner picture (optional)
          </label>
          
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors shrink-0">
              <Upload className="w-4 h-4" />
              {uploadingImage ? 'Uploading...' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>

            {settings.image && (
              <button
                type="button"
                onClick={() => setSettings({ ...settings, image: '', heroImage: '' })}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                title="Delete the picture"
              >
                <X className="w-4 h-4" />
                picture remove
              </button>
            )}
          </div>

          {settings.image && (
            <div className="mt-3 relative inline-block rounded-xl overflow-hidden border border-slate-200 max-h-56 max-w-md">
              <img src={settings.image} alt="Banner Preview" className="h-44 w-full object-cover rounded-lg" />
            </div>
          )}
        </div>

      </div>

      {/* Feedback modal */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        onClose={() => setFeedback({ ...feedback, isOpen: false })}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
