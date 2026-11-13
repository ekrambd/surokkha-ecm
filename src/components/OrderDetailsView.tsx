import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Package, RefreshCw, ShoppingBag, Truck, Calendar, MapPin, AlertCircle, Edit3, FileText, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { BookOrder } from '../types';
import { InvoicePreview } from './InvoicePreview';
import { CompactInvoiceCard } from './CompactInvoiceCard';
import { MultiCourierRatioCard } from './MultiCourierRatioCard';
import { motion } from 'motion/react';
import { isOrderCod, isOrderPaid } from '../lib/orderPaymentUtils';
import { CourierRatioModal } from './ui/CourierRatioModal';
import { checkCustomerCourierRatio, CustomerCourierRatio } from '../lib/courierFraudService';

interface Props {
  order: BookOrder;
  allOrders?: BookOrder[];
  onClose: () => void;
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<void>;
  onEditOrder: (order: BookOrder) => void;
}

const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Packaging',
  'Ready for Shipment',
  'Shipped',
  'Delivered',
  'Return',
  'Cancelled'
];

export function OrderDetailsView({ order, allOrders = [], onClose, onUpdateStatus, onEditOrder }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [courierRatio, setCourierRatio] = useState<CustomerCourierRatio | null>(null);
  const [isRatioLoading, setIsRatioLoading] = useState(false);
  const [ratioModal, setRatioModal] = useState<{
    isOpen: boolean;
    ratio: CustomerCourierRatio | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    ratio: null,
    isLoading: false
  });

  const loadRatio = async (forceRefresh: boolean = false) => {
    if (!order.phone) return;
    setIsRatioLoading(true);
    try {
      const res = await checkCustomerCourierRatio(order.phone, allOrders, forceRefresh);
      setCourierRatio(res);
      setIsRatioLoading(false);
    } catch {
      setIsRatioLoading(false);
    }
  };

  useEffect(() => {
    loadRatio(true);
  }, [order.phone, allOrders.length]);

  const handleCheckRatio = async () => {
    if (!order.phone) return;
    setRatioModal({
      isOpen: true,
      ratio: courierRatio,
      isLoading: !courierRatio
    });
    try {
      const res = await checkCustomerCourierRatio(order.phone, allOrders, true);
      setCourierRatio(res);
      setRatioModal({
        isOpen: true,
        ratio: res,
        isLoading: false
      });
    } catch {
      setRatioModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsUpdating(true);
    await onUpdateStatus(order.id, e.target.value);
    setIsUpdating(false);
  };

  const getStepProgress = () => {
    const s = order.status;
    if (['Cancelled', 'Return', 'Hold', 'Not Responding', 'Under Review'].includes(s)) return 0;
    if (s === 'Pending') return 1;
    if (s === 'Confirmed') return 2;
    if (s === 'Packaging' || s === 'Ready for Shipment') return 3;
    if (s === 'Shipped') return 4;
    if (s === 'Delivered') return 5;
    return 1;
  };

  const currentStep = getStepProgress();

  const steps = [
    { label: 'Confirm Order', icon: ShoppingBag, step: 2 },
    { label: 'Processing Order', icon: RefreshCw, step: 3 },
    { label: 'Product Dispatched', icon: Package, step: 4 },
    { label: 'On Delivery', icon: Truck, step: 4 }, // usually shipped is same as on delivery
    { label: 'Delivery Completed', icon: CheckCircle, step: 5 },
  ];

  const formatDate = (d: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
    } catch {
      return d;
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 font-sans p-3 sm:p-5 lg:p-6 animate-fadeIn text-xs sm:text-sm">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-4 sm:px-5 py-3 rounded-xl shadow-xs border border-slate-200 mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 text-slate-500 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Order #{order.id.replace('ORD-', '')}</h2>
            <span className="text-[11px] text-slate-400">{formatDate(order.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInvoice(!showInvoice)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{showInvoice ? 'Details' : 'Invoice'}</span>
          </button>
          <button
            onClick={() => onEditOrder(order)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {showInvoice ? (
        <InvoicePreview order={order} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Status Tracker Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-semibold">Order Status :</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded">
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-semibold">Payment :</span>
                  <span className="font-semibold text-slate-800">
                    {order.paymentMethod || 'Cash on Delivery'}
                  </span>
                  <span className={`px-2 py-0.5 font-bold text-[10px] rounded ${
                    isOrderPaid(order)
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isOrderPaid(order) ? 'PAID' : 'UNPAID'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={order.status}
                  onChange={handleStatusChange}
                  disabled={isUpdating}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
                >
                  {ORDER_STATUSES.map(s => (
                    <option key={s} value={s}>{s} Order</option>
                  ))}
                </select>
                <button 
                  disabled={isUpdating}
                  className="px-3 py-1.5 bg-[#52c41a] hover:bg-[#49b017] text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Change Status'}
                </button>
              </div>
            </div>

            {/* Stepper */}
            <div className="relative flex justify-between items-start px-2 sm:px-6">
              <div className="absolute top-4 left-8 right-8 h-1 bg-slate-200 rounded-full z-0"></div>
              <div 
                className="absolute top-4 left-8 h-1 bg-[#52c41a] rounded-full z-0 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, (currentStep - 2) * 25))}%` }}
              ></div>

              {steps.map((step, idx) => {
                const isActive = currentStep >= step.step;
                const Icon = step.icon;
                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center w-16 sm:w-20">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-xl shadow-xs transition-colors mb-1.5 ${
                      isActive ? 'bg-[#52c41a] text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[11px] font-bold text-center leading-tight ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 text-center">
                      {isActive ? formatDate(order.createdAt) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Products List */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase">
                  <th className="pb-2 font-semibold">Product</th>
                  <th className="pb-2 font-semibold text-center">Unit Price</th>
                  <th className="pb-2 font-semibold text-center">Quantity</th>
                  <th className="pb-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, idx: number) => {
                    const itemTitle = item.product?.title || item.title || order.productTitle || 'Product';
                    const itemImg = item.variant?.image || item.product?.image || item.image || item.productImage;
                    const itemQty = item.quantity || 1;
                    const itemUnitPrice = item.variant?.price || item.product?.price || item.price || order.price || 0;
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                              {itemImg ? (
                                <img src={itemImg} alt={itemTitle} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-800 line-clamp-1">{itemTitle}</p>
                              {item.variant?.name && (
                                <span className="text-[10px] text-slate-500">{item.variant.name}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-center font-mono text-xs text-slate-600">৳ {itemUnitPrice}</td>
                        <td className="py-2.5 text-center font-mono text-xs text-slate-600">{itemQty}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-800">৳ {itemUnitPrice * itemQty}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="font-bold text-xs text-slate-800 line-clamp-1">{order.productTitle}</p>
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-mono text-xs text-slate-600">৳ {order.price}</td>
                    <td className="py-2.5 text-center font-mono text-xs text-slate-600">{order.quantity}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-800">৳ {(order.price || 0) * (order.quantity || 1)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Cart Totals */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="grid grid-cols-2 bg-slate-50 p-2.5 rounded-lg mb-2">
                <span className="font-bold text-slate-800 text-xs">Cart Totals</span>
                <span className="font-bold text-slate-800 text-xs text-right">Price</span>
              </div>
              <div className="px-2 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Sub Total</span>
                  <span className="font-mono text-slate-800 font-bold">
                    ৳ {order.totalPrice ? order.totalPrice - (order.deliveryCharge || 0) + (order.couponDiscount || order.discountAmount || 0) : ((order.price || 0) * (order.quantity || 1))}
                  </span>
                </div>
                {order.couponDiscount && (
                  <div className="flex justify-between items-center">
                    <span className="text-rose-500 font-medium">Discount</span>
                    <span className="font-mono text-rose-600 font-bold">- ৳ {order.couponDiscount || order.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Shipping</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {order.deliveryCharge ? `৳ ${order.deliveryCharge}` : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-slate-900 text-sm">Total price</span>
                  <span className="font-mono font-black text-orange-500 text-base">
                    ৳ {order.totalAmount || order.totalPrice || ((order.price || 0) * (order.quantity || 1) + (order.deliveryCharge || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Compact Invoice Preview (Matching Screenshot 1) */}
          <CompactInvoiceCard order={order} />
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-4">
          
          {/* Summary */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 mb-3">
              <FileText className="w-4 h-4 text-slate-400" />
              Summary
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID</span>
                <span className="font-bold text-slate-900 font-mono">#{order.id.replace('ORD-', '')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-bold text-slate-900">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-bold font-mono text-orange-500">
                  ৳ {order.totalAmount || order.totalPrice || ((order.price || 0) * (order.quantity || 1) + (order.deliveryCharge || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 mb-3">
              <MapPin className="w-4 h-4 text-slate-400" />
              Shipping Address
            </h3>
            <div className="space-y-1.5 text-xs text-slate-600">
              <p className="font-bold text-slate-900">{order.customerName}</p>
              <p>{order.address}</p>
              {(order.thana || order.district) && (
                <p>{order.thana ? `${order.thana}, ` : ''}{order.district}</p>
              )}
              {order.email && <p>{order.email}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-slate-800 font-medium">{order.phone}</span>
                {order.phone && (
                  <button
                    type="button"
                    onClick={handleCheckRatio}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="h-3 w-3 text-teal-600" />
                    <span>Check Steadfast Ratio</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right-Side All Type Courier Ratio Card (Screenshot 1) */}
          <MultiCourierRatioCard
            ratio={courierRatio}
            isLoading={isRatioLoading}
            onRefresh={() => loadRatio(true)}
            onViewDetails={handleCheckRatio}
          />

          {/* Additional Info / Note */}
          {order.notes && (
            <div className="bg-amber-50 rounded-xl shadow-xs border border-amber-200 p-4">
              <h3 className="font-bold text-amber-900 text-xs flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Customer Note
              </h3>
              <p className="text-xs text-amber-800">{order.notes}</p>
            </div>
          )}

        </div>
            </div>
      )}

      {/* Steadfast Delivery Ratio & Risk Check Modal */}
      <CourierRatioModal
        isOpen={ratioModal.isOpen}
        customerName={order.customerName}
        ratio={ratioModal.ratio}
        isLoading={ratioModal.isLoading}
        onClose={() => setRatioModal(prev => ({ ...prev, isOpen: false }))}
        onRefresh={handleCheckRatio}
        onSearchPhone={async (customPhone) => {
          setRatioModal(prev => ({ ...prev, isLoading: true }));
          try {
            const res = await checkCustomerCourierRatio(customPhone, allOrders, true);
            setRatioModal(prev => ({ ...prev, ratio: res, isLoading: false }));
          } catch {
            setRatioModal(prev => ({ ...prev, isLoading: false }));
          }
        }}
      />
    </div>
  );
}
