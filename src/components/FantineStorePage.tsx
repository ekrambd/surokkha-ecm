import { dbService } from "../lib/dbService";
//fix pixel event 2

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShoppingBag, User, Search, ChevronDown, ChevronLeft, ChevronRight,
  ArrowRight, ArrowLeft, Heart, Star, Check, Sparkles, X, Plus, Minus,
  ShieldCheck, Truck, RefreshCw, Send, HelpCircle, Eye, Share2, Award,
  Phone, Mail, Globe, Droplet, Sun, Moon, Zap, Flame, Layers, MessageCircle, ArrowUp, MapPin, ZoomIn, Clock,
  Building2, BookOpen, Microscope, Quote, Sprout, FlaskConical, CreditCard, Smartphone, Copy, Tag,
  Play, Pause, Volume2, VolumeX, Menu
} from 'lucide-react';
import { trackEvent, createEventId } from '../lib/pixelGtmService';
import { Product, BookOrder, EcomSettings, InstituteInfo, ContactMessage, AboutPageSettings, DeliveryMethodItem, PaymentGatewayItem, Coupon } from '../types';
import { publicStoreService, optimizeImageUrl } from '../lib/publicStoreService';
import { DEFAULT_ABOUT_SETTINGS, DEFAULT_DELIVERY_METHODS, DEFAULT_PAYMENT_GATEWAYS } from '../lib/constants';
import { ProductSearchEngine, HANBANG_INGREDIENT_DATABASE, IngredientMeta } from '../lib/searchIndex';
import { useAppStore } from '../store/useAppStore';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { updateMetaTags, updateProductSchema, getProductSlug } from '../lib/seoUtils';
import ResponsiveImage from './ResponsiveImage';
import CheckoutPage from './CheckoutPage';
import { DoctorFloatingTrigger } from './ai/DoctorFloatingTrigger';
import { SkincareDoctorModal } from './ai/SkincareDoctorModal';
import { SkinQuizView } from './SkinQuizView';

const FantineFooter = React.lazy(() => import('./FantineFooter'));

interface FantineStorePageProps {
  onGoToLogin?: () => void;
  onGoToLanding?: () => void;
}

export interface FantineProductItem extends Product {
  series: string;
  isSet?: boolean;
  benefitsHighlights?: string;
  howToUse?: string;
}


// Full Korean Skincare Catalog matching all screenshots
const FANTINE_PRODUCTS: FantineProductItem[] = [
  // 1. Rapid Acne Treatment Series (Screenshot from product_385231.html)
  {
    id: 'product_385231',
    title: 'Rapid Acne Treatment Toner',
    author: 'FANTINE Laboratory',
    regularPrice: 22.00,
    price: 18.50,
    discountPercentage: 16,
    stockQuantity: 50,
    category: 'Rapid Acne Treatment Series',
    series: 'Rapid Acne Treatment Series',
    coverImage: 'https://images.unsplash.com/photo-1608248597359-0098f98a329d?w=800&auto=format&fit=crop&q=85',
    additionalImages: [
      'https://images.unsplash.com/photo-1608248597359-0098f98a329d?w=800&auto=format&fit=crop&q=85',
      'https://images.unsplash.com/photo-1556228722-d9b3be373b5f?w=800&auto=format&fit=crop&q=85',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=85'
    ],
    description: 'Cleanses excess oil to promote skin metabolism, removes dead skin cells, unclogs pores, and fades acne marks',
    benefitsHighlights: 'Selected acne-fighting agents & acne nemesis, powerfully combined, offering five benefits in one (oil control, unclogging, antibacterial, anti-inflammatory, astringent), for comprehensive acne care.',
    howToUse: 'Pour one teaspoon directly into the palm of your hand and gently pat it onto the skin until fully absorbed',
    badge: 'Oil Control',
    rating: 4.9,
    reviewsCount: 142,
    isFeatured: true
  },

  // 2. Ultimate Calming Solution Series
  {
    id: 'fantine-cream',
    title: 'Ultimate Calming Solution Cream',
    author: 'FANTINE Laboratory',
    regularPrice: 24.99,
    price: 20.99,
    discountPercentage: 16,
    stockQuantity: 45,
    category: 'Face Cream',
    series: 'Ultimate Calming Solution Series',
    coverImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=85',
    additionalImages: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=85',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop&q=85'
    ],
    description: 'Ultimate Calming Solution Face Cream with concentrated Aloe Vera, Centella Asiatica, and botanical Hanbang phyto-extracts. Soothes irritation and locks in continuous 48-hour hydration.',
    benefitsHighlights: 'Infused with cold-extracted aloe juice and madecassoside for rapid dermal calming and skin barrier restoration.',
    howToUse: 'Apply a dime-sized amount morning and evening onto face and neck as the final step in your skincare ritual.',
    badge: 'Best Seller',
    rating: 4.9,
    reviewsCount: 128,
    isFeatured: true
  },
  {
    id: 'fantine-cleanser',
    title: 'Ultimate Calming Solution Face Cleanser',
    author: 'FANTINE Laboratory',
    regularPrice: 14.80,
    price: 12.18,
    discountPercentage: 18,
    stockQuantity: 60,
    category: 'Cleanser',
    series: 'Ultimate Calming Solution Series',
    coverImage: 'https://images.unsplash.com/photo-1556228722-d9b3be373b5f?w=800&auto=format&fit=crop&q=85',
    additionalImages: [
      'https://images.unsplash.com/photo-1556228722-d9b3be373b5f?w=800&auto=format&fit=crop&q=85'
    ],
    description: 'Mild micro-foam foaming cleanser with amino acids and calming tea tree extract. Gently melts impurities while preserving the delicate skin moisture barrier.',
    benefitsHighlights: 'Non-stripping low-pH formulation that cleanses pores without dryness or tightness.',
    howToUse: 'Lather a small amount with warm water, gently massage across damp face in circular motions, and rinse clean.',
    badge: 'Popular',
    rating: 4.8,
    reviewsCount: 94,
    isFeatured: true
  },
  {
    id: 'fantine-toner',
    title: 'Ultimate Calming Solution Toner',
    author: 'FANTINE Laboratory',
    regularPrice: 18.80,
    price: 16.68,
    discountPercentage: 11,
    stockQuantity: 50,
    category: 'Toner',
    series: 'Ultimate Calming Solution Series',
    coverImage: 'https://images.unsplash.com/photo-1608248597359-0098f98a329d?w=800&auto=format&fit=crop&q=85',
    additionalImages: [
      'https://images.unsplash.com/photo-1608248597359-0098f98a329d?w=800&auto=format&fit=crop&q=85'
    ],
    description: 'Botanical essence toner balancing skin pH with green tea leaf infusion and 8-layer hyaluronic acid for instant dewy glass-skin glow.',
    benefitsHighlights: 'Restores skin pH balance post-cleansing and preps skin layers for maximum serum absorption.',
    howToUse: 'Sweep over face with a cotton pad or pat gently with fingertips.',
    badge: 'Trending',
    rating: 4.9,
    reviewsCount: 156,
    isFeatured: true
  },
  {
    id: 'fantine-essence',
    title: 'Ultimate Calming Solution Essence',
    author: 'FANTINE Laboratory',
    regularPrice: 22.50,
    price: 19.80,
    discountPercentage: 12,
    stockQuantity: 40,
    category: 'Serum',
    series: 'Ultimate Calming Solution Series',
    coverImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=85',
    additionalImages: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=85'
    ],
    description: 'Concentrated antioxidant pearl elixir infused with Korean Red Ginseng and fermented rice extract for cellular renewal and antioxidant barrier shield.',
    benefitsHighlights: 'Micro-encapsulated active pearls that burst on contact to deliver deep hydration and elasticity.',
    howToUse: 'Dispense 2-3 drops onto face and press gently until pearls dissolve completely.',
    badge: 'Hanbang Care',
    rating: 5.0,
    reviewsCount: 210,
    isFeatured: true
  },

  // 3. Ultra Repair Series (Screenshot 3 & 4)
  {
    id: 'fantine-mask',
    title: 'Ultra Repair Face Mask',
    author: 'FANTINE Laboratory',
    regularPrice: 19.00,
    price: 16.00,
    discountPercentage: 16,
    stockQuantity: 80,
    category: 'Ultra Repair Series',
    series: 'Ultra Repair Series',
    coverImage: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=85',
    additionalImages: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=85'
    ],
    description: 'Pro-Ceramide bio-cellulose intensive recovery mask. Deeply replenishes depleted moisture and accelerates skin barrier regeneration.',
    benefitsHighlights: 'Delivers 30ml of concentrated recovery essence in an ultra-adherent biocellulose sheet.',
    howToUse: 'Apply to cleansed face for 15-20 minutes. Remove and pat excess serum into skin.',
    badge: 'New Arrival',
    rating: 4.9,
    reviewsCount: 88,
    isFeatured: true
  },
  {
    id: 'fantine-repair-essence',
    title: 'Ultra Repair Essence',
    author: 'FANTINE Laboratory',
    regularPrice: 23.00,
    price: 19.80,
    discountPercentage: 14,
    stockQuantity: 55,
    category: 'Serum',
    series: 'Ultra Repair Series',
    coverImage: 'https://images.unsplash.com/photo-1608248597359-0098f98a329d?w=800&auto=format&fit=crop&q=85',
    description: 'Advanced dual-action repair essence targeting micro-dermal cracks, dehydration, and environmental redness.',
    benefitsHighlights: '5 essential ceramides and panthenol for intense barrier strengthening.',
    howToUse: 'Apply after toner both morning and night.',
    badge: 'Pro-Ceramide',
    rating: 4.9,
    reviewsCount: 112,
    isFeatured: true
  },
  {
    id: 'fantine-night-cream',
    title: 'Ultra Repair Night Cream',
    author: 'FANTINE Laboratory',
    regularPrice: 28.00,
    price: 25.39,
    discountPercentage: 9,
    stockQuantity: 35,
    category: 'Face Cream',
    series: 'Ultra Repair Series',
    coverImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=85',
    description: 'Overnight cell-rejuvenating cream enriched with phytosphingosine and squalane for plump, velvety-soft morning skin.',
    benefitsHighlights: 'Rich overnight mask-balm texture that seals in nutrients during restorative sleep cycles.',
    howToUse: 'Smooth generously over face before bedtime.',
    badge: 'Night Ritual',
    rating: 5.0,
    reviewsCount: 146,
    isFeatured: true
  },

  // 4. Whitening and Brightening Series
  {
    id: 'fantine-serum-vc',
    title: 'VC Brightening Serum (Pure Vitamin C)',
    author: 'FANTINE Laboratory',
    regularPrice: 29.00,
    price: 24.50,
    discountPercentage: 15,
    stockQuantity: 35,
    category: 'Serum',
    series: 'Whitening and Brightening Series',
    coverImage: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800&auto=format&fit=crop&q=85',
    description: 'Dermatological skincare formula featuring stabilized 15% Pure Vitamin C & Ferulic Acid. Deeply penetrates to fade hyperpigmentation and reveal radiant brightness.',
    benefitsHighlights: 'Antioxidant strong penetration with clinical 4-week dark spot fade efficacy.',
    howToUse: 'Apply 3-4 drops onto clean, dry skin in the morning followed by sunscreen.',
    badge: 'Derm Approved',
    rating: 4.9,
    reviewsCount: 188,
    isFeatured: true
  },

  // 5. Sunscreen Series
  {
    id: 'fantine-sunscreen',
    title: 'Botanical UV Shield Sunscreen SPF 50+ PA++++',
    author: 'FANTINE Laboratory',
    regularPrice: 23.00,
    price: 19.00,
    discountPercentage: 17,
    stockQuantity: 65,
    category: 'Sunscreen Series',
    series: 'Sunscreen Series',
    coverImage: 'https://images.unsplash.com/photo-1556228722-d9b3be373b5f?w=800&auto=format&fit=crop&q=85',
    description: 'Ultra-lightweight physical & botanical hybrid sunscreen with zero white cast, velvet matte finish, and all-day UVA/UVB photo-shield.',
    benefitsHighlights: 'Non-comedogenic reef-safe formula with antioxidant green tea extract.',
    howToUse: 'Apply liberally 15 minutes before sun exposure. Reapply every 2 hours.',
    badge: 'SPF 50+',
    rating: 4.9,
    reviewsCount: 175,
    isFeatured: true
  }
];

