import { 
  Product, Coupon, Brand, 
  PaymentGatewayItem, DeliveryMethodItem, HeroBannerItem, PromoCardItem, 
  EcomSettings, InstituteInfo, FlashSaleSettings, HighlightSpotlightSettings 
} from '../types';

export const DEFAULT_PRODUCTS: Product[] = [];

export const DEFAULT_COUPONS: Coupon[] = [];

export const DEFAULT_BRANDS: Brand[] = [];

export const DEFAULT_PAYMENT_GATEWAYS: PaymentGatewayItem[] = [
  {
    id: 'gw-1',
    title: 'Cash on Delivery',
    type: 'Cash on Delivery',
    status: 'Active',
    transactionFee: 0,
    discountAmount: 0,
    priority: 1,
    instruction: 'Pay with cash upon delivery of your order.',
    updatedAt: new Date().toLocaleDateString(),
    accountNumber: ''
  }
];

export const DEFAULT_DELIVERY_METHODS: DeliveryMethodItem[] = [
  {
    id: 'dm-1',
    title: 'Inside Dhaka',
    status: 'Active',
    mode: 'Fixed',
    type: 'Fixed',
    minimumCharge: 0,
    maximumCharge: 0,
    deliveryCharge: 60,
    updatedAt: new Date().toLocaleDateString()
  },
  {
    id: 'dm-2',
    title: 'Outside Dhaka',
    status: 'Active',
    mode: 'Fixed',
    type: 'Fixed',
    minimumCharge: 0,
    maximumCharge: 0,
    deliveryCharge: 110,
    updatedAt: new Date().toLocaleDateString()
  }
];

export const DEFAULT_HERO_BANNERS: HeroBannerItem[] = [];

export const DEFAULT_PROMO_CARDS: PromoCardItem[] = [];

export const DEFAULT_ABOUT_SETTINGS: import('../types').AboutPageSettings = {
  title: 'About Us',
  subtitle: 'SHOSTIR BAZAR - COMFORT TO WELLNESS',
  content: `SHOSTIR BAZAR-এ আমরা বিশ্বাস করি সুস্থতা ও স্বাস্থ্যকর জীবনযাপন সবার অধিকার।

আমরা সরাসরি বিশ্বমানের খাঁটি, বিশুদ্ধ ও স্বাস্থ্যকর খাদ্য ও পুষ্টিকর সুপারফুড সরবরাহ করি। আমাদের প্রতিটি প্রোডাক্ট ১০০% আসল, ল্যাব-টেস্টেড এবং সম্পূর্ণ নিরাপদ।

আমাদের লক্ষ্য হলো বাংলাদেশের প্রতিটি মানুষের কাছে সেরা মানের পুষ্টিকর, খাঁটি ও স্বাস্থ্যকর খাদ্যপণ্য সহজলভ্য এবং নির্ভরযোগ্যভাবে পৌঁছে দেওয়া।`,
  image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1600&auto=format&fit=crop&q=85',
  badge: 'PURE & ORGANIC WELLNESS',
  heroTitle: 'Pure Nutrition & Holistic Health For All',
  heroSubtitle: 'SHOSTIR BAZAR brings you the finest selection of authentic superfoods, organic dates, premium nuts, and daily wellness items.',
  heroImage: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1600&auto=format&fit=crop&q=85',
  storyBadge: 'OUR PHILOSOPHY & PROMISE',
  storyTitle: 'Pure Natural Quality You Can Trust',
  storySubtitle: 'From Trusted Organic Growers Directly to Your Family',
  storyParagraph1: 'SHOSTIR BAZAR was born out of a profound commitment to health, purity, and daily wellness. By sourcing authentic superfoods—such as fresh Medina Ajwa dates, golden raisins, organic honey, and raw nuts—we bring health straight to your family table.',
  storyParagraph2: 'Every product is handpicked, quality checked, and carefully packed under strict hygienic standards ensuring maximum freshness and nutritional integrity.',
  storyParagraph3: '100% natural, fresh, free from artificial additives, and guaranteed authentic.',
  storyImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1000&auto=format&fit=crop&q=85',
  pillarsTitle: 'Our Four Pillars of Quality',
  pillarsSubtitle: 'Committed to delivering uncompromising purity and vitality',
  pillars: [
    {
      id: 'p1',
      badge: 'PURITY',
      title: '100% Authentic & Pure',
      description: 'Sourced directly from authentic origins with absolute guarantees of quality and purity.',
      icon: 'Sprout'
    },
    {
      id: 'p2',
      badge: 'HYGIENE',
      title: 'Hygienic Packing',
      description: 'Food-grade premium packaging ensuring maximum freshness and extended shelf life.',
      icon: 'ShieldCheck'
    },
    {
      id: 'p3',
      badge: 'NUTRITION',
      title: 'High Nutrient Density',
      description: 'Loaded with natural vitamins, minerals, and antioxidants for your family’s daily energy.',
      icon: 'Heart'
    },
    {
      id: 'p4',
      badge: 'CARE',
      title: 'Customer Satisfaction',
      description: 'Fast nationwide delivery with Cash on Delivery and dedicated customer support.',
      icon: 'Sparkles'
    }
  ],
  hqTitle: 'SHOSTIR BAZAR Headquarters',
  hqSubtitle: 'Comfort To Wellness',
  hqAddress: 'Dhaka, Bangladesh',
  hqImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=85',
  missionStatement: '',
  founderQuote: 'Healthy living starts with what you consume every day. We are here to make authentic wellness effortless and trustworthy.',
  founderName: 'SHOSTIR BAZAR Wellness Team',
  founderTitle: 'Quality & Wellness Division',
  founderImage: 'https://images.unsplash.com/photo-1594824813589-980f745e69e8?w=800&auto=format&fit=crop&q=85',
  stats: [
    { id: 's1', value: '100%', label: 'Authentic & Pure' },
    { id: 's2', value: '24-48h', label: 'Fast Delivery' },
    { id: 's3', value: '10k+', label: 'Happy Customers' },
    { id: 's4', value: 'COD', label: 'Cash on Delivery' }
  ]
};

