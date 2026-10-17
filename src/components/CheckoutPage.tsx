import React, { useState, useMemo, useEffect } from 'react';
import { 
  X,
  Plus, 
  Minus, 
  Check, 
  ShoppingBag, 
  CheckCircle2, 
  MessageCircle,
  RefreshCw,
  Tag
} from 'lucide-react';
import { Product, ProductVariant, BookOrder, EcomSettings, Coupon } from '../types';
import { dbService, DEFAULT_DELIVERY_METHODS } from '../lib/dbService';
import { trackEvent, createEventId } from '../lib/pixelGtmService';
import { playOrderSuccessVibe } from '../lib/soundUtils';

interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  selectedVariant?: string;
  variant?: ProductVariant;
}

interface CheckoutPageProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  onRemoveItem: (productId: string, variantId?: string) => void;
  onClearCart: () => void;
  ecomSettings: EcomSettings;
  onNavigateHome: () => void;
  onNavigateShop: () => void;
  onOpenLoginModal?: () => void;
}

export default function CheckoutPage({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  ecomSettings,
  onNavigateHome,
  onNavigateShop,
}: CheckoutPageProps) {
  // Form State (matching screenshot fields)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Dynamic Store Settings & Delivery Methods from Admin Panel
  const [liveSettings, setLiveSettings] = useState<EcomSettings>(ecomSettings);

  useEffect(() => {
    if (ecomSettings) {
      setLiveSettings(ecomSettings);
    }
    // Fetch live settings on mount to ensure real-time synchronization with Admin changes
    dbService.getEcomSettings().then(fresh => {
      if (fresh) {
        setLiveSettings(fresh);
      }
    }).catch(() => {});
  }, [ecomSettings]);

  // Delivery Methods dynamically derived from Admin Panel settings
  const deliveryOptions = useMemo(() => {
    const list = (liveSettings?.deliveryMethods && liveSettings.deliveryMethods.length > 0)
      ? liveSettings.deliveryMethods
      : DEFAULT_DELIVERY_METHODS;

    const activeList = list.filter(m => m.status === 'Active');
    const sourceList = activeList.length > 0 ? activeList : list;

    return sourceList.map(m => ({
      id: m.id,
      title: m.title,
      charge: Number(m.deliveryCharge) >= 0 ? Number(m.deliveryCharge) : 0,
      zone: m.title
    }));
  }, [liveSettings?.deliveryMethods]);

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('');

  useEffect(() => {
    if (deliveryOptions.length > 0) {
      if (!selectedDeliveryId || !deliveryOptions.some(o => o.id === selectedDeliveryId)) {
        setSelectedDeliveryId(deliveryOptions[0].id);
      }
    }
  }, [deliveryOptions, selectedDeliveryId]);

  const selectedDelivery = useMemo(() => {
    return deliveryOptions.find(o => o.id === selectedDeliveryId) || deliveryOptions[0] || { id: 'default', title: 'ডেলিভারি', charge: 0, zone: 'Default' };
  }, [deliveryOptions, selectedDeliveryId]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + ((item.variant?.price ?? item.product.price) * item.quantity), 0);
  }, [cart]);

  const totalItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Free delivery logic if threshold configured
  const isFreeDelivery = useMemo(() => {
    return Boolean(
      liveSettings?.freeDeliveryEnabled && 
      liveSettings?.freeDeliveryMinPurchase && 
      cartSubtotal >= liveSettings.freeDeliveryMinPurchase
    );
  }, [liveSettings, cartSubtotal]);

  const deliveryCost = isFreeDelivery ? 0 : selectedDelivery.charge;

  // Coupon Logic
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    dbService.getCoupons().then(list => {
      setAvailableCoupons(list.filter(c => c.status === 'Active'));
    }).catch(() => {});
  }, []);

  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percent') {
      const disc = Math.round((cartSubtotal * appliedCoupon.discount) / 100);
      return appliedCoupon.maxDiscount ? Math.min(disc, appliedCoupon.maxDiscount) : disc;
    }
    return Math.min(appliedCoupon.discount, cartSubtotal);
  }, [appliedCoupon, cartSubtotal]);

  const grandTotal = Math.max(0, cartSubtotal + deliveryCost - couponDiscountAmount);

  // Track InitiateCheckout on checkout view entry
  useEffect(() => {
    if (cart.length > 0) {
      const eventId = createEventId('initiate_checkout');
      trackEvent('InitiateCheckout', {
        content_name: cart.map(i => i.product.title).join(', '),
        content_ids: cart.map(i => i.product.id),
        content_type: 'product',
        value: grandTotal || cartSubtotal,
        currency: 'BDT',
        num_items: totalItemCount,
        contents: cart.map(item => ({
          id: item.product.id,
          name: item.product.title,
          quantity: item.quantity,
          item_price: item.product.price
        }))
      }, eventId);
    }
  }, []);

  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetCode = couponCodeInput.trim();
    if (!targetCode) return;
    setCouponError('');
    setCouponSuccess('');

    const match = availableCoupons.find(c => c.code.toLowerCase() === targetCode.toLowerCase());
    if (!match) {
      setCouponError('কুপন কোডটি সঠিক নয় বা মেয়াদোত্তীর্ণ।');
      return;
    }
    if (match.minSpent && cartSubtotal < match.minSpent) {
      setCouponError(`এই কুপনের জন্য নূন্যতম ৳${match.minSpent.toLocaleString()} অর্ডারের প্রয়োজন।`);
      return;
    }
    setAppliedCoupon(match);
    setCouponSuccess(`কুপন "${match.code}" সফলভাবে যুক্ত হয়েছে!`);
    setCouponCodeInput('');
  };

  // Order Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<BookOrder | null>(null);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }
    if (!phone.trim()) {
      alert('অনুগ্রহ করে আপনার মোবাইল নাম্বার লিখুন।');
      return;
    }
    if (phone.replace(/\D/g, '').length < 11) {
      alert('অনুগ্রহ করে ১১ ডিজিটের সঠিক মোবাইল নাম্বার দিন।');
      return;
    }
    if (!address.trim()) {
      alert('অনুগ্রহ করে আপনার সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন।');
      return;
    }
    if (cart.length === 0) {
      alert('আপনার শপিং ব্যাগ খালি। অনুগ্রহ করে পণ্য যোগ করুন।');
      return;
    }
    if (!agreeTerms) {
      alert('অর্ডার সম্পন্ন করতে শর্তাবলী ও নীতিমালায় সম্মতি দিন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const orderId = `SB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const orderPayload: BookOrder = {
        id: orderId,
        customerName: name.trim(),
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        district: selectedDelivery.zone,
        deliveryArea: selectedDelivery.title,
        deliveryZone: selectedDelivery.title,
        deliveryCharge: deliveryCost,
        price: cartSubtotal,
        unitPrice: cart.length === 1 ? (cart[0].variant?.price ?? cart[0].product.price) : cartSubtotal,
        totalAmount: grandTotal,
        totalPrice: grandTotal,
        productName: cart.map(i => `${i.product.title}${i.variant?.name ? ` (${i.variant.name})` : ''} (x${i.quantity})`).join(', '),
        productTitle: cart.map(i => `${i.product.title}${i.variant?.name ? ` (${i.variant.name})` : ''} (x${i.quantity})`).join(', '),
        status: 'Pending',
        orderType: 'storefront',
        paymentMethod: 'Cash on Delivery',
        paymentGateway: 'Cash on Delivery',
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscountAmount > 0 ? couponDiscountAmount : undefined,
        quantity: totalItemCount,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        items: cart.map(i => ({
          product: {
            id: i.product.id,
            title: i.variant?.name ? `${i.product.title} - ${i.variant.name}` : i.product.title,
            price: i.variant?.price ?? i.product.price,
            regularPrice: i.variant?.regularPrice ?? i.product.regularPrice,
            image: i.variant?.image || i.product.coverImage || i.product.image,
            category: i.product.category,
            stock: i.product.stock || 100,
            isAvailable: true
          },
          quantity: i.quantity,
          variant: i.variant
        }))
      };

      // Server-side authoritative checkout API
      let confirmedOrder: BookOrder = orderPayload;
      try {
        const response = await fetch('/api/orders/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            deliveryZone: selectedDelivery.title,
            deliveryCharge: deliveryCost,
            deliveryMethodId: selectedDelivery.id,
            paymentMethod: 'Cash on Delivery',
            couponCode: appliedCoupon?.code,
            items: cart.map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
              variantId: item.variant?.id,
              variantName: item.variant?.name
            }))
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result && result.order) {
            confirmedOrder = result.order;
          }
        } else {
          await dbService.addBookOrder(orderPayload);
        }
      } catch {
        await dbService.addBookOrder(orderPayload);
      }

      // Track Purchase Event
      const purchaseEventId = createEventId('purchase');
      trackEvent('Purchase', {
        content_name: cart.map(i => i.product.title).join(', '),
        content_ids: cart.map(i => i.product.id),
        content_type: 'product',
        value: grandTotal || cartSubtotal,
        currency: 'BDT',
        num_items: totalItemCount,
        contents: cart.map(item => ({
          id: item.product.id,
          name: item.product.title,
          quantity: item.quantity,
          item_price: item.product.price
        }))
      }, purchaseEventId);

      playOrderSuccessVibe();
      setOrderSuccess(confirmedOrder);
      onClearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Order placement failed:', err);
      alert('অর্ডার সম্পন্ন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ORDER SUCCESS SCREEN
  if (orderSuccess) {
    const contactWa = (ecomSettings?.whatsappNumber || '8801329458568').replace(/[^0-9]/g, '');
    return (
      <div className="min-h-screen bg-[#f7f6f2] py-8 sm:py-16 px-4 flex items-center justify-center font-sans animate-fadeIn">
        <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#144d1a]">আপনার অর্ডার সফল হয়েছে!</h1>
            <p className="text-sm text-slate-600">
              ধন্যবাদ <span className="font-semibold text-slate-900">{orderSuccess.customerName}</span>! আমাদের প্রতিনিধি আপনাকে কল করে দ্রুত কনফার্ম করবেন।
            </p>
          </div>

          <div className="p-5 bg-[#faf9f6] rounded-2xl border border-slate-200 text-left space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500">অর্ডার ট্র্যাকিং আইডি:</span>
              <span className="font-mono font-bold text-slate-900">{orderSuccess.id}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500">সর্বমোট প্রদেয় মূল্য:</span>
              <span className="font-bold text-[#144d1a] text-base sm:text-lg">{(orderSuccess.totalAmount || orderSuccess.totalPrice || 0).toLocaleString()} TK</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500">পেমেন্ট মেথড:</span>
              <span className="font-semibold text-slate-800">ক্যাশ অন ডেলিভারি (COD)</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500 shrink-0">ডেলিভারি ঠিকানা:</span>
              <span className="font-medium text-slate-800 text-right">{orderSuccess.address}</span>
            </div>
          </div>

          {/* 1-Click WhatsApp Order Confirmation */}
          <a
            href={`https://wa.me/${contactWa}?text=${encodeURIComponent(
              `Hello SHOSTIR BAZAR,\nআমি একটি অর্ডার করেছি!\nঅর্ডার আইডি: #${orderSuccess.id}\nসর্বমোট: ${(orderSuccess.totalAmount || orderSuccess.totalPrice || 0).toLocaleString()} TK\nনাম: ${orderSuccess.customerName}\nমোবাইল: ${orderSuccess.customerPhone || orderSuccess.phone}\nঠিকানা: ${orderSuccess.address}\nঅনুগ্রহ করে ডেলিভারি কনফার্ম করুন!`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm sm:text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer no-underline"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            WhatsApp-এ অর্ডার কনফার্ম করুন
          </a>

          <button
            type="button"
            onClick={onNavigateShop}
            className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            আরো পণ্য কিনুন (Continue Shopping)
          </button>
        </div>
      </div>
    );
  }

  // MAIN CHECKOUT UX (Matching Naturo BD Screenshot Exactly)
  return (
    <div className="min-h-screen bg-[#f7f6f2] py-4 sm:py-8 px-2 sm:px-4 flex items-center justify-center font-sans">
      <div className="max-w-4xl w-full bg-[#faf9f6] rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-5 py-4 sm:px-8 sm:py-5 border-b border-slate-200/80 bg-white flex items-center justify-between">
          <h1 className="text-lg sm:text-2xl font-bold text-[#144d1a] tracking-tight">
            অর্ডার করুন - ক্যাশ অন ডেলিভারিতে
          </h1>
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            title="বন্ধ করুন"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">আপনার কার্টে কোন পণ্য নেই</p>
            <button
              type="button"
              onClick={onNavigateShop}
              className="px-6 py-2.5 bg-[#c5892b] hover:bg-[#b07823] text-white text-xs sm:text-sm font-bold rounded-xl cursor-pointer shadow-sm transition"
            >
              পণ্য দেখুন
            </button>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
            
            {/* 2-Column Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
              
              {/* ============================================================
                  LEFT COLUMN: 1. আপনার পণ্য  +  2. ডেলিভারি
                  ============================================================ */}
              <div className="space-y-4 sm:space-y-5">
                
                {/* CARD 1: আপনার পণ্য */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm sm:text-base font-bold text-[#144d1a]">
                      আপনার পণ্য
                    </h2>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full text-xs font-semibold">
                      {totalItemCount} টি
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                    {cart.map((item, idx) => {
                      const unitPrice = item.variant?.price ?? item.product.price ?? 0;
                      const img = item.variant?.image || item.product.coverImage || item.product.image || '/placeholder-image.svg';
                      const title = item.variant?.name ? `${item.product.title} - ${item.variant.name}` : item.product.title;
                      const variantKey = item.variant?.id;

                      return (
                        <div key={`${item.product.id}-${variantKey || idx}`} className="flex items-center gap-3">
                          <img
                            src={img}
                            alt={title}
                            className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg border border-slate-100 bg-[#fafafa] p-1 shrink-0"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/placeholder-image.svg';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                              {title}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              ৳{unitPrice.toLocaleString()}
                            </p>
                          </div>

                          {/* Stepper [-] [quantity] [+] */}
                          <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  onUpdateQuantity(item.product.id, item.quantity - 1, variantKey);
                                } else {
                                  onRemoveItem(item.product.id, variantKey);
                                }
                              }}
                              className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 py-1 text-xs font-bold text-slate-900 min-w-[1.75rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, variantKey)}
                              className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Subtotal Bottom Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs sm:text-sm font-semibold text-slate-600">
                      পণ্যের সাবটোটাল
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-900">
                      {cartSubtotal.toLocaleString()} TK
                    </span>
                  </div>
                </div>

                {/* CARD 2: ডেলিভারি */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
                  <h2 className="text-sm sm:text-base font-bold text-[#144d1a]">
                    ডেলিভারি
                  </h2>

                  <div className="space-y-2.5">
                    {deliveryOptions.map((opt) => {
                      const isSelected = selectedDeliveryId === opt.id;
                      const chargeToDisplay = isFreeDelivery ? 0 : opt.charge;

                      return (
                        <label
                          key={opt.id}
                          onClick={() => setSelectedDeliveryId(opt.id)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-[#1b5e20] bg-emerald-50/20 shadow-2xs' 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#1b5e20]' : 'border-slate-300'
                            }`}>
                              {isSelected && <span className="w-2 h-2 rounded-full bg-[#1b5e20]" />}
                            </span>
                            <span className="text-xs sm:text-sm font-medium text-slate-800">
                              {opt.title}
                            </span>
                          </div>

                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {isFreeDelivery ? 'ফ্রি' : `${chargeToDisplay} TK`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* ============================================================
                  RIGHT COLUMN: 3. গ্রাহকের তথ্য  +  4. মূল্য বিবরণ
                  ============================================================ */}
              <div className="space-y-4 sm:space-y-5">
                
                {/* CARD 3: অর্ডার করতে নিচের তথ্যগুলি দিন */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3.5">
                  <h2 className="text-sm sm:text-base font-bold text-[#144d1a]">
                    অর্ডার করতে নিচের তথ্যগুলি দিন
                  </h2>

                  <div className="space-y-3 text-xs sm:text-sm">
                    {/* নাম */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        নাম
                      </label>
                      <input
                        type="text"
                        placeholder="আপনার নাম"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-[#144d1a] focus:ring-1 focus:ring-[#144d1a] outline-none transition text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    {/* মোবাইল নাম্বার */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        মোবাইল নাম্বার
                      </label>
                      <input
                        type="tel"
                        placeholder="11 ডিজিট মোবাইল নাম্বার"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-[#144d1a] focus:ring-1 focus:ring-[#144d1a] outline-none transition text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    {/* ঠিকানা */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ঠিকানা
                      </label>
                      <textarea
                        rows={3}
                        placeholder="বাসা নম্বর, গ্রাম/মহল্লা, উপজেলা, জেলা"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-[#144d1a] focus:ring-1 focus:ring-[#144d1a] outline-none transition text-slate-900 placeholder:text-slate-400 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 4: মূল্য বিবরণ */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
                  <h2 className="text-sm sm:text-base font-bold text-[#144d1a]">
                    মূল্য বিবরণ
                  </h2>

                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>মোট</span>
                      <span className="font-bold text-slate-800">{cartSubtotal.toLocaleString()} TK</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>ডেলিভারি চার্জ</span>
                      <span className="font-bold text-slate-800">
                        {isFreeDelivery ? 'ফ্রি' : (deliveryCost > 0 ? `${deliveryCost} TK` : 'এলাকা নির্বাচন করুন')}
                      </span>
                    </div>

                    {couponDiscountAmount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span>কুপন ছাড়</span>
                        <span>-{couponDiscountAmount.toLocaleString()} TK</span>
                      </div>
                    )}

                    <div className="border-t border-slate-100 my-2" />

                    <div className="flex justify-between items-center text-slate-900">
                      <span className="font-bold text-sm sm:text-base">সর্বমোট</span>
                      <span className="font-extrabold text-base sm:text-lg text-slate-900">{grandTotal.toLocaleString()} TK</span>
                    </div>
                  </div>

                  {/* Optional Coupon Toggle */}
                  <div className="pt-1">
                    {!couponOpen && !appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => setCouponOpen(true)}
                        className="text-[11px] text-[#c5892b] hover:text-[#a36f1f] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Tag className="w-3 h-3" />
                        কুপন কোড আছে? (এখানে ক্লিক করুন)
                      </button>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="কুপন কোড লিখুন"
                            value={couponCodeInput}
                            onChange={(e) => setCouponCodeInput(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none uppercase font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            এপ্লাই
                          </button>
                        </div>
                        {couponError && <p className="text-[10px] text-rose-500 font-medium">{couponError}</p>}
                        {couponSuccess && <p className="text-[10px] text-emerald-600 font-medium">{couponSuccess}</p>}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* ============================================================
                BOTTOM FULL-WIDTH SECTION: Terms + Confirm CTA + Reassurance
                ============================================================ */}
            <div className="pt-2 sm:pt-4 space-y-3.5">
              
              {/* Terms & Policy Agreement */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#144d1a] accent-[#144d1a] rounded cursor-pointer shrink-0"
                />
                <span className="leading-relaxed">
                  আমি{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onNavigateHome(); }}
                    className="text-emerald-700 underline font-medium hover:text-emerald-900 inline p-0 bg-transparent border-0"
                  >
                    শর্তাবলী ও ব্যবহারবিধি
                  </button>
                  ,{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onNavigateHome(); }}
                    className="text-emerald-700 underline font-medium hover:text-emerald-900 inline p-0 bg-transparent border-0"
                  >
                    গোপনীয়তা নীতিমালা
                  </button>
                  {' '}ও{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onNavigateHome(); }}
                    className="text-emerald-700 underline font-medium hover:text-emerald-900 inline p-0 bg-transparent border-0"
                  >
                    পণ্য বিনিময় ও ফেরত নীতিমালা
                  </button>
                  {' '}পড়েছি এবং সম্মত আছি।
                </span>
              </label>

              {/* Big Golden CTA Button */}
              <button
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3.5 sm:py-4 px-6 bg-[#c5892b] hover:bg-[#b07823] active:scale-[0.99] text-white font-bold text-base sm:text-lg rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    অর্ডার প্রসেস হচ্ছে...
                  </span>
                ) : (
                  <span>অর্ডার কনফার্ম করুন {grandTotal.toLocaleString()} TK</span>
                )}
              </button>

              {/* Reassurance Subtitle */}
              <p className="text-center text-xs text-slate-500 font-medium pt-1">
                আমাদের একজন কাস্টমার প্রতিনিধি আপনাকে কল করে আবার কনফার্ম হবে
              </p>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
