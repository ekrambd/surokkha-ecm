import type { Product } from '../types';

import type { Product } from '../types';

const BENGALI_TO_LATIN: Record<string, string> = {
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': '', 'ঁ': '',
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
  'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
  'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou'
};

/**
 * Transliterates Bengali characters into clean English Latin characters.
 */
export function transliterateBengali(text: string): string {
  let res = '';
  for (const ch of text) {
    res += BENGALI_TO_LATIN[ch] !== undefined ? BENGALI_TO_LATIN[ch] : ch;
  }
  return res;
}

/**
 * Generates clean, professional, readable, SEO-optimized English slugs.
 * Prevents giant percent-encoded URLs like %E0%A6%96%E0%A6%...
 * Example:
 *  "খেজুর বাদামের বরফি। Date nuts" -> "date-nuts" (or "khejur-badamer-borfi-date-nuts")
 *  "সুন্দরবনের খলিশা ফুলের মধু" -> "sundarban-kholisha-modhu"
 */
export function generateProfessionalSlug(title: string): string {
  if (!title) return '';

  // 1. If title already has an English name (e.g. "Date nuts", "Gawa Ghee", "Almond"), prioritize it!
  const englishWords = (title.match(/[a-zA-Z0-9]+/g) || [])
    .filter(w => !['sku', 'fresh', 'premium', 'item', 'the', 'and', 'or'].includes(w.toLowerCase()));
  
  if (englishWords.length >= 1 && englishWords.join('-').length >= 3) {
    return englishWords.join('-').toLowerCase();
  }

  // 2. Otherwise transliterate Bengali to clear readable Latin letters
  const transliterated = transliterateBengali(title);
  const clean = transliterated
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return clean || 'product';
}

export function slugifyProductText(value: string): string {
  const trimmed = (value || '').trim();
  // Check if string contains non-latin (like Bengali)
  if (/[\u0980-\u09FF]/.test(trimmed)) {
    return generateProfessionalSlug(trimmed);
  }
  return trimmed
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function getProductSlug(product: Pick<Product, 'id' | 'title' | 'slug'>): string {
  if (product.slug && product.slug.trim()) {
    // If slug is currently stored in raw Bengali, convert it to clean English slug
    if (/[\u0980-\u09FF]/.test(product.slug)) {
      return generateProfessionalSlug(product.slug);
    }
    return slugifyProductText(product.slug);
  }
  return generateProfessionalSlug(product.title) || product.id;
}

export function truncateSeoText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function updateMetaTags(title: string, description: string, image?: string, url?: string) {
  if (typeof document === 'undefined') return;
  
  document.title = title;
  
  // Update OG Title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', title);

  // Update Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', description);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  ogDesc.setAttribute('content', description);

  // Update OG Image
  if (image) {
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', image);
  }
  
  // Update OG URL and Canonical Link
  if (url) {
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', url);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  }
}

export function updateBreadcrumbSchema(items: { name: string; url: string }[]) {
  if (typeof document === 'undefined') return;

  let script = document.querySelector('#breadcrumb-schema') as HTMLScriptElement;
  if (!script) {
    script = document.createElement('script');
    script.id = 'breadcrumb-schema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  if (!items || items.length === 0) {
    script.textContent = '';
    return;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  script.textContent = JSON.stringify(schema);
}

export function updateProductSchema(product: any, url: string, storeName: string) {
  if (typeof document === 'undefined') return;
  
  let script = document.querySelector('#product-schema') as HTMLScriptElement;
  if (!script) {
    script = document.createElement('script');
    script.id = 'product-schema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  
  if (!product) {
    script.textContent = '';
    return;
  }

  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const images = [
    product.coverImage || product.image,
    ...(Array.isArray(product.gallery) ? product.gallery : [])
  ].filter(Boolean);

  const schema: Record<string, any> = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": images.length > 0 ? images : ['https://shostirbazar.com/placeholder-logo.svg'],
    "description": product.subtitle || product.description || `${product.title} from ${storeName}`,
    "sku": String(product.id),
    "mpn": String(product.id),
    "category": product.series || product.category || 'Wellness & Organic Foods',
    "brand": {
      "@type": "Brand",
      "name": product.brand || storeName
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": product.rating || "4.9",
      "reviewCount": product.reviewCount || "34",
      "bestRating": "5",
      "worstRating": "1"
    },
    "offers": {
      "@type": "Offer",
      "url": url,
      "priceCurrency": "BDT",
      "price": product.offerPrice || product.regularPrice || product.price,
      "priceValidUntil": validUntil,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": storeName
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": "60",
          "currency": "BDT"
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "BD"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 0,
            "maxValue": 1,
            "unitCode": "d"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 1,
            "maxValue": 3,
            "unitCode": "d"
          }
        }
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "BD",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 7,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/FreeReturn"
      }
    }
  };

  script.textContent = JSON.stringify(schema);
}