export const DEFAULT_FLASH_SALE_SETTINGS: FlashSaleSettings = {
  enabled: false,
  productId: '',
  badgeTag: '',
  title: '',
  subtitle: '',
  customImage: '',
  flashPrice: 0,
  originalPrice: 0,
  endDate: '',
  buttonText: 'SHOP NOW',
  showVideoSection: false,
  videoTitle: '',
  videoSubtitle: '',
  videoType: 'file',
  videoUrl: ''
};

export const DEFAULT_HIGHLIGHT_SPOTLIGHT_SETTINGS: HighlightSpotlightSettings = {
  enabled: false,
  targetType: 'product',
  productId: '',
  categoryName: '',
  badgeTag: '',
  title: '',
  subtitle: '',
  customImage: '',
  buttonText: 'BUY NOW',
  buttonLink: ''
};

export const DEFAULT_ECOM_SETTINGS: EcomSettings = {
  storeName: 'SHOSTIR BAZAR',
  companyName: 'SHOSTIR BAZAR',
  storeLogo: '',
  storeFavicon: '',
  favicon: '',
  storeTagline: 'COMFORT TO WELLNESS',
  topAnnouncementText: 'WELCOME TO SHOSTIR BAZAR',
  contactEmail: '',
  contactPhone: '',
  storeAddress: '',
  footerDescription: 'SHOSTIR BAZAR - COMFORT TO WELLNESS. Discover premium quality products for your health, comfort, and daily wellness.',
  socialLinks: {
    facebook: '',
    instagram: '',
    youtube: '',
    twitter: '',
    tiktok: '',
    linkedin: '',
    whatsapp: ''
  },
  primaryColor: '#0f766e',
  gtmId: '',
  deliveryChargeInsideDhaka: 60,
  deliveryChargeOutsideDhaka: 110,
  bkashNumber: '',
  nagadNumber: '',
  paymentGateways: DEFAULT_PAYMENT_GATEWAYS,
  deliveryMethods: DEFAULT_DELIVERY_METHODS,
  categories: [],
  heroBanners: [],
  promoCards: [],
  showViewCountOnWebsite: false,
  websiteViewsCount: 0,
  landingViewsCount: 0,
  aboutSettings: DEFAULT_ABOUT_SETTINGS,
  flashSale: DEFAULT_FLASH_SALE_SETTINGS,
  highlightSpotlight: DEFAULT_HIGHLIGHT_SPOTLIGHT_SETTINGS
};

