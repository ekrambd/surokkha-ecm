import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, BookOrder, Customer } from '../types';
import { 
  Search, ShoppingCart, User, RotateCcw, X, Plus, Minus, 
  Printer, Check, Phone, DollarSign, Tag, MessageSquare, 
  ArrowRight, ShieldCheck, CreditCard, Clock, CheckCircle2,
  Package, LayoutGrid, List, Maximize2, RefreshCw
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';

interface PosCartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
}

interface PosManagerProps {
  products: Product[];
  customers: Customer[];
  onAddOrder: (order: BookOrder) => Promise<void>;
  onNavigateTab: (tab: any) => void;
}

export default function PosManager({
  products,
  customers,
  onAddOrder,
  onNavigateTab
}: PosManagerProps) {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // Cart State
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [fulfillmentType, setFulfillmentType] = useState<'handover' | 'ship'>('handover');
  const [paymentType, setPaymentType] = useState<'cash' | 'digital' | 'pay_later'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [discountType, setDiscountType] = useState<'none' | 'fixed' | 'percent'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Customer Selection State (Walk-in vs Specific Customer)
  const [customerMode, setCustomerMode] = useState<'walk_in' | 'select' | 'create'>('walk_in');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');

  // Shipping details if fulfillmentType === 'ship'
  const [shippingFee, setShippingFee] = useState<number>(60);
  const [shippingAddress, setShippingAddress] = useState('');

  // Success state for instant thermal print or receipt
  const [lastCompletedOrder, setLastCompletedOrder] = useState<BookOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products for POS grid
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

      const currentStock = typeof p.stock === 'number' ? p.stock : (p as any).stockQuantity || 0;
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = currentStock > 0;
      if (stockFilter === 'low_stock') matchesStock = currentStock <= 5;

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // Auto-scan / quick barcode lookup on Enter
  const handleBarcodeSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = searchTerm.trim().toLowerCase();
      if (!code) return;

      const directMatch = products.find(p => 
        (p.barcode && p.barcode.toLowerCase() === code) ||
        (p.sku && p.sku.toLowerCase() === code) ||
        (p.id && p.id.toLowerCase() === code)
      );

      if (directMatch) {
        addToCart(directMatch);
        setSearchTerm('');
      }
    }
  };

  // Add item to cart
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, customPrice: product.price }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[];
    });
  };

  const updateItemPrice = (productId: string, newPrice: number) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, customPrice: newPrice } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashReceived('');
    setDiscountValue(0);
    setDiscountType('none');
  };

  // Subtotal calculation
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = item.customPrice !== undefined ? item.customPrice : item.product.price;
      return sum + price * item.quantity;
    }, 0);
  }, [cart]);

  // Discount calculation
  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((subtotal * Math.min(100, discountValue)) / 100);
    }
    if (discountType === 'fixed') {
      return Math.min(subtotal, discountValue);
    }
    return 0;
  }, [subtotal, discountType, discountValue]);

  // Final total
  const finalTotal = useMemo(() => {
    const fee = fulfillmentType === 'ship' ? Number(shippingFee) || 0 : 0;
    return Math.max(0, subtotal - discountAmount + fee);
  }, [subtotal, discountAmount, fulfillmentType, shippingFee]);

  // Cash change calculation
  const receivedNum = Number(cashReceived) || 0;
  const changeDue = Math.max(0, receivedNum - finalTotal);

  // Quick cash buttons
  const setQuickCash = (amount: number) => {
    setCashReceived(String(amount));
  };

  const addQuickCash = (delta: number) => {
    setCashReceived(String((Number(cashReceived) || 0) + delta));
  };

  // Complete POS Transaction
  const handleCharge = async () => {
    if (cart.length === 0) {
      setFeedback({
        isOpen: true,
        type: 'info',
        title: 'Empty Cart',
        message: 'Please add at least one product to the POS cart.'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const customerName = 
        customerMode === 'walk_in' 
          ? 'Walk-in Customer' 
          : customerMode === 'create' 
            ? (newCustomerName.trim() || 'Walk-in Customer')
            : (selectedCustomer?.name || 'Customer');

      const customerPhone = 
        customerMode === 'walk_in' 
          ? '01700000000' 
          : customerMode === 'create' 
            ? (newCustomerPhone.trim() || '01700000000')
            : (selectedCustomer?.phone || '01700000000');

      const customerAddr = 
        fulfillmentType === 'ship'
          ? (shippingAddress.trim() || selectedCustomer?.address || 'Delivery Address')
          : (selectedCustomer?.address || 'In-store Walk-in Purchase');

      const orderItems = cart.map(item => ({
        product: {
          id: item.product.id,
          title: item.product.title,
          price: item.customPrice !== undefined ? item.customPrice : item.product.price,
          regularPrice: item.product.regularPrice || item.product.price,
          image: item.product.image,
          category: item.product.category,
          stock: item.product.stock,
          isAvailable: true
        },
        quantity: item.quantity,
        price: item.customPrice !== undefined ? item.customPrice : item.product.price
      }));

      const newOrder: BookOrder = {
        id: `POS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName,
        phone: customerPhone,
        address: customerAddr,
        orderType: 'physical',
        status: fulfillmentType === 'handover' ? 'Delivered' : 'Confirmed',
        paymentMethod: paymentType === 'cash' ? 'Cash on Delivery' : paymentType === 'digital' ? 'bKash' : 'COD',
        totalPrice: finalTotal,
        totalAmount: finalTotal,
        deliveryCharge: fulfillmentType === 'ship' ? (Number(shippingFee) || 0) : 0,
        deliveryFee: fulfillmentType === 'ship' ? (Number(shippingFee) || 0) : 0,
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
        items: orderItems,
        productTitle: cart.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
        productName: cart.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
        notes: `POS Sale • ${fulfillmentType === 'handover' ? 'Hand over now' : 'Ship / deliver'} • Payment: ${paymentType}${cashReceived ? ` • Cash received: ৳${cashReceived}` : ''}${changeDue > 0 ? ` • Change: ৳${changeDue}` : ''}`,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString()
      };

      await onAddOrder(newOrder);
      setLastCompletedOrder(newOrder);

      // Trigger automatic receipt print or show receipt view
      clearCart();

      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Transaction Completed!',
        message: `Order #${newOrder.id} successfully charged (৳${finalTotal.toLocaleString()}).`
      });
    } catch (err: any) {
      console.error('POS transaction error:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Transaction Failed',
        message: err?.message || 'Could not complete POS sale.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Instant POS Thermal Receipt Print
  const handlePrintReceipt = (order: BookOrder) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.id}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: monospace; font-size: 12px; padding: 15px; margin: 0; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          .items-table th, .items-table td { font-size: 11px; text-align: left; }
          .items-table th:last-child, .items-table td:last-child { text-align: right; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 16px;">SHOSTIR BAZAR</div>
        <div class="center" style="font-size: 10px;">Point of Sale Receipt</div>
        <div class="divider"></div>
        <div>Order: #${order.id}</div>
        <div>Date: ${new Date(order.createdAt).toLocaleString()}</div>
        <div>Customer: ${order.customerName}</div>
        <div>Phone: ${order.phone}</div>
        <div class="divider"></div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((it: any) => `
              <tr>
                <td>${it.product?.title || it.title || 'Product'}</td>
                <td>${it.quantity}</td>
                <td>৳${(it.price || it.product?.price || 0) * it.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="row bold"><span>Total Amount:</span><span>৳${(order.totalPrice || order.totalAmount || 0).toLocaleString()}</span></div>
        <div class="row"><span>Payment:</span><span>${order.paymentMethod || 'Cash'}</span></div>
        <div class="divider"></div>
        <div class="center" style="margin-top: 12px; font-size: 10px;">Thank you for shopping with us!</div>
        <script>
          window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  return (
    <div className="pos-system font-sans flex flex-col xl:flex-row gap-6 h-[calc(100vh-100px)] min-h-[650px] overflow-hidden">
      
      {/* ================= LEFT 65%: PRODUCT CATALOG & SEARCH ================= */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Top POS Header & Search Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-black">
                  POS
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Point of Sale</h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fast checkout, barcode scan & in-store counter sales
              </p>
            </div>

            {/* Quick Navigation Badges */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Orders
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('customers')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Customers
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setStockFilter('all');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Reset filters"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search Bar + Category Dropdown + Layout toggle */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleBarcodeSearch}
                placeholder="Scan barcode, press Enter or type name / SKU..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">All categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Layout Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewLayout === 'grid' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('list')}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewLayout === 'list' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter Badges (All / In stock / Low stock) */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  stockFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All {products.length}
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('in_stock')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  stockFilter === 'in_stock'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                In stock {products.filter(p => (Number(p.stock) || 0) > 0).length}
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('low_stock')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  stockFilter === 'low_stock'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Low stock {products.filter(p => (Number(p.stock) || 0) <= 5).length}
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              {filteredProducts.length} of {products.length} items
            </span>
          </div>
        </div>

        {/* Product List / Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {viewLayout === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const currentStock = typeof p.stock === 'number' ? p.stock : (p as any).stockQuantity || 0;
                const isOutOfStock = currentStock <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`bg-white border rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md group relative text-left ${
                      inCart 
                        ? 'border-teal-500 ring-2 ring-teal-500/20' 
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-teal-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                        {inCart.quantity}
                      </span>
                    )}

                    <div className="space-y-2">
                      <div className="h-28 w-full bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-slate-100">
                        <img
                          src={p.image || p.coverImage || 'https://images.unsplash.com/photo-1608248597359-0098f98a329d?w=200&auto=format&fit=crop&q=80'}
                          alt={p.title}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-teal-700">
                        {p.title}
                      </h4>
                      {p.sku && (
                        <p className="text-[10px] font-mono text-slate-400 truncate">SKU: {p.sku}</p>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 font-mono">
                        ৳{Number(p.price || 0).toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-bold ${
                        isOutOfStock ? 'text-rose-600' : currentStock <= 5 ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {isOutOfStock ? 'Out of stock' : `${currentStock} in stock`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredProducts.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const currentStock = typeof p.stock === 'number' ? p.stock : (p as any).stockQuantity || 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="py-3 px-3 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        <img src={p.image || p.coverImage || ''} alt={p.title} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{p.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {p.sku ? `SKU: ${p.sku} • ` : ''}{currentStock} in stock
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-extrabold text-slate-900 font-mono">
                        ৳{Number(p.price || 0).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        {inCart ? `Add (${inCart.quantity})` : 'Add'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Package className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No products match your search or filter</p>
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT 35%: POS CART & INSTANT CHECKOUT ================= */}
      <div className="w-full xl:w-[420px] bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden shrink-0">
        
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Cart ({cart.reduce((s, i) => s + i.quantity, 0)} {cart.length === 1 ? 'item' : 'items'})
            </h3>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Customer Select / Walk-in Toggle Bar */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-bold text-slate-800">
              {customerMode === 'walk_in' ? 'Walk-in Customer' : selectedCustomer ? selectedCustomer.name : 'Customer'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setCustomerMode('walk_in');
                setSelectedCustomer(null);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                customerMode === 'walk_in' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Walk-in
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode('select')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                customerMode === 'select' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Select
            </button>
          </div>
        </div>

        {/* Customer Search Drawer if customerMode === 'select' */}
        {customerMode === 'select' && (
          <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer by name or phone..."
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-teal-500"
            />
            <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 bg-white rounded-lg border border-slate-200">
              {customers
                .filter(c => 
                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                  c.phone.includes(customerSearch)
                )
                .slice(0, 5)
                .map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerMode('select');
                      if (c.address) setShippingAddress(c.address);
                    }}
                    className="p-2 text-xs hover:bg-teal-50 cursor-pointer flex justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.phone}</span>
                    </div>
                    <span className="text-[10px] text-teal-600 font-bold self-center">Select</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map(item => {
            const currentItemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
            const lineTotal = currentItemPrice * item.quantity;

            return (
              <div key={item.product.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{item.product.title}</h4>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {item.product.sku ? `SKU: ${item.product.sku}` : item.product.category}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {/* Price input (editable inline) */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-bold">Price</span>
                    <input
                      type="number"
                      value={item.customPrice ?? item.product.price}
                      onChange={(e) => updateItemPrice(item.product.id, Math.max(0, Number(e.target.value) || 0))}
                      className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-center outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* Qty Stepper */}
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2.5 py-1 text-xs font-bold text-slate-800 font-mono">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <span className="text-xs font-black text-slate-900 font-mono">
                    ৳{lineTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}

          {cart.length === 0 && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingCart className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Scan or tap a product to start.</p>
              <p className="text-[11px] text-slate-400">Scan a barcode or search products on the left</p>
            </div>
          )}
        </div>

        {/* Fulfillment & Payment Options matching screenshot */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-3">
          
          {/* Fulfillment Toggle: Hand over now vs Ship / deliver */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFulfillmentType('handover')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                fulfillmentType === 'handover'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hand over now
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentType('ship')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                fulfillmentType === 'ship'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ship / deliver
            </button>
          </div>

          {/* If shipping, prompt shipping fee & address */}
          {fulfillmentType === 'ship' && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Delivery Charge:</span>
                <input
                  type="number"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-center font-bold"
                />
              </div>
              <input
                type="text"
                placeholder="Customer delivery address..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}

          {/* Payment Method: Cash / Digital / Pay later */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentType('cash')}
              className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                paymentType === 'cash'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('digital')}
              className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                paymentType === 'digital'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Digital
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('pay_later')}
              className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                paymentType === 'pay_later'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Pay later
            </button>
          </div>

          {/* Cash Received & Change Calculation */}
          {paymentType === 'cash' && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Cash received</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Change</span>
                  <span className="text-sm font-black text-emerald-600 font-mono">
                    ৳{changeDue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Exact & Quick Cash Chips matching screenshot */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickCash(finalTotal)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  Exact
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCash(100)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg cursor-pointer font-mono"
                >
                  ৳100
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCash(200)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg cursor-pointer font-mono"
                >
                  ৳200
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCash(500)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg cursor-pointer font-mono"
                >
                  ৳500
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCash(1000)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg cursor-pointer font-mono"
                >
                  ৳1,000
                </button>
                <button
                  type="button"
                  onClick={() => addQuickCash(100)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-teal-700 text-[11px] font-bold rounded-lg cursor-pointer font-mono"
                >
                  +৳100
                </button>
                <button
                  type="button"
                  onClick={() => addQuickCash(500)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-teal-700 text-[11px] font-bold rounded-lg cursor-pointer font-mono"
                >
                  +৳500
                </button>
              </div>
            </div>
          )}

          {/* Discount Row */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="font-bold text-slate-700">Discount</span>
            <div className="flex items-center gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold"
              >
                <option value="none">None</option>
                <option value="fixed">Fixed Tk</option>
                <option value="percent">Percent %</option>
              </select>
              {discountType !== 'none' && (
                <input
                  type="number"
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-center text-xs font-bold"
                />
              )}
            </div>
          </div>

          {/* Total & Big Charge Button matching screenshot */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Total</span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                ৳{finalTotal.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCharge}
              disabled={cart.length === 0 || isProcessing}
              className="w-full py-3.5 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-black text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              {isProcessing ? 'Processing Sale...' : `Charge ৳${finalTotal.toLocaleString()}`}
            </button>

            {/* Quick Actions Footer matching screenshot: Print / Preview / WhatsApp / Orders */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-1">
              <div className="flex items-center gap-3">
                {lastCompletedOrder && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(lastCompletedOrder)}
                      className="hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(lastCompletedOrder)}
                      className="hover:text-slate-900 cursor-pointer"
                    >
                      Preview
                    </button>
                    {lastCompletedOrder.phone && (
                      <a
                        href={`https://wa.me/88${lastCompletedOrder.phone.replace(/[^0-9]/g, '')}?text=Thank%20you%20for%20your%20purchase!%20Order%20ID:%20${lastCompletedOrder.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="hover:text-teal-700 cursor-pointer font-bold"
              >
                Orders →
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
