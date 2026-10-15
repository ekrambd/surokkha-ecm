import fs from 'fs';
import path from 'path';
import { Product, BookOrder, EcomSettings } from '../../types';

const PRODUCTS_STORAGE_FILE = path.join(process.cwd(), 'prisma', 'products.json');
const SETTINGS_STORAGE_FILE = path.join(process.cwd(), 'prisma', 'settings.json');

// No fake seed products
export const INITIAL_REAL_PRODUCTS: Product[] = [];

// Load persisted products from disk
export function loadProductsFromDisk(): Product[] {
  try {
    if (fs.existsSync(PRODUCTS_STORAGE_FILE)) {
      const raw = fs.readFileSync(PRODUCTS_STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[store] Could not load products from disk:', err);
  }
  return [];
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

if (!fs.existsSync(PRODUCTS_STORAGE_FILE)) {
  saveProductsToDisk(storeProducts);
}

const ORDERS_STORAGE_FILE = path.join(process.cwd(), 'prisma', 'orders.json');

// Load persisted orders from disk
export function loadOrdersFromDisk(): BookOrder[] {
  try {
    if (fs.existsSync(ORDERS_STORAGE_FILE)) {
      const raw = fs.readFileSync(ORDERS_STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[store] Could not load orders from disk:', err);
  }
  return [];
}

export function saveOrdersToDisk(orders: BookOrder[]): void {
  try {
    const dir = path.dirname(ORDERS_STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ORDERS_STORAGE_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.error('[store] Failed saving orders to disk:', err);
  }
}

export let storeOrders: BookOrder[] = loadOrdersFromDisk();

export const setStoreOrders = (newOrders: BookOrder[]) => {
  storeOrders = newOrders;
  saveOrdersToDisk(storeOrders);
  return storeOrders;
};

export function loadSettingsFromDisk(): EcomSettings {
  try {
    if (fs.existsSync(SETTINGS_STORAGE_FILE)) {
      const raw = fs.readFileSync(SETTINGS_STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[store] Could not load settings from disk:', err);
  }
  return {
    storeName: '',
    storeLogo: '',
    storeFavicon: '',
    favicon: '',
    storeTagline: '',
    gtmId: '',
    deliveryChargeInsideDhaka: 60,
    deliveryChargeOutsideDhaka: 110,
    bkashNumber: '',
    nagadNumber: '',
    categories: [],
    categoryItems: [],
    heroBanners: [],
    promoCards: []
  };
}

export function saveSettingsToDisk(settings: EcomSettings): void {
  try {
    const dir = path.dirname(SETTINGS_STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_STORAGE_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[store] Failed saving settings to disk:', err);
  }
}

export let storeSettings: EcomSettings = loadSettingsFromDisk();

export const updateStoreSettings = (newSettings: Partial<EcomSettings>) => {
  storeSettings = { ...storeSettings, ...newSettings };
  saveSettingsToDisk(storeSettings);
  return storeSettings;
};

export const clearAllStoreData = () => {
  storeProducts = [];
  saveProductsToDisk(storeProducts);
  storeOrders = [];
  saveOrdersToDisk(storeOrders);
  return { success: true };
};
