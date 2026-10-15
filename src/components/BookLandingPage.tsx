import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShoppingCart, RefreshCw, Zap, 
  CheckCircle2, Clock, ChevronLeft, ChevronRight, Check,
  MessageCircle, Settings, Trophy, Wrench, Shirt, ShieldCheck, Package, Copy
} from 'lucide-react';
import { publicStoreService, readStorefrontCache, optimizeImageUrl } from '../lib/publicStoreService';
import { DEFAULT_DELIVERY_METHODS, DEFAULT_LANDING_PAGE_SETTINGS } from '../lib/constants';
import { Product, EcomSettings, BookOrder, LandingPageData, DeliveryMethodItem, LandingPageVariant, InstituteInfo } from '../types';
import { initPixelAndGtm, trackEvent, createEventId } from '../lib/pixelGtmService';
import { getProductSlug } from '../lib/seoUtils';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { playOrderSuccessVibe } from '../lib/soundUtils';

interface BookLandingPageProps {
  onNavigateHome: () => void;
  onNavigateToLogin: () => void;
}

export default function BookLandingPage({ onNavigateHome }: BookLandingPageProps) {
  const { slug } = useParams<{ slug?: string }>();
  
  // Instant Cache Hydration: Render in 0ms without waiting for network/Firestore
  const [storeSettings, setStoreSettings] = useState<EcomSettings | null>(() => readStorefrontCache<EcomSettings>('noor_ecom_settings'));
  const [instituteInfo, setInstituteInfo] = useState<InstituteInfo | null>(() => readStorefrontCache<InstituteInfo>('noor_institute_info'));
  const [allProducts, setAllProducts] = useState<Product[]>(() => readStorefrontCache<Product[]>('noor_ecom_products') || []);
  
  const initialTargetProduct = useMemo(() => {
    const cachedProds = readStorefrontCache<Product[]>('noor_ecom_products') || [];
    const normalizedSlug = slug ? slug.trim().toLowerCase() : '';
    if (normalizedSlug && cachedProds.length > 0) {
      return cachedProds.find(p => {
        const pSlug = (p.slug || '').toLowerCase();
        const genSlug = getProductSlug(p).toLowerCase();
        return p.id.toLowerCase() === normalizedSlug || pSlug === normalizedSlug || genSlug === normalizedSlug;
      }) || cachedProds[0];
    }
    return cachedProds[0] || null;
  }, [slug]);

  const [product, setProduct] = useState<Product | null>(initialTargetProduct);
  const [landingConfig, setLandingConfig] = useState<LandingPageData | null>(() => {
    const key = `noor_lp_${slug || initialTargetProduct?.slug || initialTargetProduct?.id || 'default'}`;
    return readStorefrontCache<LandingPageData>(key) || DEFAULT_LANDING_PAGE_SETTINGS;
  });
  
  // Never block the user with full-page loading if cache or defaults are present
  const [loading, setLoading] = useState(false);

  // Gallery slider & Variant state
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<LandingPageVariant | null>(() => {
    const key = `noor_lp_${slug || initialTargetProduct?.slug || initialTargetProduct?.id || 'default'}`;
    const cachedLp = readStorefrontCache<LandingPageData>(key);
    if (cachedLp?.customVariants && cachedLp.customVariants.length > 0) {
      return cachedLp.customVariants[0];
    }
    if (initialTargetProduct?.variants && initialTargetProduct.variants.length > 0) {
      return {
        id: initialTargetProduct.variants[0].id || 'var-0',
        name: initialTargetProduct.variants[0].name,
        image: optimizeImageUrl(initialTargetProduct.variants[0].image || initialTargetProduct.samplePages?.[0] || initialTargetProduct.image || '', 400),
        price: initialTargetProduct.variants[0].price || initialTargetProduct.price,
        regularPrice: initialTargetProduct.variants[0].regularPrice || initialTargetProduct.regularPrice
      };
    }
    return null;
  });

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedDeliveryMethodId, setSelectedDeliveryMethodId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [placedLuckyCoupon, setPlacedLuckyCoupon] = useState('');

  // Touch swipe support for gallery carousel
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Feedback dialog state
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

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        const normalizedSlug = slug ? slug.trim().toLowerCase() : '';

        // Execute ALL public queries simultaneously in parallel to avoid waterfalls
        const [settings, products, info, lpSettings] = await Promise.all([
          publicStoreService.getEcomSettings(),
          publicStoreService.getProducts(),
          publicStoreService.getInstituteInfo(),
          publicStoreService.getLandingPageSettings(normalizedSlug, initialTargetProduct || undefined)
        ]);

        if (isCancelled) return;

        setStoreSettings(settings);
        setAllProducts(products || []);
        setInstituteInfo(info || null);
        setLandingConfig(lpSettings);

        // Initialize Meta Pixel & GTM if configured
        if (settings?.pixelId || settings?.gtmId) {
          initPixelAndGtm(settings.pixelId, settings.gtmId);
        }

        // Find product matching current slug if provided
        let targetProduct: Product | undefined;
        if (normalizedSlug && products && products.length > 0) {
          targetProduct = products.find(p => {
            const pSlug = (p.slug || '').toLowerCase();
            const genSlug = getProductSlug(p).toLowerCase();
            return p.id.toLowerCase() === normalizedSlug || pSlug === normalizedSlug || genSlug === normalizedSlug;
          });
        }

        if (!targetProduct && products && products.length > 0) {
          targetProduct = products[0];
        }

        if (targetProduct) {
          setProduct(targetProduct);
        }

        // Initialize variant if available
        if (lpSettings.customVariants && lpSettings.customVariants.length > 0) {
          setSelectedVariant(prev => prev || lpSettings.customVariants![0]);
        } else if (targetProduct?.variants && targetProduct.variants.length > 0) {
          const firstVar: LandingPageVariant = {
            id: targetProduct.variants[0].id || 'var-0',
            name: targetProduct.variants[0].name,
            image: optimizeImageUrl(targetProduct.variants[0].image || targetProduct.samplePages?.[0] || targetProduct.image || '', 400),
            price: targetProduct.variants[0].price || targetProduct.price,
            regularPrice: targetProduct.variants[0].regularPrice || targetProduct.regularPrice
          };
          setSelectedVariant(prev => prev || firstVar);
        }

        // Preload top gallery & hero images in background using optimized URLs
        const imagesToPreload: string[] = [
          optimizeImageUrl(lpSettings?.heroBookImage, 800),
          optimizeImageUrl(lpSettings?.mainBookImage, 800),
          optimizeImageUrl(lpSettings?.campaignBannerImage, 800),
          optimizeImageUrl(targetProduct?.image, 800),
          ...(lpSettings?.galleryImages || []).map(img => optimizeImageUrl(img, 800)),
          ...(targetProduct?.samplePages || []).map(img => optimizeImageUrl(img, 800)),
          ...(lpSettings?.customVariants || []).map(v => optimizeImageUrl(v.image, 400))
        ].filter(Boolean) as string[];

        imagesToPreload.slice(0, 6).forEach(src => {
          if (src) {
            const img = new Image();
            img.src = src;
          }
        });

        // Track ViewContent event
        if (targetProduct || lpSettings) {
          const viewPrice = targetProduct?.price || lpSettings?.offerPrice || 0;
          const viewTitle = targetProduct?.title || lpSettings?.bookTitle || 'Watch Landing';
          const eventId = createEventId('view');
          trackEvent('ViewContent', {
            content_name: viewTitle,
            content_ids: [targetProduct?.id || lpSettings?.productId || 'landing'],
            content_type: 'product',
            value: viewPrice,
            currency: 'BDT'
          }, eventId);
        }
      } catch (error) {
        console.warn("Landing page background refresh:", error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [slug, initialTargetProduct]);

  const fallbackProduct = {
    title: 'CASIO ROYALE AE-1200 CHAIN VERSION',
    subtitle: 'CASIO AE-1200 Watch',
    price: 999,
    regularPrice: 1650,
    image: '/placeholder-image.svg',
    description: ''
  };

  const displayTitle = landingConfig?.bookTitle || product?.title || fallbackProduct.title;
  const displaySubtitle = landingConfig?.bookSubtitle || product?.subtitle || landingConfig?.authorName || fallbackProduct.subtitle;
  const displayDesc = landingConfig?.heroDescription || product?.description || fallbackProduct.description;
  const displayPrice = selectedVariant?.price || landingConfig?.offerPrice || product?.price || fallbackProduct.price;
  const regularPrice = selectedVariant?.regularPrice || landingConfig?.regularPrice || product?.regularPrice || fallbackProduct.regularPrice;
  const displayImage = selectedVariant?.image || landingConfig?.heroBookImage || landingConfig?.mainBookImage || product?.image || fallbackProduct.image || '/placeholder-image.svg';
  
  // Dedicated Top Hero Banner image (uploaded in Section 2 as 'Landing page hero product image' - Original/HD)
  const heroTopImage = landingConfig?.heroBookImage || landingConfig?.mainBookImage || landingConfig?.campaignBannerImage || product?.image || fallbackProduct.image || '/placeholder-image.svg';

  // YouTube Video Embed URL Helper
  const getYouTubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };
  const embedVideoUrl = getYouTubeEmbedUrl(landingConfig?.videoUrl);
  
  const campaignBadgeText = landingConfig?.campaignBadgeText || '🏆 Winner will get this bike';
  const rawTicker = landingConfig?.campaignTickerText || landingConfig?.bannerDeliveryText;
  const campaignTickerText = (rawTicker && !rawTicker.includes('2 bikes and a car'))
    ? rawTicker
    : 'Lucky coupon to win Yamaha R15 on order.';

  // Variants list
  const variants: LandingPageVariant[] = useMemo(() => {
    if (landingConfig?.customVariants && landingConfig.customVariants.length > 0) {
      return landingConfig.customVariants;
    }
    if (product?.variants && product.variants.length > 0) {
      return product.variants.map((v, i) => ({
        id: v.id || `var-${i}`,
        name: v.name,
        image: v.image || product.samplePages?.[i] || product.image || displayImage,
        price: v.price || product.price,
        regularPrice: v.regularPrice || product.regularPrice,
        tag: i === 0 ? 'Best seller' : 'popular'
      }));
    }
    return [
      {
        id: 'var-default',
        name: displayTitle || 'CASIO AE-1200 Watch',
        image: displayImage,
        price: displayPrice,
        regularPrice: regularPrice,
        tag: 'Original Edition'
      }
    ];
  }, [landingConfig?.customVariants, product?.variants, product?.samplePages, product?.image, displayImage, displayPrice, regularPrice, displayTitle]);

  // Gallery images list for slider
  const galleryImages: string[] = useMemo(() => {
    const list: string[] = [];
    if (landingConfig?.galleryImages && landingConfig.galleryImages.length > 0) {
      list.push(...landingConfig.galleryImages.map(img => optimizeImageUrl(img, 800)));
    }
    if (product?.samplePages && product.samplePages.length > 0) {
      list.push(...product.samplePages.map(img => optimizeImageUrl(img, 800)));
    }
    if (variants && variants.length > 0) {
      variants.forEach(v => {
        if (v.image) {
          const opt = optimizeImageUrl(v.image, 800);
          if (!list.includes(opt)) {
            list.push(opt);
          }
        }
      });
    }
    if (displayImage && !list.includes(displayImage)) {
      list.unshift(displayImage);
    }
    return list.length > 0 ? list : [displayImage];
  }, [landingConfig?.galleryImages, product?.samplePages, variants, displayImage]);

  const storeName = storeSettings?.storeName || instituteInfo?.name || 'Watch Store';

  // Support & Helpline Phone
  const rawSupportPhone = instituteInfo?.phone || storeSettings?.bkashNumber || storeSettings?.nagadNumber || landingConfig?.whatsAppNumber || '';
  const supportPhone = (rawSupportPhone && rawSupportPhone !== '01XXXXXXXXX' && !rawSupportPhone.includes('01XXXXXXXXX'))
    ? rawSupportPhone
    : '';

  // WhatsApp Phone
  const rawWhatsAppPhone = landingConfig?.whatsAppNumber || instituteInfo?.phone || storeSettings?.bkashNumber || storeSettings?.nagadNumber || '';
  const whatsAppPhone = (rawWhatsAppPhone && rawWhatsAppPhone !== '01XXXXXXXXX' && !rawWhatsAppPhone.includes('01XXXXXXXXX'))
    ? rawWhatsAppPhone
    : '';
  const cleanWhatsAppNumber = whatsAppPhone.replace(/\D/g, '').replace(/^0/, '880');

  // Dynamic Vintage / Story Section Data
  const vintageTag = landingConfig?.vintageTag ?? 'For vintage lovers';
  const vintageTitle = landingConfig?.vintageTitle ?? 'Whose eyes still get stuck on the clocks of yesteryear';
  const vintageDescription = landingConfig?.vintageDescription ?? 'A taste of real time lost in the crowd of smartwatches — this classic design is for them.';

  const vintageFeatures = useMemo(() => {
    if (landingConfig?.vintageFeatures && landingConfig.vintageFeatures.length > 0) {
      return landingConfig.vintageFeatures;
    }
    return [
      { id: 'vf-1', title: 'Classic Dial', subtitle: '40s-90s original look', icon: 'Clock' },
      { id: 'vf-2', title: 'Durable metal body', subtitle: 'Can be used for years', icon: 'Wrench' },
      { id: 'vf-3', title: 'Retro LED backlight', subtitle: 'Brings back old memories', icon: 'Zap' },
      { id: 'vf-4', title: 'Fits all clothes', subtitle: 'Formal or casual', icon: 'Shirt' }
    ];
  }, [landingConfig?.vintageFeatures]);

  // Gallery Section Titles
  const gallerySectionTag = landingConfig?.gallerySectionTag ?? 'Gallery';
  const gallerySectionTitle = landingConfig?.gallerySectionTitle ?? 'Premium from every angle';

  // Quality Section Data
  const qualitySectionTag = landingConfig?.qualitySectionTag ?? 'Why this watch?';
  const qualitySectionTitle = landingConfig?.qualitySectionTitle ?? 'Japanese quality, amazing price';

  const qualityItems = useMemo(() => {
    if (landingConfig?.qualityItems && landingConfig.qualityItems.length > 0) {
      return landingConfig.qualityItems;
    }
    return [
      { id: 'qi-1', title: 'Precise timing', subtitle: 'Original movement design', icon: 'Settings' },
      { id: 'qi-2', title: 'Premium look', subtitle: 'Classic design on metal band', icon: 'Trophy' }
    ];
  }, [landingConfig?.qualityItems]);

  // Lucky Draw Campaign Data
  const luckyDrawTag = landingConfig?.luckyDrawTag ?? 'R15 lucky draw';
  const luckyDrawTitle = landingConfig?.luckyDrawTitle ?? 'Order, win R15';
  const luckyDrawSteps = useMemo(() => {
    if (landingConfig?.luckyDrawSteps && landingConfig.luckyDrawSteps.length > 0) {
      return landingConfig.luckyDrawSteps;
    }
    return [
      'Order watch — receive unique lucky coupon code with parcel',
      'Keep the coupon code safe',
      'Winners will be selected by lottery next month',
      'The result will be announced live on Facebook Live'
    ];
  }, [landingConfig?.luckyDrawSteps]);

  const grandPrizeTitle = landingConfig?.grandPrizeTitle ?? 'Yamaha R15';
  const grandPrizeSubtitle = landingConfig?.grandPrizeSubtitle ?? 'Every order = a new opportunity';
  const grandPrizeLiveTag = landingConfig?.grandPrizeLiveTag ?? 'FACEBOOK LIVE STREAM';

  // Color Section Titles
  const colorSectionTag = landingConfig?.colorSectionTag ?? 'Color selection';
  const colorSectionTitle = landingConfig?.colorSectionTitle ?? 'Click on the color button below to preview the watch and order';

  // Icon Helper for Dynamic Cards
  const renderFeatureIcon = (iconName?: string) => {
    switch ((iconName || '').toLowerCase()) {
      case 'wrench': return <Wrench className="w-5 h-5 text-[#e0562e]" />;
      case 'zap': return <Zap className="w-5 h-5 text-[#e0562e]" />;
      case 'shirt': return <Shirt className="w-5 h-5 text-[#e0562e]" />;
      case 'settings': return <Settings className="w-5 h-5 text-[#8f8274]" />;
      case 'trophy': return <Trophy className="w-5 h-5 text-[#d49b38]" />;
      case 'clock':
      default:
        return <Clock className="w-5 h-5 text-[#e0562e]" />;
    }
  };

  const discountPercent = regularPrice > displayPrice 
    ? Math.round(((regularPrice - displayPrice) / regularPrice) * 100) 
    : 60;

  useEffect(() => {
    if (displayTitle) {
      document.title = `${displayTitle} | ${storeName}`;
    }
  }, [displayTitle, storeName]);
  
  const activeDeliveryMethods: DeliveryMethodItem[] = useMemo(() => {
    const methods = storeSettings?.deliveryMethods?.filter(m => m.status === 'Active') || [];
    if (methods.length > 0) return methods;
    return DEFAULT_DELIVERY_METHODS.filter(m => m.status === 'Active');
  }, [storeSettings?.deliveryMethods]);

  useEffect(() => {
    if (activeDeliveryMethods.length > 0 && (!selectedDeliveryMethodId || !activeDeliveryMethods.some(m => m.id === selectedDeliveryMethodId))) {
      setSelectedDeliveryMethodId(activeDeliveryMethods[0].id);
    }
  }, [activeDeliveryMethods, selectedDeliveryMethodId]);

  const selectedDeliveryMethod = activeDeliveryMethods.find(m => m.id === selectedDeliveryMethodId) || activeDeliveryMethods[0];
  const deliveryCharge = selectedDeliveryMethod ? Number(selectedDeliveryMethod.deliveryCharge || 0) : 80;
  const subtotal = (displayPrice || 0) * quantity;
  const totalPrice = subtotal + deliveryCharge;

  // Gallery carousel controls
  const handlePrevSlide = () => {
    setGalleryIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setGalleryIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > 50) {
      handleNextSlide();
    } else if (distance < -50) {
      handlePrevSlide();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const scrollToOrder = () => {
    const eventId = createEventId('initiate_checkout');
    trackEvent('InitiateCheckout', {
      content_name: chosenItemTitle,
      content_ids: [product?.id || landingConfig?.productId || 'landing_product'],
      content_type: 'product',
      value: totalPrice || displayPrice,
      currency: 'BDT',
      num_items: quantity
    }, eventId);

    const el = document.getElementById('order-form-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleWhatsAppClick = () => {
    trackEvent('Contact', { content_name: 'WhatsApp Order Inquiry' });
    if (!cleanWhatsAppNumber || cleanWhatsAppNumber.length < 10) {
      scrollToOrder();
      return;
    }
    const productName = selectedVariant?.name || displayTitle;
    const message = encodeURIComponent(`Hello, it's me ${productName} watchT (${displayPrice}Tk.) want to order। Give details?`);
    window.open(`https://wa.me/${cleanWhatsAppNumber}?text=${message}`, '_blank');
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setFeedback({
        isOpen: true,
        type: 'info',
        title: 'Information is required',
        message: 'Please provide your name, mobile number and full delivery address.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
      const luckyCode = 'R15-' + Math.floor(100000 + Math.random() * 900000);
      const chosenItemTitle = selectedVariant ? `${displayTitle} (${selectedVariant.name})` : displayTitle;
      
      const newOrder: BookOrder = {
        id: orderId,
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim(),
        quantity: quantity,
        price: displayPrice,
        unitPrice: displayPrice,
        deliveryCharge: deliveryCharge,
        totalPrice: totalPrice,
        totalAmount: totalPrice,
        deliveryArea: selectedDeliveryMethod?.title || 'Inside Dhaka',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        paymentMethod: 'COD',
        orderType: 'landing',
        source: slug ? `landing-${slug}` : 'landing-page',
        productId: product?.id || landingConfig?.productId || 'watch_landing',
        productTitle: chosenItemTitle,
        productName: chosenItemTitle,
        luckyCouponCode: luckyCode,
        items: [{
          product: {
            id: product?.id || landingConfig?.productId || 'watch_prod',
            title: chosenItemTitle,
            price: displayPrice,
            regularPrice: regularPrice,
            image: selectedVariant?.image || displayImage,
            category: product?.category || 'Watches',
            stock: 100,
            isAvailable: true
          },
          quantity: quantity,
          variant: selectedVariant ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            price: selectedVariant.price || displayPrice,
            regularPrice: selectedVariant.regularPrice || regularPrice
          } : undefined
        }],
        district: selectedDeliveryMethod?.title || 'N/A'
      };

      const { dbService } = await import('../lib/dbService');
      await dbService.addBookOrder(newOrder);

      // Track Purchase event with Meta Pixel & GTM
      const eventId = createEventId('purchase');
      trackEvent('Purchase', {
        content_name: chosenItemTitle,
        content_ids: [product?.id || landingConfig?.productId || 'watch_item'],
        content_type: 'product',
        value: totalPrice,
        currency: 'BDT',
        num_items: quantity
      }, eventId);

      playOrderSuccessVibe();
      setPlacedOrderId(orderId);
      setPlacedLuckyCoupon(luckyCode);
      setOrderSuccess(true);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setQuantity(1);
    } catch (err: any) {
      console.error("Order submission failed", err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'The order failed',
        message: err?.message || 'Sorry, the order was not successful. Please try again or contact directly on WhatsApp.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#110e0a] flex flex-col items-center justify-center space-y-4 text-[#e0562e]">
        <RefreshCw className="h-10 w-10 animate-spin text-[#e0562e]" />
        <p className="text-[#d8c8b8] text-sm font-semibold tracking-wider">Loading Premium Collection of Watches...</p>
      </div>
    );
  }

  if (landingConfig?.isEnabled === false) {
    return (
      <div className="min-h-screen bg-[#110e0a] flex flex-col items-center justify-center p-6 text-center font-sans text-slate-100">
        <div className="max-w-md w-full bg-[#1c1611] border border-[#b8863b]/30 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-[#e0562e]/10 border border-[#e0562e]/30 rounded-2xl flex items-center justify-center mx-auto text-[#e0562e]">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">This campaign is currently suspended</h2>
            <p className="text-xs text-[#a89d91] leading-relaxed">
              {displayTitle} - Its landing page campaignT Temporarily closed। You can see other interesting models in our online store।
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full py-3.5 bg-[#e0562e] hover:bg-[#c44320] text-white font-black text-xs rounded-xl transition-all shadow-lg cursor-pointer"
          >
            All storesRoSee Duct
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#110e0a] text-slate-100 font-sans pb-28 sm:pb-20 selection:bg-[#e0562e] selection:text-white">
      
      {/* Container wrapper matching bestwatchbd layout */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-3 space-y-7">

        {/* ========================================================== */}
        {/* 1. TOP GIVEAWAY BANNER & HERO SECTION                      */}
        {/* ========================================================== */}
        <section className="text-center space-y-4 pt-2">
          
          {/* Top Pill Badge: '🏆 Winner will get this bike' */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1c1611] border border-[#d49b38]/60 text-[#f5b842] text-xs font-bold tracking-wide shadow-md">
            <span>{campaignBadgeText}</span>
          </div>

          {/* Top Graphic Poster Banner (Hero Top Image) */}
          <div className="relative rounded-2xl overflow-hidden border border-[#b8863b]/30 shadow-2xl bg-[#16120e]">
            <img 
              src={heroTopImage || '/placeholder-image.svg'} 
              alt={displayTitle} 
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/placeholder-image.svg')) {
                  target.src = '/placeholder-image.svg';
                }
              }}
              className="w-full h-auto max-h-[480px] object-cover mx-auto"
            />
          </div>

          {/* Embedded YouTube Video (9:16 Mobile & 16:9 Desktop) */}
          {embedVideoUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-[#b8863b]/30 shadow-2xl bg-black aspect-[9/16] md:aspect-video w-full max-w-sm md:max-w-none mx-auto my-3">
              <iframe
                src={embedVideoUrl}
                title="Product Video Review"
                loading="lazy"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}

          {/* Main Hero Title: 'Old fashioned design, chance to win R15!' */}
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug tracking-tight px-2">
            {displayTitle}
          </h1>

          {/* Subtitle / Pitch Copy */}
          <p className="text-xs sm:text-sm text-[#d4c8bc] leading-relaxed max-w-lg mx-auto font-normal px-2">
            {displayDesc}
          </p>

          {/* Lucky Draw Ticker Text */}
          {campaignTickerText && (
            <p className="text-xs sm:text-sm font-bold text-[#f5b842] leading-tight">
              {campaignTickerText}
            </p>
          )}

          {/* Price & Discount Row */}
          <div className="flex items-center justify-center gap-3 pt-1">
            {regularPrice > displayPrice && (
              <span className="text-sm sm:text-base text-slate-400 line-through font-mono font-medium">
                Tk.{regularPrice.toLocaleString('bn-BD')}
              </span>
            )}
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {displayPrice.toLocaleString('bn-BD')} only
            </span>
            {discountPercent > 0 && (
              <span className="bg-[#e4a836] text-[#1a140d] font-black text-xs px-2.5 py-0.5 rounded-md shadow-xs">
                {discountPercent}% discount
              </span>
            )}
          </div>

          {/* Primary CTA Button: '🛒 Order now' */}
          <div className="pt-2">
            <button
              type="button"
              onClick={scrollToOrder}
              className="w-full max-w-md mx-auto py-3.5 px-6 bg-[#e0562e] hover:bg-[#c9451f] text-white font-black text-sm sm:text-base rounded-xl shadow-lg shadow-[#e0562e]/30 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Order now</span>
            </button>
          </div>
        </section>

        {/* ========================================================== */}
        {/* 2. SECTION: 'Whose eyes still get stuck on the clocks of yesteryear' */}
        {/* ========================================================== */}
        <section className="text-center space-y-4 pt-4">
          <div className="space-y-1">
            {vintageTag && (
              <p className="text-xs sm:text-sm font-bold text-[#e0562e] tracking-wide">
                {vintageTag}
              </p>
            )}
            <h2 className="text-lg sm:text-2xl font-black text-white px-2">
              {vintageTitle}
            </h2>
            {vintageDescription && (
              <p className="text-xs text-[#b8aba0] max-w-md mx-auto leading-relaxed pt-1">
                {vintageDescription}
              </p>
            )}
          </div>

          {/* Dynamic Feature Cards with Dashed Amber Border */}
          <div className="space-y-3 pt-1 text-left">
            {vintageFeatures.map((feat, idx) => (
              <div 
                key={feat.id || idx}
                className="bg-[#17130e] border border-dashed border-[#b8863b]/70 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#251d14] border border-[#b8863b]/30 flex items-center justify-center text-[#e0562e] shrink-0">
                  {renderFeatureIcon(feat.icon)}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#e0562e]">{feat.title}</h3>
                  <p className="text-[11px] sm:text-xs text-[#c9bcb0]">{feat.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================== */}
        {/* 3. SECTION: 'Gallery' / 'Premium from every angle' */}
        {/* ========================================================== */}
        <section className="text-center space-y-3 pt-3">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#e0562e] flex items-center justify-center gap-2">
              <span className="w-6 h-[1px] bg-[#e0562e]"></span>
              <span>{gallerySectionTag}</span>
              <span className="w-6 h-[1px] bg-[#e0562e]"></span>
            </p>
            <h2 className="text-lg sm:text-2xl font-black text-white">
              {gallerySectionTitle}
            </h2>
          </div>

          {/* Interactive Image Slider */}
          <div 
            className="relative rounded-2xl overflow-hidden border border-[#b8863b]/40 shadow-xl bg-[#17130e] max-w-md mx-auto aspect-square flex items-center justify-center group"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img 
              src={galleryImages[galleryIndex] || displayImage || '/placeholder-image.svg'} 
              alt="Watch Gallery" 
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/placeholder-image.svg')) {
                  target.src = '/placeholder-image.svg';
                }
              }}
              className="w-full h-full object-cover transition-all duration-300"
            />

            {/* Slider Navigation Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Pagination Dots */}
          {galleryImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {galleryImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIndex(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    galleryIndex === i ? 'w-5 bg-[#e0562e]' : 'w-2 bg-[#4a3f33]'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Order CTA under Slider */}
          <div className="pt-2">
            <button
              type="button"
              onClick={scrollToOrder}
              className="w-full max-w-md mx-auto py-3.5 px-6 bg-[#e0562e] hover:bg-[#c9451f] text-white font-black text-sm rounded-xl shadow-md transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Order now</span>
            </button>
          </div>
        </section>



        {/* ========================================================== */}
        {/* 5. SECTION: 'R15 lucky draw' / 'Order, win R15'       */}
        {/* ========================================================== */}
        <section className="text-center space-y-4 pt-3">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#e0562e] flex items-center justify-center gap-2">
              <span className="w-6 h-[1px] bg-[#e0562e]"></span>
              <span>{luckyDrawTag}</span>
              <span className="w-6 h-[1px] bg-[#e0562e]"></span>
            </p>
            <h2 className="text-lg sm:text-2xl font-black text-white">
              {luckyDrawTitle}
            </h2>
          </div>

          {/* Step-by-Step Numbered List */}
          <div className="space-y-3.5 text-left max-w-md mx-auto pt-1">
            {luckyDrawSteps.map((stepText, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#e0562e] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {(idx + 1).toLocaleString('bn-BD')}
                </span>
                <p className="text-xs sm:text-sm text-[#d4c8bc] leading-snug">
                  {stepText}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================== */}
        {/* 6. SECTION: 'Color selection' & ORDER FORM (CHECKOUT)        */}
        {/* ========================================================== */}
        <section id="order-form-section" className="scroll-mt-12 text-center space-y-4 pt-3">
          {variants.length > 1 ? (
            /* Multi-Variant Mode (e.g. Silver, Black) */
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#e0562e] flex items-center justify-center gap-2">
                  <span className="w-6 h-[1px] bg-[#e0562e]"></span>
                  <span>{colorSectionTag}</span>
                  <span className="w-6 h-[1px] bg-[#e0562e]"></span>
                </p>
                <h2 className="text-base sm:text-xl font-black text-white px-2">
                  {colorSectionTitle}
                </h2>
              </div>

              {/* Variant Selector Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md mx-auto pt-1">
                {variants.map((v, idx) => {
                  const isSelected = (selectedVariant?.id === v.id) || (!selectedVariant && idx === 0);
                  return (
                    <button
                      key={v.id || idx}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#181d24] text-white border-2 border-[#f5b842] shadow-lg ring-2 ring-[#f5b842]/30 scale-102'
                          : 'bg-[#17130e] text-[#c9bcb0] border border-[#2e261e] hover:border-[#b8863b]/50'
                      }`}
                    >
                      {v.image && (
                        <img 
                          src={v.image} 
                          alt={v.name} 
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.endsWith('/placeholder-image.svg')) {
                              target.src = '/placeholder-image.svg';
                            }
                          }}
                          className="w-6 h-6 object-contain rounded" 
                        />
                      )}
                      <span>{v.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#f5b842] stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Single Variant: Clean Product Title & Highlight Badge */
            <div className="space-y-2.5 max-w-md mx-auto px-2">
              <p className="text-xs font-bold text-[#e0562e] flex items-center justify-center gap-2">
                <span className="w-6 h-[1px] bg-[#e0562e]"></span>
                <span>{colorSectionTag || 'colorselection'}</span>
                <span className="w-6 h-[1px] bg-[#e0562e]"></span>
              </p>

              <div className="bg-gradient-to-r from-[#1c150c] via-[#17130e] to-[#120e0a] border border-[#b8863b]/40 rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#0f0c08] border border-[#382d22] p-1 shrink-0 flex items-center justify-center">
                    <img
                      src={selectedVariant?.image || displayImage || '/placeholder-image.svg'}
                      alt={selectedVariant?.name || displayTitle}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.endsWith('/placeholder-image.svg')) {
                          target.src = '/placeholder-image.svg';
                        }
                      }}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      {displayTitle}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#f5b842] bg-[#f5b842]/10 px-2 py-0.5 rounded-md border border-[#f5b842]/20">
                        ✨ {selectedVariant?.tag || 'Original Premium Collection'}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        ⚡ In-stock ready delivery
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Placement Form */}
          <div className="bg-[#17130e] border border-[#b8863b]/40 rounded-2xl p-4 sm:p-6 text-left max-w-md mx-auto shadow-2xl space-y-4">
            
            {orderSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">Congratulations! Your order has been successful</h3>
                  <p className="text-xs text-slate-300">
                    Order number: <span className="font-mono font-black text-[#f5b842]">#{placedOrderId}</span>
                  </p>
                </div>

                {/* Golden Yamaha R15 Lucky Draw Coupon Ticket Card */}
                {placedLuckyCoupon && (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-[#f5b842] bg-gradient-to-b from-[#2d1e0d] via-[#1c150c] to-[#120e0a] p-4 text-center shadow-2xl space-y-2.5">
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#f5b842]/10 rounded-full blur-xl pointer-events-none" />
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5b842]/20 border border-[#f5b842]/40 text-[#f5b842] text-[11px] font-bold">
                      <Trophy className="w-3.5 h-3.5 text-[#f5b842]" />
                      <span>Yamaha R15 Mega Lucky Draw Coupon</span>
                    </div>
                    
                    <p className="text-[11px] text-[#d8c8b8]">Your Confirmed Lucky Draw Coupon Number:</p>
                    
                    <div className="py-2.5 px-4 bg-black/60 border border-dashed border-[#f5b842]/70 rounded-xl flex items-center justify-center gap-3">
                      <span className="font-mono text-xl sm:text-2xl font-black text-[#f5b842] tracking-wider selection:bg-amber-500">
                        {placedLuckyCoupon}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(placedLuckyCoupon);
                          setFeedback({
                            isOpen: true,
                            type: 'success',
                            title: 'Copy successful!',
                            message: `Coupon code ${placedLuckyCoupon} successfulCopied।`
                          });
                        }}
                        className="p-1.5 rounded-lg bg-[#f5b842]/20 hover:bg-[#f5b842]/30 text-[#f5b842] transition-colors cursor-pointer"
                        title="Copy the coupon code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-[10px] text-[#a89d91] space-y-1">
                      <p className="text-amber-300 font-semibold flex items-center justify-center gap-1">
                        <span>📸</span> Coupon numberTScreenshot or save
                      </p>
                      <p>This code will also be printed on the official coupon card provided with the parcel.</p>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-[#a89d91]">
                  Our representative will call your order shortlyT Confirm।
                </p>

                <button
                  type="button"
                  onClick={() => setOrderSuccess(false)}
                  className="w-full py-3 bg-[#e0562e] hover:bg-[#c44320] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  anotherT order
                </button>
              </div>
            ) : (
              <form onSubmit={handleOrderSubmit} className="space-y-3.5 text-xs">
                <div className="text-center border-b border-[#2e261e] pb-2">
                  <h3 className="text-sm font-bold text-white">Fill the order form</h3>
                  <p className="text-[10px] text-[#a89d91]">Cash on Delivery — Pay on receipt of goods</p>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-200">
                    your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#120e0a] border border-[#382d22] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#e0562e] transition-all"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-200">
                    mobile number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="For example: 017XXXXXXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#120e0a] border border-[#382d22] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#e0562e] transition-all font-mono"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-200">
                    Complete delivery address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Mention House No., Road, Police Station, District"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#120e0a] border border-[#382d22] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#e0562e] transition-all resize-none"
                  />
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-slate-200">Quantity:</span>
                  <div className="flex items-center border border-[#382d22] rounded-lg bg-[#120e0a]">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1 text-slate-300 hover:text-white font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-[#f5b842] font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="px-3 py-1 text-slate-300 hover:text-white font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Delivery Area Selection */}
                <div className="space-y-1.5 pt-1">
                  <label className="block font-bold text-slate-200">Delivery Area:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeDeliveryMethods.map((method) => {
                      const isSelected = (selectedDeliveryMethod?.id === method.id) || (selectedDeliveryMethodId === method.id);
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedDeliveryMethodId(method.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#261e16] border-[#e0562e] text-white shadow-xs'
                              : 'bg-[#120e0a] border-[#2e261e] text-[#a89d91]'
                          }`}
                        >
                          <span className="font-bold text-[11px] truncate">{method.title}</span>
                          <span className="font-bold text-[11px] text-[#f5b842] font-mono">Tk.{method.deliveryCharge}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-[#120e0a] border border-[#2e261e] rounded-xl p-3 space-y-1.5 pt-2">
                  <div className="flex justify-between text-[#a89d91]">
                    <span>{quantity} T:</span>
                    <span className="font-bold text-white font-mono">Tk.{subtotal.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="flex justify-between text-[#a89d91]">
                    <span>Delivery charges:</span>
                    <span className="font-bold text-white font-mono">Tk.{deliveryCharge}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#2e261e] flex justify-between font-black text-sm text-white">
                    <span>Total Bill:</span>
                    <span className="text-[#f5b842] font-mono">Tk.{totalPrice.toLocaleString('bn-BD')}</span>
                  </div>
                </div>

                {/* Submit Order Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#e0562e] hover:bg-[#c9451f] text-white font-black text-sm rounded-xl shadow-lg transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm Order • Tk.{totalPrice.toLocaleString('bn-BD')}</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-[#a89d91] flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pay full price upon receipt of product</span>
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#2e261e] py-6 text-center text-[11px] text-[#8f8274] space-y-1">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          {supportPhone && (
            <p>Emergency Helpline: <a href={`tel:${supportPhone}`} className="text-[#f5b842] font-bold">{supportPhone}</a></p>
          )}
        </footer>

      </div>

      {/* ========================================================== */}
      {/* 7. FIXED BOTTOM ACTION BAR (Exact demo style from photos)  */}
      {/* ========================================================== */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-[#16120e]/95 backdrop-blur-md border-t border-[#2e261e] p-2.5 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          {/* Orange '🛒 Place an order' Button */}
          <button
            type="button"
            onClick={scrollToOrder}
            className="flex-1 py-3 px-3 bg-[#e0562e] hover:bg-[#c9451f] text-white font-black text-xs sm:text-sm rounded-lg shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>order</span>
          </button>

          {/* Green '💬 WhatsApp' Button */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="flex-1 py-3 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs sm:text-sm rounded-lg shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
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
    </div>
  );
}