export const DEFAULT_INSTITUTE_INFO: InstituteInfo = {
  name: 'SHOSTIR BAZAR',
  regNo: '',
  phone: '',
  email: '',
  address: '',
  street: '',
  description: 'COMFORT TO WELLNESS',
  industry: '',
  bearingRollLocation: '',
  logo: '',
  favicon: ''
};

export const DEFAULT_LANDING_PAGE_SETTINGS: import('../types').LandingPageData = {
  id: 'landing-default',
  slug: 'casio-ae-1200whl',
  templateTheme: 'luxury_dark',
  bookTitle: 'CASIO ROYALE AE-1200 CHAIN VERSION',
  bookSubtitle: 'CASIO AE-1200 Watch',
  authorName: 'CASIO AE-1200 Watch',
  authorDesignation: '10০% অরিজিনাল ও প্রিমিয়াম কোয়ালিT',
  authorPhoto: '/placeholder-image.svg',
  mainBookImage: '/placeholder-image.svg',
  heroBookImage: '/placeholder-image.svg',
  logoUrl: '',
  pageCount: '10 Year Battery',
  paperQuality: '100M Water Resist',
  regularPrice: 1650,
  offerPrice: 999,
  deliveryCharge: 80,
  deliveryChargeOutside: 130,
  deliveryAreaInsideText: 'ঢাকার ভিতরে ডেলিভারি',
  deliveryAreaOutsideText: 'ঢাকার বাইরে ডেলিভারি',
  bannerDeliveryText: 'Lucky coupon to win Yamaha R15 on order.',
  heroHeadline: 'CASIO ROYALE AE-1200 CHAIN VERSION',
  heroDescription: 'World Time (48 Cities), LED Backlight, Stopwatch (1/100 sec), 5 Daily Alarms, 100M Water Resistance। সাথে প্রতি Lucky coupon to win Yamaha R15 on order.',
  videoUrl: '',
  campaignBadgeText: 'Yamaha R15 জিতুন',
  campaignBannerTitle: 'অর্ডার করলেই আপনি পেয়ে যাবেন একT কুপন কার্ড যার মাধ্যমে আপনিও ক্যাম্পেইনে যুক্ত হয়ে যেতে পারবেন!',
  campaignCouponNote: 'কুপনT অবশ্যই যত্ন সহকারে সংগ্রহ করে রাখবেন',
  campaignTickerText: 'Lucky coupon to win Yamaha R15 on order.',
  prizes: [
    { rank: 'গ্র্যান্ড প্রাইজ', title: 'Yamaha R15 V4' }
  ],
  variantSectionTitle: 'একই feeচার, তিনT ভিন্ন লুক',
  variantSectionSubtitle: 'বেছে নিন যেটা আপনার স্টাইলের সাথে মানায়',
  customVariants: [
    {
      id: 'var-silver',
      name: 'CASIO AE-1200WHL — সিলভার',
      image: '/placeholder-image.svg',
      price: 950,
      regularPrice: 2500,
      tag: 'Best seller'
    },
    {
      id: 'var-black',
      name: 'CASIO AE-1200WHL — ব্ল্যাক',
      image: '/placeholder-image.svg',
      price: 950,
      regularPrice: 2500,
      tag: 'popular'
    },
    {
      id: 'var-gold',
      name: 'CASIO AE-1200WHL — ভিন্টেজ গোল্ড',
      image: '/placeholder-image.svg',
      price: 950,
      regularPrice: 2500,
      tag: 'এক্সক্লুসিভ'
    }
  ],
  watchSpecs: [
    { label: 'ব্যাটারি লাইফ', value: '10 বছর দীর্ঘস্থায়ী ব্যাটারি' },
    { label: 'ওয়াটার রেজিস্ট্যান্স', value: '10০ মিটার (10 Bar) ওয়াটারপ্রুফ' },
    { label: 'ওয়ার্ল্ড টাইম', value: '৪৮T শহর ও ৪T টাইম জোন' },
    { label: 'অ্যালার্ম', value: '৫T ডেইলি অ্যালার্ম সিস্টেম' },
    { label: 'ডিসপ্লে লাইট', value: 'এলইডি লাইট উইথ আফটারগ্লো' },
    { label: 'স্টপওয়াচ ও টাইমার', value: '১/10০ সেকেন্ড প্রিসিশন টাইমার' }
  ],
  features: [
    '10 বছরের ব্যাটারি লাইফ (Long Battery Life)',
    '10০ মিটার ওয়াটার রেজিস্ট্যান্ট (100m Water Resist)',
    'ওয়ার্ল্ড টাইম (৪৮T শহরের সময় ও ৪T টাইম জোন)',
    '৫T ডেইলি অ্যালার্ম ও ঘণ্টা ভিত্তিক সিগন্যাল',
    'এলইডি ব্যাকলাইট ও আফটারগ্লো সুবিধা',
    'ডিজিটাল ও অ্যানালগ এলসিডি ডুয়াল ডিসপ্লে'
  ],
  reviews: [
    { name: 'তানভীর আহমেদ', comment: 'watchT হাতে পাওয়ার পর সত্যি মুগ্ধ হয়েছি। কোয়ালিT ও feeনিশিং অgeneral! কুপন কার্ড পেয়েছি।', rating: 5 },
    { name: 'রাকিব হাসান', comment: 'সিলভার কালারটা নিয়েছি, দেখতে অনেক প্রিমিয়াম লাগে। সময়মতো ডেলিভারি পেয়েছি।', rating: 5 },
    { name: 'মাহমুদুল হক', comment: 'অরিজিনাল লুক And চমৎকার Packaging। 10০% রেকমেন্ডেড!', rating: 5 }
  ],
  relatedProductIds: [],
  galleryImages: [],
  paymentMethodDefault: 'COD',
  onlyCashOnDelivery: true,
  vintageTag: 'For vintage lovers',
  vintageTitle: 'Whose eyes still get stuck on the clocks of yesteryear',
  vintageDescription: 'স্মارتওয়াচের ভিড়ে হারিয়ে যাওয়া আসল সময়ের স্বাদ — এই ক্লাসিক ডিজাইন তাদেরই জন্য।',
  vintageFeatures: [
    { id: 'vf-1', title: 'Classic Dial', subtitle: '40s-90s original look', icon: 'Clock' },
    { id: 'vf-2', title: 'Durable metal body', subtitle: 'Can be used for years', icon: 'Wrench' },
    { id: 'vf-3', title: 'Retro LED backlight', subtitle: 'Brings back old memories', icon: 'Zap' },
    { id: 'vf-4', title: 'Fits all clothes', subtitle: 'Formal or casual', icon: 'Shirt' }
  ],
  gallerySectionTag: 'Gallery',
  gallerySectionTitle: 'Premium from every angle',
  qualitySectionTag: 'Why this watch?',
  qualitySectionTitle: 'Japanese quality, amazing price',
  qualityItems: [
    { id: 'qi-1', title: 'Precise timing', subtitle: 'Original movement design', icon: 'Settings' },
    { id: 'qi-2', title: 'Premium look', subtitle: 'Classic design on metal band', icon: 'Trophy' }
  ],
  luckyDrawTag: 'R15 lucky draw',
  luckyDrawTitle: 'Order, win R15',
  luckyDrawSteps: [
    'Order watch — receive unique lucky coupon code with parcel',
    'Keep the coupon code safe',
    'Winners will be selected by lottery next month',
    'The result will be announced live on Facebook Live'
  ],
  grandPrizeTitle: 'Yamaha R15',
  grandPrizeSubtitle: 'Every order = a new opportunity',
  grandPrizeLiveTag: 'FACEBOOK LIVE STREAM',
  colorSectionTag: 'Color selection',
  colorSectionTitle: 'Click on the color button below to preview the watch and order'
};

