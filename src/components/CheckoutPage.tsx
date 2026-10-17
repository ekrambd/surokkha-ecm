import { trackEvent, createEventId } from '../lib/pixelGtmService';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Copy, 
  Smartphone, 
  CreditCard, 
  Gift,
  ChevronRight,
  CheckCircle2,
  MessageCircle
} from 'lucide-react';
import { Product, ProductVariant, BookOrder, EcomSettings, DeliveryMethodItem, PaymentGatewayItem, Coupon } from '../types';
import { dbService } from '../lib/dbService';
import { DEFAULT_DELIVERY_METHODS, DEFAULT_PAYMENT_GATEWAYS } from '../lib/constants';
import { playOrderSuccessVibe } from '../lib/soundUtils';

const BD_DISTRICTS = [
  'Dhaka',
  'Gazipur',
  'Narayanganj',
  'Chattogram',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
  'Cumilla',
  "Cox's Bazar",
  'Brahmanbaria',
  'Chandpur',
  'Noakhali',
  'Feni',
  'Lakshmipur',
  'Tangail',
  'Kishoreganj',
  'Narsingdi',
  'Manikganj',
  'Munshiganj',
  'Faridpur',
  'Gopalganj',
  'Madaripur',
  'Rajbari',
  'Shariatpur',
  'Bogura',
  'Pabna',
  'Sirajganj',
  'Naogaon',
  'Natore',
  'Chapainawabganj',
  'Joypurhat',
  'Jashore',
  'Satkhira',
  'Kushtia',
  'Jhenaidah',
  'Chuadanga',
  'Meherpur',
  'Bagerhat',
  'Narail',
  'Magura',
  'Patuakhali',
  'Bhola',
  'Pirojpur',
  'Barguna',
  'Jhalokathi',
  'Dinajpur',
  'Kurigram',
  'Gaibandha',
  'Nilphamari',
  'Panchagarh',
  'Thakurgaon',
  'Lalmonirhat',
  'Habiganj',
  'Moulvibazar',
  'Sunamganj',
  'Netrokona',
  'Jamalpur',
  'Sherpur',
  'Bandarban',
  'Rangamati',
  'Khagrachhari'
];

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
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
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
  onOpenLoginModal
}: CheckoutPageProps) {
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [thana, setThana] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isBillingSame, setIsBillingSame] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Delivery Methods from Admin (Dynamic based on District and Free Delivery Threshold)
  const activeDeliveryMethods = useMemo<DeliveryMethodItem[]>(() => {
    const list: DeliveryMethodItem[] = [];
    const isDhaka = district.toLowerCase().includes('dhaka');

    const subTotal = cart.reduce((total, item) => {
      const price = item.variant?.price ?? (item.product.price || item.product.regularPrice || 0);
      return total + (price * item.quantity);
    }, 0);

    const isFreeDelivery = ecomSettings?.freeDeliveryEnabled && 
                           ecomSettings?.freeDeliveryMinPurchase && 
                           subTotal >= ecomSettings.freeDeliveryMinPurchase;

    if (isDhaka) {
      list.push({
        id: 'inside-regular',
        title: 'Inside Dhaka (Regular)',
        status: 'Active',
        mode: 'Fixed',
        type: 'Fixed',
        minimumCharge: 0,
        maximumCharge: 0,
        deliveryCharge: isFreeDelivery ? 0 : (ecomSettings?.deliveryChargeInsideDhaka || 60),
        updatedAt: new Date().toISOString()
      });
      if (ecomSettings?.deliveryChargeInsideExpress) {
        list.push({
          id: 'inside-express',
          title: 'Inside Dhaka (Express)',
          status: 'Active',
          mode: 'Fixed',
          type: 'Fixed',
          minimumCharge: 0,
          maximumCharge: 0,
          deliveryCharge: isFreeDelivery ? 0 : ecomSettings.deliveryChargeInsideExpress,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      list.push({
        id: 'outside-regular',
        title: 'Outside Dhaka (Regular)',
        status: 'Active',
        mode: 'Fixed',
        type: 'Fixed',
        minimumCharge: 0,
        maximumCharge: 0,
        deliveryCharge: isFreeDelivery ? 0 : (ecomSettings?.deliveryChargeOutsideDhaka || 120),
        updatedAt: new Date().toISOString()
      });
      if (ecomSettings?.deliveryChargeOutsideExpress) {
        list.push({
          id: 'outside-express',
          title: 'Outside Dhaka (Express)',
          status: 'Active',
          mode: 'Fixed',
          type: 'Fixed',
          minimumCharge: 0,
          maximumCharge: 0,
          deliveryCharge: isFreeDelivery ? 0 : ecomSettings.deliveryChargeOutsideExpress,
          updatedAt: new Date().toISOString()
        });
      }
    }

    return list;
  }, [ecomSettings, district, cart]);

  const [selectedDeliveryMethodId, setSelectedDeliveryMethodId] = useState<string>('');

  useEffect(() => {
    if (activeDeliveryMethods.length > 0 && (!selectedDeliveryMethodId || !activeDeliveryMethods.some(m => m.id === selectedDeliveryMethodId))) {
      // Auto-detect based on district
      if (district.toLowerCase().includes('dhaka') || district.includes('Dhaka')) {
        const inside = activeDeliveryMethods.find(m => m.title.toLowerCase().includes('inside') || m.title.includes('within'));
        setSelectedDeliveryMethodId(inside?.id || activeDeliveryMethods[0].id);
      } else {
        const outside = activeDeliveryMethods.find(m => m.title.toLowerCase().includes('outside') || m.title.includes('Outside'));
        setSelectedDeliveryMethodId(outside?.id || activeDeliveryMethods[0].id);
      }
    }
  }, [activeDeliveryMethods, district, selectedDeliveryMethodId]);

  const selectedDeliveryMethod = useMemo(() => {
    return activeDeliveryMethods.find(m => m.id === selectedDeliveryMethodId) || activeDeliveryMethods[0];
  }, [activeDeliveryMethods, selectedDeliveryMethodId]);

  const deliveryCost = selectedDeliveryMethod?.deliveryCharge ?? (ecomSettings?.deliveryChargeInsideDhaka || 0);

  // Payment Gateways from Admin
  const activePaymentGateways = useMemo<PaymentGatewayItem[]>(() => {
    let gateways = ecomSettings?.paymentGateways;
    if (!gateways || gateways.length === 0) {
      gateways = DEFAULT_PAYMENT_GATEWAYS;
    }
    const active = gateways.filter(g => g.status === 'Active');
    return active.length > 0 ? active : gateways;
  }, [ecomSettings?.paymentGateways]);

  const [selectedPaymentGatewayId, setSelectedPaymentGatewayId] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState('');
  const [trxId, setTrxId] = useState('');
  const [copiedAccNo, setCopiedAccNo] = useState(false);

  useEffect(() => {
    if (activePaymentGateways.length > 0 && (!selectedPaymentGatewayId || !activePaymentGateways.some(g => g.id === selectedPaymentGatewayId))) {
      setSelectedPaymentGatewayId(activePaymentGateways[0].id);
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

  // Coupon Logic
  const [couponAccordionOpen, setCouponAccordionOpen] = useState(true);
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

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + ((item.variant?.price ?? item.product.price) * item.quantity), 0);
  }, [cart]);

  const totalItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percent') {
      const disc = Math.round((cartSubtotal * appliedCoupon.discount) / 100);
      return appliedCoupon.maxDiscount ? Math.min(disc, appliedCoupon.maxDiscount) : disc;
    }
    return Math.min(appliedCoupon.discount, cartSubtotal);
  }, [appliedCoupon, cartSubtotal]);

  const bogoEligible = useMemo(() => {
    return appliedCoupon && (appliedCoupon.usageCount || 0) >= 10 && cartSubtotal >= 2000;
  }, [appliedCoupon, cartSubtotal]);

  const gatewayDiscount = selectedPaymentGateway?.discountAmount ? Number(selectedPaymentGateway.discountAmount) : 0;
  const gatewayFee = selectedPaymentGateway?.transactionFee ? Number(selectedPaymentGateway.transactionFee) : 0;
  const grandTotal = Math.max(0, cartSubtotal + deliveryCost + gatewayFee - gatewayDiscount - couponDiscountAmount);

  // Track InitiateCheckout on checkout page entry
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

  const handleApplyCoupon = (codeToApply?: string) => {
    const targetCode = (codeToApply || couponCodeInput).trim();
    if (!targetCode) return;
    setCouponError('');
    setCouponSuccess('');

    const match = availableCoupons.find(c => c.code.toLowerCase() === targetCode.toLowerCase());
    if (!match) {
      setCouponError('Invalid or expired coupon code.');
      return;
    }
    if (match.minSpent && cartSubtotal < match.minSpent) {
      setCouponError(`Minimum order of Tk.${match.minSpent.toLocaleString()} required for this coupon.`);
      return;
    }
    setAppliedCoupon(match);
    setCouponSuccess(`Coupon "${match.code}" applied successfully!`);
    setCouponCodeInput('');
  };

  const handleCopyAccountNumber = (acc: string) => {
    navigator.clipboard.writeText(acc);
    setCopiedAccNo(true);
    setTimeout(() => setCopiedAccNo(false), 2000);
  };

  // Order Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<BookOrder | null>(null);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter your Full Name.');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter your Phone Number.');
      return;
    }
    if (!address.trim()) {
      alert('Please enter your full delivery address.');
      return;
    }
    if (cart.length === 0) {
      alert('Your shopping bag is empty.');
      return;
    }
    if (!agreeTerms) {
      alert('Please agree to the Terms & Conditions and Privacy Policy.');
      return;
    }
    if (isOnlinePayment && (!senderPhone.trim() || !trxId.trim())) {
      alert(`Please provide the Sender Phone Number and Transaction ID (TrxID) for ${selectedPaymentGateway?.title}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const orderPayload: BookOrder = {
        id: orderId,
        customerName: name.trim(),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        district: district,
        thana: thana.trim() || undefined,
        notes: (specialNotes.trim() ? specialNotes.trim() + '\n' : '') + (bogoEligible ? '[BOGO APPLIED: 11th+ Coupon Usage - Free Gift]' : '') || undefined,
        deliveryArea: selectedDeliveryMethod?.title || 'Inside Dhaka',
        deliveryZone: selectedDeliveryMethod?.title || 'Inside Dhaka',
        deliveryCharge: deliveryCost,
        price: cartSubtotal,
        unitPrice: cart.length === 1 ? (cart[0].variant?.price ?? cart[0].product.price) : cartSubtotal,
        totalAmount: grandTotal,
        totalPrice: grandTotal,
        productName: cart.map(i => `${i.product.title}${i.variant?.name ? ` (${i.variant.name})` : ''} (x${i.quantity})`).join(', ') + (bogoEligible && cart.length > 0 ? `, [FREE] ${cart[0].product.title} (x1)` : ''),
        productTitle: cart.map(i => `${i.product.title}${i.variant?.name ? ` (${i.variant.name})` : ''} (x${i.quantity})`).join(', ') + (bogoEligible && cart.length > 0 ? `, [FREE] ${cart[0].product.title} (x1)` : ''),
        status: 'Pending',
        orderType: 'storefront',
        paymentMethod: selectedPaymentGateway?.title || 'Cash on Delivery',
        paymentGateway: selectedPaymentGateway?.title || 'Cash on Delivery',
        senderPhone: isOnlinePayment ? senderPhone.trim() : undefined,
        trxId: isOnlinePayment ? trxId.trim() : undefined,
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscountAmount > 0 ? couponDiscountAmount : undefined,
        quantity: totalItemCount + (bogoEligible ? 1 : 0),
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        items: (() => {
          const baseItems = cart.map(i => ({
            product: {
              id: i.product.id,
              title: i.variant?.name ? `${i.product.title} - ${i.variant.name}` : i.product.title,
              price: i.variant?.price ?? i.product.price,
              regularPrice: i.variant?.regularPrice ?? i.product.regularPrice,
              image: i.variant?.image || i.product.coverImage,
              category: i.product.category,
              stock: i.product.stock || 100,
              isAvailable: true
            },
            quantity: i.quantity,
            variant: i.variant
          }));
          
          if (bogoEligible && baseItems.length > 0) {
            baseItems.push({
              product: {
                ...baseItems[0].product,
                id: `free-${baseItems[0].product.id}`,
                title: `[FREE GIFT] ${baseItems[0].product.title}`,
                price: 0
              },
              quantity: 1
            });
          }
          return baseItems;
        })()
      };

      // 1. Try Authoritative Server-Side Atomic Checkout first
      let confirmedOrder: BookOrder = orderPayload;
      let orderCreatedViaServer = false;

      try {
        const response = await fetch('/api/orders/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            deliveryZone: selectedDeliveryMethod?.title || 'Inside Dhaka',
            paymentMethod: selectedPaymentGateway?.title || 'Cash on Delivery',
            senderPhone: isOnlinePayment ? senderPhone.trim() : undefined,
            trxId: isOnlinePayment ? trxId.trim() : undefined,
            couponCode: appliedCoupon?.code,
            items: (() => {
              const baseApiItems = cart.map(i => ({
                productId: i.product.id,
                quantity: i.quantity,
                price: i.variant?.price ?? i.product.price,
                regularPrice: i.variant?.regularPrice ?? i.product.regularPrice,
                title: i.variant?.name ? `${i.product.title} - ${i.variant.name}` : i.product.title
              }));
              if (bogoEligible && baseApiItems.length > 0) {
                baseApiItems.push({
                  productId: baseApiItems[0].productId,
                  quantity: 1,
                  price: 0,
                  regularPrice: baseApiItems[0].regularPrice,
                  title: `[FREE GIFT] ${baseApiItems[0].title}`
                });
              }
              return baseApiItems;
            })()
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
      const totalItemsPurchased = cart.reduce((sum, item) => sum + item.quantity, 0);
      trackEvent('Purchase', {
        content_name: cart.map(i => i.product.title).join(', '),
        content_ids: cart.map(i => i.product.id),
        content_type: 'product',
        value: grandTotal || cartSubtotal,
        currency: 'BDT',
        num_items: totalItemsPurchased,
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
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ORDER SUCCESS SCREEN
  if (orderSuccess) {
    return (
      <div className="min-h-[80vh] bg-[#f8fafc] py-16 px-4 sm:px-6 flex items-center justify-center animate-fadeIn">
        <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Order Placed Successfully!</h1>
            <p className="text-sm text-slate-500">
              Thank you <span className="font-semibold text-slate-800">{orderSuccess.customerName}</span>! Your order has been placed.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Order Tracking ID:</span>
              <span className="font-mono font-bold text-slate-900">{orderSuccess.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Payable Amount:</span>
              <span className="font-bold text-orange-600 text-base">{(orderSuccess.totalAmount || orderSuccess.totalPrice || 0).toLocaleString()} BDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-medium text-slate-800">{orderSuccess.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Delivery Address:</span>
              <span className="font-medium text-slate-800 text-right truncate max-w-[220px]">{orderSuccess.address}</span>
            </div>
          </div>

          {/* 1-Click WhatsApp Order Confirmation & Tracking */}
          <a
            href={`https://wa.me/8801329458568?text=${encodeURIComponent(
              `Hello SHOSTIR BAZAR,\nI just placed order #${orderSuccess.id} (Amount: ${(orderSuccess.totalAmount || orderSuccess.totalPrice || 0).toLocaleString()} BDT).\nCustomer Name: ${orderSuccess.customerName}\nPhone: ${orderSuccess.customerPhone || orderSuccess.phone}\nPlease confirm my order & delivery updates!`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer no-underline"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            Track & Confirm on WhatsApp (1-Click)
          </a>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onNavigateShop}
              className="flex-1 py-3.5 px-6 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => onOpenLoginModal ? onOpenLoginModal() : onNavigateHome()}
              className="flex-1 py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              Track Order / Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-24 selection:bg-orange-100 selection:text-orange-900">
      
      {/* 1. Header Title & Breadcrumb */}
      <div className="bg-white border-b border-slate-200/80 py-8 text-center space-y-1.5 shadow-2xs">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Checkout</h1>
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <button onClick={onNavigateHome} className="hover:text-slate-900 transition-colors cursor-pointer">
            Home
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-[#f97316] font-semibold">Checkout</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* 2. Top Login / Register Notice Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <p className="text-xs sm:text-sm text-slate-600 font-medium text-center sm:text-left">
            Have any account? please login or register
          </p>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-5 py-2 text-xs font-bold text-white bg-[#f97316] hover:bg-[#ea580c] rounded-xl transition-all shadow-sm shadow-orange-500/20 cursor-pointer"
            >
              Register
            </button>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ============================================================
                LEFT COLUMN: Order Review + Shipping Address + Billing
                ============================================================ */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Card 1: Order Review */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-[#f97316] rounded-full"></div>
                  <h2 className="text-base font-bold text-slate-900">Order review</h2>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500">Your cart is currently empty.</p>
                    <button
                      type="button"
                      onClick={onNavigateShop}
                      className="px-4 py-2 bg-[#f97316] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Shop Products
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <div key={item.product.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={item.product.coverImage || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200'}
                            alt={item.product.title}
                            loading="lazy"
                            decoding="async"
                            width={56}
                            height={56}
                            className="w-14 h-14 object-cover rounded-xl border border-slate-100 bg-slate-50 shrink-0"
                          />
                          <div className="min-w-0 space-y-1">
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                              {item.product.title}
                              {item.variant?.name && (
                                <span className="ml-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  ({item.variant.name})
                                </span>
                              )}
                            </h3>
                            
                            <div className="flex items-center gap-2">
                              {item.product.price === 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-200/60">
                                  <Gift className="w-3 h-3" />
                                  Gift
                                </span>
                              )}
                              
                              {/* Quantity pill selector */}
                              <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50/70 p-0.5 text-xs">
                                <span className="text-[11px] text-slate-500 pl-1.5 pr-1">Qty:</span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center font-bold text-slate-800 text-xs">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900">
                            Tk.{(((item.variant?.price ?? item.product.price)) * item.quantity).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.product.id)}
                            className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Shipping & Customer Details */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-[#f97316] rounded-full"></div>
                  <h2 className="text-base font-bold text-slate-900">Shipping Details</h2>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  {/* 1. Mobile Phone Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Phone Number (mobile number) *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3.5 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs font-bold text-slate-600">
                        88
                      </span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-r-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-mono focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] transition-all"
                      />
                    </div>
                  </div>

                  {/* 2. Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Full Name (your name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] transition-all"
                    />
                  </div>

                  {/* 3. Full Address */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Full Address (complete address - the village/RoDr. Thana, Distt) *
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="ex: House no. / Village, Road, Thana, District"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] transition-all"
                    />
                  </div>

                  {/* Dynamic Delivery Method Selector Pill Options */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Delivery Method:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeDeliveryMethods.map((method) => {
                        const isSelected = selectedDeliveryMethod?.id === method.id;
                        return (
                          <div
                            key={method.id}
                            onClick={() => setSelectedDeliveryMethodId(method.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-[#f97316] bg-orange-50/40 text-slate-900 font-bold ring-1 ring-[#f97316]'
                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-[#f97316] bg-[#f97316]' : 'border-slate-300'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="truncate">{method.title}</span>
                            </div>
                            <span className="font-bold text-[#f97316]">
                              {method.deliveryCharge === 0 ? 'FREE' : `Tk.${method.deliveryCharge}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* ============================================================
                RIGHT COLUMN: Payment Method + Coupons + Summary + Order Button
                ============================================================ */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Card 1: Payment Method */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-[#f97316] rounded-full"></div>
                  <h2 className="text-base font-bold text-slate-900">Payment method</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePaymentGateways.map((gateway) => {
                    const isSelected = selectedPaymentGateway?.id === gateway.id;
                    const isCOD = gateway.type === 'Cash on Delivery' || gateway.type === 'COD' || gateway.title.toLowerCase().includes('cash');
                    const isBkash = gateway.title.toLowerCase().includes('bkash') || gateway.title.toLowerCase().includes('development');

                    return (
                      <div
                        key={gateway.id}
                        onClick={() => setSelectedPaymentGatewayId(gateway.id)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all select-none ${
                          isSelected
                            ? 'border-[#f97316] bg-orange-50/50 shadow-xs ring-1 ring-[#f97316]'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isBkash ? (
                            <div className="w-6 h-6 rounded-md bg-[#e2136e] text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                              bK
                            </div>
                          ) : isCOD ? (
                            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              💵
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <CreditCard className="w-4 h-4" />
                            </div>
                          )}

                          <span className="font-semibold text-slate-900 text-xs truncate">
                            {gateway.title}
                          </span>
                        </div>

                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-[#f97316] bg-[#f97316]' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Banking / Online Gateway Instructions & TrxID Input */}
                {isOnlinePayment && selectedPaymentGateway && (
                  <div className="p-4 bg-orange-50/60 border border-orange-200/80 rounded-2xl space-y-3 text-xs animate-fadeIn">
                    <div className="space-y-1.5">
                      <div className="font-bold text-orange-950 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-[#f97316]" />
                          {selectedPaymentGateway.title} Payment
                        </span>
                        {selectedPaymentGateway.discountAmount > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            Save Tk.{selectedPaymentGateway.discountAmount}
                          </span>
                        )}
                      </div>

                      {selectedPaymentGateway.accountNumber && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-slate-600">Account Number:</span>
                          <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-orange-200 text-xs">
                            {selectedPaymentGateway.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyAccountNumber(selectedPaymentGateway.accountNumber || '')}
                            className="p-1.5 hover:bg-orange-100 rounded-lg text-[#f97316] cursor-pointer"
                            title="Copy Account Number"
                          >
                            {copiedAccNo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}

                      {selectedPaymentGateway.instruction && (
                        <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed pt-1">
                          {selectedPaymentGateway.instruction}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-orange-200/60">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Sender Phone Number *</label>
                        <input
                          type="tel"
                          required={isOnlinePayment}
                          placeholder="01XXXXXXXXX"
                          value={senderPhone}
                          onChange={(e) => setSenderPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-[#f97316] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Transaction ID (TrxID) *</label>
                        <input
                          type="text"
                          required={isOnlinePayment}
                          placeholder="e.g. 9J82K3M..."
                          value={trxId}
                          onChange={(e) => setTrxId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-xs font-mono uppercase focus:ring-1 focus:ring-[#f97316] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Coupon / Gift Voucher Accordion */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
                <button
                  type="button"
                  onClick={() => setCouponAccordionOpen(!couponAccordionOpen)}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Have any coupon or gift voucher?
                  </h2>
                  {couponAccordionOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {couponAccordionOpen && (
                  <div className="space-y-4 pt-1 animate-fadeIn">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value)}
                        placeholder="Enter Coupon"
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm uppercase tracking-wider focus:outline-none focus:border-[#f97316]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        className="px-5 py-2.5 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        Apply coupon
                      </button>
                    </div>

                    {couponError && (
                      <p className="text-xs text-rose-500 font-medium">{couponError}</p>
                    )}
                    {couponSuccess && (
                      <p className="text-xs text-emerald-600 font-medium">{couponSuccess}</p>
                    )}


                  </div>
                )}
              </div>

              {/* Card 3: Summary Calculations */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-3.5">
                <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                  <span>Sub total</span>
                  <span className="font-semibold text-slate-900">{cartSubtotal.toLocaleString()} BDT</span>
                </div>

                <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                  <span>Delivery cost</span>
                  <span className="font-semibold text-slate-900">
                    {deliveryCost === 0 ? '0 BDT' : `${deliveryCost.toLocaleString()} BDT`}
                  </span>
                </div>

                {couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-emerald-600 font-medium">
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span>-{couponDiscountAmount.toLocaleString()} BDT</span>
                  </div>
                )}

                {gatewayDiscount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-emerald-600 font-medium">
                    <span>Payment Discount</span>
                    <span>-{gatewayDiscount.toLocaleString()} BDT</span>
                  </div>
                )}

                {gatewayFee > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-amber-600 font-medium">
                    <span>Gateway Fee</span>
                    <span>+{gatewayFee.toLocaleString()} BDT</span>
                  </div>
                )}

                {bogoEligible && (
                  <div className="flex justify-between text-xs sm:text-sm text-[#f97316] font-bold bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                    <span>🎉 BOGO FREE Gift Applied!</span>
                    <span>1 Extra Free</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm sm:text-base font-bold text-slate-900">Total</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {grandTotal.toLocaleString()} BDT
                  </span>
                </div>
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#f97316] focus:ring-[#f97316] cursor-pointer"
                />
                <label htmlFor="agreeTerms" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                  I have read and agree to the <span className="text-[#f97316] hover:underline font-medium">Terms and Conditions</span>, <span className="text-[#f97316] hover:underline font-medium">Privacy Policy</span> & <span className="text-[#f97316] hover:underline font-medium">Refund and Return Policy</span>.
                </label>
              </div>

              {/* Main PLACE ORDER Button */}
              <button
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-4 px-8 bg-[#f97316] hover:bg-[#ea580c] active:scale-[0.99] disabled:bg-orange-300 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    PLACING ORDER...
                  </>
                ) : (
                  'PLACE ORDER'
                )}
              </button>

            </div>

          </div>
        </form>

      </div>

      {/* Floating Cart Widget (matching screenshot bottom-right) */}
      {cart.length > 0 && (
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-4 sm:right-6 z-40 bg-[#f97316] text-white p-3 sm:px-4 sm:py-3 rounded-2xl shadow-xl shadow-orange-600/30 flex items-center gap-2.5 cursor-pointer hover:bg-[#ea580c] transition-all hover:scale-105"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-white text-[#f97316] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {totalItemCount}
            </span>
          </div>
          <div className="text-xs font-bold leading-tight hidden sm:block">
            <div>{totalItemCount} Items</div>
            <div className="text-[11px] font-mono">Tk.{cartSubtotal.toLocaleString()}</div>
          </div>
        </div>
      )}

    </div>
  );
}
