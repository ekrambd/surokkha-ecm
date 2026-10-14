import fs from 'fs';
import path from 'path';
import { Product, BookOrder, EcomSettings } from '../../types';

const PRODUCTS_STORAGE_FILE = path.join(process.cwd(), 'prisma', 'products.json');

// Authentic FANTINE Skincare Catalog with verified server uploads
export const INITIAL_REAL_PRODUCTS: Product[] = [
  {
    id: 'prod-vb5-repair-serum',
    title: 'VB5 Repair Serum',
    author: 'FANTINE Korea',
    regularPrice: 1800,
    price: 1550,
    discountPercentage: 14,
    stockQuantity: 100,
    category: 'Serums',
    series: 'Ultra Repair Series',
    coverImage: '/uploads/file-1791830876714-429462367.jpg',
    images: [
      '/uploads/file-1791830876714-429462367.jpg',
      '/uploads/file-1791830880605-206422960.jpeg',
      '/uploads/file-1791830885183-155996593.jpeg'
    ],
    additionalImages: [
      '/uploads/file-1791830880605-206422960.jpeg',
      '/uploads/file-1791830885183-155996593.jpeg'
    ],
    description: 'Provitamin B5 (D-Panthenol) intensive calming essence. Relieves itching, eliminates redness, and rapidly reinforces damaged skin barrier.',
    benefitsHighlights: 'High-purity Provitamin B5 • Deep cellular moisture lock • Barrier restoration • Zero irritation',
    howToUse: 'Dispense 2-3 drops after cleansing and toning. Pat gently over face and neck until fully absorbed.',
    badge: 'Best Seller',
    isFeatured: true
  },
  {
    id: 'prod-vc-brightening-serum',
    title: 'VC Brightening Serum',
    author: 'FANTINE Korea',
    regularPrice: 2200,
    price: 1350,
    discountPercentage: 39,
    stockQuantity: 100,
    category: 'Serums',
    series: 'Whitening and Brightening Series',
    coverImage: '/uploads/file-1791830762714-399075316.jpg',
    images: [
      '/uploads/file-1791830762714-399075316.jpg',
      '/uploads/file-1791830766725-465711461.jpeg',
      '/uploads/file-1791830769792-761661464.jpeg'
    ],
    additionalImages: [
      '/uploads/file-1791830766725-465711461.jpeg',
      '/uploads/file-1791830769792-761661464.jpeg'
    ],
    description: 'Stabilized Pure Vitamin C antioxidant formula. Fades pigmentation, lightens sun spots, and illuminates fatigued skin with natural radiance.',
    benefitsHighlights: 'Pure Vitamin C complex • Stronger antioxidant efficacy • Non-oxidizing formula • Instant dewy glow',
    howToUse: 'Apply morning and night after toner. Follow with moisturizer and sunscreen in the morning.',
    badge: 'Popular',
    isFeatured: true
  },
  {
    id: 'prod-vb3-spot-lightening-essence',
    title: 'VB3 Spot-Lightening Essence',
    author: 'FANTINE Korea',
    regularPrice: 2100,
    price: 1500,
    discountPercentage: 29,
    stockQuantity: 100,
    category: 'Serums',
    series: 'Whitening and Brightening Series',
    coverImage: '/uploads/file-1791830989305-696330059.jpg',
    images: [
      '/uploads/file-1791830989305-696330059.jpg',
      '/uploads/file-1791830994106-62464748.jpeg',
      '/uploads/file-1791830999191-605068443.jpeg'
    ],
    additionalImages: [
      '/uploads/file-1791830994106-62464748.jpeg',
      '/uploads/file-1791830999191-605068443.jpeg'
    ],
    description: 'High-potency Vitamin B3 (Niacinamide) target solution. Eliminates stubborn post-acne dark marks and evens skin complexion.',
    benefitsHighlights: 'Niacinamide active formula • Dark spot correction • Pore refining • Non-sticky velvet finish',
    howToUse: 'Smooth evenly across face, focusing on areas with dark spots and discoloration.',
    badge: 'Trending',
    isFeatured: true
  },
  {
    id: 'prod-super-antioxidant-serum',
    title: 'Super Antioxidant Serum',
    author: 'FANTINE Korea',
    regularPrice: 2300,
    price: 1600,
    discountPercentage: 30,
    stockQuantity: 100,
    category: 'Serums',
    series: 'Ultra Repair Series',
    coverImage: '/uploads/file-1791831243256-923954313.jpg',
    images: [
      '/uploads/file-1791831243256-923954313.jpg',
      '/uploads/file-1791831246663-670212725.jpeg',
      '/uploads/file-1791831250379-772129356.jpeg'
    ],
    additionalImages: [
      '/uploads/file-1791831246663-670212725.jpeg',
      '/uploads/file-1791831250379-772129356.jpeg'
    ],
    description: 'Bio-botanical green tea & phyto-complex defending against urban pollution, reversing oxidative damage, and smoothing fine lines.',
    benefitsHighlights: 'Super antioxidant barrier • Reduces oxidative stress • Youthful firming elasticity • Eco-certified extracts',
    howToUse: 'Massage 2-3 drops into face and neck before heavier face creams.',
    badge: 'Antioxidant',
    isFeatured: true
  },
  {
    id: 'prod-ve-nourishing-serum',
    title: 'VE Nourishing Serum',
    author: 'FANTINE Korea',
    regularPrice: 1950,
    price: 1450,
    discountPercentage: 26,
    stockQuantity: 100,
    category: 'Serums',
    series: 'Deep Hydration Series',
    coverImage: '/uploads/file-1791830588893-187058483.jpg',
    images: [
      '/uploads/file-1791830588893-187058483.jpg',
      '/uploads/file-1791830593541-799200212.jpeg',
      '/uploads/file-1791830597458-464719743.jpeg'
    ],
    additionalImages: [
      '/uploads/file-1791830593541-799200212.jpeg',
      '/uploads/file-1791830597458-464719743.jpeg'
    ],
    description: 'Rich Vitamin E tocopherol concentrate restoring deep lipid hydration to severely dry, flaky, or weather-damaged skin.',
    benefitsHighlights: 'Intense lipid nourishment • Repairs flakiness • Soothing botanical oils • 48h moisture shield',
    howToUse: 'Gently warm 2 drops between palms and press onto face after serum step.',
    badge: 'Moisture Care',
    isFeatured: true
  },
  {
    id: 'prod-rapid-acne-treatment-essence',
    title: 'Rapid Acne Treatment Essence',
    author: 'FANTINE Korea',
    regularPrice: 3000,
    price: 2000,
    discountPercentage: 33,
    stockQuantity: 100,
    category: 'Rapid Acne Treatment Series',
    series: 'Rapid Acne Treatment Series',
    coverImage: '/uploads/file-1791826953559-621616270.jpg',
    images: [
      '/uploads/file-1791826953559-621616270.jpg',
      '/uploads/file-1791826958408-501895547.jpeg',
      '/uploads/file-1791826961577-101639256.jpeg'
    ],
    additionalImages: [
      '/uploads/file-1791826958408-501895547.jpeg',
      '/uploads/file-1791826961577-101639256.jpeg'
    ],
    description: 'Fast-action anti-inflammatory clarifying essence. Deeply clears congested pores, controls excess sebum, and prevents recurrent breakouts.',
    benefitsHighlights: 'Rapid blemish relief • Pores decongested • Oil balancing • Gentle botanical actives',
    howToUse: 'Apply to problem areas or all over face after cleansing.',
    badge: 'Acne Care',
    isFeatured: true
  },
  {
    id: 'prod-aha-exfoliating-essence',
    title: 'AHA Exfoliating Essence',
    author: 'FANTINE Korea',
    regularPrice: 3000,
    price: 2000,
    discountPercentage: 33,
    stockQuantity: 100,
    category: 'Toners',
    series: 'Rapid Acne Treatment Series',
    coverImage: '/uploads/file-1791822354692-346436357.jpg',
    images: [
      '/uploads/file-1791822354692-346436357.jpg',
      '/uploads/file-1791822359176-731563340.webp',
      '/uploads/file-1791822363053-980807663.webp'
    ],
    additionalImages: [
      '/uploads/file-1791822359176-731563340.webp',
      '/uploads/file-1791822363053-980807663.webp'
    ],
    description: 'Gentle fruit acid resurfacing elixir removing dead keratinized cells, smoothing rough texture, and unlocking clean radiant skin.',
    benefitsHighlights: 'Gentle AHA resurfacing • Dissolves dead skin cells • Unclogs comedones • Enhances absorption',
    howToUse: 'Use 2-3 nights per week with a cotton pad on cleansed skin. Follow with hydration.',
    badge: 'Exfoliation',
    isFeatured: true
  },
  {
    id: 'prod-retinol-anti-aging-serum',
    title: 'Retinol Anti-Aging Serum',
    author: 'FANTINE Korea',
    regularPrice: 3200,
    price: 2200,
    discountPercentage: 31,
    stockQuantity: 100,
    category: 'Serums',
    series: 'Ultra Repair Series',
    coverImage: '/uploads/file-1791827320010-515338106.jpg',
    images: [
      '/uploads/file-1791827320010-515338106.jpg',
      '/uploads/file-1791827334201-693066165.jpeg',
      '/uploads/file-1791827334452-792065672.jpeg'
    ],
    additionalImages: [
      '/uploads/file-1791827334201-693066165.jpeg',
      '/uploads/file-1791827334452-792065672.jpeg'
    ],
    description: 'Stabilized Retinol micro-capsules stimulating collagen synthesis, diminishing deep expression lines, and promoting cellular turnover.',
    benefitsHighlights: 'Micro-encapsulated Retinol • Anti-wrinkle firming • Boosts renewal • Safe nocturnal regimen',
    howToUse: 'Apply at night. Start 2 nights per week, gradually increasing frequency as skin adapts.',
    badge: 'Anti-Aging',
    isFeatured: true
  },
  {
    id: 'prod-collagen-elastic-essence',
    title: 'Collagen Elastic Essence',
    author: 'FANTINE Korea',
    regularPrice: 2500,
    price: 1800,
    discountPercentage: 28,
    stockQuantity: 100,
    category: 'Serums',
    series: 'Deep Hydration Series',
    coverImage: '/uploads/file-1791823814770-967689183.jpg',
    images: [
      '/uploads/file-1791823814770-967689183.jpg',
      '/uploads/file-1791823819604-611080923.jpeg',
      '/uploads/file-1791823819691-282589560.jpeg'
    ],
    additionalImages: [
      '/uploads/file-1791823819604-611080923.jpeg',
      '/uploads/file-1791823819691-282589560.jpeg'
    ],
    description: 'Hydrolyzed marine and botanical collagen peptides restoring bounce, plumpling fine dehydration lines, and imparting glass skin finish.',
    benefitsHighlights: 'Hydrolyzed collagen • Plumps skin firmness • Dewy finish • Non-comedogenic',
    howToUse: 'Apply generously to face and neck morning and evening before face cream.',
    badge: 'Elasticity',
    isFeatured: true
  }
];