export const createDefaultLandingForProduct = (product: Product): import('../types').LandingPageData => {
  const slug = product.slug || product.id;
  
  return {
    id: `landing-${product.id}`,
    slug: slug,
    isEnabled: true,
    productId: product.id,
    productIds: [product.id],
    templateTheme: 'luxury_dark',
    relatedProductIds: [],
    bookTitle: product.title || 'একT watch অর্ডার করলেই Toyota Premio সহ ২T বাইক জেতার সুযোগ',
    bookSubtitle: product.subtitle || product.shortSummary || product.title,
    authorName: product.authorName || product.title,
    authorDesignation: '10০% অরিজিনাল ও প্রিমিয়াম কোয়ালিT',
    authorPhoto: product.image || '',
    mainBookImage: product.image || '',
    heroBookImage: product.image || '',
    logoUrl: product.image || '',
    regularPrice: product.regularPrice || Math.round(product.price * 1.5) || 2500,
    offerPrice: product.price || 950,
    deliveryCharge: 80,
    deliveryChargeOutside: 130,
    deliveryAreaInsideText: 'ঢাকার ভিতরে ডেলিভারি',
    deliveryAreaOutsideText: 'ঢাকার বাইরে ডেলিভারি',
    bannerDeliveryText: 'Lucky coupon to win Yamaha R15 on order.',
    heroHeadline: product.title || 'একT watch অর্ডার করলেই Yamaha R15 জেতার সুযোগ',
    heroDescription: product.description || product.shortSummary || 'প্রিমিয়াম কোয়ালিTর ঘড়ি অর্ডার করলেই আপনি পেয়ে যাচ্ছেন আকর্ষণীয় লাকি ড্র-তে অংশগ্রহণের সুযোগ। সাথে প্রতিT পার্সেল থাকছে একT Coupon code।',
    videoUrl: product.pdfUrl || '',
    campaignBadgeText: 'Yamaha R15 জিতুন',
    campaignBannerTitle: 'অর্ডার করলেই আপনি পেয়ে যাবেন একT কুপন কার্ড যার মাধ্যমে আপনিও ক্যাম্পেইনে যুক্ত হয়ে যেতে পারবেন!',
    campaignCouponNote: 'কুপনT অবশ্যই যত্ন সহকারে সংগ্রহ করে রাখবেন',
    campaignTickerText: 'Lucky coupon to win Yamaha R15 on order.',
    prizes: [
      { rank: '১ম পুরস্কার', title: 'Toyota Premio' },
      { rank: '২য় পুরস্কার', title: 'Yamaha R15 V4' },
      { rank: '৩য় পুরস্কার', title: 'Suzuki GSXR' }
    ],
    variantSectionTitle: 'একই feeচার, তিনT ভিন্ন লুক',
    variantSectionSubtitle: 'বেছে নিন যেটা আপনার স্টাইলের সাথে মানায়',
    customVariants: product.variants && product.variants.length > 0
      ? product.variants.map((v, i) => ({
          id: v.id || `var-${i}`,
          name: v.name,
          image: product.samplePages?.[i] || product.image || '',
          price: v.price || product.price,
          regularPrice: v.regularPrice || product.regularPrice,
          tag: i === 0 ? 'Best seller' : 'popular'
        }))
      : [
          {
            id: 'var-1',
            name: `${product.title} — সিলভার`,
            image: product.image || '',
            price: product.price,
            regularPrice: product.regularPrice || Math.round(product.price * 1.5),
            tag: 'Best seller'
          }
        ],
    features: product.features && product.features.length > 0
      ? product.features
      : [
          '10০% প্রিমিয়াম ও অরিজিনাল কোয়ালিT',
          '10 বছরের দীর্ঘস্থায়ী ব্যাটারি লাইফ',
          '10০ মিটার ওয়াটার রেজিস্ট্যান্স সুরক্ষা',
          'ওয়ার্ল্ড টাইম ও একাধিক অ্যালার্ম সিস্টেম',
          'product হাতে পেয়ে চেক করে সম্পূর্ণ price পরিশোধের সুবিধা'
        ],
    reviews: [
      { name: 'তানভীর আহমেদ', comment: 'watchT হাতে পাওয়ার পর সত্যি মুগ্ধ হয়েছি। কোয়ালিT ও feeনিশিং অgeneral!', rating: 5 },
      { name: 'রাকিব হাসান', comment: 'সিলভার কালারটা নিয়েছি, দেখতে অনেক প্রিমিয়াম লাগে। সময়মতো ডেলিভারি পেয়েছি।', rating: 5 }
    ],
    galleryImages: product.samplePages || [],
    paymentMethodDefault: 'COD',
    onlyCashOnDelivery: true
  };
};