export const DEFAULT_FANTINE_FALLBACK_IMAGE = '/uploads/file-1791830876714-429462367.jpg';

export const FANTINE_CURATED_IMAGES = [
  '/uploads/file-1791830876714-429462367.jpg',
  '/uploads/file-1791830762714-399075316.jpg',
  '/uploads/file-1791830989305-696330059.jpg',
  '/uploads/file-1791831243256-923954313.jpg',
  '/uploads/file-1791830588893-187058483.jpg',
  '/uploads/file-1791826953559-621616270.jpg',
  '/uploads/file-1791822354692-346436357.jpg',
  '/uploads/file-1791827320010-515338106.jpg',
  '/uploads/file-1791823814770-967689183.jpg'
];

export const getSafeSkincareImage = (rawImg?: any, indexOrSeed?: number | string): string => {
  if (!rawImg || typeof rawImg !== 'string' || !rawImg.trim()) {
    if (typeof indexOrSeed === 'number') {
      return FANTINE_CURATED_IMAGES[Math.abs(indexOrSeed) % FANTINE_CURATED_IMAGES.length];
    }
    return DEFAULT_FANTINE_FALLBACK_IMAGE;
  }
  const trimmed = rawImg.trim();
  // Filter out broken placeholder / legacy bookstore URLs
  if (
    trimmed.includes('photo-1544716278-ca5e3f4abd8c') ||
    trimmed.includes('/watch.jpg') ||
    trimmed.includes('/book.png') ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    if (typeof indexOrSeed === 'number') {
      return FANTINE_CURATED_IMAGES[Math.abs(indexOrSeed) % FANTINE_CURATED_IMAGES.length];
    }
    return DEFAULT_FANTINE_FALLBACK_IMAGE;
  }
  return trimmed;
};

export const normalizeFantineProduct = (p: Product, index: number = 0): FantineProductItem => {
  const price = typeof p.price === 'number' ? p.price : (Number(p.price) || 19.99);
  const regularPrice = p.regularPrice ? (typeof p.regularPrice === 'number' ? p.regularPrice : Number(p.regularPrice)) : undefined;
  const discountPercentage = p.discountPercentage || (regularPrice && regularPrice > price ? Math.round(((regularPrice - price) / regularPrice) * 100) : undefined);
  
  const rawCover = (p as any).coverImage || p.image || (p as any).imageUrl || ((p as any).images && (p as any).images[0]) || ((p as any).samplePages && (p as any).samplePages[0]);
  const coverImage = getSafeSkincareImage(rawCover, index);
  
  const rawAdditional = (p as any).additionalImages || (p as any).images || (p as any).samplePages;
  const additionalImages = Array.isArray(rawAdditional) && rawAdditional.length > 0 
    ? rawAdditional.map((img: string, i: number) => getSafeSkincareImage(img, i))
    : [coverImage];

  return {
    ...p,
    id: p.id || `prod_${Date.now()}_${index}`,
    title: p.title || 'Korean Hanbang Skincare Formula',
    author: (p as any).author || p.brand || 'FANTINE Laboratory',
    regularPrice,
    price,
    discountPercentage,
    stockQuantity: p.stockQuantity ?? p.stock ?? 50,
    category: p.category || 'Skincare',
    series: (p as any).series || p.category || 'Luxury Hanbang Series',
    coverImage,
    additionalImages,
    description: p.description || p.shortSummary || 'Clinically formulated luxury Korean skincare powered by traditional Hanbang botanical extracts.',
    benefitsHighlights: (p as any).benefitsHighlights || p.shortSummary || 'Offers high-potency cellular nourishment, barrier restoration, and long-lasting glass-skin radiance.',
    howToUse: (p as any).howToUse || 'Apply gently onto cleansed face and neck in morning and evening skincare routine until fully absorbed.',
    badge: (p as any).badge || (p.isFeatured ? 'Featured' : undefined),
    rating: p.rating || 4.9,
    reviewsCount: p.reviewsCount || 88,
    isFeatured: p.isFeatured ?? true
  };
};

const DEFAULT_SHOP_CATEGORIES = [
  'All',
  'Sunscreen Series',
  'Ultra Repair Series',
  'Ultimate Calming Solution Series',
  'Cleanser',
  'Deep Hydration Series',
  'Serum',
  'Face Cream',
  'Rapid Acne Treatment Series',
  'Whitening and Brightening Series'
];

function extractYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return match[1];
  }
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}