// Load persisted products from disk or initialize with real catalog
function loadProductsFromDisk(): Product[] {
  try {
    if (fs.existsSync(PRODUCTS_STORAGE_FILE)) {
      const raw = fs.readFileSync(PRODUCTS_STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[store] Could not load products from disk:', err);
  }
  return [...INITIAL_REAL_PRODUCTS];
}

export function saveProductsToDisk(products: Product[]): void {
  try {
    const dir = path.dirname(PRODUCTS_STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PRODUCTS_STORAGE_FILE, JSON.stringify(products, null, 2), 'utf-8');
  } catch (err) {
    console.error('[store] Failed saving products to disk:', err);
  }
}

export let storeProducts: Product[] = loadProductsFromDisk();

// Persist initial real products if file does not exist yet
if (!fs.existsSync(PRODUCTS_STORAGE_FILE)) {
  saveProductsToDisk(storeProducts);
}

export const setStoreProducts = (newProducts: Product[]) => {
  storeProducts = newProducts;
  saveProductsToDisk(storeProducts);
  return storeProducts;
};

export let storeOrders: BookOrder[] = [];

export let storeSettings: EcomSettings = {
  storeName: 'FANTINE Korea (Brandini Co., Ltd.)',
  storeTagline: 'Luxury Hanbang Skincare & Clinical Botanical Whitening Solutions',
  gtmId: '',
  deliveryChargeInsideDhaka: 0,
  deliveryChargeOutsideDhaka: 0,
  bkashNumber: '',
  nagadNumber: '',
  categories: [
    'Serums',
    'Ultra Repair Series',
    'Whitening and Brightening Series',
    'Rapid Acne Treatment Series',
    'Deep Hydration Series',
    'Toners',
    'Creams',
    'Cleansers',
    'Sets'
  ]
};

export const updateStoreSettings = (newSettings: Partial<EcomSettings>) => {
  storeSettings = { ...storeSettings, ...newSettings };
  return storeSettings;
};

export const clearAllStoreData = () => {
  storeProducts = [...INITIAL_REAL_PRODUCTS];
  saveProductsToDisk(storeProducts);
  storeOrders = [];
  return { success: true };
};
