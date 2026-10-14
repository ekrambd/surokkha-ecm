import React from 'react';
import { ArrowUp } from 'lucide-react';

interface FantineFooterProps {
  displayStoreLogo: string;
  displayStoreName: string;
  displayTagline: string;
  displayEmail: string;
  displayPhone: string;
  shopCategories: string[];
  socialLinks: Record<string, string> | undefined;
  setActiveNav: (nav: 'home' | 'shop' | 'about' | 'contact' | 'product_detail' | 'checkout' | 'quiz') => void;
  setSelectedCategoryCheckbox: (cat: string) => void;
  scrollToTop: () => void;
}

export default function FantineFooter({
  displayStoreLogo,
  displayStoreName,
  displayTagline,
  displayEmail,
  displayPhone,
  shopCategories,
  socialLinks,
  setActiveNav,
  setSelectedCategoryCheckbox,
  scrollToTop
}: FantineFooterProps) {
  return (
    <>
      <footer className="bg-[#111827] text-white pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          
          <div className="space-y-4">
            <div className="mb-4">
              <img 
                src={displayStoreLogo} 
                alt={displayStoreName} 
                className="h-11 sm:h-13 md:h-14 max-h-14 max-w-[260px] sm:max-w-[320px] object-contain drop-shadow-sm" 
                onError={(e) => {
                  e.currentTarget.src = '/logo_transparent.webp';
                }}
              />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-light">
              {displayTagline}
            </p>
            <div className="text-sm text-slate-300 space-y-1.5 pt-2 font-light">
              <div>Email: <a href={`mailto:${displayEmail}`} className="text-slate-100 hover:underline font-medium">{displayEmail}</a></div>
              <div>Customer Care: <span className="text-slate-100 font-medium">{displayPhone}</span></div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold tracking-widest uppercase text-slate-200 mb-5">Explore Shop</h4>
            <ul className="space-y-3 text-sm text-slate-300 font-light">
              {shopCategories.filter(cat => cat !== 'All').slice(0, 3).map((cat, idx) => (
                <li key={idx}>
                  <button 
                    onClick={() => { 
                      setActiveNav('shop'); 
                      setSelectedCategoryCheckbox(cat); 
                    }} 
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold tracking-widest uppercase text-slate-200 mb-5">Social Media</h4>
            <ul className="space-y-3 text-sm text-slate-300 font-light">
              <li>
                <a href={socialLinks?.facebook || "https://facebook.com"} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-white transition-colors cursor-pointer group">
                  <svg className="w-4 h-4 fill-current text-slate-400 group-hover:text-blue-400 transition-colors" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  <span>Facebook</span>
                </a>
              </li>
              <li>
                <a href={socialLinks?.instagram || "https://instagram.com"} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-white transition-colors cursor-pointer group">
                  <svg className="w-4 h-4 fill-current text-slate-400 group-hover:text-pink-400 transition-colors" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a href={socialLinks?.youtube || "https://youtube.com"} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-white transition-colors cursor-pointer group">
                  <svg className="w-4 h-4 fill-current text-slate-400 group-hover:text-red-500 transition-colors" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                  <span>YouTube</span>
                </a>
              </li>
              <li>
                <a href={socialLinks?.tiktok || "https://tiktok.com"} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-white transition-colors cursor-pointer group">
                  <svg className="w-4 h-4 fill-current text-slate-400 group-hover:text-teal-400 transition-colors" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
                  <span>TikTok</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold tracking-widest uppercase text-slate-200 mb-5">Newsletter</h4>
            <p className="text-sm text-slate-300 mb-4 font-light leading-relaxed">Join the {displayStoreName} Club for exclusive Korean skincare routines and 15% off your first order.</p>
            <form onSubmit={(e) => { e.preventDefault(); alert(`Thank you for subscribing to ${displayStoreName}!`); }} className="flex gap-2">
              <input type="email" placeholder="Your email address" required className="bg-slate-800 text-white px-3.5 py-2.5 text-sm border border-slate-700 rounded-lg w-full focus:outline-none focus:border-slate-400 placeholder:text-slate-500" />
              <button type="submit" className="bg-[#93c5fd] hover:bg-[#7dd3fc] active:scale-95 text-slate-950 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase transition-all rounded-lg cursor-pointer shrink-0">Join</button>
            </form>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-12 pt-6 border-t border-slate-800 flex justify-center text-sm text-slate-400">
          <div className="text-xs sm:text-sm text-center">© 2026 FANTINE BD. All rights reserved.</div>
        </div>
      </footer>

      {/* FLOATING SCROLL TO TOP BUTTON */}
      <div className="fixed bottom-6 left-6 z-40 hidden sm:block">
        <button 
          onClick={scrollToTop}
          className="w-10 h-10 bg-white/90 hover:bg-white text-slate-800 rounded-full flex items-center justify-center shadow-lg border border-slate-200/80 transition-transform hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