export default function FantineStorePage({ onGoToLogin, onGoToLanding }: FantineStorePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId, slug: routeSlug } = useParams<{ id?: string; slug?: string }>();

  // Navigation View: 'home' | 'shop' | 'about' | 'contact' | 'product_detail' | 'checkout' | 'quiz'
  const [activeNav, setActiveNav] = useState<'home' | 'shop' | 'about' | 'contact' | 'product_detail' | 'checkout' | 'quiz'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.startsWith('/product')) return 'product_detail';
      if (p.startsWith('/shop')) return 'shop';
      if (p.startsWith('/about')) return 'about';
      if (p.startsWith('/contact')) return 'contact';
      if (p.startsWith('/quiz')) return 'quiz';
      if (p.startsWith('/checkout')) return 'checkout';
    }
    return 'home';
  });
  const [selectedCategoryCheckbox, setSelectedCategoryCheckbox] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<number>(50000); // Max range default
  const [quizPrompt, setQuizPrompt] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Dynamic Ecom Settings for Hero Banners & Videos
  const [ecomSettings, setEcomSettings] = useState<EcomSettings | null>(null);
  const [instituteInfo, setInstituteInfo] = useState<InstituteInfo | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // Dynamic Product State from Admin / DB (No Seed Data Overwriting)
  const [products, setProducts] = useState<FantineProductItem[]>(() => {
    try {
      const cached = localStorage.getItem('noor_ecom_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => normalizeFantineProduct(p, idx));
        }
      }
    } catch {
      // fallback
    }
    return FANTINE_PRODUCTS;
  });

  // Helper to find matching product from URL path or router params
  const findProductFromPath = useCallback((path: string, idParam?: string, slugParam?: string, productList: FantineProductItem[] = products) => {
    if (!productList || productList.length === 0) return null;
    const targetId = (idParam || '').toLowerCase();
    const targetSlug = (slugParam || '').toLowerCase();

    // 1. Direct match by ID
    if (targetId) {
      const directMatch = productList.find(p => p.id.toLowerCase() === targetId);
      if (directMatch) return directMatch;
    }

    // 2. Direct match by slug
    if (targetSlug) {
      const slugMatch = productList.find(p => {
        const pSlug = getProductSlug(p).toLowerCase();
        return pSlug === targetSlug || p.id.toLowerCase() === targetSlug;
      });
      if (slugMatch) return slugMatch;
    }

    // 3. Maybe targetId is actually a slug
    if (targetId) {
      const slugAsIdMatch = productList.find(p => {
        const pSlug = getProductSlug(p).toLowerCase();
        return pSlug === targetId;
      });
      if (slugAsIdMatch) return slugAsIdMatch;
    }

    // 4. Check if pathname contains any product id
    const pathLower = path.toLowerCase();
    const pathMatch = productList.find(p => pathLower.includes(p.id.toLowerCase()));
    if (pathMatch) return pathMatch;

    // 5. Check if pathname contains any product slug
    const pathSlugMatch = productList.find(p => {
      const pSlug = getProductSlug(p).toLowerCase();
      return pSlug.length > 3 && pathLower.includes(pSlug);
    });
    if (pathSlugMatch) return pathSlugMatch;

    return null;
  }, [products]);

  // Active Selected Product for Detail Page (Deep link aware on initial load)
  const [activeProductDetail, setActiveProductDetail] = useState<FantineProductItem>(() => {
    const initialList = products.length > 0 ? products : FANTINE_PRODUCTS;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product')) {
      const p = window.location.pathname;
      const found = initialList.find(prod => {
        const slug = getProductSlug(prod).toLowerCase();
        return p.includes(prod.id) || (slug.length > 3 && p.toLowerCase().includes(slug));
      });
      if (found) return found;
    }
    return initialList[0] || FANTINE_PRODUCTS[0];
  });
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [isHoverZooming, setIsHoverZooming] = useState<boolean>(false);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState<boolean>(false);
  const [aiDoctorSelectedProductIds, setAiDoctorSelectedProductIds] = useState<string[]>([]);
  const [aiDoctorContextProduct, setAiDoctorContextProduct] = useState<Product | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);


  // Sync Live Settings from dbService & publicStoreService
  const loadLiveSettings = async () => {
    try {
      const [settings, info] = await Promise.all([
        (await import('../lib/dbService')).dbService.getEcomSettings().catch(() => null),
        (await import('../lib/dbService')).dbService.getInstituteInfo().catch(() => null)
      ]);
      if (settings) setEcomSettings(settings);
      if (info) setInstituteInfo(info);
    } catch {
      // ignore
    }

    try {
      const [pubSettings, pubInfo] = await Promise.all([
        publicStoreService.getEcomSettings().catch(() => null),
        publicStoreService.getInstituteInfo().catch(() => null)
      ]);
      if (pubSettings) {
        setEcomSettings(prev => prev || pubSettings);
      }
      if (pubInfo) {
        setInstituteInfo(prev => prev || pubInfo);
      }
    } catch {
      // ignore
    }
  };

  // Sync Live Products from dbService & publicStoreService
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadLiveProducts = async () => {
    try {
      const dbProds = await dbService.getProducts();
      if (dbProds && dbProds.length > 0) {
        const normalized = dbProds.map((p, idx) => normalizeFantineProduct(p, idx));
        setProducts(normalized);
        setActiveProductDetail(prev => {
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product')) {
            const urlMatch = findProductFromPath(window.location.pathname, routeId, routeSlug, normalized);
            if (urlMatch) return urlMatch;
          }
          const match = normalized.find(p => p.id === prev?.id);
          return match || normalized[0];
        });
        return;
      }
    } catch (err) {
      console.warn('Failed loading from dbService:', err);
    }

    try {
      const pubProds = await publicStoreService.getProducts();
      if (pubProds && pubProds.length > 0) {
        const normalized = pubProds.map((p, idx) => normalizeFantineProduct(p, idx));
        setProducts(normalized);
        setActiveProductDetail(prev => {
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product')) {
            const urlMatch = findProductFromPath(window.location.pathname, routeId, routeSlug, normalized);
            if (urlMatch) return urlMatch;
          }
          const match = normalized.find(p => p.id === prev?.id);
          return match || normalized[0];
        });
      }
    } catch (err) {
      console.warn('Failed loading from publicStoreService:', err);
    }
  };



  useEffect(() => {
    loadLiveProducts();
    loadLiveSettings();

    const handleProductUpdate = () => {
      loadLiveProducts();
    };
    const handleSettingsUpdate = () => {
      loadLiveSettings();
    };

    window.addEventListener('ecom-products-updated', handleProductUpdate);
    window.addEventListener('ecom-settings-updated', handleSettingsUpdate);
    window.addEventListener('institute-info-updated', handleSettingsUpdate);
    window.addEventListener('storage', handleProductUpdate);
    return () => {
      window.removeEventListener('ecom-products-updated', handleProductUpdate);
      window.removeEventListener('ecom-settings-updated', handleSettingsUpdate);
      window.removeEventListener('institute-info-updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleProductUpdate);
    };
  }, []);

  // General States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currency] = useState<'BDT'>('BDT');
  
  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  // 10-Minute Cart Reservation Hold State
  const [reservationSeconds, setReservationSeconds] = useState<number>(600); // 10 mins

  // In-Memory Fast Search Index Instance
  const searchEngine = useMemo(() => new ProductSearchEngine(products), [products]);
  const searchOutput = useMemo(() => searchEngine.search(searchTerm), [searchEngine, searchTerm]);

  // Cart State (Zustand Global Store)
  const cart = useAppStore(state => state.cart);
  const addToCartAction = useAppStore(state => state.addToCart);
  const removeFromCartAction = useAppStore(state => state.removeFromCart);
  const updateQuantityAction = useAppStore(state => state.updateQuantity);
  const clearCartAction = useAppStore(state => state.clearCart);


  // Reservation Timer Countdown
  useEffect(() => {
    if (cart.length === 0) {
      setReservationSeconds(600);
      return;
    }

    const interval = setInterval(() => {
      setReservationSeconds(prev => {
        if (prev <= 1) {
          return 600; // auto-refresh hold
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cart.length]);

  // Contact Form State
  const [contactSenderName, setContactSenderName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Dynamic Store & Footer Brand Details (From Admin Profile / Store Setup)
  const displayStoreName = ecomSettings?.storeName || 'F A И T I И E';
  const displayStoreLogo = ecomSettings?.storeLogo || instituteInfo?.logo || '/logo_transparent.webp';
  const displayCompanyName = ecomSettings?.companyName || instituteInfo?.name || 'Brandini Co., Ltd.';
  const displayTagline = ecomSettings?.storeTagline || ecomSettings?.footerDescription || instituteInfo?.description || 'Brandini Co., Ltd. • Seoul, Republic of Korea. Clinical Hanbang Skincare & Botanical Whitening Solutions.';
  const displayEmail = ecomSettings?.contactEmail || instituteInfo?.email || 'FANTINE@BRANDINI.CO.KR';
  const displayPhone = ecomSettings?.contactPhone || instituteInfo?.phone || '+82 (02) 884-9021';
  const displayAddress = ecomSettings?.storeAddress || instituteInfo?.address || '9F, Gangnamjeil Bldg, 109, Teheran-ro, Gangnam-gu, Seoul, Republic of Korea';
  const displayAnnouncement = ecomSettings?.topAnnouncementText || `WELCOME TO ${(displayCompanyName || 'BRANDINI CO.,LTD').toUpperCase()}`;
  const socialLinks = ecomSettings?.socialLinks;
  const aboutSettings: AboutPageSettings = ecomSettings?.aboutSettings || DEFAULT_ABOUT_SETTINGS;

  // Dynamic Flash Sale Countdown Hook
  const flashSaleConfig = ecomSettings?.flashSale;
  const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTime = () => {
      const endDateStr = flashSaleConfig?.endDate;
      if (!endDateStr) {
        setFlashSaleTimeLeft({ days: 6, hours: 23, minutes: 59, seconds: 59 });
        return;
      }
      const diff = +new Date(endDateStr) - +new Date();
      if (diff > 0) {
        setFlashSaleTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        });
      } else {
        setFlashSaleTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [flashSaleConfig?.endDate]);

  // Dynamic Favicon and Document Title Sync
  useEffect(() => {
    if (displayStoreLogo) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = displayStoreLogo;
    }
    if (displayStoreName) {
      updateMetaTags(
        `${displayStoreName} | Official Store`, 
        aboutSettings?.description || 'Welcome to our official store', 
        displayStoreLogo,
        window.location.href
      );
    }
  }, [displayStoreLogo, displayStoreName, aboutSettings?.description]);

  // Dynamic SEO based on active view
  useEffect(() => {
    if (activeNav === 'product_detail' && activeProductDetail) {
      updateMetaTags(
        `${activeProductDetail.title} | ${displayStoreName}`,
        activeProductDetail.subtitle || activeProductDetail.description || 'View product details and clinical formulation.',
        activeProductDetail.coverImage || activeProductDetail.image,
        window.location.href
      );
      updateProductSchema(activeProductDetail, window.location.href, displayStoreName);

      // Track ViewContent for Meta Pixel & GTM
      const eventId = createEventId('view');
      trackEvent('ViewContent', {
        content_name: activeProductDetail.title,
        content_ids: [activeProductDetail.id],
        content_type: 'product',
        value: activeProductDetail.price,
        currency: 'BDT'
      }, eventId);
    } else if (activeNav === 'shop') {
      updateMetaTags(
        `Shop All Korean Skincare | ${displayStoreName}`,
        aboutSettings?.description || 'Browse our complete catalog of Korean Hanbang botanical skincare formulations.',
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
    } else if (activeNav === 'about') {
      updateMetaTags(
        `About Us & Hanbang Story | ${displayStoreName}`,
        aboutSettings?.subtitle || aboutSettings?.description || 'Learn about our Seoul heritage, brand story, and Korean skincare philosophy.',
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
    } else if (activeNav === 'contact') {
      updateMetaTags(
        `Contact Us & Customer Support | ${displayStoreName}`,
        'Get in touch with our customer care team via WhatsApp, phone, or email.',
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
    } else if (activeNav === 'quiz') {
      updateMetaTags(
        `Personalized Skin Routine Quiz | ${displayStoreName}`,
        'Find your custom Korean skincare ritual tailored to your specific skin type and concerns.',
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
    } else if (activeNav === 'checkout') {
      updateMetaTags(
        `Secure Checkout | ${displayStoreName}`,
        'Complete your order with Fast Delivery & Cash on Delivery across Bangladesh.',
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
    } else if (activeNav === 'home') {
      updateMetaTags(
        `${displayStoreName} | Official Store`,
        aboutSettings?.description || 'Welcome to our official store',
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
    }
  }, [activeNav, activeProductDetail, displayStoreName, displayStoreLogo, aboutSettings?.description, aboutSettings?.subtitle]);

  // Track Search event on search query input (debounced)
  useEffect(() => {
    const q = searchTerm.trim();
    if (!q || q.length < 2) return;
    const timer = setTimeout(() => {
      trackEvent('Search', { search_string: q });
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Transparent Header on initial top view, solid white on scroll
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isTransparentHeader = (activeNav === 'home' || activeNav === 'about') && !isScrolled;

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Central Router Navigation Helper (Syncs Browser URL with SPA Views)
  const navigateTo = useCallback((section: 'home' | 'shop' | 'about' | 'contact' | 'checkout' | 'quiz') => {
    setIsMobileMenuOpen(false);
    const targetPath = section === 'home' ? '/' : `/${section}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
    setActiveNav(section);
    scrollToTop();
  }, [location.pathname, navigate, scrollToTop]);

  // Sync React Router pathname with active store view & product
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/product')) {
      const found = findProductFromPath(path, routeId, routeSlug, products);
      if (found) {
        setActiveProductDetail(found);
        setActiveNav('product_detail');
      } else if (products.length > 0) {
        setActiveProductDetail(products[0]);
        setActiveNav('product_detail');
      }
    } else if (path.startsWith('/shop')) {
      setActiveNav('shop');
    } else if (path.startsWith('/about')) {
      setActiveNav('about');
    } else if (path.startsWith('/contact')) {
      setActiveNav('contact');
    } else if (path.startsWith('/quiz')) {
      setActiveNav('quiz');
    } else if (path.startsWith('/checkout')) {
      setActiveNav('checkout');
    } else if (path === '/' || path === '') {
      setActiveNav('home');
    }
  }, [location.pathname, routeId, routeSlug, products, findProductFromPath]);

  // Bangladeshi Taka BDT Currency Formatter (Exclusive)
  const formatPrice = (priceVal: number) => {
    if (!priceVal && priceVal !== 0) return 'Tk.0';
    const bdtAmount = priceVal < 100 ? Math.round(priceVal * 120) : Math.round(priceVal);
    return `Tk.${bdtAmount.toLocaleString('en-US')}`;
  };

  // Add to Cart Helper
  const handleAddToCart = useCallback((product: Product, quantity = 1) => {
    const eventId = createEventId('cart');
    trackEvent('AddToCart', {
      content_name: product.title,
      content_ids: [product.id],
      content_type: 'product',
      value: (product.price || 0) * quantity,
      currency: 'BDT',
      num_items: quantity,
      contents: [{
        id: product.id,
        name: product.title,
        quantity: quantity,
        item_price: product.price
      }]
    }, eventId);
    addToCartAction({ product, quantity });
    setShowNotificationToast({ show: true, msg: `Added ${product.title} to your bag.` });
    setTimeout(() => setShowNotificationToast({ show: false, msg: '' }), 3500);
  }, [addToCartAction]);

  const handleRemoveFromCart = useCallback((productId: string) => {
    removeFromCartAction(productId);
  }, [removeFromCartAction]);

  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCartAction(productId);
      return;
    }
    updateQuantityAction(productId, quantity);
  }, [removeFromCartAction, updateQuantityAction]);

  // Open Full Product Detail Page with dynamic SEO deep-link URL
  const openProductDetail = useCallback((product: FantineProductItem) => {
    setActiveProductDetail(product);
    setActiveImageIndex(0);
    setActiveNav('product_detail');
    const slug = getProductSlug(product);
    navigate(`/product/${encodeURIComponent(slug)}/${encodeURIComponent(product.id)}`);
    scrollToTop();
  }, [navigate, scrollToTop]);

  // Cart Subtotal
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cart]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Filtered & Sorted Catalog for Shop Page
  const filteredCatalog = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm.trim() || 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategoryCheckbox === 'All' || 
        p.category === selectedCategoryCheckbox || 
        p.series === selectedCategoryCheckbox;
        
      const matchesBrand = selectedBrand === 'All' || 
        p.brand === selectedBrand;
        
      const matchesPrice = p.price <= priceRange;

      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });
  }, [products, searchTerm, selectedCategoryCheckbox, selectedBrand, priceRange, sortBy]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCatalog.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCatalog, currentPage]);

  const shopCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
      if (p.series && p.series.trim()) set.add(p.series.trim());
    });
    const custom = Array.from(set);
    return custom.length > 0 ? ['All', ...custom] : DEFAULT_SHOP_CATEGORIES;
  }, [products]);

  const shopBrands = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.brand).filter(Boolean)))];
  }, [products]);

  const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage) || 1;

  // Active Delivery Methods from Admin Settings
  const activeDeliveryMethods = useMemo<DeliveryMethodItem[]>(() => {
    const list = ecomSettings?.deliveryMethods || DEFAULT_DELIVERY_METHODS;
    const active = list.filter(m => m.status === 'Active');
    return active.length > 0 ? active : list;
  }, [ecomSettings?.deliveryMethods]);

  const [selectedDeliveryMethodId, setSelectedDeliveryMethodId] = useState<string>('');

  useEffect(() => {
    if (activeDeliveryMethods.length > 0) {
      if (!selectedDeliveryMethodId || !activeDeliveryMethods.some(m => m.id === selectedDeliveryMethodId)) {
        setSelectedDeliveryMethodId(activeDeliveryMethods[0].id);
      }
    }
  }, [activeDeliveryMethods, selectedDeliveryMethodId]);

  const selectedDeliveryMethod = useMemo(() => {
    return activeDeliveryMethods.find(m => m.id === selectedDeliveryMethodId) || activeDeliveryMethods[0];
  }, [activeDeliveryMethods, selectedDeliveryMethodId]);

  const deliveryCharge = selectedDeliveryMethod?.deliveryCharge ?? (ecomSettings?.deliveryChargeInsideDhaka || 0);

  // Active Payment Gateways from Admin Settings
  const activePaymentGateways = useMemo<PaymentGatewayItem[]>(() => {
    let gateways = ecomSettings?.paymentGateways;
    if (!gateways || gateways.length === 0) {
      gateways = DEFAULT_PAYMENT_GATEWAYS;
    }
    const active = gateways.filter(g => g.status === 'Active');
    return active.length > 0 ? active : gateways;
  }, [ecomSettings?.paymentGateways]);

  const [selectedPaymentGatewayId, setSelectedPaymentGatewayId] = useState<string>('');
  const [trxId, setTrxId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [copiedAccNo, setCopiedAccNo] = useState(false);

  useEffect(() => {
    if (activePaymentGateways.length > 0) {
      if (!selectedPaymentGatewayId || !activePaymentGateways.some(g => g.id === selectedPaymentGatewayId)) {
        setSelectedPaymentGatewayId(activePaymentGateways[0].id);
      }
    }
  }, [activePaymentGateways, selectedPaymentGatewayId]);

  const selectedPaymentGateway = useMemo(() => {
    return activePaymentGateways.find(g => g.id === selectedPaymentGatewayId) || activePaymentGateways[0];
  }, [activePaymentGateways, selectedPaymentGatewayId]);

  const isOnlinePayment = selectedPaymentGateway && 
    selectedPaymentGateway.type !== 'Cash on Delivery' && 
    selectedPaymentGateway.type !== 'COD' &&
    !selectedPaymentGateway.title.toLowerCase().includes('cash on delivery') &&
    !selectedPaymentGateway.title.toLowerCase().includes('Cash on');

  // Coupon State & Calculation
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const coupons = await dbService.getCoupons();
      const match = coupons.find(c => c.code.toLowerCase() === couponCodeInput.trim().toLowerCase() && c.status === 'Active');
      if (!match) {
        setCouponError('Invalid or expired coupon code');
        return;
      }
      if (match.minSpent && cartSubtotal < match.minSpent) {
        setCouponError(`Minimum to use this coupon ${formatPrice(match.minSpent)} Must order money`);
        return;
      }
      setAppliedCoupon(match);
      setCouponSuccess(`coupon "${match.code}" successfulhas been applied!`);
      setCouponCodeInput('');
    } catch {
      setCouponError('There was a problem validating the coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
  };

  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percent') {
      const disc = Math.round((cartSubtotal * appliedCoupon.discount) / 100);
      return appliedCoupon.maxDiscount ? Math.min(disc, appliedCoupon.maxDiscount) : disc;
    }
    return Math.min(appliedCoupon.discount, cartSubtotal);
  }, [appliedCoupon, cartSubtotal]);

  const gatewayDiscount = selectedPaymentGateway?.discountAmount ? Number(selectedPaymentGateway.discountAmount) : 0;
  const gatewayFee = selectedPaymentGateway?.transactionFee ? Number(selectedPaymentGateway.transactionFee) : 0;
  const cartGrandTotal = Math.max(0, cartSubtotal + deliveryCharge + gatewayFee - gatewayDiscount - couponDiscountAmount);

  // Checkout Form
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<BookOrder | null>(null);

  const handleCopyAccountNumber = (acc: string) => {
    navigator.clipboard.writeText(acc);
    setCopiedAccNo(true);
    setTimeout(() => setCopiedAccNo(false), 2000);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPhone.trim() || !checkoutAddress.trim() || !checkoutName.trim()) {
      alert('Please provide your name, mobile number and full delivery address.');
      return;
    }

    if (cart.length === 0) {
      alert('Your shopping bag is empty.');
      return;
    }

    if (isOnlinePayment && (!senderPhone.trim() || !trxId.trim())) {
      alert(`please ${selectedPaymentGateway?.title || 'Payment'}-sender of mobile number and Transaction ID (TrxID) day।`);
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderPayload: BookOrder = {
        id: orderId,
        customerName: checkoutName.trim(),
        name: checkoutName.trim(),
        phone: checkoutPhone.trim(),
        address: checkoutAddress.trim(),
        deliveryArea: selectedDeliveryMethod?.title || 'Inside Dhaka',
        deliveryZone: selectedDeliveryMethod?.title || 'Inside Dhaka',
        district: selectedDeliveryMethod?.title || 'Inside Dhaka',
        deliveryCharge: deliveryCharge,
        price: cartSubtotal,
        unitPrice: cart.length === 1 ? cart[0].product.price : cartSubtotal,
        totalAmount: cartGrandTotal,
        totalPrice: cartGrandTotal,
        productName: cart.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
        productTitle: cart.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
        status: 'Pending',
        orderType: 'storefront',
        paymentMethod: selectedPaymentGateway?.title || 'COD',
        paymentGateway: selectedPaymentGateway?.title || 'COD',
        senderPhone: isOnlinePayment ? senderPhone.trim() : undefined,
        trxId: isOnlinePayment ? trxId.trim() : undefined,
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscountAmount > 0 ? couponDiscountAmount : undefined,
        quantity: cart.reduce((acc, i) => acc + i.quantity, 0),
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        items: cart.map(i => ({
          product: {
            id: i.product.id,
            title: i.product.title,
            price: i.product.price,
            regularPrice: i.product.regularPrice,
            image: i.product.coverImage,
            category: i.product.category,
            stock: i.product.stock || 100,
            isAvailable: true
          },
          quantity: i.quantity
        }))
      };

      // 1. Try Authoritative Server-Side Atomic Checkout first
      let confirmedOrder: BookOrder = orderPayload;
      let orderCreatedViaServer = false;

      try {
        const response = await fetch('/api/orders/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: checkoutName.trim(),
            phone: checkoutPhone.trim(),
            address: checkoutAddress.trim(),
            deliveryZone: selectedDeliveryMethod?.title || 'Inside Dhaka',
            paymentMethod: selectedPaymentGateway?.title || 'Cash on Delivery',
            senderPhone: isOnlinePayment ? senderPhone.trim() : undefined,
            trxId: isOnlinePayment ? trxId.trim() : undefined,
            couponCode: appliedCoupon?.code,
            items: cart.map(i => ({
              productId: i.product.id,
              quantity: i.quantity,
              price: i.product.price,
              regularPrice: i.product.regularPrice,
              title: i.product.title
            }))
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData?.order) {
            confirmedOrder = resData.order;
            orderCreatedViaServer = true;
          }
        }
      } catch {
        // Fallback to direct client DB service if offline/standalone
      }

      // 2. Fallback / Sync to Local & Firestore DB
      if (!orderCreatedViaServer) {
        await dbService.addBookOrder(orderPayload);
      } else {
        await dbService.saveBookOrder(confirmedOrder);
      }

      // Track Purchase event before clearing cart
      const purchaseEventId = createEventId('purchase');
      const totalItemsPurchased = cart.reduce((acc, item) => acc + item.quantity, 0);
      trackEvent('Purchase', {
        content_name: cart.map(i => i.product.title).join(', '),
        content_ids: cart.map(i => i.product.id),
        content_type: 'product',
        value: cartGrandTotal || cartSubtotal,
        currency: 'BDT',
        num_items: totalItemsPurchased,
        contents: cart.map(item => ({
          id: item.product.id,
          name: item.product.title,
          quantity: item.quantity,
          item_price: item.product.price
        }))
      }, purchaseEventId);

      setOrderSuccess(confirmedOrder);
      clearCartAction();
      setIsCartOpen(false);
      setCheckoutName('');
      setCheckoutPhone('');
      setCheckoutAddress('');
      setTrxId('');
      setSenderPhone('');
      setAppliedCoupon(null);
    } catch (err) {
      console.error('Order error:', err);
      alert('There was a problem processing the order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim()) {
      alert('Please enter your email address.');
      return;
    }

    try {
      setIsSubmittingContact(true);
      await dbService.saveContactMessage({
        name: contactSenderName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
        subject: contactSubject.trim(),
        message: contactMessage.trim(),
        createdAt: new Date().toISOString(),
        status: 'unread'
      });

      setContactSubmitted(true);
      trackEvent('Contact', { content_name: 'Customer Contact Form' });
      setContactSenderName('');
      setContactEmail('');
      setContactPhone('');
      setContactSubject('');
      setContactMessage('');
      alert(`Thank you! Your message has been received and forwarded to ${displayCompanyName}.`);
    } catch (err) {
      console.error('Error submitting contact form to dbService:', err);
      try {
        await publicStoreService.submitContactMessage({
          name: contactSenderName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
          subject: contactSubject.trim(),
          message: contactMessage.trim()
        });
      } catch {}
      setContactSubmitted(true);
      setContactSenderName('');
      setContactEmail('');
      setContactPhone('');
      setContactSubject('');
      setContactMessage('');
      alert(`Thank you! Your message has been received.`);
    } finally {
      setIsSubmittingContact(false);
      setTimeout(() => setContactSubmitted(false), 3000);
    }
  };

  const currentProductImages = useMemo(() => {
    return activeProductDetail.additionalImages && activeProductDetail.additionalImages.length > 0
      ? activeProductDetail.additionalImages
      : [activeProductDetail.coverImage];
  }, [activeProductDetail]);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-900 font-sans relative selection:bg-rose-100 selection:text-rose-900">
      
      {/* Toast Notification */}
      {showNotificationToast.show && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium">{showNotificationToast.msg}</span>
        </div>
      )}

      {/* ============================================================
          MAIN LUXURY HEADER & NAVIGATION BAR
          ============================================================ */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        isTransparentHeader 
          ? 'bg-transparent border-b border-transparent shadow-none text-white' 
          : 'bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs text-slate-900'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-4 sm:gap-8 flex-nowrap">
          
          {/* Logo with Korean Flag Taegeuk Emblem (Single Line, Never Wraps) */}
          <div className="flex items-center cursor-pointer group shrink-0" onClick={() => navigateTo('home')}>
            <img 
              src={displayStoreLogo} 
              alt={displayStoreName} 
              className={`h-10 sm:h-12 md:h-14 max-h-14 max-w-[240px] sm:max-w-[300px] md:max-w-[360px] object-contain transition-all duration-200 ${
                !isTransparentHeader ? 'bg-slate-900 px-3 py-1.5 rounded-lg shadow-sm' : 'drop-shadow-sm'
              }`}
              onError={(e) => {
                e.currentTarget.src = '/logo_transparent.webp';
              }}
            />
          </div>

          {/* Center Navigation Links (Matching brandini.co.kr exactly - Single Line) */}
          <nav className={`hidden md:flex items-center space-x-2 lg:space-x-4 text-sm sm:text-base lg:text-[16px] font-semibold shrink-0 flex-nowrap ${
            isTransparentHeader ? 'text-white/90' : 'text-slate-700'
          }`}>
            <button 
              onClick={() => navigateTo('quiz')}
              className={`px-3.5 lg:px-5 py-2 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap rounded-lg ${
                activeNav === 'quiz' 
                  ? (isTransparentHeader ? 'text-white font-bold underline underline-offset-8 decoration-white' : 'text-slate-950 font-bold bg-slate-100/80') 
                  : (isTransparentHeader ? 'hover:text-white text-white/80 hover:bg-white/10' : 'hover:text-slate-950 text-slate-600 hover:bg-slate-50')
              }`}
            >
              <span className="bg-clip-text text-transparent bg-[linear-gradient(to_right,theme(colors.teal.400),theme(colors.indigo.400),theme(colors.rose.400),theme(colors.teal.400))] bg-[length:200%_auto] animate-[text-shimmer_3s_linear_infinite]">
                Take Skin Quiz ✧
              </span>
            </button>

            <button 
              onClick={() => navigateTo('about')}
              className={`px-3.5 lg:px-5 py-2 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap rounded-lg ${
                activeNav === 'about' 
                  ? (isTransparentHeader ? 'text-white font-bold underline underline-offset-8 decoration-white' : 'text-slate-950 font-bold bg-slate-100/80') 
                  : (isTransparentHeader ? 'hover:text-white text-white/80 hover:bg-white/10' : 'hover:text-slate-950 text-slate-600 hover:bg-slate-50')
              }`}
            >
              About Us
            </button>

            <button 
              onClick={() => navigateTo('shop')}
              className={`px-3.5 lg:px-5 py-2 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap rounded-lg ${
                activeNav === 'shop' || activeNav === 'product_detail' 
                  ? (isTransparentHeader ? 'text-white font-bold underline underline-offset-8 decoration-white' : 'text-slate-950 font-bold bg-slate-100/80') 
                  : (isTransparentHeader ? 'hover:text-white text-white/80 hover:bg-white/10' : 'hover:text-slate-950 text-slate-600 hover:bg-slate-50')
              }`}
            >
              Shop
            </button>

            <button 
              onClick={() => navigateTo('contact')}
              className={`px-3.5 lg:px-5 py-2 transition-all cursor-pointer whitespace-nowrap rounded-lg ${
                activeNav === 'contact' 
                  ? (isTransparentHeader ? 'text-white font-bold underline underline-offset-8 decoration-white' : 'text-slate-950 font-bold bg-slate-100/80') 
                  : (isTransparentHeader ? 'hover:text-white text-white/80 hover:bg-white/10' : 'hover:text-slate-950 text-slate-600 hover:bg-slate-50')
              }`}
            >
              Contact Us
            </button>
          </nav>

          {/* Right Tools: Search, Currency, Bag, Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
            {/* Interactive Inline Search Bar (Instant Filter to Shop Page) */}
            <div className={`relative flex items-center rounded-full transition-all duration-300 ${
              isTransparentHeader 
                ? 'bg-white/15 focus-within:bg-white focus-within:text-slate-900 border border-white/30 focus-within:border-white text-white' 
                : 'bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10 border border-slate-200 focus-within:border-slate-400 text-slate-900'
            } w-28 sm:w-44 md:w-56 lg:w-64 pl-2.5 sm:pl-3.5 pr-1.5 sm:pr-2 py-1.5 sm:py-2 shadow-2xs`}>
              <Search className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${
                isTransparentHeader ? 'text-white/80' : 'text-slate-400'
              }`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (activeNav !== 'shop') {
                    navigateTo('shop');
                  }
                  setCurrentPage(1);
                }}
                onFocus={() => {
                  if (activeNav !== 'shop' && searchTerm.trim()) {
                    navigateTo('shop');
                  }
                }}
                placeholder="Search..."
                className={`w-full bg-transparent text-[11px] sm:text-xs md:text-sm pl-1.5 sm:pl-2 pr-1 focus:outline-none placeholder:text-[11px] sm:placeholder:text-xs ${
                  isTransparentHeader 
                    ? 'placeholder:text-white/70 focus:text-slate-900 focus:placeholder:text-slate-500' 
                    : 'placeholder:text-slate-500 text-slate-900'
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="p-0.5 text-slate-500 hover:text-slate-700 cursor-pointer"
                  title="Clear Search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Shopping Bag Button */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className={`relative p-2 sm:p-2.5 transition-transform active:scale-95 cursor-pointer ${
                isTransparentHeader ? 'text-white hover:text-white/80' : 'text-slate-800 hover:text-slate-950'
              }`}
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              {totalCartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Customer Account / Order Tracking Button */}
            <button 
              onClick={() => onGoToLogin ? onGoToLogin() : undefined}
              className={`relative p-2 sm:p-2.5 transition-transform active:scale-95 cursor-pointer ${
                isTransparentHeader ? 'text-white hover:text-white/80' : 'text-slate-800 hover:text-slate-950'
              }`}
              aria-label="Customer Account / Track Orders"
              title="Account / Track Orders"
            >
              <User className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Mobile Hamburger Menu Toggle Button (Visible on md:hidden) */}
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className={`md:hidden p-2 rounded-xl transition-transform active:scale-95 cursor-pointer ${
                isTransparentHeader ? 'text-white hover:bg-white/15' : 'text-slate-900 hover:bg-slate-100'
              }`}
              aria-label="Toggle Mobile Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white text-slate-900 border-b border-slate-200 shadow-2xl animate-in slide-in-from-top-2 duration-200 px-5 py-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Navigation Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-700 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex flex-col space-y-1 text-sm font-semibold">
              <button
                onClick={() => navigateTo('home')}
                className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                  activeNav === 'home' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <span>Home</span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                onClick={() => navigateTo('quiz')}
                className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                  activeNav === 'quiz' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <span className="bg-clip-text text-transparent bg-[linear-gradient(to_right,theme(colors.teal.400),theme(colors.indigo.400),theme(colors.rose.400),theme(colors.teal.400))] bg-[length:200%_auto] animate-[text-shimmer_3s_linear_infinite]">Take Skin Quiz ✧</span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                onClick={() => navigateTo('shop')}
                className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                  activeNav === 'shop' || activeNav === 'product_detail' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <span>Shop All Products</span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                onClick={() => navigateTo('about')}
                className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                  activeNav === 'about' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <span>About Us & Hanbang Story</span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                onClick={() => navigateTo('contact')}
                className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                  activeNav === 'contact' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <span>Contact Us</span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onGoToLogin) onGoToLogin();
                }}
                className="w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between hover:bg-slate-100 text-slate-800"
              >
                <span className="flex items-center gap-2 font-medium">
                  <User className="w-4 h-4 text-slate-600" />
                  Account & Track Orders
                </span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </button>
            </nav>

            {/* Mobile Categories Quick Access */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Popular Categories</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'All Products', action: () => { setSelectedCategoryCheckbox('All'); setSearchTerm(''); } },
                  { name: 'Serum & Essence', action: () => { setSelectedCategoryCheckbox('Serum'); } },
                  { name: 'Face Cream', action: () => { setSelectedCategoryCheckbox('Face Cream'); } },
                  { name: 'Cleanser', action: () => { setSelectedCategoryCheckbox('Cleanser'); } },
                  { name: 'Rapid Acne', action: () => { setSearchTerm('Acne'); } },
                  { name: 'Brightening', action: () => { setSearchTerm('Brightening'); } }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      item.action();
                      navigateTo('shop');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ============================================================
          MAIN BODY CONTENT (ROUTED VIEWS)
          ============================================================ */}

      {/* VIEW 1: DEDICATED PRODUCT DETAIL VIEW (Screenshot 2: product_385231.html) */}
      {activeNav === 'product_detail' && (
        <div className="py-6 sm:py-12 lg:py-16 max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500">
            <button onClick={() => navigateTo('home')} className="hover:text-slate-900 transition-colors cursor-pointer">Home</button>
            <span>/</span>
            <button onClick={() => navigateTo('shop')} className="hover:text-slate-900 transition-colors cursor-pointer">Shop</button>
            <span>/</span>
            <span className="text-slate-800 font-medium">{activeProductDetail.series}</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-none">{activeProductDetail.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-start">
            
            {/* Left Gallery: Horizontal on Mobile / Vertical on Tablet & Desktop */}
            <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
              
              {/* Thumbnail Strip (Scrollable on small screens) */}
              <div className="flex sm:flex-col gap-2 sm:gap-3 overflow-x-auto sm:overflow-y-auto no-scrollbar py-1 shrink-0">
                {currentProductImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 sm:w-20 sm:h-20 bg-[#e8f5e9]/40 border ${activeImageIndex === idx ? 'border-dashed border-slate-900' : 'border-slate-200'} p-1 overflow-hidden transition-all shrink-0`}
                  >
                    <img width={80} height={80} src={imgUrl} alt="Thumbnail" 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                      }}
                      className="w-full h-full object-contain" 
                    />
                  </button>
                ))}
              </div>

              {/* Main Product Frame with Water Drop / Ripple Green Background + Interactive Zoom */}
              <div 
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setZoomPos({ x, y });
                  setIsHoverZooming(true);
                }}
                onMouseLeave={() => setIsHoverZooming(false)}
                onClick={() => setIsZoomModalOpen(true)}
                className="relative flex-1 aspect-square max-h-[500px] bg-[#e8f5e9]/30 rounded-none overflow-hidden border border-slate-100 flex items-center justify-center group cursor-zoom-in"
              >
                <img fetchPriority="high" width={500} height={500} src={currentProductImages[activeImageIndex] || activeProductDetail.coverImage} alt={activeProductDetail.title} 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                  }}
                  style={{
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    transform: isHoverZooming ? 'scale(2.2)' : 'scale(1)'
                  }}
                  className="w-4/5 h-4/5 object-contain transition-transform duration-200 pointer-events-none select-none"
                />

                {/* Left/Right Carousel Arrows */}
                {currentProductImages.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(prev => (prev === 0 ? currentProductImages.length - 1 : prev - 1));
                      }}
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/60 text-white rounded-none flex items-center justify-center transition-colors cursor-pointer z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(prev => (prev === currentProductImages.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/60 text-white rounded-none flex items-center justify-center transition-colors cursor-pointer z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Zoom Icon Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomModalOpen(true);
                  }}
                  className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer z-10"
                  title="Click to Zoom Fullscreen"
                >
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

            </div>

            {/* Right Side: Title, Description, Benefits, How-To-Use */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-6">
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-slate-900 font-normal tracking-tight leading-snug">
                {activeProductDetail.title}
              </h1>

              {/* Price Row */}
              <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3">
                <span className="text-xl sm:text-2xl font-bold text-slate-900">{formatPrice(activeProductDetail.price)}</span>
                {activeProductDetail.regularPrice && (
                  <span className="text-sm sm:text-base text-slate-500 line-through">{formatPrice(activeProductDetail.regularPrice)}</span>
                )}
                {activeProductDetail.discountPercentage && (
                  <span className="text-xs bg-rose-50 text-rose-700 font-bold px-2 py-0.5 border border-rose-200">
                    SAVE {activeProductDetail.discountPercentage}%
                  </span>
                )}
              </div>

              {/* Actions (ADD TO BAG & BUY NOW) */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <button 
                  onClick={() => handleAddToCart(activeProductDetail)}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 text-white font-semibold py-3 sm:py-3.5 px-6 text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  ADD TO BAG
                </button>
                <button 
                  onClick={() => {
                    handleAddToCart(activeProductDetail);
                    setIsCartOpen(false);
                    navigateTo('checkout');
                  }}
                  className="flex-1 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-3 sm:py-3.5 px-6 text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  BUY NOW
                </button>
              </div>

              {/* AI Doctor Consultation Button for This Product */}
              <button
                onClick={() => {
                  setAiDoctorContextProduct(activeProductDetail);
                  setAiDoctorSelectedProductIds([activeProductDetail.id]);
                  setIsDoctorModalOpen(true);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 border border-rose-200/80 rounded-2xl flex items-center justify-between text-xs font-bold text-rose-950 shadow-xs transition cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition">👨‍⚕️</span>
                  <span>Check with your doctor for this formula and how to use it</span>
                </div>
                <span className="text-rose-600 font-semibold group-hover:translate-x-0.5 transition">Take advice →</span>
              </button>

              {/* Product Description */}
              <div className="space-y-1.5 pt-2">
                <h2 className="font-serif text-base font-semibold text-slate-900">Product Description:</h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-light text-justify whitespace-pre-line">
                  {activeProductDetail.description || activeProductDetail.benefitsHighlights}
                </p>
              </div>

              {/* How to use it */}
              <div className="space-y-1.5">
                <h2 className="font-serif text-base font-semibold text-slate-900">How to use it :</h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-light text-justify whitespace-pre-line">
                  {activeProductDetail.howToUse || 'Pour one teaspoon directly into the palm of your hand and gently pat it onto the skin until fully absorbed.'}
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* VIEW 2: CONTACT US PAGE (Screenshot 1) */}
      {activeNav === 'contact' && (
        <div className="py-12 sm:py-20 max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">
            
            <div className="lg:col-span-4 bg-[#1e293b] text-white p-8 sm:p-10 space-y-8 flex flex-col justify-between">
              <div className="space-y-4">
                <h2 className="font-serif text-2xl font-normal text-white">Contact information</h2>
                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  Contact us for the latest product inquiries, international distribution, and Korean Hanbang skincare formulations.
                </p>
              </div>

              <div className="space-y-6 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{displayPhone}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <a href={`mailto:${displayEmail}`} className="hover:text-white transition-colors">{displayEmail}</a>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    {displayAddress}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-700 text-[11px] text-slate-400">
                {displayCompanyName.toUpperCase()} • Global Customer Service
              </div>
            </div>

            <div className="lg:col-span-8 p-8 sm:p-12 space-y-6 bg-white">
              <h3 className="font-serif text-2xl text-slate-900 font-normal">Leave us message</h3>
              
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Full Name</label>
                    <input 
                      type="text" 
                      value={contactSenderName} 
                      onChange={e => setContactSenderName(e.target.value)} 
                      placeholder="Your name"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Email *</label>
                    <input 
                      type="email" 
                      value={contactEmail} 
                      onChange={e => setContactEmail(e.target.value)} 
                      required 
                      placeholder="your.email@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-xs font-semibold text-slate-700">Phone</label>
                      <span className="text-[10px] text-slate-500">Optional</span>
                    </div>
                    <input 
                      type="tel" 
                      value={contactPhone} 
                      onChange={e => setContactPhone(e.target.value)} 
                      placeholder="+82 / 01..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-xs font-semibold text-slate-700">Subject</label>
                      <span className="text-[10px] text-slate-500">Optional</span>
                    </div>
                    <input 
                      type="text" 
                      value={contactSubject} 
                      onChange={e => setContactSubject(e.target.value)} 
                      placeholder="Product inquiry, wholesale, etc."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-semibold text-slate-700">Message *</label>
                    <span className="text-[10px] text-slate-500">Required</span>
                  </div>
                  <textarea 
                    rows={5} 
                    value={contactMessage} 
                    onChange={e => setContactMessage(e.target.value)} 
                    required
                    placeholder="Write your message here..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmittingContact}
                    className="bg-[#111827] hover:bg-slate-800 text-white font-medium px-8 py-3 rounded-lg text-xs tracking-wider uppercase transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingContact ? 'Submitting...' : contactSubmitted ? 'Sent!' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* VIEW 3: SHOP CATALOG PAGE (Screenshot 3 & 4) */}
      {activeNav === 'shop' && (
        <div className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
          


          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-5 sm:p-6 border border-slate-200/80 shadow-xs">
                <h2 className="font-serif text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 pb-2 border-b border-slate-100">
                  Shop Categories
                </h2>
                
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3">
                  {shopCategories.map((cat) => (
                    <label 
                      key={cat}
                      className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 hover:text-slate-950 select-none"
                    >
                      <input 
                        type="checkbox"
                        checked={selectedCategoryCheckbox === cat}
                        onChange={() => {
                          setSelectedCategoryCheckbox(cat);
                          setCurrentPage(1);
                        }}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer"
                      />
                      <span className="truncate">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {shopBrands.length > 1 && (
                <div className="bg-white p-5 sm:p-6 border border-slate-200/80 shadow-xs">
                  <h2 className="font-serif text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 pb-2 border-b border-slate-100">
                    Brands
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3">
                    {shopBrands.map((brand: any) => (
                      <label 
                        key={brand}
                        className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 hover:text-slate-950 select-none"
                      >
                        <input 
                          type="radio"
                          name="brand_filter"
                          checked={selectedBrand === brand}
                          onChange={() => {
                            setSelectedBrand(brand);
                            setCurrentPage(1);
                          }}
                          className="w-4 h-4 text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer"
                        />
                        <span className="truncate">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white p-5 sm:p-6 border border-slate-200/80 shadow-xs">
                <h2 className="font-serif text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 pb-2 border-b border-slate-100">
                  Filter by Price
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Tk. 0</span>
                    <span>Tk. {priceRange.toLocaleString('en-US')}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={priceRange}
                    onChange={(e) => {
                      setPriceRange(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-9 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="text-xs text-slate-500 font-medium">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredCatalog.length)} of {filteredCatalog.length} products (Page {currentPage})
                  {searchTerm && <span className="text-slate-800 font-semibold ml-1">for &quot;{searchTerm}&quot;</span>}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Sort:</span>
                  <select 
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-200 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-800 rounded-none focus:outline-none cursor-pointer"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Product Grid or Empty State (2-cols on mobile, 3-cols on tablet/desktop) */}
              {paginatedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                  {paginatedProducts.map((product) => (
                    <div 
                      key={product.id}
                      className="group bg-white border border-slate-200/80 hover:shadow-lg transition-all p-2.5 sm:p-3 flex flex-col justify-between"
                    >
                      <div className="relative aspect-square w-full bg-[#f6f5f2] overflow-hidden mb-2.5 sm:mb-3 cursor-pointer" onClick={() => openProductDetail(product)}>
                        <ResponsiveImage width={286} height={286} src={product.coverImage} alt={product.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      </div>

                      <div className="text-center space-y-1 sm:space-y-1.5">
                        <h4 
                          onClick={() => openProductDetail(product)}
                          className="font-serif text-xs sm:text-sm font-normal text-slate-900 hover:text-amber-800 transition-colors cursor-pointer truncate"
                        >
                          {product.title}
                        </h4>

                        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 font-serif text-xs">
                          <span className="text-rose-600 font-semibold">{formatPrice(product.price)}</span>
                          {product.regularPrice && (
                            <span className="text-slate-500 line-through text-[11px] sm:text-xs">{formatPrice(product.regularPrice)}</span>
                          )}
                        </div>

                        <button 
                          onClick={() => handleAddToCart(product)}
                          className="mt-2 w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] sm:text-[11px] font-bold py-2 uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          ADD TO BAG
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-4">
                  <Search className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-slate-800">
                      No products found
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      We couldn&apos;t find any products matching &quot;{searchTerm}&quot;. Try adjusting your keywords or category filters.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategoryCheckbox('All');
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Clear Search & View All
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-8 text-xs text-slate-600 font-medium">
                <button 
                  onClick={() => setCurrentPage(1)} 
                  disabled={currentPage === 1}
                  className="hover:text-slate-950 disabled:opacity-40"
                >
                  ← First
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                  disabled={currentPage === 1}
                  className="hover:text-slate-950 disabled:opacity-40"
                >
                  &lt; Previous
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-6 h-6 flex items-center justify-center ${currentPage === i + 1 ? 'font-bold text-slate-950 border-b border-slate-950' : 'hover:text-slate-950'}`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                  disabled={currentPage === totalPages}
                  className="hover:text-slate-950 disabled:opacity-40"
                >
                  Next &gt;
                </button>
                <button 
                  onClick={() => setCurrentPage(totalPages)} 
                  disabled={currentPage === totalPages}
                  className="hover:text-slate-950 disabled:opacity-40"
                >
                  Last →
                </button>
              </div>



            </div>

          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 4: DEDICATED ABOUT US PAGE (Clean Simple Text & Narrative)
          ============================================================ */}
      {activeNav === 'about' && (
        <div className="bg-[#faf9f6] animate-fadeIn min-h-[70vh]">
          
          {/* 1. CINEMATIC ABOUT HERO BANNER */}
          <section className="relative overflow-hidden -mt-[84px] sm:-mt-[92px] md:-mt-[100px] pt-[84px] sm:pt-[92px] md:pt-[100px] min-h-[420px] sm:min-h-[500px] flex items-center justify-center bg-slate-950 text-white border-b border-slate-900">
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                src={aboutSettings.image || aboutSettings.heroImage || 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1600&auto=format&fit=crop&q=85'}
                alt={aboutSettings.title || aboutSettings.heroTitle || 'About FANTINE'}
                className="w-full h-full object-cover filter brightness-75 scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/40"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-16 text-center space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#93c5fd]/20 text-[#93c5fd] border border-[#93c5fd]/30 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" />
                {aboutSettings.badge || 'ABOUT OUR BRAND'}
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-white font-normal uppercase leading-tight tracking-tight drop-shadow-md">
                {aboutSettings.title || aboutSettings.heroTitle || 'about us'}
              </h1>

              {(aboutSettings.subtitle || aboutSettings.heroSubtitle) && (
                <p className="text-slate-200 text-sm sm:text-base font-light leading-relaxed max-w-2xl mx-auto">
                  {aboutSettings.subtitle || aboutSettings.heroSubtitle}
                </p>
              )}

              {/* Breadcrumb */}
              <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-300 font-mono tracking-wider uppercase">
                <button onClick={() => navigateTo('home')} className="hover:text-white transition-colors cursor-pointer">HOME</button>
                <span>/</span>
                <span className="text-[#93c5fd] font-semibold">about us</span>
              </div>
            </div>
          </section>

          {/* 2. MAIN STORY TEXT CONTENT */}
          <section className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-8">
            <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xs border border-slate-200/80 space-y-8">
              <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-light text-base sm:text-lg whitespace-pre-line space-y-4 text-justify">
                {aboutSettings.content || [
                  aboutSettings.storyParagraph1,
                  aboutSettings.storyParagraph2,
                  aboutSettings.storyParagraph3
                ].filter(Boolean).join('\n\n') || 'Detailed information about us will be added soon.'}
              </div>


            </div>
          </section>

        </div>
      )}

      {/* ============================================================
          VIEW 5: DEDICATED CHECKOUT PAGE (Exact UX from User Design)
          ============================================================ */}
      {activeNav === 'checkout' && (
        <CheckoutPage
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={() => clearCartAction()}
          ecomSettings={ecomSettings || (DEFAULT_ABOUT_SETTINGS as any)}
          onNavigateHome={() => navigateTo('home')}
          onNavigateShop={() => navigateTo('shop')}
          onOpenLoginModal={onGoToLogin}
        />
      )}

      {/* VIEW 7: SKIN QUIZ */}
      {activeNav === 'quiz' && (
        <SkinQuizView 
          products={products}
          onAddToCart={(product) => handleAddToCart(product, 1)}
          onCancel={() => navigateTo('home')}
          isWishlisted={(productId) => false}
          onToggleWishlist={() => {}}
          onOpenDetail={(product) => openProductDetail(product)}
        />
      )}

      {/* VIEW 6: HOME VIEW (Default - Matching brandini.co.kr) */}
      {activeNav === 'home' && (
        <>
          {/* ============================================================
              1. TOP HERO BACKGROUND VIDEO (9:16 Mobile & 16:9 Desktop)
              ============================================================ */}
          <section className="relative overflow-hidden -mt-[84px] sm:-mt-[92px] md:-mt-[100px] pt-[84px] sm:pt-[92px] md:pt-[100px] min-h-[520px] sm:min-h-[600px] lg:min-h-[680px] flex items-center justify-start bg-slate-950 text-white border-b border-slate-900 group aspect-[9/16] sm:aspect-auto md:aspect-[16/9]">
            {/* Background Media Container (9:16 Mobile & 16:9 Desktop) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none aspect-[9/16] sm:aspect-auto md:aspect-[16/9]">
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                disablePictureInPicture
                controls={false}
                tabIndex={-1}
                className="hero-bg-video w-full h-full object-cover opacity-90 scale-105 filter brightness-95 pointer-events-none select-none"
              >
                <source src="/FANTINE_serum_brand_product_vi.mp4" type="video/mp4" />
              </video>
              {/* Subtle Luxury Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/20 to-transparent"></div>
            </div>
          </section>

          {/* ============================================================
              3. TREAT YOUR SKIN CONCERN (Dynamic Products Uploaded in Admin)
              ============================================================ */}
          <section className="py-12 sm:py-20 lg:py-24 bg-white border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-8">
              
              <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-14">
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-slate-900 font-normal tracking-tight mb-2 sm:mb-3">
                  Treat Your Skin Concern with Hanbang + Modern Ingredients
                </h2>
                <p className="text-slate-500 text-[11px] sm:text-sm tracking-wider uppercase font-light">
                  Centella Asiatica • Niacinamide • Pure Vitamin C • Red Ginseng Ferments
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
                {products.slice(0, 4).map((product) => (
                  <div 
                    key={product.id}
                    className="group flex flex-col bg-white rounded-none border border-transparent hover:border-slate-200 transition-all duration-300 p-1.5 sm:p-2"
                  >
                    <div className="relative aspect-square w-full bg-[#f6f5f2] rounded-none overflow-hidden mb-2.5 sm:mb-4 cursor-pointer" onClick={() => openProductDetail(product)}>
                      <img 
                        loading="lazy" 
                        decoding="async"
                        width={286} 
                        height={286} 
                        src={optimizeImageUrl(product.coverImage, 400)} 
                        srcSet={`${optimizeImageUrl(product.coverImage, 360)} 360w, ${optimizeImageUrl(product.coverImage, 600)} 600w`}
                        sizes="(max-width: 640px) 50vw, 286px"
                        alt={product.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                        }}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                          className="w-full bg-white text-slate-950 hover:bg-slate-100 py-1.5 sm:py-2 rounded-none text-[10px] sm:text-xs font-semibold tracking-wider uppercase shadow-md transition-colors"
                        >
                          ADD TO BAG
                        </button>
                      </div>
                    </div>

                    <div className="text-center flex-1 flex flex-col justify-between space-y-1 sm:space-y-1.5">
                      <h3 
                        onClick={() => openProductDetail(product)}
                        className="font-serif text-xs sm:text-base text-slate-900 hover:text-amber-800 transition-colors cursor-pointer font-normal line-clamp-1"
                      >
                        {product.title}
                      </h3>
                      
                      <div className="font-serif text-xs sm:text-sm font-semibold text-slate-700">
                        {formatPrice(product.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center mt-8 sm:mt-10">
                <div 
                  onClick={() => navigateTo('shop')}
                  className="flex items-center gap-2 sm:gap-3 text-slate-900 bg-[#f9f8f6] px-4 sm:px-5 py-2 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors shadow-xs"
                >
                  <span className="text-[11px] sm:text-xs font-serif font-semibold">View All Formulations ({products.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================
              4. SAVE WITH SETS (Dynamic Bundle/Discount Formulations)
              ============================================================ */}
          <section className="py-12 sm:py-20 lg:py-24 bg-[#faf8f5] border-b border-slate-200/70">
            <div className="max-w-7xl mx-auto px-4 sm:px-8">
              
              <div className="text-center mb-8 sm:mb-14">
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-slate-900 font-normal tracking-tight mb-2">
                  Save with Sets
                </h2>
                <p className="text-slate-500 text-[11px] sm:text-sm tracking-wide">
                  Complete multi-step skincare regimens curated with special discount savings
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 max-w-5xl mx-auto">
                {products.slice(0, 3).map((product) => (
                  <div 
                    key={`set-${product.id}`}
                    className="group flex flex-col bg-white rounded-none border border-slate-200/80 hover:shadow-xl transition-all duration-300 p-3 sm:p-4"
                  >
                    <div className="relative aspect-square w-full bg-[#f6f5f2] rounded-none overflow-hidden mb-3 sm:mb-4 cursor-pointer" onClick={() => openProductDetail(product)}>
                      <img 
                        loading="lazy" 
                        decoding="async"
                        width={286} 
                        height={286} 
                        src={optimizeImageUrl(product.coverImage, 400)} 
                        srcSet={`${optimizeImageUrl(product.coverImage, 360)} 360w, ${optimizeImageUrl(product.coverImage, 600)} 600w`}
                        sizes="(max-width: 640px) 50vw, 286px"
                        alt={product.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.discountPercentage ? (
                        <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 border border-rose-200">
                          SAVE {product.discountPercentage}%
                        </span>
                      ) : (
                        <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 border border-indigo-200">
                          SET VALUE
                        </span>
                      )}
                    </div>

                    <div className="text-center space-y-1.5 sm:space-y-2 flex-1 flex flex-col justify-between">
                      <h3 
                        onClick={() => openProductDetail(product)}
                        className="font-serif text-xs sm:text-base text-slate-900 hover:text-amber-800 transition-colors cursor-pointer font-normal line-clamp-1"
                      >
                        {product.title}
                      </h3>
                      
                      <div className="flex items-center justify-center gap-2 font-serif">
                        <span className="text-rose-600 font-semibold text-sm sm:text-base">
                          {formatPrice(product.price)}
                        </span>
                        {product.regularPrice && (
                          <span className="text-slate-500 line-through text-xs sm:text-sm">
                            {formatPrice(product.regularPrice)}
                          </span>
                        )}
                      </div>

                      <button 
                        onClick={() => handleAddToCart(product)}
                        className="mt-2 sm:mt-3 w-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-semibold py-2 sm:py-2.5 uppercase tracking-wider transition-colors"
                      >
                        ADD TO BAG
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>


          {/* ============================================================
              6. CLEAN LUXURY FLASH SALE SPOTLIGHT & CLINICAL VIDEO
              ============================================================ */}
          {(!flashSaleConfig || flashSaleConfig.enabled !== false) && (() => {
            const targetProd = flashSaleConfig?.productId 
              ? products.find(p => p.id === flashSaleConfig.productId) 
              : products[0];
            
            const title = flashSaleConfig?.title || targetProd?.title || 'FANTINE Whitening and Brightening Series';
            const subtitle = flashSaleConfig?.subtitle || targetProd?.description || 'Instantly brightens and revitalizes the skin with just one application. Infused with six powerful botanical whitening extracts for a rosy and radiant complexion.';
            const badgeTag = flashSaleConfig?.badgeTag || 'LIMITED FLASH SALE • KOREAN HANBANG CARE';
            const image = targetProd?.coverImage || (targetProd?.images && targetProd.images[0]) || flashSaleConfig?.customImage || DEFAULT_FANTINE_FALLBACK_IMAGE;
            const flashPrice = flashSaleConfig?.flashPrice ?? (targetProd?.price || 1250);
            const origPrice = flashSaleConfig?.originalPrice ?? (targetProd?.regularPrice || targetProd?.price || 1850);
            const discount = origPrice > flashPrice && origPrice > 0 ? Math.round(((origPrice - flashPrice) / origPrice) * 100) : 0;
            const buttonText = flashSaleConfig?.buttonText || 'SHOP FLASH DEAL';
            
            const videoUrl = flashSaleConfig?.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-dropper-dropping-oil-into-a-glass-jar-42790-large.mp4';
            const videoTitle = flashSaleConfig?.videoTitle || 'Clinical Hanbang Formulation & Daily Application Ritual';
            const videoSubtitle = flashSaleConfig?.videoSubtitle || 'Watch how our Korean active formula penetrates deeply into epidermal layers to soothe irritation, strengthen the moisture barrier, and revive natural glass-skin glow.';

            return (
              <div className="relative">
                {/* Clean Box-Free Luxury Flash Sale Section */}
                <section className="relative overflow-hidden bg-gradient-to-b from-[#faf8f5] via-[#f7f2ea] to-[#f4ede3] py-16 sm:py-24 border-b border-stone-200/70">
                  {/* Subtle Background Radial Aura */}
                  <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-amber-100/60 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                      
                      {/* Left Column: Minimalist Typography & Animated Open Countdown */}
                      <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
                        
                        {/* Animated Header Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-800 text-[11px] font-bold tracking-widest uppercase">
                          <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                          <span>{badgeTag}</span>
                          {discount > 0 && (
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-1 animate-pulse">
                              {discount}% OFF
                            </span>
                          )}
                        </div>

                        {/* Punchy Title */}
                        <h2 className="font-serif text-3xl sm:text-5xl lg:text-[54px] text-slate-900 leading-[1.12] font-normal tracking-tight">
                          {title}
                        </h2>
                        
                        {/* Clean Short Subtitle */}
                        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg mx-auto lg:mx-0 font-light line-clamp-2">
                          {subtitle}
                        </p>

                        {/* Open Typography Countdown (No Box Container) */}
                        <div className="pt-2">
                          <div className="flex items-baseline justify-center lg:justify-start gap-3 sm:gap-5 text-slate-900 select-none">
                            <div className="text-center lg:text-left">
                              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">{String(flashSaleTimeLeft.days).padStart(2, '0')}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-widest mt-0.5">DAYS</span>
                            </div>
                            <span className="font-mono text-2xl sm:text-3xl font-light text-slate-300 -translate-y-2 sm:-translate-y-3">:</span>
                            <div className="text-center lg:text-left">
                              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">{String(flashSaleTimeLeft.hours).padStart(2, '0')}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-widest mt-0.5">HOURS</span>
                            </div>
                            <span className="font-mono text-2xl sm:text-3xl font-light text-slate-300 -translate-y-2 sm:-translate-y-3">:</span>
                            <div className="text-center lg:text-left">
                              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">{String(flashSaleTimeLeft.minutes).padStart(2, '0')}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-widest mt-0.5">MINS</span>
                            </div>
                            <span className="font-mono text-2xl sm:text-3xl font-light text-slate-300 -translate-y-2 sm:-translate-y-3">:</span>
                            <div className="text-center lg:text-left">
                              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black text-rose-600 tracking-tight animate-pulse">{String(flashSaleTimeLeft.seconds).padStart(2, '0')}</span>
                              <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-widest mt-0.5">SECS</span>
                            </div>
                          </div>
                        </div>

                        {/* Price & CTA Action */}
                        <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-5 sm:gap-6">
                          <div className="flex items-baseline gap-2.5">
                            <span className="font-serif text-3xl sm:text-4xl font-black text-slate-900">
                              {formatPrice(flashPrice)}
                            </span>
                            {origPrice > flashPrice && (
                              <span className="font-serif text-lg sm:text-xl text-slate-500 line-through">
                                {formatPrice(origPrice)}
                              </span>
                            )}
                          </div>

                          <button 
                            onClick={() => {
                              if (targetProd) {
                                openProductDetail(targetProd);
                              } else {
                                navigateTo('shop');
                              }
                            }}
                            className="bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs tracking-widest uppercase px-8 py-4 rounded-full shadow-xl shadow-slate-950/15 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 inline-flex items-center gap-2.5 cursor-pointer group"
                          >
                            <span>{buttonText || 'SHOP NOW'}</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>

                      </div>

                      {/* Right Column: Seamless Product Image (Directly on background - No Box Card) */}
                      <div className="lg:col-span-6 relative flex items-center justify-center lg:justify-end">
                        <div 
                          onClick={() => {
                            if (targetProd) openProductDetail(targetProd);
                          }}
                          className="relative w-full max-w-md lg:max-w-lg cursor-pointer group flex items-center justify-center"
                        >
                          {/* Ambient Backlight Glow */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/40 via-rose-200/30 to-transparent rounded-full blur-3xl opacity-60 group-hover:opacity-90 transition-opacity duration-700 pointer-events-none scale-105"></div>

                          {/* Seamless Floating Product Image */}
                          <img loading="lazy" width={286} height={286} src={image} alt={title} 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                            }}
                            className="relative z-10 w-full h-auto max-h-[460px] sm:max-h-[520px] object-contain drop-shadow-2xl group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-700 select-none"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </section>
              </div>
            );
          })()}

          {/* ============================================================
              7. RUNNING MARQUEE BANNER
              ============================================================ */}
          <div className="bg-[#bfe0fb] text-slate-900 py-3 px-4 overflow-hidden border-y border-blue-200/60 font-medium text-xs sm:text-sm tracking-wider uppercase text-center">
            <div className="animate-marquee-brands whitespace-nowrap">
              <span>{aboutSettings.missionStatement || 'WE SINCERELY HOPE WE CAN RELIEVE YOUR TENSIONS AND STRESSES, AND GIVE YOU A HEALTHIER AND MORE PEACEFUL LIFE.'} &nbsp; • &nbsp; {aboutSettings.missionStatement || 'WE SINCERELY HOPE WE CAN RELIEVE YOUR TENSIONS AND STRESSES, AND GIVE YOU A HEALTHIER AND MORE PEACEFUL LIFE.'}</span>
            </div>
          </div>

          {/* ============================================================
              8. HIGHLIGHT SPOTLIGHT (Product or Category Focus)
              ============================================================ */}
          {(!ecomSettings?.highlightSpotlight || ecomSettings.highlightSpotlight.enabled !== false) && (() => {
            const hlConfig = ecomSettings?.highlightSpotlight;
            const isProductTarget = !hlConfig || hlConfig.targetType === 'product';
            
            const targetProd = isProductTarget && hlConfig?.productId
              ? products.find(p => p.id === hlConfig.productId)
              : (isProductTarget ? products[0] : null);

            const targetCat = !isProductTarget && hlConfig?.categoryName
              ? hlConfig.categoryName
              : (ecomSettings?.categories?.[0] || 'Creams');

            const title = hlConfig?.title 
              || (isProductTarget ? (targetProd?.title || 'Ultimate Calming Solution Face Cleanser') : `Explore Our ${targetCat} Collection`);
            
            const subtitle = (hlConfig?.subtitle && !hlConfig.subtitle.includes('stay in touch')) 
              ? hlConfig.subtitle
              : (isProductTarget ? (targetProd?.benefitsHighlights || targetProd?.description || 'Gentle daily botanical foam cleanser formulated to deeply purify pores without stripping moisture.') : `Discover premium formulations and clinical results in our ${targetCat} line.`);
            
            const badgeTag = (hlConfig?.badgeTag && !hlConfig.badgeTag.includes('BRANDINI SEOUL TOWER')) 
              ? hlConfig.badgeTag 
              : (isProductTarget && targetProd?.category ? `${targetProd.category.toUpperCase()}` : null);
            
            const image = isProductTarget 
              ? (targetProd?.coverImage || (targetProd?.images && targetProd.images[0]) || hlConfig?.customImage || aboutSettings.hqImage || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&auto=format&fit=crop&q=85")
              : (products.find(p => p.category?.toLowerCase() === targetCat.toLowerCase())?.coverImage || hlConfig?.customImage || aboutSettings.hqImage || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&auto=format&fit=crop&q=85");

            const currentPrice = targetProd?.price || 500;
            const regularPrice = targetProd?.regularPrice && targetProd.regularPrice > currentPrice 
              ? targetProd.regularPrice 
              : (targetProd ? Math.round(currentPrice * 1.35) : null);

            const handleBuyNow = () => {
              if (targetProd) {
                handleAddToCart(targetProd, 1);
                setIsCartOpen(true);
              } else {
                navigateTo('shop');
              }
            };

            const handleAction = () => {
              if (isProductTarget && targetProd) {
                openProductDetail(targetProd);
              } else if (!isProductTarget) {
                setSelectedCategoryCheckbox(targetCat);
                navigateTo('shop');
              } else {
                navigateTo('shop');
              }
            };

            return (
              <section className="py-16 sm:py-20 bg-white border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
                  
                  <div className="md:col-span-6 flex flex-col items-center justify-center">
                    <div 
                      onClick={handleAction}
                      className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-100 w-full h-[320px] sm:h-[380px] md:h-[410px] max-h-[420px] cursor-pointer group bg-slate-50 flex items-center justify-center"
                    >
                      <img loading="lazy" width={286} height={286} src={image} alt={title} 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {badgeTag && (
                        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-[11px] font-bold tracking-widest uppercase shadow-md border border-white/10">
                          {badgeTag}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-6 flex flex-col justify-center space-y-5 text-center md:text-left py-2 sm:py-4">
                    <h2 className="font-serif text-3xl sm:text-4xl text-slate-900 font-normal leading-tight">
                      {title}
                    </h2>
                    
                    <p className="text-slate-600 text-sm leading-relaxed max-w-lg mx-auto md:mx-0 font-light">
                      {subtitle}
                    </p>

                    {/* Price & Old Price Display */}
                    {isProductTarget && (
                      <div className="flex items-baseline gap-3 justify-center md:justify-start pt-1">
                        <span className="font-serif text-3xl sm:text-4xl font-black text-slate-900">
                          {formatPrice(currentPrice)}
                        </span>
                        {regularPrice && regularPrice > currentPrice && (
                          <span className="font-serif text-lg sm:text-xl text-slate-500 line-through">
                            {formatPrice(regularPrice)}
                          </span>
                        )}
                        {regularPrice && regularPrice > currentPrice && (
                          <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded-full ml-1">
                            SAVE {Math.round(((regularPrice - currentPrice) / regularPrice) * 100)}%
                          </span>
                        )}
                      </div>
                    )}

                    {/* Buy Now Action Button */}
                    <div className="pt-2 flex flex-wrap items-center gap-3 justify-center md:justify-start">
                      <button 
                        onClick={handleBuyNow}
                        className="bg-[#f97316] hover:bg-[#ea580c] active:scale-[0.98] text-white font-bold text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        <span>BUY NOW</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={handleAction}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm px-6 py-4 rounded-xl transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                </div>
              </section>
            );
          })()}
        </>
      )}

      {/* ============================================================
          LUXURY FOOTER
          ============================================================ */}
      <React.Suspense fallback={<div className="h-40 bg-[#111827]"></div>}>
        <FantineFooter 
          displayStoreLogo={displayStoreLogo}
          displayStoreName={displayStoreName}
          displayTagline={displayTagline}
          displayEmail={displayEmail}
          displayPhone={displayPhone}
          shopCategories={shopCategories}
          socialLinks={socialLinks}
          setActiveNav={(nav) => navigateTo(nav as any)}
          setSelectedCategoryCheckbox={setSelectedCategoryCheckbox}
          scrollToTop={scrollToTop}
        />
      </React.Suspense>

      {/* ============================================================
          SLIDE-OUT SHOPPING BAG & CHECKOUT DRAWER
          ============================================================ */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <div className="w-screen max-w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
              
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-slate-800" />
                  <h3 className="font-serif text-lg font-bold text-slate-900">Your Shopping Bag ({totalCartCount})</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 10-Minute Cart Reservation Hold Banner */}
              {cart.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-b border-amber-500/25 px-6 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                    <span>Stock Reserved For You:</span>
                  </div>
                  <div className="font-mono font-black text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-md text-xs shadow-2xs">
                    {Math.floor(reservationSeconds / 60).toString().padStart(2, '0')}:{(reservationSeconds % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                    <div className="font-serif text-lg text-slate-600">Your bag is empty</div>
                    <p className="text-xs text-slate-500">Discover our clinical Hanbang formulas to get started.</p>
                    <button
                      type="button"
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex gap-3 sm:gap-4 pb-4 border-b border-slate-100 items-center relative group">
                      <img 
                        src={item.product.coverImage} 
                        alt={item.product.title} 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                        }}
                        className="w-16 h-16 object-cover bg-slate-50 rounded-lg border border-slate-100 shrink-0" 
                      />
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="font-serif text-sm font-semibold text-slate-900 truncate">{item.product.title}</h4>
                        <div className="text-xs text-slate-500 mt-0.5">{formatPrice(item.product.price)}</div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            type="button"
                            onClick={() => {
                              if (item.quantity > 1) {
                                handleUpdateQuantity(item.product.id, item.quantity - 1);
                              } else {
                                handleRemoveFromCart(item.product.id);
                              }
                            }}
                            className="w-6 h-6 border border-slate-200 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-semibold px-2">{item.quantity}</span>
                          <button 
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 border border-slate-200 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Right side: Remove Cross Button + Total Price */}
                      <div className="flex flex-col items-end justify-between self-stretch shrink-0 py-0.5 min-h-[60px]">
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-slate-500 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors cursor-pointer -mr-1"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="text-sm font-serif font-bold text-slate-900">
                          {formatPrice(item.product.price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-5 sm:p-6 bg-white border-t border-slate-200/80 space-y-4 shadow-lg">
                  {/* Price Breakdown Summary */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-serif font-semibold text-slate-900">{formatPrice(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center font-serif text-sm sm:text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                      <span>Total:</span>
                      <span className="text-[#f97316] text-lg font-black">{formatPrice(cartSubtotal)}</span>
                    </div>
                  </div>

                  {/* Proceed to Dedicated Checkout Page Button */}
                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        if (cart.length > 0) {
                          const eventId = createEventId('initiate_checkout');
                          trackEvent('InitiateCheckout', {
                            content_name: cart.map(i => i.product.title).join(', '),
                            content_ids: cart.map(i => i.product.id),
                            content_type: 'product',
                            value: cartGrandTotal || cartSubtotal,
                            currency: 'BDT',
                            num_items: cart.reduce((acc, item) => acc + item.quantity, 0),
                            contents: cart.map(item => ({
                              id: item.product.id,
                              name: item.product.title,
                              quantity: item.quantity,
                              item_price: item.product.price
                            }))
                          }, eventId);
                        }
                        setIsCartOpen(false);
                        navigateTo('checkout');
                      }}
                      className="w-full bg-[#f97316] hover:bg-[#ea580c] active:scale-[0.99] text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-orange-500/25 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>PROCEED TO CHECKOUT</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ORDER SUCCESS CONFIRMATION MODAL
          ============================================================ */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white max-w-md w-full shadow-2xl p-8 text-center space-y-4 border border-slate-100">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-slate-900">Order Confirmed!</h3>
            <p className="text-xs text-slate-600">
              Thank you for ordering with FANTINE Korea. Your order ID is <strong>{orderSuccess.id}</strong>.
              Our delivery team will contact you shortly.
            </p>
            <button 
              onClick={() => setOrderSuccess(null)}
              className="w-full bg-slate-900 text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
              CONTINUE SHOPPING
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          FULLSCREEN PRODUCT IMAGE ZOOM LIGHTBOX MODAL
          ============================================================ */}
      {isZoomModalOpen && (
        <div 
          onClick={() => setIsZoomModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn cursor-zoom-out"
        >
          <button 
            onClick={() => setIsZoomModalOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer z-50"
            title="Close Zoom"
          >
            <X className="w-6 h-6" />
          </button>

          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center"
          >
            <img fetchPriority="high" width={500} height={500} src={currentProductImages[activeImageIndex] || activeProductDetail.coverImage} alt={activeProductDetail.title} 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
              }}
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl shadow-2xl bg-white/5 p-2 border border-white/10"
            />

            {/* Lightbox Carousel Navigation */}
            {currentProductImages.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => (prev === 0 ? currentProductImages.length - 1 : prev - 1));
                  }}
                  className="absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => (prev === currentProductImages.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          AI SKINCARE DOCTOR & VOICE ASSISTANT FLOATING WIDGET
          ============================================================ */}
      <DoctorFloatingTrigger
        onOpenDoctor={() => {
          if (activeNav === 'product_detail' && activeProductDetail) {
            setAiDoctorContextProduct(activeProductDetail);
            setAiDoctorSelectedProductIds([activeProductDetail.id]);
          } else {
            setAiDoctorContextProduct(null);
          }
          setIsDoctorModalOpen(true);
        }}
        selectedProductCount={cart.length}
        whatsappNumber={socialLinks?.whatsapp}
        storeName={displayStoreName}
      />

      <SkincareDoctorModal
        isOpen={isDoctorModalOpen}
        onClose={() => {
          setIsDoctorModalOpen(false);
          setAiDoctorContextProduct(null);
          setQuizPrompt('');
        }}
        initialUserPrompt={quizPrompt}
        products={products}
        cartProducts={cart.map(item => item.product)}
        activeProduct={aiDoctorContextProduct || (activeNav === 'product_detail' ? activeProductDetail : null)}
        initialSelectedProductIds={aiDoctorSelectedProductIds}
      />

    </div>
  );
}
