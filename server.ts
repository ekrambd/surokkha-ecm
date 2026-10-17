import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import zlib from "zlib";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { app } from "./src/server/app";
import { storeProducts, storeSettings } from "./src/server/data/store";

function injectServerMeta(html: string, reqPath: string, host: string, proto: string): string {
  const storeName = storeSettings?.storeName?.trim() || "SHOSTIR BAZAR";
  const storeTagline = storeSettings?.storeTagline?.trim() || "COMFORT TO WELLNESS";
  let title = storeSettings?.storeName?.trim()
    ? (storeSettings?.storeTagline?.trim() ? `${storeName} - ${storeTagline}` : `${storeName} - COMFORT TO WELLNESS`)
    : "SHOSTIR BAZAR - COMFORT TO WELLNESS";
  let description = storeSettings?.storeTagline?.trim() || storeSettings?.footerDescription?.trim() || "SHOSTIR BAZAR - COMFORT TO WELLNESS. Discover premium quality products for your health, comfort, and daily wellness.";
  
  // Use user-uploaded logo/favicon if configured, otherwise use clean placeholder SVG
  const uploadedLogo = storeSettings?.storeLogo?.trim();
  const uploadedFavicon = (storeSettings?.storeFavicon || storeSettings?.favicon)?.trim();
  let image = uploadedLogo || (uploadedFavicon ? uploadedFavicon : `${proto}://${host}/placeholder-logo.svg`);
  const fullUrl = `${proto}://${host}${reqPath}`;

  if (reqPath.startsWith('/product')) {
    const rawSeg = reqPath.replace(/^\/product\/?/, '').split('/')[0] || '';
    const cleanSeg = decodeURIComponent(rawSeg).trim().toLowerCase();
    const pathLower = decodeURIComponent(reqPath).toLowerCase();

    const matched = storeProducts.find(p => {
      const pId = (p.id || '').toLowerCase();
      const rawTitle = (p.title || '').trim();
      const pSlug = (p.slug || rawTitle)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');

      return (cleanSeg && (cleanSeg === pSlug || cleanSeg === pId)) ||
             (pSlug.length > 2 && pathLower.includes(pSlug)) ||
             (pId.length > 2 && pathLower.includes(pId));
    });

    if (matched) {
      title = `${matched.title} | ${storeName}`;
      description = matched.description || (matched as any).subtitle || description;
      image = (matched as any).coverImage || matched.image || image;
    }
  } else if (reqPath.startsWith('/shop')) {
    title = `Shop All Products | ${storeName}`;
    description = `Explore our complete product catalog at ${storeName}.`;
  } else if (reqPath.startsWith('/about')) {
    title = `About Us | ${storeName}`;
    description = `Learn more about ${storeName}.`;
  } else if (reqPath.startsWith('/contact')) {
    title = `Contact Us | ${storeName}`;
    description = `Reach out to the ${storeName} team for customer support and order inquiries.`;
  }

  let modified = html;
  // Replace Title
  modified = modified.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

  // Replace Meta Description
  modified = modified.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${description}" />`);

  // Replace OpenGraph tags
  modified = modified.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
  modified = modified.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
  modified = modified.replace(/<meta property="og:image" content=".*?"\s*\/?>/i, `<meta property="og:image" content="${image}" />`);
  modified = modified.replace(/<meta property="og:url" content=".*?"\s*\/?>/i, `<meta property="og:url" content="${fullUrl}" />`);

  // Replace Twitter card tags
  modified = modified.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
  modified = modified.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);
  modified = modified.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${image}" />`);

  // Dynamically update favicon tag
  const faviconUrl = uploadedFavicon || '/placeholder-favicon.svg';
  modified = modified.replace(/<link rel="icon" [^>]*>/i, `<link rel="icon" href="${faviconUrl}" />`);
  modified = modified.replace(/<link rel="shortcut icon" [^>]*>/i, `<link rel="shortcut icon" href="${faviconUrl}" />`);

  return modified;
}

// Vercel injects production variables. Local development reads the ignored file.
dotenv.config({ path: '.env.local' });

const PORT = Number(process.env.PORT) || 3004;

// Native HTTP Gzip/Deflate Compression Middleware (Zero dependency)
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
    return next();
  }

  const originalSend = res.send.bind(res);
  res.send = (body: any) => {
    // Only compress text, json, and html payloads larger than 1KB
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      const contentType = (res.getHeader('Content-Type') as string) || '';
      const isCompressible = contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript') || contentType.includes('xml');

      if (isCompressible && (typeof body === 'string' ? Buffer.byteLength(body) : body.length) > 1024) {
        if (acceptEncoding.includes('gzip')) {
          res.setHeader('Content-Encoding', 'gzip');
          res.removeHeader('Content-Length');
          return zlib.gzip(body, (err, compressed) => {
            if (err) return originalSend(body);
            originalSend(compressed);
          });
        }
      }
    }
    return originalSend(body);
  };
  next();
});

// ==================== VITE / STATIC SERVER ====================
async function startServer() {
  const isDev = process.env.NODE_ENV !== "production" ||
                process.env.npm_lifecycle_event === 'dev' ||
                !fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // Static Assets Cache (Immutable 1-year cache for fingerprinted JS/CSS/Images)
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));

    // Fallback static files directly from public directory
    app.use(express.static(path.join(process.cwd(), 'public')));

    const getIndexHtml = () => {
      let filePath = path.join(distPath, 'index.html');
      if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), 'index.html');
      }
      if (fs.existsSync(filePath)) {
        const html = fs.readFileSync(filePath, 'utf-8');
        const etag = `"${crypto.createHash('md5').update(html).digest('hex')}"`;
        return { html, etag };
      }
      return { html: null, etag: null };
    };

    // SPA Page Route Handler with Micro-caching & Dynamic Server-side Meta Injection
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/cdn') || req.path.startsWith('/uploads')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }

      // Prevent non-HTML file requests (e.g. missing .js, .tsx, .css) from returning index.html
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return res.status(404).end();
      }

      const { html, etag } = getIndexHtml();
      if (!html) {
        return res.sendFile(path.join(process.cwd(), 'index.html'));
      }

      const host = req.headers.host || 'localhost:3000';
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const isMetaRoute = req.path === '/' || req.path.startsWith('/product') || req.path.startsWith('/shop') || req.path.startsWith('/about') || req.path.startsWith('/contact') || req.path.startsWith('/quiz');

      if (isMetaRoute) {
        const enrichedHtml = injectServerMeta(html, req.path, host, proto);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(enrichedHtml);
      }

      // Check 304 Not Modified for static index
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && clientEtag === etag) {
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('X-Page-Cache', 'HIT-304');
        return res.status(304).end();
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (etag) res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Page-Cache', 'HIT-MEMORY');
      res.send(html);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Noor E-Commerce Architecture active on http://localhost:${PORT}`);
  });
}

startServer();
