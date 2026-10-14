import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { 
  User, CheckCircle, Phone, Mail, MapPin, Lock, ShieldCheck,
  Building2, KeyRound, QrCode, Receipt, ChevronDown, Download,
  Image as ImageIcon, Upload, X, Palette, Store, Check, Sparkles, Share2
} from 'lucide-react';
import { dbService } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { compressImage } from '../lib/imageUtils';
import { uploadDataUrlToStorage } from '../lib/storageService';

interface ProfileSettingsProps {
  adminEmail: string;
}

const BRAND_COLOR_PRESETS = [
  { name: 'Rose Red (Default)', hex: '#e11d48' },
  { name: 'Teal Green', hex: '#0f766e' },
  { name: 'Emerald Green', hex: '#16a34a' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Indigo Purple', hex: '#6366f1' },
  { name: 'Deep Orange', hex: '#ea580c' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Slate Dark', hex: '#0f172a' },
];

export default function ProfileSettings({ adminEmail }: ProfileSettingsProps) {
  // Store Details state
  const [storeName, setStoreName] = useState('F A И T I И E');
  const [companyName, setCompanyName] = useState('Brandini Co., Ltd.');
  const [storeTagline, setStoreTagline] = useState('Brandini Co., Ltd. • Seoul, Republic of Korea. Clinical Hanbang Skincare & Botanical Whitening Solutions.');
  const [topAnnouncementText, setTopAnnouncementText] = useState('WELCOME TO BRANDINI CO.,LTD');
  const [phone, setPhone] = useState('+82 (02) 884-9021');
  const [email, setEmail] = useState('FANTINE@BRANDINI.CO.KR');
  const [street, setStreet] = useState('9F, Gangnamjeil Bldg, 109, Teheran-ro, Gangnam-gu, Seoul, Republic of Korea');
  const [industry, setIndustry] = useState('Cosmetics & Skincare');

  // Social Media Links state
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com');
  const [youtubeUrl, setYoutubeUrl] = useState('https://youtube.com');
  const [twitterUrl, setTwitterUrl] = useState('https://twitter.com');
  const [tiktokUrl, setTiktokUrl] = useState('https://tiktok.com');
  const [linkedinUrl, setLinkedinUrl] = useState('https://linkedin.com');
  const [whatsappNumber, setWhatsappNumber] = useState('+82 (02) 884-9021');

  // Store Identity & Branding state
  const [storeLogo, setStoreLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#93c5fd');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Additional settings
  const [bearingRollLocation, setBearingRollLocation] = useState('Seoul');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [info, ecomSettings] = await Promise.all([
          dbService.getInstituteInfo(),
          dbService.getEcomSettings()
        ]);

        if (info) {
          if (info.name) setCompanyName(info.name);
          if (info.phone) setPhone(info.phone);
          if (info.email) setEmail(info.email);
          if (info.address) setStreet(info.address);
          if (info.industry) setIndustry(info.industry);
          if (info.bearingRollLocation) setBearingRollLocation(info.bearingRollLocation);
          if (info.description) setStoreTagline(info.description);
          if (info.logo) setStoreLogo(info.logo);
        }

        if (ecomSettings) {
          if (ecomSettings.storeName) setStoreName(ecomSettings.storeName);
          if (ecomSettings.companyName) setCompanyName(ecomSettings.companyName);
          if (ecomSettings.storeLogo) setStoreLogo(ecomSettings.storeLogo);
          if (ecomSettings.storeTagline) setStoreTagline(ecomSettings.storeTagline);
          if (ecomSettings.topAnnouncementText) setTopAnnouncementText(ecomSettings.topAnnouncementText);
          if (ecomSettings.contactEmail) setEmail(ecomSettings.contactEmail);
          if (ecomSettings.contactPhone) setPhone(ecomSettings.contactPhone);
          if (ecomSettings.storeAddress) setStreet(ecomSettings.storeAddress);
          if (ecomSettings.primaryColor) setPrimaryColor(ecomSettings.primaryColor);
          if (ecomSettings.maintenanceMode !== undefined) setMaintenanceMode(ecomSettings.maintenanceMode);
          if (ecomSettings.socialLinks) {
            if (ecomSettings.socialLinks.facebook !== undefined) setFacebookUrl(ecomSettings.socialLinks.facebook);
            if (ecomSettings.socialLinks.instagram !== undefined) setInstagramUrl(ecomSettings.socialLinks.instagram);
            if (ecomSettings.socialLinks.youtube !== undefined) setYoutubeUrl(ecomSettings.socialLinks.youtube);
            if (ecomSettings.socialLinks.twitter !== undefined) setTwitterUrl(ecomSettings.socialLinks.twitter);
            if (ecomSettings.socialLinks.tiktok !== undefined) setTiktokUrl(ecomSettings.socialLinks.tiktok);
            if (ecomSettings.socialLinks.linkedin !== undefined) setLinkedinUrl(ecomSettings.socialLinks.linkedin);
            if (ecomSettings.socialLinks.whatsapp !== undefined) setWhatsappNumber(ecomSettings.socialLinks.whatsapp);
          }
        }

        if (auth?.currentUser) {
          setDisplayName(auth.currentUser.displayName || '');
        }

      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const compressedFile = await compressImage(file, 500);
      const downloadUrl = await uploadDataUrlToStorage(compressedFile, `store_assets/logo_${Date.now()}.jpg`);
      setStoreLogo(downloadUrl);
      setSuccessMsg('Logo loaded successfully! Click "Update Settings" to save.');
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setErrorMsg('Logo upload failed.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const oldInst = await dbService.getInstituteInfo() || {} as any;
      await dbService.saveInstituteInfo({
        ...oldInst,
        name: companyName || storeName,
        logo: storeLogo,
        description: storeTagline,
        phone,
        email,
        address: street,
        street,
        industry,
        bearingRollLocation
      });

      const oldEcom = await dbService.getEcomSettings() || {} as any;
      await dbService.saveEcomSettings({
        ...oldEcom,
        storeName,
        companyName,
        storeLogo,
        storeTagline,
        topAnnouncementText,
        contactEmail: email,
        contactPhone: phone,
        storeAddress: street,
        footerDescription: storeTagline,
        primaryColor,
        maintenanceMode,
        socialLinks: {
          facebook: facebookUrl,
          instagram: instagramUrl,
          youtube: youtubeUrl,
          twitter: twitterUrl,
          tiktok: tiktokUrl,
          linkedin: linkedinUrl,
          whatsapp: whatsappNumber
        }
      });

      // Dynamically update favicon based on store logo
      if (storeLogo) {
        let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = storeLogo;
      }

      if (auth?.currentUser && displayName.trim()) {
        try {
          await updateProfile(auth.currentUser, { displayName: displayName.trim() });
        } catch (profileErr) {
          console.warn('Could not update Auth displayName:', profileErr);
        }
      }

      setIsSaving(false);
      setSuccessMsg('Store identity, company details, footer & contact info updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Error saving profile settings:', err);
      setErrorMsg(err.message || 'Failed to save settings.');
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setIsChangingPass(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({ currentPassword: currentPassword || '', newPassword })
      });

      if (!res.ok) {
        let msg = 'Failed to change password';
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch {
          // fallback
        }
        throw new Error(msg);
      }

      setSuccessMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg('Password change failed: ' + (err.message || 'Please try again.'));
    } finally {
      setIsChangingPass(false);
    }
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading profile settings..." size="md" />
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Admin Profile & Store Settings</h2>
        <p className="text-slate-500 text-xs mt-0.5">Manage your store branding, footer info, contact details and admin info</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-fadeIn">
          <X className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Store & Footer Identity</h3>
            <p className="text-slate-500 text-xs mt-1">Changes here will immediately appear in the website header, footer, and Contact Us page.</p>
            <div className="h-px bg-slate-100 mt-4 mb-6" />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Store Name</label>
                <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-semibold"
                    placeholder="e.g. F A И T I И E"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Company Name</label>
                <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-semibold"
                    placeholder="e.g. Brandini Co., Ltd."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Footer & Store Tagline</label>
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                  <Sparkles className="h-5 w-5 text-slate-400" />
                </div>
                <textarea
                  value={storeTagline}
                  onChange={(e) => setStoreTagline(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none min-h-[80px] resize-y"
                  placeholder="e.g. Brandini Co., Ltd. • Seoul, Republic of Korea. Clinical Hanbang Skincare & Botanical Whitening Solutions."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Customer Care Phone</label>
                <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-mono"
                    placeholder="e.g. +82 (02) 884-9021"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Contact Email</label>
                <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-mono"
                    placeholder="e.g. FANTINE@BRANDINI.CO.KR"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Top Bar Announcement Text</label>
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Sparkles className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={topAnnouncementText}
                  onChange={(e) => setTopAnnouncementText(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-semibold uppercase tracking-wider"
                  placeholder="e.g. WELCOME TO BRANDINI CO.,LTD"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Address</label>
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none"
                  placeholder="e.g. 9F, Gangnamjeil Bldg, 109, Teheran-ro, Gangnam-gu, Seoul, Republic of Korea"
                />
              </div>
            </div>

            {/* Social Media Links Section */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-blue-600" />
                  Social Media Links
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">These links will be directly added to the top announcement bar and footer social icons.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Instagram Profile URL</label>
                  <input
                    type="url"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/fantine"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">YouTube Channel URL</label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/@fantine"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Twitter / X Profile URL</label>
                  <input
                    type="url"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    placeholder="https://twitter.com/fantine"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">TikTok Profile URL</label>
                  <input
                    type="url"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    placeholder="https://tiktok.com/@fantine"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Facebook Page URL</label>
                  <input
                    type="url"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/fantine"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">WhatsApp Contact / Number</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+82 (02) 884-9021 or https://wa.me/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-[6px]">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    Maintenance Mode
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    When enabled, a maintenance notice will be displayed to all customers.
                  </p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="maintenance_toggle"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <label htmlFor="maintenance_toggle" className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                Store Logo
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-6">
                  {storeLogo ? (
                    <div className="relative group">
                      <img 
                        src={storeLogo} 
                        alt="Store Logo" 
                        className="h-16 w-auto max-w-[12rem] object-contain bg-slate-50 border border-slate-200 rounded-lg p-2 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setStoreLogo('')}
                        className="absolute -top-2 -right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Logo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-14 w-32 bg-slate-100 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-bold">
                      No Logo
                    </div>
                  )}

                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-200">
                    <Upload className="h-3.5 w-3.5 text-slate-600" />
                    <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1 max-w-lg">
                  <label className="text-[11px] font-semibold text-slate-500">Or Direct Logo Image Link (URL):</label>
                  <input
                    type="url"
                    value={storeLogo}
                    onChange={(e) => setStoreLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              disabled={isSaving}
              className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSaving ? 'Updating...' : 'Update Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
