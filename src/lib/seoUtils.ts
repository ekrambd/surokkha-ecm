import type { Product } from '../types';

export function slugifyProductText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function getProductSlug(product: Pick<Product, 'id' | 'title' | 'slug'>): string {
  return slugifyProductText(product.slug || product.title) || product.id;
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

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": [
      product.coverImage || product.image
    ],
    "description": product.subtitle || product.description,
    "sku": product.id,
    "brand": {
      "@type": "Brand",
      "name": product.brand || storeName
    },
    "offers": {
      "@type": "Offer",
      "url": url,
      "priceCurrency": "BDT",
      "price": product.offerPrice || product.regularPrice,
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };

  script.textContent = JSON.stringify(schema);
}
