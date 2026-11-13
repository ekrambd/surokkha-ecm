import React, { useEffect, useState, useRef } from 'react';
import { 
  ShoppingBag, ExternalLink, Search, Filter, Plus, Phone, MapPin, Calendar, 
  CheckCircle, Clock, Truck, XCircle, Trash2, Edit3, Printer, 
  Check, ArrowUpDown, User, Package, DollarSign, Send, ShieldCheck,
  ChevronDown, FileSpreadsheet, Download, Upload, MessageSquare,
  Copy, RefreshCw, FileText, CheckSquare, AlertCircle, Sparkles, Tag,
  ArrowLeft, MoreVertical, CreditCard
} from 'lucide-react';
import { BookOrder, Product, Customer, ModeratorUser } from '../types';
import { OrderDetailsView } from './OrderDetailsView';
import { dbService } from '../lib/dbService';
import { ApiClient } from '../services/apiClient';
import { motion, AnimatePresence } from 'motion/react';
import ResponsiveImage from './ResponsiveImage';

import { ConfirmDialog } from './ui/ConfirmDialog';
import { isOrderCod, isOrderPaid } from '../lib/orderPaymentUtils';
import { CourierRatioModal } from './ui/CourierRatioModal';
import { checkCustomerCourierRatio, CustomerCourierRatio } from '../lib/courierFraudService';

interface OrderManagerProps {
  orders: BookOrder[];
  products?: Product[];
  customers?: Customer[];
  onAddOrder: (order: BookOrder) => Promise<void>;
  onUpdateOrder: (order: BookOrder) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  onRefreshOrders?: () => Promise<void>;
}

// Helper for relative timestamps (e.g. '20 minutes ago', '4 hours ago', 'a day ago')
function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const diffMs = now - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHours === 1) return 'an hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'a day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// Crisp Barcode SVG Generator for print outputs
function BarcodeSVG({ value, height = 38 }: { value: string; height?: number }) {
  const bars: { width: number; space: number }[] = [];
  const clean = (value || 'ORD-1001').toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    bars.push({
      width: (code % 3) + 1.5,
      space: ((code * 2) % 3) + 1.5
    });
  }

  let currentX = 10;
  bars.forEach(b => { currentX += b.width + b.space; });
  const totalWidth = currentX + 10;

  let renderX = 10;
  return (
    <svg viewBox={`0 0 ${totalWidth} ${height}`} className="w-full h-10" preserveAspectRatio="none">
      {bars.map((b, idx) => {
        const x = renderX;
        renderX += b.width + b.space;
        return (
          <rect
            key={idx}
            x={x}
            y={0}
            width={b.width}
            height={height}
            fill="#000000"
          />
        );
      })}
    </svg>
  );
}

// Helper QR Code SVG Generator for customer feedback review
function FeedbackQRCodeSVG({ url, size = 68 }: { url: string; size?: number }) {
  // Generates a clean vector QR matrix visual
  const hash = (url || 'review').split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000007, 7);
  const matrixSize = 21;
  const cells: boolean[][] = Array(matrixSize).fill(false).map(() => Array(matrixSize).fill(false));

  // Finder patterns (top-left, top-right, bottom-left)
  const addFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          cells[r0 + r][c0 + c] = true;
        }
      }
    }
  };
  addFinder(0, 0);
  addFinder(0, 14);
  addFinder(14, 0);

  // Timing patterns
  for (let i = 8; i < 13; i++) {
    cells[6][i] = i % 2 === 0;
    cells[i][6] = i % 2 === 0;
  }

  // Data pseudo-fill deterministic based on url
  let seed = hash;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Don't overwrite finders or timing
      if ((r < 7 && c < 7) || (r < 7 && c >= 14) || (r >= 14 && c < 7)) continue;
      if (r === 6 || c === 6) continue;
      seed = (seed * 9301 + 49297) % 233280;
      cells[r][c] = (seed % 3) === 0;
    }
  }

  return (
    <svg viewBox={`0 0 ${matrixSize} ${matrixSize}`} style={{ width: size, height: size }} className="shrink-0">
      <rect width={matrixSize} height={matrixSize} fill="white" />
      {cells.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0f172a" /> : null
        )
      )}
    </svg>
  );
}

// Available Export Column Options for Custom Column Modal
const DEFAULT_EXPORT_COLUMNS = [
  { id: 'id', label: 'ID', defaultChecked: true },
  { id: 'customerName', label: 'Customer Name', defaultChecked: true },
  { id: 'phone', label: 'Phone', defaultChecked: true },
  { id: 'address', label: 'Address', defaultChecked: true },
  { id: 'status', label: 'Status', defaultChecked: true },
  { id: 'channel', label: 'Channel', defaultChecked: true },
  { id: 'shopId', label: 'Shop ID', defaultChecked: true },
  { id: 'supplierIds', label: 'Supplier IDs', defaultChecked: true },
  { id: 'resellerId', label: 'Reseller ID', defaultChecked: true },
  { id: 'attributionId', label: 'Attribution ID', defaultChecked: true },
  { id: 'affiliateCode', label: 'Affiliate Code', defaultChecked: true },
  { id: 'net', label: 'Net', defaultChecked: true },
  { id: 'logistics', label: 'Logistics', defaultChecked: true },
  { id: 'logisticsCharge', label: 'Logistics Charge', defaultChecked: true },
  { id: 'total', label: 'Total', defaultChecked: true },
  { id: 'rEarn', label: 'R. Earn', defaultChecked: true },
  { id: 'resell', label: 'Resell', defaultChecked: true },
  { id: 'paid', label: 'Paid', defaultChecked: true },
  { id: 'due', label: 'Due', defaultChecked: true },
  { id: 'rDue', label: 'R. Due', defaultChecked: true },
  { id: 'profit', label: 'Profit', defaultChecked: true },
  { id: 'created', label: 'Created', defaultChecked: true },
  { id: 'logisticsNote', label: 'Logistics Note', defaultChecked: true },
  { id: 'contactName', label: 'Contact Name', defaultChecked: true },
  { id: 'contactPhone', label: 'Contact Phone', defaultChecked: true },
];


const MAIN_STATUSES = [
  { id: 'Pending', label: 'Pending' },
  { id: 'Confirmed', label: 'Approved' },
  { id: 'Packaging', label: 'Packaging' },
  { id: 'Ready for Shipment', label: 'Ready for Shipment' },
  { id: 'Shipped', label: 'Courier' },
  { id: 'Delivered', label: 'Delivered' }
];

const EXCEPTION_STATUSES = ['Hold', 'Under Review', 'Not Responding', 'Return', 'Cancelled'];

function StatusStepper({ order, onChange }: { order: BookOrder, onChange: (o: BookOrder, s: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const currentIdx = MAIN_STATUSES.findIndex(s => s.id === order.status);
  const isException = EXCEPTION_STATUSES.includes(order.status) || (currentIdx === -1 && order.status);

  return (
    <div className="flex items-center w-full min-w-[200px] gap-2">
      {isException ? (
        <div className="flex-1 flex items-center justify-between bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5">
          <span className="text-[11px] font-bold text-rose-700">{order.status}</span>
        </div>
      ) : (
        <div className="flex items-center flex-1">
          {MAIN_STATUSES.map((step, idx) => {
            const isCompleted = currentIdx >= idx;
            const isCurrent = currentIdx === idx;
            return (
              <React.Fragment key={step.id}>
                <div 
                  onClick={() => onChange(order, step.id)}
                  title={`Mark as ${step.label}`}
                  className={`relative flex items-center justify-center w-4 h-4 rounded-full cursor-pointer transition-all shrink-0 border-2 ${
                    isCurrent ? 'border-teal-600 bg-white ring-2 ring-teal-100 ring-offset-1' :
                    isCompleted ? 'border-teal-600 bg-teal-600' : 
                    'border-slate-200 bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {isCompleted && !isCurrent && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  {isCurrent && <div className="w-1.5 h-1.5 bg-teal-600 rounded-full" />}
                </div>
                {idx < MAIN_STATUSES.length - 1 && (
                  <div className={`h-[3px] flex-1 mx-0.5 rounded-full transition-colors ${
                    currentIdx > idx ? 'bg-teal-600' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
      
      {/* Exception Menu */}
      <div className="relative" ref={menuRef}>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[60]"
            >
               <div className="px-3 pb-2 mb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 Update Status
               </div>
               
               {isException && (
                 <button 
                   onClick={() => { onChange(order, 'Pending'); setShowMenu(false); }}
                   className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                 >
                   <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                   waiting-Reset to
                 </button>
               )}
               {EXCEPTION_STATUSES.map(status => (
                 <button 
                   key={status}
                   onClick={() => { onChange(order, status); setShowMenu(false); }}
                   className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 ${
                     status === 'Cancelled' ? 'text-rose-600 hover:bg-rose-50' : 'text-amber-700 hover:bg-amber-50'
                   }`}
                 >
                   {status === 'Cancelled' ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                   {status === 'Hold'? 'Suspended' : status === 'Under Review'? 'Verification' : status === 'Not Responding'? 'No answer' : status === 'Return'? 'Return' : 'canceled'}
                 </button>
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function OrderManager({
  orders,
  products = [],
  customers = [],
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  onRefreshOrders
}: OrderManagerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'landing' | 'physical' | 'store'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchDialog, setDispatchDialog] = useState<{ orderId: string; message: string; success: boolean } | null>(null);
  const [openActionMenuOrderId, setOpenActionMenuOrderId] = useState<string | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<BookOrder | null>(null);
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState<{ newStatus: string; count: number } | null>(null);
  const [collectDueOrder, setCollectDueOrder] = useState<BookOrder | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectPaymentMethod, setCollectPaymentMethod] = useState<string>('Cash In Delivery');
  const [collectTrxId, setCollectTrxId] = useState<string>('');
  const [collectNote, setCollectNote] = useState<string>('');
  const [invoiceBrand, setInvoiceBrand] = useState({
    name: 'SHOSTIR BAZAR',
    tagline: '',
    phone: '',
    email: '',
    website: '',
    logo: ''
  });

  // Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Print Mode State
  const [activePrintMode, setActivePrintMode] = useState<
    'invoice' | 'stickers' | 'mini-stickers' | 'pos-receipt' | 'packing-slips' | 'pick-list' | 'check-list' | 'commercial' | null
  >(null);
  const [printOrdersList, setPrintOrdersList] = useState<BookOrder[]>([]);

  // Sticker & Label customization state
  const [labelFormat, setLabelFormat] = useState<'Parcel sticker' | 'Mini sticker' | 'POS label'>('Parcel sticker');
  const [labelSize, setLabelSize] = useState<'Courier 4 x 6' | '4 x 4' | '6 x 3'>('Courier 4 x 6');
  const [labelRotation, setLabelRotation] = useState<'0° normal' | '90° rotate'>('0° normal');
  const [showStickerItems, setShowStickerItems] = useState(true);

  // Invoice & Print layout customization state (matching screenshots)
  const [invoiceFormat, setInvoiceFormat] = useState<'Invoice, style 2' | 'Packing slip' | 'POS receipt'>('Invoice, style 2');
  const [invoicePerSheet, setInvoicePerSheet] = useState<'1 invoice' | '2 invoices' | '3 invoices'>('2 invoices');
  const [invoicePaperSize, setInvoicePaperSize] = useState<'Thermal 80mm' | 'Thermal 58mm' | 'A4' | 'A5'>('Thermal 80mm');
  const [showInvoiceImages, setShowInvoiceImages] = useState(false);
  const [isOfficeCopy, setIsOfficeCopy] = useState(false);
  const [quickOrderLookupNumber, setQuickOrderLookupNumber] = useState('');

  // Modals
  const [isExportColumnsModalOpen, setIsExportColumnsModalOpen] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>(
    DEFAULT_EXPORT_COLUMNS.map(c => c.id)
  );

  const [isImportCourierModalOpen, setIsImportCourierModalOpen] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  
  const [isBulkSmsModalOpen, setIsBulkSmsModalOpen] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState('Your order has been successfully received. Shipping on cash-on-delivery by courier soon. Thank you!');
  const [sendingSms, setSendingSms] = useState(false);

  // Customer Courier Delivery Ratio & Fraud Check Modal
  const [ratioModal, setRatioModal] = useState<{
    isOpen: boolean;
    customerName: string;
    phone: string;
    ratio: CustomerCourierRatio | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    customerName: '',
    phone: '',
    ratio: null,
    isLoading: false
  });

  // Moderator / Staff list for Order Assignment
  const [staffList, setStaffList] = useState<ModeratorUser[]>([]);

  useEffect(() => {
    dbService.getModerators().then(setStaffList).catch(() => {});
    const handleModsUpdate = (e: any) => {
      if (Array.isArray(e.detail)) setStaffList(e.detail);
    };
    window.addEventListener('moderators-updated', handleModsUpdate);
    return () => window.removeEventListener('moderators-updated', handleModsUpdate);
  }, []);

  const handleOpenRatioModal = async (phone: string, customerName?: string, forceRefresh: boolean = false) => {
    if (!phone) return;
    setRatioModal({
      isOpen: true,
      customerName: customerName || 'Customer',
      phone,
      ratio: null,
      isLoading: true
    });

    try {
      const res = await checkCustomerCourierRatio(phone, orders, forceRefresh);
      setRatioModal(prev => ({
        ...prev,
        ratio: res,
        isLoading: false
      }));
    } catch (err) {
      console.error('Failed to load courier ratio:', err);
      setRatioModal(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  };
  const [bulkCourierConfirm, setBulkCourierConfirm] = useState<{
    isOpen: boolean;
    provider: 'steadfast' | 'pathao';
    providerName: string;
    count: number;
  }>({
    isOpen: false,
    provider: 'steadfast',
    providerName: 'Steadfast',
    count: 0
  });

  // Add Physical Order Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    productTitle: '',
    price: 0,
    deliveryCharge: 0,
    quantity: 1,
    orderType: 'physical' as 'physical' | 'landing' | 'store',
    status: 'Confirmed' as BookOrder['status'],
    notes: ''
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<BookOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<BookOrder | null>(null);
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    productTitle: '',
    price: 0,
    quantity: 1,
    deliveryCharge: 0,
    couponCode: '',
    luckyCouponCode: '',
    discountAmount: 0,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-order-actions]')) {
        setOpenActionMenuOrderId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadInvoiceBrand = async () => {
      try {
        const [ecomSettings, instituteInfo] = await Promise.all([
          dbService.getEcomSettings(),
          dbService.getInstituteInfo()
        ]);

        if (!mounted) return;

        const rawDomain = ecomSettings?.storeDomain || instituteInfo?.website || '';
        const cleanWebsite = rawDomain ? rawDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

        setInvoiceBrand({
          name: ecomSettings?.storeName || instituteInfo?.name || 'SHOSTIR BAZAR',
          tagline: ecomSettings?.storeTagline || instituteInfo?.description || '',
          phone: instituteInfo?.phone || ecomSettings?.supportPhone || '',
          email: instituteInfo?.email || ecomSettings?.supportEmail || '',
          website: cleanWebsite,
          logo: ecomSettings?.storeLogo || instituteInfo?.logo || ''
        });
      } catch (err) {
        console.warn('Failed to load invoice brand data:', err);
      }
    };

    loadInvoiceBrand();
    return () => {
      mounted = false;
    };
  }, []);

  const calculateOrderTotal = (price: number, quantity: number, deliveryCharge: number, discountAmount: number) => {
    const subtotal = Math.max(0, price) * Math.max(1, quantity);
    return Math.max(0, subtotal + Math.max(0, deliveryCharge) - Math.max(0, discountAmount));
  };

  const openEditOrder = (order: BookOrder) => {
    setEditingOrder(order);
    setEditFormData({
      customerName: order.customerName || '',
      phone: order.phone || '',
      address: order.address || '',
      productTitle: order.productTitle || '',
      price: order.price || 0,
      quantity: order.quantity || 1,
      deliveryCharge: order.deliveryCharge || 0,
      couponCode: order.couponCode || '',
      luckyCouponCode: order.luckyCouponCode || '',
      discountAmount: order.discountAmount || 0,
      orderType: order.orderType || 'physical',
      status: order.status || 'Confirmed',
      notes: order.notes || ''
    } as any);
    setViewingOrder(null);
    setIsEditModalOpen(true);
  };

  const closeEditOrder = () => {
    setIsEditModalOpen(false);
    setEditingOrder(null);
  };

  const handleSaveOrderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setIsSubmitting(true);
    try {
      const discountAmount = Math.max(0, Number(editFormData.discountAmount) || 0);
      const totalPrice = calculateOrderTotal(
        Number(editFormData.price) || 0,
        Number(editFormData.quantity) || 1,
        Number(editFormData.deliveryCharge) || 0,
        discountAmount
      );

      const updatedOrder: BookOrder = {
        ...editingOrder,
        customerName: (editFormData.customerName || '').trim(),
        phone: (editFormData.phone || '').trim(),
        address: (editFormData.address || '').trim(),
        productTitle: (editFormData.productTitle || '').trim() || editingOrder.productTitle,
        price: Number(editFormData.price) || 0,
        quantity: Math.max(1, Number(editFormData.quantity) || 1),
        deliveryCharge: Number(editFormData.deliveryCharge) || 0,
        couponCode: (editFormData.couponCode || '').trim() || undefined,
        luckyCouponCode: (editFormData.luckyCouponCode || '').trim() || undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        totalPrice,
        notes: (editFormData.notes || '').trim() || undefined
      };

      await onUpdateOrder(updatedOrder);
      closeEditOrder();
    } catch (err) {
      console.error('Update order error:', err);
      alert('There was a problem updating the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.luckyCouponCode && order.luckyCouponCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.address && order.address.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || order.orderType === typeFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  // Selected orders array
  const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));

  // Metrics
  const totalOrders = orders.length;
  const landingCount = orders.filter(o => o.orderType === 'landing').length;
  const physicalCount = orders.filter(o => o.orderType === 'physical').length;
  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const totalRevenue = orders
    .filter(o => o.status === 'Delivered' || o.status === 'Confirmed' || o.status === 'Shipped')
    .reduce((sum, o) => sum + (o.totalPrice || 580), 0);

  // Handlers for Checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleStatusChange = async (order: BookOrder, newStatus: BookOrder['status']) => {
    const updated = { ...order, status: newStatus };
    await onUpdateOrder(updated);
  };

  // Bulk Status Update Action
  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one order.');
      return;
    }
    setBulkStatusConfirm({ newStatus, count: selectedOrderIds.length });
  };

  const confirmBulkStatusChange = async () => {
    if (!bulkStatusConfirm) return;
    const { newStatus } = bulkStatusConfirm;
    const idsToUpdate = [...selectedOrderIds];
    setBulkStatusConfirm(null);

    for (const orderId of idsToUpdate) {
      const target = orders.find(o => o.id === orderId);
      if (target) {
        await onUpdateOrder({ ...target, status: newStatus as any });
      }
    }

    setIsActionsMenuOpen(false);
  };


  // Dispatch to Steadfast Courier
  const handleSteadfastDispatch = async (order: BookOrder) => {
    setDispatchingId(order.id);
    setOpenActionMenuOrderId(null);
    try {
      const result = await dbService.sendToSteadfastCourier(order);
      if (result.success && result.trackingCode) {
        onUpdateOrder({
          ...order,
          status: 'Shipped',
          courierProvider: 'steadfast',
          steadfastTrackingCode: result.trackingCode,
          steadfastStatus: 'In Transit'
        });
      }
      setDispatchDialog({
        orderId: order.id,
        message: result.message || 'Parcel entry has been successfully made to Steadfast Courier!',
        success: result.success
      });
    } catch (err: any) {
      console.error('Steadfast dispatch error:', err);
      setDispatchDialog({
        orderId: order.id,
        message: err?.message || 'There is a problem with courier booking',
        success: false
      });
    } finally {
      setDispatchingId(null);
    }
  };

  // Dispatch to Pathao Courier
  const handlePathaoDispatch = async (order: BookOrder) => {
    setDispatchingId(order.id);
    setOpenActionMenuOrderId(null);
    try {
      const result = await dbService.sendToPathaoCourier(order);
      if (result.success && result.consignmentId) {
        onUpdateOrder({
          ...order,
          status: 'Shipped',
          courierProvider: 'pathao',
          pathaoConsignmentId: result.consignmentId,
          pathaoTrackingCode: result.trackingCode || result.consignmentId,
          pathaoStatus: result.orderStatus || 'Pending',
          pathaoDeliveryFee: result.deliveryFee
        });
      }
      setDispatchDialog({
        orderId: order.id,
        message: result.message || `send courierE successfulBooking done! (Consignment: ${result.consignmentId})`,
        success: result.success
      });
    } catch (err: any) {
      console.error('Pathao dispatch error:', err);
      setDispatchDialog({
        orderId: order.id,
        message: err?.message || 'There is a problem with the booking of Pathao Courier',
        success: false
      });
    } finally {
      setDispatchingId(null);
    }
  };

  const handleBulkTransferToCourier = (provider: 'steadfast' | 'pathao' = 'steadfast') => {
    if (selectedOrderIds.length === 0) {
      return;
    }

    const providerName = provider === 'pathao'? 'Send it' : 'Steadfast';
    setBulkCourierConfirm({
      isOpen: true,
      provider,
      providerName,
      count: selectedOrderIds.length
    });
  };

  const handleExecuteBulkTransfer = async () => {
    const { provider, providerName } = bulkCourierConfirm;
    setBulkCourierConfirm(prev => ({ ...prev, isOpen: false }));

    let successCount = 0;
    for (const id of selectedOrderIds) {
      const target = orders.find(o => o.id === id);
      if (target) {
        try {
          if (provider === 'pathao') {
            const res = await dbService.sendToPathaoCourier(target);
            if (res.success && res.consignmentId) {
              await onUpdateOrder({
                ...target,
                status: 'Shipped',
                courierProvider: 'pathao',
                pathaoConsignmentId: res.consignmentId,
                pathaoTrackingCode: res.trackingCode || res.consignmentId,
                pathaoStatus: res.orderStatus || 'Pending',
                pathaoDeliveryFee: res.deliveryFee
              });
              successCount++;
            }
          } else {
            const res = await dbService.sendToSteadfastCourier(target);
            if (res.success && res.trackingCode) {
              await onUpdateOrder({ 
                ...target, 
                status: 'Shipped', 
                courierProvider: 'steadfast',
                steadfastTrackingCode: res.trackingCode,
                steadfastStatus: 'In Transit'
              });
              successCount++;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    setIsActionsMenuOpen(false);
  };

  const handleDeleteOrderClick = (order: BookOrder) => {
    setOpenActionMenuOrderId(null);
    setDeleteConfirmOrder(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    const target = deleteConfirmOrder;
    setDeleteConfirmOrder(null);
    await onDeleteOrder(target.id);
  };

  const handleSyncCourier = async () => {
    const candidates = orders.filter(order =>
      (order.steadfastTrackingCode || order.pathaoConsignmentId) && 
      (selectedOrderIds.length === 0 || selectedOrderIds.includes(order.id))
    );
    if (candidates.length === 0) {
      alert('Could not find Steadfast or Pathao tracking code to sync.');
      return;
    }

    let successCount = 0;
    for (const order of candidates) {
      try {
        if (order.pathaoConsignmentId) {
          const result = await ApiClient.getPathaoStatus(order.pathaoConsignmentId);
          const normalized = (result.status || '').toLowerCase();
          const status = normalized.includes('delivered')
            ? 'Delivered'
            : (normalized.includes('cancelled') || normalized.includes('returned'))
              ? 'Return'
              : order.status;
          await onUpdateOrder({ ...order, status, pathaoStatus: result.status });
          successCount++;
        } else if (order.steadfastTrackingCode) {
          const result = await ApiClient.getSteadfastStatus(order.steadfastTrackingCode);
          const normalized = result.status.toLowerCase();
          const status = normalized === 'delivered'
            ? 'Delivered'
            : normalized.includes('cancelled')
              ? 'Cancelled'
              : order.status;
          await onUpdateOrder({ ...order, status, steadfastStatus: result.status });
          successCount++;
        }
      } catch (error) {
        console.error(`Courier sync failed for ${order.id}:`, error);
      }
    }
    setIsActionsMenuOpen(false);
    alert(`${successCount} / ${candidates.length} T the courier Status successfulway synced।`);
  };

  // Export as Steadfast Bulk CSV Format
  const exportSteadfastCSV = () => {
    const list = selectedOrders.length > 0 ? selectedOrders : filteredOrders;
    if (list.length === 0) {
      alert('There are no orders to export.');
      return;
    }

    const headers = ['Invoice', 'Name', 'Contact', 'Address', 'Amount', 'Note'];
    const rows = list.map(o => [
      `"${o.id || ''}"`,
      `"${String(o.customerName || o.name || '').replace(/"/g, '""')}"`,
      `"${String(o.phone || '').replace(/"/g, '""')}"`,
      `"${String(o.address || '').replace(/"/g, '""')}"`,
      `"${Number(o.totalPrice ?? o.totalAmount ?? (Number(o.price || 0) * Number(o.quantity || 1) + Number(o.deliveryCharge || 0))) || 0}"`,
      `"${(String(o.productTitle || o.productName || 'Item') + ' x' + (o.quantity || 1)).replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Steadfast_Bulk_Upload_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  // Export as Pathao Bulk CSV Format
  const exportPathaoCSV = () => {
    const list = selectedOrders.length > 0 ? selectedOrders : filteredOrders;
    if (list.length === 0) {
      alert('There are no orders to export.');
      return;
    }

    const headers = [
      'Item Type', 'Delivery Type', 'Item Quantity', 'Recipient Name', 
      'Recipient Phone', 'Recipient Address', 'Recipient City', 'Recipient Zone', 
      'Amount to Collect', 'Item Description'
    ];

    const rows = list.map(o => [
      '"PARCEL"',
      '"NORMAL"',
      `"${o.quantity || 1}"`,
      `"${String(o.customerName || o.name || '').replace(/"/g, '""')}"`,
      `"${String(o.phone || '').replace(/"/g, '""')}"`,
      `"${String(o.address || '').replace(/"/g, '""')}"`,
      `"${String(o.district || 'Dhaka').replace(/"/g, '""')}"`,
      `"${String(o.thana || 'Dhaka').replace(/"/g, '""')}"`,
      `"${Number(o.totalPrice ?? o.totalAmount ?? (Number(o.price || 0) * Number(o.quantity || 1) + Number(o.deliveryCharge || 0))) || 0}"`,
      `"${(String(o.productTitle || o.productName || 'Order') + ' - ' + (o.id || '')).replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pathao_Bulk_Upload_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  // Custom Columns Export (Screenshot 5)
  const handleDownloadCustomColumnsCSV = () => {
    const list = selectedOrders.length > 0 ? selectedOrders : filteredOrders;
    if (list.length === 0) {
      alert('There are no orders to export.');
      return;
    }

    const cols = DEFAULT_EXPORT_COLUMNS.filter(c => selectedExportColumns.includes(c.id));
    const headers = cols.map(c => c.label);

    const rows = list.map(o => {
      return cols.map(c => {
        let val = '';
        switch (c.id) {
          case 'id': val = o.id; break;
          case 'customerName': val = o.customerName; break;
          case 'phone': val = o.phone; break;
          case 'address': val = o.address; break;
          case 'status': val = o.status; break;
          case 'channel': val = o.orderType; break;
          case 'shopId': val = 'SHOP-01'; break;
          case 'supplierIds': val = 'SUP-01'; break;
          case 'resellerId': val = '-'; break;
          case 'attributionId': val = '-'; break;
          case 'affiliateCode': val = o.couponCode || '-'; break;
          case 'net': val = String(o.price * o.quantity); break;
          case 'logistics': val = o.steadfastTrackingCode ? 'Steadfast' : 'Courier'; break;
          case 'logisticsCharge': val = String(o.deliveryCharge); break;
          case 'total': val = String(o.totalPrice); break;
          case 'rEarn': val = '0'; break;
          case 'resell': val = 'No'; break;
          case 'paid': val = isOrderPaid(o) ? String(o.totalPrice || 0) : '0'; break;
          case 'due': val = !isOrderPaid(o) ? String(o.totalPrice || 0) : '0'; break;
          case 'rDue': val = '0'; break;
          case 'profit': val = String(Math.round(o.totalPrice * 0.4)); break;
          case 'created': val = new Date(o.createdAt).toLocaleDateString('en-US'); break;
          case 'logisticsNote': val = o.notes || '-'; break;
          case 'contactName': val = o.customerName; break;
          case 'contactPhone': val = o.phone; break;
          default: val = '';
        }
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Orders_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExportColumnsModalOpen(false);
  };

  // Open Print Mode with selected or single order
  const handleOpenPrintView = (
    mode: 'invoice' | 'stickers' | 'mini-stickers' | 'pos-receipt' | 'packing-slips' | 'pick-list' | 'check-list' | 'commercial',
    singleOrder?: BookOrder
  ) => {
    if (singleOrder) {
      setPrintOrdersList([singleOrder]);
    } else if (selectedOrders.length > 0) {
      setPrintOrdersList(selectedOrders);
    } else {
      setPrintOrdersList(filteredOrders.slice(0, 10));
    }
    if (mode === 'mini-stickers') {
      setInvoiceFormat('Invoice, style 2');
    } else if (mode === 'pos-receipt') {
      setInvoiceFormat('POS receipt');
    } else if (mode === 'packing-slips') {
      setInvoiceFormat('Packing slip');
    } else {
      setInvoiceFormat('Invoice, style 2');
    }
    setActivePrintMode(mode);
    setIsActionsMenuOpen(false);
  };

  // Create Physical Order Submit
  const handleCreatePhysicalOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone) return;

    setIsSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const num = orders.length + 1001;
      const sub = formData.price * formData.quantity;
      const tot = sub + formData.deliveryCharge;

      const newOrder: BookOrder = {
        id: `ORD-${year}-${num}`,
        customerName: formData.customerName.trim(),
        name: formData.customerName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || 'Buy directly from the showroom',
        productTitle: formData.productTitle,
        productName: formData.productTitle,
        price: formData.price,
        deliveryCharge: formData.deliveryCharge,
        quantity: formData.quantity,
        totalPrice: tot,
        totalAmount: tot,
        orderType: formData.orderType,
        status: formData.status,
        createdAt: new Date().toISOString(),
        notes: formData.notes
      };

      await onAddOrder(newOrder);
      setIsAddModalOpen(false);
      setFormData({
        customerName: '',
        phone: '',
        address: '',
        productTitle: '',
        price: 0,
        deliveryCharge: 0,
        quantity: 1,
        orderType: 'physical',
        status: 'Confirmed',
        notes: ''
      });
    } catch (err) {
      console.error('Add order error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import Courier File CSV Parser
  const handleImportCourierCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setImportStatusMessage('No sufficient data found in CSV file.');
        return;
      }

      let updatedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length >= 2) {
          const idOrPhone = parts[0];
          const trackingOrStatus = parts[1];

          const match = orders.find(o => o.id === idOrPhone || o.phone === idOrPhone);
          if (match) {
            await onUpdateOrder({
              ...match,
              steadfastTrackingCode: trackingOrStatus.startsWith('CID') || trackingOrStatus.startsWith('ST') 
                ? trackingOrStatus 
                : match.steadfastTrackingCode,
              status: trackingOrStatus.toLowerCase().includes('deliver') ? 'Delivered' : match.status
            });
            updatedCount++;
          }
        }
      }

      setImportStatusMessage(`${updatedCount} T order successfulway has been updated!`);
    };
    reader.readAsText(file);
  };

  // Send Bulk SMS Handler
  const handleSendBulkSms = async () => {
    if (selectedOrderIds.length === 0) {
      alert('Please select at least one recipient.');
      return;
    }
    const recipients = orders
      .filter(o => selectedOrderIds.includes(o.id) && o.phone)
      .map(o => o.phone.trim());

    if (recipients.length === 0) {
      alert('None of the selected orders have a valid phone number.');
      return;
    }

    setSendingSms(true);
    try {
      const res = await ApiClient.sendBulkSms(recipients, smsTemplate);
      setSendingSms(false);
      setIsBulkSmsModalOpen(false);
      if (res && res.success) {
        alert(`${recipients.length} জন গ্রাহকের নম্বরে সফলভাবে SMS পাঠানো সম্পন্ন হয়েছে!`);
      } else {
        alert(`SMS সম্পন্ন হয়েছে (${recipients.length} recipients)`);
      }
    } catch (err: any) {
      setSendingSms(false);
      alert(`SMS পাঠাতে ত্রুটি হয়েছে: ${err.message || 'Error'}`);
    }
  };

  // IF PRINT MODE IS ACTIVE: Render dedicated Printable Pages (Matching Screenshots 1, 2, 3)
  if (activePrintMode) {
    const isInvoiceOrSlip = activePrintMode === 'invoice' || activePrintMode === 'packing-slips';
    const isStickerMode = activePrintMode === 'stickers' || activePrintMode === 'mini-stickers';

    // Handle Quick Order search input "Open" in print view
    const handleQuickOpenOrder = () => {
      const q = quickOrderLookupNumber.trim().toLowerCase();
      if (!q) return;
      const found = orders.find(o => 
        o.id.toLowerCase().includes(q) || 
        o.phone.includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q))
      );
      if (found) {
        if (!printOrdersList.some(p => p.id === found.id)) {
          setPrintOrdersList([found, ...printOrdersList]);
        }
        if (!selectedOrderIds.includes(found.id)) {
          setSelectedOrderIds(prev => [found.id, ...prev]);
        }
        setQuickOrderLookupNumber('');
      } else {
        alert(`Order "${quickOrderLookupNumber}" not found.`);
      }
    };

    return (
      <div className="bg-slate-100 min-h-screen p-4 sm:p-8 font-sans">
        {/* Print Overlay Controls Bar - Pixel-matched to Screenshots */}
        <div className="max-w-6xl mx-auto mb-6 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 print:hidden space-y-3">
          
          {/* Top Title & Page Count */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline space-x-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isStickerMode 
                  ? (labelFormat === 'Parcel sticker' ? 'Parcel stickers' : labelFormat === 'Mini sticker' ? 'Mini stickers' : 'POS labels')
                  : 'Print invoices'}
              </h2>
              <span className="text-sm font-semibold text-slate-400">
                {printOrdersList.length}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActivePrintMode(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Orders
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium -mt-1">
            {Math.ceil(printOrdersList.length / (invoicePerSheet === '1 invoice' ? 1 : invoicePerSheet === '3 invoices' ? 3 : 2))} pages to print
          </div>

          {/* Controls Row: Order number input, Format, Per page / Paper size, Toggles */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            
            {/* Order number lookup input */}
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Order number"
                value={quickOrderLookupNumber}
                onChange={(e) => setQuickOrderLookupNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickOpenOrder()}
                className="w-36 sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={handleQuickOpenOrder}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Open
            </button>

            <button
              onClick={() => {
                setSelectedOrderIds([]);
                setPrintOrdersList([]);
              }}
              className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Clear selection
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* If Invoices/Slips Mode */}
            {isInvoiceOrSlip && (
              <>
                {/* Format Dropdown */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Format</span>
                  <select
                    value={invoiceFormat}
                    onChange={(e) => setInvoiceFormat(e.target.value as any)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Invoice, style 2">Invoice, style 2</option>
                    <option value="Packing slip">Packing slip</option>
                    <option value="POS receipt">POS receipt</option>
                  </select>
                </div>

                {/* Per page OR Paper size dropdown */}
                {invoiceFormat === 'POS receipt' ? (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Paper size</span>
                    <select
                      value={invoicePaperSize}
                      onChange={(e) => setInvoicePaperSize(e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="Thermal 80mm">Thermal 80mm</option>
                      <option value="Thermal 58mm">Thermal 58mm</option>
                      <option value="A4">A4</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Per page</span>
                    <select
                      value={invoicePerSheet}
                      onChange={(e) => setInvoicePerSheet(e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="1 invoice">1 invoice</option>
                      <option value="2 invoices">2 invoices</option>
                      <option value="3 invoices">3 invoices</option>
                    </select>
                  </div>
                )}

                {/* Images toggle */}
                <button
                  type="button"
                  onClick={() => setShowInvoiceImages(!showInvoiceImages)}
                  className={`mt-4 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    showInvoiceImages 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Images
                </button>

                {/* Office copy toggle */}
                <button
                  type="button"
                  onClick={() => setIsOfficeCopy(!isOfficeCopy)}
                  className={`mt-4 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isOfficeCopy 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Office copy
                </button>
              </>
            )}

            {/* If Stickers Mode */}
            {isStickerMode && (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Format</span>
                  <select
                    value={labelFormat}
                    onChange={(e) => setLabelFormat(e.target.value as any)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Parcel sticker">Parcel sticker</option>
                    <option value="Mini sticker">Mini sticker</option>
                    <option value="POS label">POS label</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Label size</span>
                  <select
                    value={labelSize}
                    onChange={(e) => setLabelSize(e.target.value as any)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Courier 4 x 6">4 x 6</option>
                    <option value="4 x 4">4 x 4</option>
                    <option value="6 x 3">6 x 3</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Rotation</span>
                  <select
                    value={labelRotation}
                    onChange={(e) => setLabelRotation(e.target.value as any)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="0° normal">0° normal</option>
                    <option value="90° rotate">90° rotate</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStickerItems(!showStickerItems)}
                  className={`mt-4 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    showStickerItems
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Show items
                </button>
              </>
            )}

          </div>
        </div>

        {/* --- DYNAMIC RENDER OF THE 3 INVOICE FORMATS (Matching user screenshots) --- */}
        {isInvoiceOrSlip && (
          <div className="max-w-5xl mx-auto space-y-6">

            {/* FORMAT 1: Invoice, style 2 (Screenshot 1) */}
            {invoiceFormat === 'Invoice, style 2' && (
              <div className="space-y-6">
                {printOrdersList.map((ord) => {
                  const orderDate = new Date(ord.createdAt);
                  const formattedDate = orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) + ', ' + orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  const orderNum = ord.id.replace(/^ORD-202[0-9]-/, '').replace(/^ORD-/, '');
                  const isPaid = isOrderPaid(ord);

                  const itemsList = (ord.items && ord.items.length > 0) ? ord.items : [];
                  const subtotal = itemsList.length > 0
                    ? itemsList.reduce((sum: number, it: any) => sum + ((it.variant?.price || it.product?.price || it.price || 0) * (it.quantity || 1)), 0)
                    : ((ord.price || 0) * (ord.quantity || 1));
                  const delivery = ord.deliveryCharge || 0;
                  const total = ord.totalPrice || ord.totalAmount || (subtotal + delivery);
                  const paid = isPaid ? total : 0;
                  const balanceDue = isPaid ? 0 : total;

                  const trackingCode = ord.pathaoConsignmentId || ord.steadfastTrackingCode || `DL${orderNum}T8L8Y`;
                  const courierLabel = ord.pathaoConsignmentId 
                    ? `Pathao (inactive) - ${ord.deliveryZone || 'Inside Dhaka'}`
                    : ord.steadfastTrackingCode 
                      ? `Steadfast - ${ord.deliveryZone || 'Inside Dhaka'}`
                      : (ord.deliveryZone || 'Inside Dhaka');

                  const storeDomain = invoiceBrand.website || 'livewellfresh.com';
                  const storeBrandName = invoiceBrand.name.toLowerCase().replace(/\s+/g, '') || 'livewellfresh';

                  return (
                    <div 
                      key={ord.id}
                      className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-7 shadow-sm text-slate-900 font-sans page-break-after print:shadow-none print:border-slate-800"
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-wrap justify-between items-start border-b border-slate-200 pb-4 gap-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center tracking-tight">
                            {storeBrandName.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-extrabold text-sm text-slate-900">{storeBrandName}</h3>
                              <span className="text-slate-400 text-xs">·</span>
                              <span className="text-xs font-semibold text-slate-600">
                                {isOfficeCopy ? 'Invoice (Office Copy)' : 'Invoice'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Bangladesh · {invoiceBrand.phone || '01733917502'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">INV</span>
                            <span className="text-sm font-extrabold text-slate-900 block mt-0.5">#{orderNum}</span>
                          </div>
                          <div className="w-36 text-right">
                            <BarcodeSVG value={trackingCode} height={28} />
                            <span className="text-[10px] font-mono font-bold text-slate-600 block mt-0.5">TRK {trackingCode}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bill To & Meta Row */}
                      <div className="py-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-baseline space-x-2">
                            <span className="text-slate-400 font-medium">Bill To:</span>
                            <span className="font-extrabold text-slate-900">{ord.customerName}</span>
                            <span className="text-slate-400">·</span>
                            <span className="font-bold font-mono text-slate-900">{ord.phone}</span>
                          </div>
                          <p className="text-slate-600 leading-snug text-[11px]">{ord.address}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                          <div>
                            <span className="text-slate-400 font-medium block">Date</span>
                            <span className="font-bold text-slate-800 block">{formattedDate}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Payment</span>
                            <span className="font-bold text-slate-800 block">{ord.paymentMethod || 'COD'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Courier</span>
                            <span className="font-bold text-slate-800 truncate block">{courierLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Status</span>
                            <span className="font-bold text-slate-800 block">
                              {isPaid ? 'Paid' : `COD (${itemsList.length || ord.quantity || 1})`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div className="py-4 border-b border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-400 font-semibold border-b border-slate-100 pb-2">
                              <th className="w-10 pb-2">#</th>
                              <th className="pb-2">Item Description</th>
                              <th className="text-right w-24 pb-2">Rate</th>
                              <th className="text-center w-16 pb-2">Qty</th>
                              <th className="text-right w-28 pb-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {itemsList.length > 0 ? (
                              itemsList.map((it: any, idx: number) => {
                                const rate = it.variant?.price || it.product?.price || it.price || 0;
                                const qty = it.quantity || 1;
                                const sku = it.product?.sku || it.sku || `SKU:${orderNum}`;
                                const title = it.product?.title || it.title || 'Product';
                                return (
                                  <tr key={idx} className="font-medium text-slate-800">
                                    <td className="py-2.5 font-mono text-slate-400">0{idx + 1}</td>
                                    <td className="py-2.5">
                                      <div className="flex items-center space-x-2">
                                        {showInvoiceImages && it.product?.image && (
                                          <img src={it.product.image} alt={title} className="w-8 h-8 rounded object-cover border border-slate-100" />
                                        )}
                                        <span>
                                          <span className="font-bold text-slate-900">{title}</span>
                                          <span className="text-slate-400 text-[11px] font-mono ml-1.5">(SKU:{sku})</span>
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 text-right font-mono">৳ {rate.toLocaleString()}</td>
                                    <td className="py-2.5 text-center font-bold">{qty}</td>
                                    <td className="py-2.5 text-right font-bold font-mono">৳ {(rate * qty).toLocaleString()}</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr className="font-medium text-slate-800">
                                <td className="py-2.5 font-mono text-slate-400">01</td>
                                <td className="py-2.5">
                                  <span className="font-bold text-slate-900">{ord.productTitle || 'Product'}</span>
                                  <span className="text-slate-400 text-[11px] font-mono ml-1.5">(SKU:{orderNum})</span>
                                </td>
                                <td className="py-2.5 text-right font-mono">৳ {(ord.price || 0).toLocaleString()}</td>
                                <td className="py-2.5 text-center font-bold">{ord.quantity || 1}</td>
                                <td className="py-2.5 text-right font-bold font-mono">৳ {subtotal.toLocaleString()}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Bottom Section: QR Feedback Left + Totals Right */}
                      <div className="pt-4 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
                        
                        {/* Feedback QR Box */}
                        <div className="flex items-center space-x-3.5 max-w-sm">
                          <div className="p-1.5 border border-slate-200 rounded-xl bg-white shadow-2xs">
                            <FeedbackQRCodeSVG url={`https://${storeDomain}/review?order=${ord.id}`} size={64} />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 text-xs">
                              আপনার অভিজ্ঞতা কেমন? · Share Feedback
                            </p>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              QR স্ক্যান করে অর্ডার ও পণ্যের রিভিউ দিন।
                            </p>
                            <p className="text-[10px] text-slate-400 pt-0.5">
                              Thank you for shopping with <span className="font-bold text-slate-600">{storeBrandName}</span>
                            </p>
                          </div>
                        </div>

                        {/* Totals & Sign */}
                        <div className="w-full sm:w-64 space-y-1.5 text-slate-600">
                          <div className="flex justify-between">
                            <span>Subtotal ({itemsList.length || ord.quantity || 1} item)</span>
                            <span className="font-bold font-mono text-slate-900">৳ {subtotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delivery</span>
                            <span className="font-bold font-mono text-slate-900">৳ {delivery.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-100">
                            <span>Total</span>
                            <span className="font-mono">৳ {total.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>Paid</span>
                            <span className="font-mono font-medium">৳ {paid.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                            <span>Balance Due (COD)</span>
                            <span className="font-mono">৳ {balanceDue.toLocaleString()}</span>
                          </div>

                          <div className="pt-6 flex justify-end">
                            <div className="text-center">
                              <div className="w-32 border-b border-slate-300 mb-1" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Authorized Sign
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* FORMAT 2: Packing slip (Screenshot 2) */}
            {invoiceFormat === 'Packing slip' && (
              <div className="space-y-6">
                {printOrdersList.map((ord) => {
                  const orderDate = new Date(ord.createdAt);
                  const formattedDate = orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) + ', ' + orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  const orderNum = ord.id.replace(/^ORD-202[0-9]-/, '').replace(/^ORD-/, '');

                  const itemsList = (ord.items && ord.items.length > 0) ? ord.items : [];
                  const totalPcs = itemsList.length > 0 
                    ? itemsList.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0)
                    : (ord.quantity || 1);

                  const trackingCode = ord.pathaoConsignmentId || ord.steadfastTrackingCode || `DL${orderNum}T8L8Y`;
                  const courierLabel = ord.pathaoConsignmentId 
                    ? `Pathao (inactive) - ${ord.deliveryZone || 'Inside Dhaka'}`
                    : ord.steadfastTrackingCode 
                      ? `Steadfast - ${ord.deliveryZone || 'Inside Dhaka'}`
                      : (ord.deliveryZone || 'Inside Dhaka');

                  const storeBrandName = invoiceBrand.name.toLowerCase().replace(/\s+/g, '') || 'livewellfresh';

                  return (
                    <div 
                      key={ord.id}
                      className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-7 shadow-sm text-slate-900 font-sans page-break-after print:shadow-none print:border-slate-800"
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-wrap justify-between items-start border-b border-slate-200 pb-4 gap-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center tracking-tight">
                            {storeBrandName.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-extrabold text-sm text-slate-900">{storeBrandName}</h3>
                              <span className="text-slate-400 text-xs">·</span>
                              <span className="text-xs font-semibold text-slate-600">Packing Slip</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Bangladesh · {invoiceBrand.phone || '01733917502'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">INV</span>
                            <span className="text-sm font-extrabold text-slate-900 block mt-0.5">#{orderNum}</span>
                          </div>
                          <div className="w-36 text-right">
                            <BarcodeSVG value={trackingCode} height={28} />
                            <span className="text-[10px] font-mono font-bold text-slate-600 block mt-0.5">TRK {trackingCode}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bill To & Logistics Row */}
                      <div className="py-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-baseline space-x-2">
                            <span className="text-slate-400 font-medium">Bill To:</span>
                            <span className="font-extrabold text-slate-900">{ord.customerName}</span>
                            <span className="text-slate-400">·</span>
                            <span className="font-bold font-mono text-slate-900">{ord.phone}</span>
                          </div>
                          <p className="text-slate-600 leading-snug text-[11px]">{ord.address}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                          <div>
                            <span className="text-slate-400 font-medium block">Date</span>
                            <span className="font-bold text-slate-800 block">{formattedDate}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Payment</span>
                            <span className="font-bold text-slate-800 block">{ord.paymentMethod || 'COD'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Courier</span>
                            <span className="font-bold text-slate-800 truncate block">{courierLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Items</span>
                            <span className="font-bold text-slate-800 block">{totalPcs} pcs</span>
                          </div>
                        </div>
                      </div>

                      {/* Pick Checklist Table */}
                      <div className="py-4 border-b border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-400 font-semibold border-b border-slate-100 pb-2">
                              <th className="w-14 pb-2">Pick</th>
                              <th className="w-10 pb-2">#</th>
                              <th className="pb-2">Item Description</th>
                              <th className="text-center w-28 pb-2">SKU</th>
                              <th className="text-right w-16 pb-2">Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {itemsList.length > 0 ? (
                              itemsList.map((it: any, idx: number) => {
                                const qty = it.quantity || 1;
                                const sku = it.product?.sku || it.sku || `SKU:${orderNum}`;
                                const title = it.product?.title || it.title || 'Product';
                                return (
                                  <tr key={idx} className="font-medium text-slate-800">
                                    <td className="py-3">
                                      <div className="w-4 h-4 border-2 border-slate-400 rounded cursor-pointer" />
                                    </td>
                                    <td className="py-3 font-mono text-slate-400">0{idx + 1}</td>
                                    <td className="py-3">
                                      <div className="flex items-center space-x-2">
                                        {showInvoiceImages && it.product?.image && (
                                          <img src={it.product.image} alt={title} className="w-8 h-8 rounded object-cover border border-slate-100" />
                                        )}
                                        <span>
                                          <span className="font-bold text-slate-900">{title}</span>
                                          <span className="text-slate-400 text-[11px] font-mono ml-1.5">(SKU:{sku})</span>
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 text-center font-mono font-bold text-slate-700">{sku}</td>
                                    <td className="py-3 text-right font-extrabold text-slate-900 text-sm">{qty}</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr className="font-medium text-slate-800">
                                <td className="py-3">
                                  <div className="w-4 h-4 border-2 border-slate-400 rounded cursor-pointer" />
                                </td>
                                <td className="py-3 font-mono text-slate-400">01</td>
                                <td className="py-3">
                                  <span className="font-bold text-slate-900">{ord.productTitle || 'Product'}</span>
                                  <span className="text-slate-400 text-[11px] font-mono ml-1.5">(SKU:{orderNum})</span>
                                </td>
                                <td className="py-3 text-center font-mono font-bold text-slate-700">hvfx1</td>
                                <td className="py-3 text-right font-extrabold text-slate-900 text-sm">{ord.quantity || 1}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Note and Sign-offs */}
                      <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                        <div className="text-[11px] text-slate-500 font-medium">
                          Verify quantity and variant before sealing the parcel. — <span className="font-bold text-slate-800">{storeBrandName}</span>
                        </div>

                        <div className="flex items-center space-x-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <div className="text-center">
                            <div className="w-20 border-b border-slate-300 mb-1" />
                            <span>Picked by</span>
                          </div>
                          <div className="text-center">
                            <div className="w-20 border-b border-slate-300 mb-1" />
                            <span>Checked by</span>
                          </div>
                          <div className="text-center">
                            <div className="w-20 border-b border-slate-300 mb-1" />
                            <span>Packed by</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* FORMAT 3: POS receipt (Screenshot 3) */}
            {invoiceFormat === 'POS receipt' && (
              <div className="flex flex-wrap justify-center gap-6">
                {printOrdersList.map((ord) => {
                  const orderDate = new Date(ord.createdAt);
                  const formattedDate = orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  const orderNum = ord.id.replace(/^ORD-202[0-9]-/, '').replace(/^ORD-/, '');
                  const isPaid = isOrderPaid(ord);

                  const itemsList = (ord.items && ord.items.length > 0) ? ord.items : [];
                  const subtotal = itemsList.length > 0
                    ? itemsList.reduce((sum: number, it: any) => sum + ((it.variant?.price || it.product?.price || it.price || 0) * (it.quantity || 1)), 0)
                    : ((ord.price || 0) * (ord.quantity || 1));
                  const delivery = ord.deliveryCharge || 0;
                  const total = ord.totalPrice || ord.totalAmount || (subtotal + delivery);
                  const codDue = isPaid ? 0 : total;

                  const trackingCode = ord.pathaoConsignmentId || ord.steadfastTrackingCode || `DL${orderNum}T8L8Y`;
                  const storeDomain = invoiceBrand.website || 'livewellfresh.com';
                  const storeBrandName = invoiceBrand.name.toLowerCase().replace(/\s+/g, '') || 'livewellfresh';

                  const paperWidthClass = invoicePaperSize === 'Thermal 58mm' ? 'max-w-[280px]' : 'max-w-[340px]';

                  return (
                    <div 
                      key={ord.id}
                      className={`bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-md font-sans text-slate-900 page-break-after print:shadow-none print:border-slate-800 w-full ${paperWidthClass}`}
                    >
                      {/* Centered Store Header */}
                      <div className="text-center pb-4 border-b border-slate-100">
                        <h3 className="text-base font-extrabold text-slate-900">{storeBrandName}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Bangladesh</p>
                        <p className="text-[11px] font-mono text-slate-500">{invoiceBrand.phone || '8801635311494'}</p>

                        <div className="w-40 mx-auto mt-3">
                          <BarcodeSVG value={ord.id} height={32} />
                        </div>
                        <span className="text-xs font-black text-slate-900 block mt-1">#{orderNum}</span>
                        <span className="text-[10px] text-slate-400 block">{formattedDate}</span>
                      </div>

                      {/* Recipient Details */}
                      <div className="py-3 border-b border-slate-100 text-xs space-y-0.5">
                        <h4 className="font-bold text-slate-900">{ord.customerName}</h4>
                        <p className="font-mono font-bold text-slate-900">{ord.phone}</p>
                        <p className="text-[11px] text-slate-600 leading-tight pt-0.5">{ord.address}</p>
                        <p className="text-[10px] text-slate-500 font-mono pt-1">Tracking: {trackingCode}</p>
                      </div>

                      {/* Line Items */}
                      <div className="py-3 border-b border-slate-100 text-xs space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Qty × Item</span>
                          <span>Amount</span>
                        </div>
                        {itemsList.length > 0 ? (
                          itemsList.map((it: any, idx: number) => {
                            const rate = it.variant?.price || it.product?.price || it.price || 0;
                            const qty = it.quantity || 1;
                            const title = it.product?.title || it.title || 'Product';
                            const sku = it.product?.sku || it.sku || `hvfx1`;
                            return (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex justify-between items-baseline font-bold text-slate-900">
                                  <span>{qty} × {title}</span>
                                  <span className="font-mono">৳ {(rate * qty).toLocaleString()}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono block">{sku}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex justify-between items-baseline font-bold text-slate-900">
                              <span>{ord.quantity || 1} × {ord.productTitle || 'Product'}</span>
                              <span className="font-mono">৳ {subtotal.toLocaleString()}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">hvfx1</span>
                          </div>
                        )}
                      </div>

                      {/* Subtotal, Shipping, Total, COD DUE */}
                      <div className="py-3 space-y-1 text-xs border-b border-slate-100">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span className="font-mono font-medium text-slate-900">৳ {subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Delivery:</span>
                          <span className="font-mono font-medium text-slate-900">৳ {delivery.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-900 font-extrabold pt-1">
                          <span>Total:</span>
                          <span className="font-mono">৳ {total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 text-sm font-black text-slate-900 bg-slate-50 p-2 rounded-xl mt-1">
                          <span>COD DUE:</span>
                          <span className="text-base font-mono">৳ {codDue.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Feedback QR & Footer */}
                      <div className="pt-4 text-center space-y-2">
                        <div className="flex items-center justify-center space-x-2 text-left">
                          <FeedbackQRCodeSVG url={`https://${storeDomain}/review?order=${ord.id}`} size={48} />
                          <div>
                            <p className="text-[10px] font-bold text-slate-900">আপনার অভিজ্ঞতা কেমন? · Share Feedback</p>
                            <p className="text-[9px] text-slate-500 leading-tight">QR স্ক্যান করে অর্ডার ও পণ্যের রিভিউ দিন।</p>
                          </div>
                        </div>

                        <p className="text-[10px] font-semibold text-slate-500 pt-1">
                          Thank you for your order!
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">
                          www.{storeDomain}
                        </p>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* --- DYNAMIC RENDER OF THE STICKERS VIEW (When activePrintMode === 'stickers' || 'mini-stickers') --- */}
        {isStickerMode && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-wrap justify-center gap-6 print:block print:space-y-4">
              {printOrdersList.map((ord) => {
                const orderDate = new Date(ord.createdAt);
                const dateFormatted = orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                const orderNum = ord.id.replace(/^ORD-202[0-9]-/, '').replace(/^ORD-/, '');
                const isPaid = isOrderPaid(ord);

                const itemsList = (ord.items && ord.items.length > 0) ? ord.items : [];
                const primaryItem = itemsList[0];
                const rawTitle = primaryItem?.product?.title || primaryItem?.title || ord.productTitle || ord.productName || 'Product';
                const cleanTitle = rawTitle.replace(/\s*\(x\d+\)$/i, '').trim();
                const totalQty = itemsList.length > 0 ? itemsList.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) : (ord.quantity || 1);

                const totalAmount = ord.totalPrice || (ord.price ? ord.price * (ord.quantity || 1) + (ord.deliveryCharge || 0) : (ord.totalAmount || 0));
                const deliveryCharge = ord.deliveryCharge || ord.deliveryFee || 0;
                const subtotal = Math.max(0, totalAmount - deliveryCharge);
                const codPayable = isPaid ? 0 : totalAmount;

                const courierName = ord.pathaoConsignmentId 
                  ? `Pathao (inactive) - ${ord.deliveryZone || 'Inside Dhaka'}`
                  : ord.steadfastTrackingCode 
                    ? `Steadfast - ${ord.deliveryZone || 'Inside Dhaka'}`
                    : (ord.deliveryZone || 'Inside Dhaka');

                const trackingCode = ord.pathaoConsignmentId || ord.steadfastTrackingCode || `DL${orderNum}T8L8Y`;

                // Render based on selected Format & Size
                if (labelFormat === 'Parcel sticker') {
                  return (
                    <div 
                      key={ord.id} 
                      className={`bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-md font-sans text-slate-900 page-break-inside-avoid print:shadow-none print:border-slate-800 ${
                        labelRotation === '90° rotate' ? 'rotate-90' : ''
                      } w-full max-w-xl`}
                    >
                      {/* Top Header */}
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parcel Sticker</span>
                          <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">#{orderNum}</h3>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{dateFormatted}</span>
                        </div>
                        <div className="w-40 text-right">
                          <BarcodeSVG value={ord.id} height={38} />
                        </div>
                      </div>

                      {/* Recipient Details */}
                      <div className="py-4 border-b border-slate-100 space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-900">{ord.customerName}</h4>
                        <p className="font-mono font-bold text-slate-900 text-sm tracking-tight">{ord.phone}</p>
                        <p className="text-xs text-slate-600 leading-snug pt-0.5">{ord.address}</p>
                      </div>

                      {/* Courier & COD Payable */}
                      <div className="py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Courier / Tracking</span>
                          <span className="text-xs font-bold text-slate-900 block mt-0.5">{courierName}</span>
                          <span className="text-[11px] font-mono text-slate-500 block">{trackingCode}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {isPaid ? 'Paid' : 'COD Payable'}
                          </span>
                          <span className="text-lg font-extrabold text-slate-900 block mt-0.5">
                            ৳ {codPayable.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Item Details if Show Items enabled */}
                      {showStickerItems && (
                        <div className="pt-3 border-b border-slate-100 pb-3 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Items</span>
                          <div className="text-xs font-bold text-slate-800 flex justify-between">
                            <span>{totalQty} × {cleanTitle}</span>
                            <span>৳ {subtotal.toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 text-[11px] font-semibold text-slate-400">
                        <span>Seller: {invoiceBrand.name.toLowerCase()}</span>
                        <span>{totalQty} item(s)</span>
                      </div>
                    </div>
                  );
                }

                if (labelFormat === 'Mini sticker') {
                  return (
                    <div 
                      key={ord.id} 
                      className={`bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-md font-sans text-slate-900 page-break-inside-avoid print:shadow-none print:border-slate-800 ${
                        labelRotation === '90° rotate' ? 'rotate-90' : ''
                      } w-full max-w-sm`}
                    >
                      {/* Top Header */}
                      <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mini Sticker</span>
                          <h3 className="text-base font-extrabold text-slate-900">#{orderNum}</h3>
                        </div>
                        <div className="w-28 text-right">
                          <BarcodeSVG value={ord.id} height={28} />
                        </div>
                      </div>

                      {/* Recipient Details */}
                      <div className="py-2.5 border-b border-slate-100 space-y-0.5 text-xs">
                        <h4 className="font-extrabold text-slate-900">{ord.customerName}</h4>
                        <p className="font-mono font-bold text-slate-900">{ord.phone}</p>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">{ord.address}</p>
                      </div>

                      {/* Courier & COD Due */}
                      <div className="py-2.5 border-b border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800 text-[11px] block">{courierName}</span>
                          <span className="text-[10px] font-mono text-slate-500 block">{trackingCode}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            {isPaid ? 'Paid' : 'COD Due'}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900 block">
                            ৳ {codPayable.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 text-[10px] font-medium text-slate-400">
                        <span>{invoiceBrand.name.toLowerCase()}</span>
                        <span>{totalQty} item(s)</span>
                      </div>
                    </div>
                  );
                }

                // POS label format (Screenshot 3, 4, 5)
                return (
                  <div 
                    key={ord.id} 
                    className={`bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-md font-sans text-slate-900 page-break-inside-avoid print:shadow-none print:border-slate-800 ${
                      labelRotation === '90° rotate' ? 'rotate-90' : ''
                    } ${labelSize === '6 x 3' ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}
                  >
                    {/* Centered Barcode and Store Header */}
                    <div className="text-center pb-4 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-500 block mb-1">{orderNum}</span>
                      <div className="w-48 mx-auto">
                        <BarcodeSVG value={ord.id} height={34} />
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium block mt-1">by {invoiceBrand.website || invoiceBrand.name.toLowerCase()}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Order ID</span>
                    </div>

                    {/* Customer & Address Details */}
                    <div className="py-4 border-b border-slate-100 space-y-1">
                      <p className="text-base font-extrabold text-slate-900 font-mono tracking-tight">{ord.phone}</p>
                      <h4 className="text-sm font-bold text-slate-800">{ord.customerName}</h4>
                      <p className="text-xs text-slate-600 leading-snug">{ord.address}</p>
                    </div>

                    {/* Courier Line */}
                    <div className="py-3 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900 block">{courierName}</span>
                      <span className="text-[11px] font-mono text-slate-500 block">{trackingCode}</span>
                    </div>

                    {/* Line Items if Show Items is checked */}
                    {showStickerItems && (
                      <div className="py-3 border-b border-slate-100 space-y-1.5">
                        <div className="flex justify-between items-start text-xs font-bold text-slate-800">
                          <div>
                            <span>{totalQty} × {cleanTitle}</span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {primaryItem?.product?.sku || ord.id.split('-').pop()}
                            </span>
                          </div>
                          <span>৳ {subtotal.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Subtotal, Shipping, and COD Due */}
                    <div className="pt-3 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Subtotal:</span>
                        <span>৳ {subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Shipping:</span>
                        <span>৳ {deliveryCharge.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 text-sm font-extrabold text-slate-900 border-t border-slate-100 mt-2">
                        <span>{isPaid ? 'Total Paid:' : 'COD due:'}</span>
                        <span className="text-base font-black">
                          ৳ {codPayable.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- STANDARD MAIN ORDER MANAGEMENT DASHBOARD VIEW ---
  if (viewingOrder) {
    return (
      <OrderDetailsView 
        order={viewingOrder} 
        allOrders={orders}
        onClose={() => setViewingOrder(null)} 
        onUpdateStatus={async (id, newStatus) => {
          await onUpdateOrder({ ...viewingOrder, status: newStatus });
          setViewingOrder({ ...viewingOrder, status: newStatus });
        }}
        onEditOrder={openEditOrder}
      />
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <ShoppingBag className="h-6 w-6 text-teal-600" />
            <span>Orders</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage orders, courier bookings, and print invoices.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onRefreshOrders && (
            <button 
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await onRefreshOrders();
                } finally {
                  setTimeout(() => setIsRefreshing(false), 400);
                }
              }}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
              title="নতুন অর্ডার রিফ্রেশ করুন"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 text-slate-500 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
              <span>{isRefreshing ? 'রিফ্রেশ হচ্ছে...' : 'রিফ্রেশ'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">total order</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{totalOrders}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block">Landing page order</span>
          <span className="text-xl sm:text-2xl font-extrabold text-indigo-600">{landingCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider block">Physical order</span>
          <span className="text-xl sm:text-2xl font-extrabold text-teal-700">{physicalCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">Pending</span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-600">{pendingCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Estimate gross sales</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-700">Tk. {totalRevenue}</span>
        </div>
      </div>

      {/* Selected Items Floating Action Toolbar */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3 text-xs font-bold">
            <span className="bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-lg">
              {selectedOrderIds.length} selected
            </span>
            <span>Order selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Clear selection
            </button>

            {/* Print Parcel Stickers Quick Button */}
            <button
              onClick={() => handleOpenPrintView('stickers')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Stickers</span>
            </button>

            {/* Print Tax Invoices Quick Button */}
            <button
              onClick={() => handleOpenPrintView('invoice')}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Print Invoices</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Controls with Actions & Export Dropdowns */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Customer Name, Mobile or Order ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold w-full md:w-auto shrink-0">
            <button 
              onClick={() => setTypeFilter('all')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              all Type
            </button>
            <button 
              onClick={() => setTypeFilter('landing')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'landing' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Landing ({landingCount})
            </button>
            <button 
              onClick={() => setTypeFilter('physical')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'physical' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Store ({physicalCount})
            </button>
          </div>

          {/* Status Filter */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-40 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="all">All status</option>
            <option value="Pending">waiting</option>
            <option value="Confirmed">allowed</option>
            <option value="Packaging">Packaging</option>
            <option value="Ready for Shipment">Ready for shipment</option>
            <option value="Shipped">by courier</option>
            <option value="Delivered">delivered</option>
            <option value="Hold">adjourned</option>
            <option value="Under Review">verification</option>
            <option value="Not Responding">no response</option>
            <option value="Return">return</option>
            <option value="Cancelled">canceled</option>
          </select>

          {/* BULK ACTIONS DROPDOWN BUTTON (Matching Screenshots) */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => {
                setIsActionsMenuOpen(!isActionsMenuOpen);
                setIsExportMenuOpen(false);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl flex items-center justify-between gap-2 border border-slate-200 transition-colors cursor-pointer"
            >
              <span>Actions</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Actions Menu Popup List (Exact match for Screenshot options) */}
            {isActionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 text-xs font-semibold text-slate-800 space-y-1 max-h-96 overflow-y-auto animate-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                  Bulk Print & Docs
                </div>

                <button
                  onClick={() => handleOpenPrintView('invoice')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Print invoices</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('packing-slips')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span>Print packing slips</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('pos-receipt')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <DollarSign className="h-4 w-4 text-slate-600" />
                  <span>Print POS Receipts</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('stickers')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <Tag className="h-4 w-4 text-slate-600" />
                  <span>Print Parcel Stickers</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('mini-stickers')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <Tag className="h-4 w-4 text-slate-600" />
                  <span>Print Mini Stickers</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('pick-list')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <CheckSquare className="h-4 w-4 text-slate-600" />
                  <span>Pick List</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('check-list')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4 text-slate-600" />
                  <span>Check List</span>
                </button>

                <button
                  onClick={() => handleOpenPrintView('commercial')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span>Commercial / PO Docs</span>
                </button>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 pt-2 border-t border-slate-100">
                  Courier Integration (send it Steadfast)
                </div>

                <button
                  onClick={() => handleBulkTransferToCourier('pathao')}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-800 rounded-xl flex items-center space-x-2 cursor-pointer font-bold"
                >
                  <Send className="h-4 w-4 text-red-600" />
                  <span>Send to Pathaosend</span>
                </button>

                <button
                  onClick={() => handleBulkTransferToCourier('steadfast')}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50 text-amber-800 rounded-xl flex items-center space-x-2 cursor-pointer font-bold"
                >
                  <Truck className="h-4 w-4 text-amber-600" />
                  <span>Send to SteadfastSteadfast</span>
                </button>

                <button
                  onClick={handleSyncCourier}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer font-semibold"
                >
                  <RefreshCw className="h-4 w-4 text-teal-600" />
                  <span>Sync courier status</span>
                </button>

                <button
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setIsImportCourierModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <Upload className="h-4 w-4 text-slate-600" />
                  <span>Import courier file</span>
                </button>

                <button
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setIsBulkSmsModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4 text-slate-600" />
                  <span>Send Bulk SMS</span>
                </button>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 pt-2 border-t border-slate-100">
                  Update Status
                </div>

                <button onClick={() => handleBulkStatusChange('Confirmed')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Mark Confirmed</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Packaging')} className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-indigo-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Package className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Mark Packaging</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Ready for Shipment')} className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-indigo-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Truck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Mark Ready for Shipment</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Shipped')} className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-purple-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Truck className="h-3.5 w-3.5 text-purple-600" />
                  <span>Mark Shipping</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Delivered')} className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Mark Delivered</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Hold')} className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Mark Hold</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Under Review')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <Search className="h-3.5 w-3.5 text-slate-600" />
                  <span>Mark Under Review</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Not Responding')} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-800 rounded-lg flex items-center space-x-2 cursor-pointer font-semibold">
                  <Phone className="h-3.5 w-3.5 text-rose-600" />
                  <span>Mark Not Responding</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Return')} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5 text-rose-600" />
                  <span>Mark Return</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Cancelled')} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-800 rounded-lg flex items-center space-x-2 cursor-pointer font-bold">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>Mark Canceled</span>
                </button>

                <button onClick={() => handleBulkStatusChange('Pending')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-800 rounded-lg flex items-center space-x-2 cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                  <span>Reset to Placed</span>
                </button>
              </div>
            )}
          </div>

          {/* EXPORT BULK COURIER CSV BUTTON */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => {
                setIsExportMenuOpen(!isExportMenuOpen);
                setIsActionsMenuOpen(false);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-between gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Courier Bulk CSV</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 text-xs font-semibold text-slate-800 space-y-1 animate-in zoom-in-95 duration-150">
                <button
                  onClick={exportSteadfastCSV}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-900 rounded-xl flex items-center space-x-2 cursor-pointer font-bold"
                >
                  <Download className="h-4 w-4 text-emerald-600" />
                  <span>Steadfast Bulk Upload CSV</span>
                </button>

                <button
                  onClick={exportPathaoCSV}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 text-teal-900 rounded-xl flex items-center space-x-2 cursor-pointer font-bold"
                >
                  <Download className="h-4 w-4 text-teal-600" />
                  <span>Pathao Courier Bulk CSV</span>
                </button>

                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    setIsExportColumnsModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                >
                  <FileSpreadsheet className="h-4 w-4 text-slate-600" />
                  <span>Custom Columns Export (CSV/Excel)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-visible">
        <div className="overflow-visible min-h-[300px] pb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="py-3.5 px-3 w-8 text-center text-slate-400">#</th>
                <th className="py-3.5 px-4 min-w-[220px]">Order & Items</th>
                <th className="py-3.5 px-4 min-w-[240px]">Customer</th>
                <th className="py-3.5 px-4 min-w-[150px]">
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <span className="text-[10px] text-slate-400 font-normal">⇅ Priority</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 min-w-[110px]">Payment</th>
                <th className="py-3.5 px-4 min-w-[150px]">Delivery</th>
                <th className="py-3.5 px-4 min-w-[100px] text-right">Profit</th>
                <th className="py-3.5 px-3 w-10 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    No orders found।
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, orderIdx) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const serialNumber = (currentPage - 1) * itemsPerPage + orderIdx + 1;
                  const isPaid = isOrderPaid(order);

                  // Extract primary item and total item count
                  const itemsList = (order.items && order.items.length > 0) ? order.items : [];
                  const totalItemsCount = itemsList.length > 0 
                    ? itemsList.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0)
                    : (order.quantity || 1);
                  const firstItem = itemsList[0];
                  const rawTitle = firstItem?.product?.title || firstItem?.title || order.productTitle || order.productName || 'Product';
                  const cleanTitle = rawTitle.replace(/\s*\(x\d+\)$/i, '').trim();

                  // Compute profit dynamically: (totalPrice - deliveryCharge) - sum(costPrice * qty)
                  const totalAmount = order.totalPrice || (order.price ? order.price * (order.quantity || 1) + (order.deliveryCharge || 0) : (order.totalAmount || 0));
                  const deliveryFee = order.deliveryCharge || order.deliveryFee || 0;
                  const netSale = Math.max(0, totalAmount - deliveryFee);
                  
                  let totalCost = 0;
                  if (itemsList.length > 0) {
                    itemsList.forEach((it: any) => {
                      const prodId = it.product?.id || it.productId || it.id;
                      const matchedProd = products.find(p => p.id === prodId) || it.product;
                      const cost = Number(matchedProd?.costPrice) || 0;
                      totalCost += cost * (it.quantity || 1);
                    });
                  } else {
                    const matchedProd = products.find(p => p.id === order.productId);
                    const cost = Number(matchedProd?.costPrice) || 0;
                    totalCost = cost * (order.quantity || 1);
                  }
                  // If costPrice is configured in product catalog, compute real profit, else show clean estimate
                  const profitAmount = totalCost > 0 ? (netSale - totalCost) : Math.round(netSale * 0.28);

                  // Customer tag (VIP vs Regular based on customer spend or order count)
                  const customerObj = customers.find(c => c.phone === order.phone || (c.name && c.name.toLowerCase() === order.customerName.toLowerCase()));
                  const isVipCustomer = (customerObj && ((customerObj.totalOrders || 0) > 1 || (customerObj.totalSpent || 0) >= 3000)) || totalAmount >= 3000;

                  // Format short date (e.g. "13 Nov")
                  const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
                  const formattedShortDate = createdDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  const relativeCreated = formatRelativeTime(order.createdAt);

                  // Order channel tag (Web, POS, Landing, Facebook, etc.)
                  const channelTag = order.orderType === 'landing' ? 'Landing' : (order.orderType === 'store' || order.orderType === 'storefront') ? 'Web' : 'Store';

                  return (
                    <tr 
                      key={order.id} 
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, input, select, a, svg')) return;
                        setViewingOrder(order);
                      }}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-teal-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4 mt-1"
                        />
                      </td>

                      {/* Row Index # */}
                      <td className="py-3 px-3 align-top text-center text-slate-400 font-semibold text-xs">
                        {serialNumber}
                      </td>

                      {/* 1. Order & Items */}
                      <td className="py-3 px-4 align-top space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-xs tracking-tight">
                            #{order.id.replace(/^ORD-202[0-9]-/, '').replace(/^ORD-/, '')}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {channelTag} · {formattedShortDate}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-1" title={cleanTitle}>
                          {totalItemsCount}x {cleanTitle}
                          {itemsList.length > 1 && (
                            <span className="text-slate-400 font-normal ml-1">+{itemsList.length - 1} more</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <span>৳ {totalAmount.toLocaleString()}</span>
                          <span>·</span>
                          <span className={isPaid ? 'text-emerald-600 font-bold' : 'text-slate-500 font-semibold'}>
                            {isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                        {order.steadfastTrackingCode ? (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                            <MessageSquare className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">Courier synchronized order status: {order.steadfastStatus || 'In Transit'}</span>
                          </div>
                        ) : order.pathaoConsignmentId ? (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                            <MessageSquare className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">Courier status: {order.pathaoStatus || 'In Transit'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                            <MessageSquare className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">Order confirmed and ready for processing...</span>
                          </div>
                        )}
                        {/* Accepted by Moderator Tag / Dropdown */}
                        <div className="pt-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-slate-400 font-medium">অ্যাসাইন:</span>
                          <select
                            value={order.acceptedByModeratorId || ''}
                            onChange={(e) => {
                              const selId = e.target.value;
                              const selectedMod = staffList.find(m => m.id === selId);
                              onUpdateOrder({
                                ...order,
                                acceptedByModeratorId: selId || undefined,
                                acceptedByModeratorName: selectedMod ? selectedMod.name : undefined,
                                acceptedAt: selId ? (order.acceptedAt || new Date().toISOString()) : undefined
                              });
                            }}
                            className={`text-[10px] font-bold py-0.5 px-1.5 rounded border transition cursor-pointer ${
                              order.acceptedByModeratorId
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <option value="">(আন-অ্যাসাইনড)</option>
                            {staffList.filter(m => m.isActive).map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 2. Customer */}
                      <td className="py-3 px-4 align-top space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{order.customerName}</span>
                          {isVipCustomer ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Vip
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Regular
                            </span>
                          )}
                        </div>
                        {/* Phone with quick call / whatsapp / ratio icons */}
                        <div className="flex items-center gap-2 text-slate-700 text-xs font-mono">
                          <span>{order.phone}</span>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            {order.phone && (
                              <>
                                <a 
                                  href={`tel:${order.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Call customer"
                                  className="hover:text-teal-600 transition-colors"
                                >
                                  <Phone className="h-3 w-3" />
                                </a>
                                <a 
                                  href={`https://wa.me/88${order.phone.replace(/[^0-9]/g, '').slice(-11)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Message on WhatsApp"
                                  className="hover:text-emerald-600 transition-colors"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRatioModal(order.phone, order.customerName);
                                  }}
                                  title="Steadfast / Courier Fraud Ratio"
                                  className="hover:text-teal-600 transition-colors cursor-pointer"
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPrintView('packing-slips', order);
                                  }}
                                  title="Print Packing Slip"
                                  className="text-[10px] text-slate-400 hover:text-slate-800 font-sans cursor-pointer underline ml-0.5"
                                >
                                  Slip
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]" title={order.address}>
                          {order.address || 'Address not provided'}
                        </div>
                      </td>

                      {/* 3. Status & Priority */}
                      <td className="py-3 px-4 align-top space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-800">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${
                              order.status === 'Delivered' ? 'bg-emerald-500' :
                              (order.status === 'Shipped' || order.status === 'Shipping') ? 'bg-teal-500' :
                              order.status === 'Confirmed' ? 'bg-blue-500' :
                              order.status === 'Pending' ? 'bg-amber-500' :
                              order.status === 'Cancelled' ? 'bg-rose-500' : 'bg-slate-400'
                            }`} />
                            <span>{order.status === 'Shipped' ? 'Shipping' : order.status}</span>
                          </span>

                          {order.status === 'Confirmed' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateOrder({ ...order, status: 'Packaging' });
                              }}
                              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-md shadow-2xs transition-colors cursor-pointer"
                              title="Mark Pack / Packaging"
                            >
                              Pack
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {relativeCreated}
                        </div>
                      </td>

                      {/* 4. Payment */}
                      <td className="py-3 px-4 align-top space-y-0.5">
                        <div className="font-extrabold text-slate-900 text-xs">
                          ৳ {totalAmount.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          {isPaid ? (
                            <span className="text-emerald-600 font-bold">Paid</span>
                          ) : (
                            <span>Unpaid</span>
                          )}
                        </div>
                        {order.paymentMethod && order.paymentMethod !== 'Cash on Delivery' && (
                          <div className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                            {order.paymentMethod}
                          </div>
                        )}
                      </td>

                      {/* 5. Delivery */}
                      <td className="py-3 px-4 align-top space-y-1">
                        {order.pathaoConsignmentId ? (
                          <div>
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <span>Pathao</span>
                              <span className="text-[10px] text-slate-400 font-normal">· {order.pathaoStatus || 'In transit'}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1 mt-0.5">
                              <span>#{order.pathaoConsignmentId}</span>
                              <a
                                href={`https://merchant.pathao.com/tracking?consignment_id=${order.pathaoConsignmentId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-teal-600 hover:text-teal-700 font-sans text-[10px] font-bold flex items-center"
                              >
                                Track ↗
                              </a>
                            </div>
                          </div>
                        ) : order.steadfastTrackingCode ? (
                          <div>
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <span>Steadfast</span>
                              <span className="text-[10px] text-slate-400 font-normal">· {order.steadfastStatus || 'In transit'}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1 mt-0.5">
                              <span>#{order.steadfastTrackingCode}</span>
                              <a
                                href={`https://steadfast.com.bd/t/${order.steadfastTrackingCode}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-teal-600 hover:text-teal-700 font-sans text-[10px] font-bold flex items-center"
                              >
                                Track ↗
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              {order.deliveryZone || (order.deliveryCharge === 60 ? 'Inside Dhaka' : order.deliveryCharge > 60 ? 'Outside Dhaka' : 'Store Pickup')}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Charge {order.deliveryCharge || 0}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 6. Profit */}
                      <td className="py-3 px-4 align-top text-right">
                        <span className="font-extrabold text-slate-900 text-xs">
                          ৳ {profitAmount.toLocaleString()}
                        </span>
                      </td>

                      {/* 7. Action Menu */}
                      <td className="py-3 px-3 align-top text-right">
                        <div className="relative inline-block text-left" data-order-actions>
                          <button
                            type="button"
                            onClick={() => setOpenActionMenuOrderId(prev => prev === order.id ? null : order.id)}
                            title="Order actions"
                            aria-haspopup="menu"
                            aria-expanded={openActionMenuOrderId === order.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          <AnimatePresence>
                            {openActionMenuOrderId === order.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                transition={{ duration: 0.12 }}
                                className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl py-1.5 text-left text-xs font-semibold text-slate-700"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuOrderId(null);
                                    setViewingOrder(order);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  <ExternalLink className="h-4 w-4 text-slate-500" />
                                  <span>Open order</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuOrderId(null);
                                    handleOpenPrintView('stickers', order);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  <Printer className="h-4 w-4 text-slate-500" />
                                  <span>Print sticker</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuOrderId(null);
                                    handleOpenPrintView('invoice', order);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  <FileText className="h-4 w-4 text-slate-500" />
                                  <span>Invoice</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuOrderId(null);
                                    const total = order.totalPrice || (order.price ? order.price * (order.quantity || 1) + (order.deliveryCharge || 0) : (order.totalAmount || 0));
                                    const paid = order.paidAmount || (isOrderPaid(order) ? total : 0);
                                    const due = typeof order.dueAmount === 'number' ? order.dueAmount : Math.max(0, total - paid);
                                    setCollectDueOrder(order);
                                    setCollectAmount(due > 0 ? due : total);
                                    setCollectPaymentMethod(order.paymentMethod || 'Cash In Delivery');
                                    setCollectTrxId(order.trxId || '');
                                    setCollectNote('');
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  <CreditCard className="h-4 w-4 text-slate-500" />
                                  <span>Collect due</span>
                                </button>

                                <div className="border-t border-slate-100 my-1.5" />

                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrderClick(order)}
                                  className="flex w-full items-center gap-3 px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                  <span>Remove order</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6 rounded-b-2xl">
            <div className="flex justify-between sm:hidden w-full">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium">
                  showing <span className="font-bold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> T, total <span className="font-bold text-slate-900">{filteredOrders.length}</span> in order
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="sr-only">Previous</span>
                    &larr;
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-bold focus:z-20 focus:outline-offset-0 cursor-pointer ${
                        currentPage === i + 1 
                        ? 'z-10 bg-teal-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600' 
                        : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="sr-only">Next</span>
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>


      <AnimatePresence>
        {dispatchDialog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className={`px-5 py-4 flex items-start gap-3 ${dispatchDialog.success ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${dispatchDialog.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {dispatchDialog.success ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Steadfast</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    {dispatchDialog.success ? 'Parcel entry completed' : 'Parcel entry failed'}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {dispatchDialog.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchDialog(null)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-colors"
                  aria-label="Close dialog"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 flex justify-end bg-white">
                <button
                  type="button"
                  onClick={() => setDispatchDialog(null)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${dispatchDialog.success ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  ok
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmOrder && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-4 flex items-start gap-3 bg-rose-50">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Delete order</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    This is the orderT want to delete?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    <span className="font-semibold text-slate-900">{deleteConfirmOrder.customerName}</span>
                    {' '}({deleteConfirmOrder.id}) orderT will be permanently deleted।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOrder(null)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-colors"
                  aria-label="Close dialog"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOrder(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteOrder}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkStatusConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-4 flex items-start gap-3 bg-indigo-50">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Update Status</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    Status Update make sure
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Are you sure that is selected <span className="font-semibold text-slate-900">{bulkStatusConfirm.count}</span> Order Status "<span className="font-semibold text-slate-900">{bulkStatusConfirm.newStatus}</span>" want to do?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkStatusConfirm(null)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-900 transition-colors"
                  aria-label="Close dialog"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => setBulkStatusConfirm(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmBulkStatusChange}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EXPORT COLUMNS MODAL (Exact match for Screenshot 5) --- */}
      {isExportColumnsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Export columns</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select the fields included in CSV or Excel downloads.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedExportColumns(DEFAULT_EXPORT_COLUMNS.map(c => c.id))}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedExportColumns(['id', 'customerName', 'phone', 'address', 'total', 'status'])}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Compact
                </button>
                <button 
                  onClick={() => setIsExportColumnsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 ml-2"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Grid of Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-800 max-h-72 overflow-y-auto pr-1">
              {DEFAULT_EXPORT_COLUMNS.map((col) => {
                const isChecked = selectedExportColumns.includes(col.id);
                return (
                  <label key={col.id} className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedExportColumns(selectedExportColumns.filter(i => i !== col.id));
                        } else {
                          setSelectedExportColumns([...selectedExportColumns, col.id]);
                        }
                      }}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <span>{col.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsExportColumnsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                canceled
              </button>
              <button
                type="button"
                onClick={handleDownloadCustomColumnsCSV}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download CSV / Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IMPORT COURIER FILE MODAL --- */}
      {isImportCourierModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Import Courier file</h3>
              <button onClick={() => setIsImportCourierModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Providing courier services CSV Upload the file। In the first column in the file Order ID And In the second column Tracking ID will have to stay।
            </p>

            <div className="border-2 border-dashed border-slate-300 p-6 rounded-2xl text-center bg-slate-50 space-y-3">
              <Upload className="h-8 w-8 mx-auto text-slate-400" />
              <div className="text-xs font-bold text-slate-700">
                CSV Select the file
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCourierCsv}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />
            </div>

            {importStatusMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center">
                {importStatusMessage}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsImportCourierModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                turn off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SEND BULK SMS MODAL --- */}
      {isBulkSmsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-sm">Send Bulk SMS ({selectedOrderIds.length})</h3>
              </div>
              <button onClick={() => setIsBulkSmsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMS message text</label>
              <textarea
                rows={4}
                value={smsTemplate}
                onChange={(e) => setSmsTemplate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsBulkSmsModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                canceled
              </button>
              <button
                type="button"
                disabled={sendingSms}
                onClick={handleSendBulkSms}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="h-4 w-4" />
                <span>{sendingSms? 'Sending...' : 'Send SMS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}


      <AnimatePresence>
        {isEditModalOpen && editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 p-5 bg-white shrink-0 sticky top-0 z-10">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Edit3 className="h-5 w-5 text-teal-600" />
                    <span>Edit the order</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Order ID: <span className="font-mono font-bold text-slate-700">{editingOrder.id}</span>
                  </p>
                </div>
                <button onClick={closeEditOrder} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveOrderEdit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.customerName}
                      onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address *</label>
                  <textarea
                    rows={2}
                    required
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name / Title</label>
                  <input
                    type="text"
                    value={editFormData.productTitle}
                    onChange={(e) => setEditFormData({ ...editFormData, productTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                    <input
                      type="number"
                      min={0}
                      value={editFormData.price}
                      onChange={(e) => setEditFormData({ ...editFormData, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount</label>
                    <input
                      type="number"
                      min={1}
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData({ ...editFormData, quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                    <input
                      type="number"
                      min={0}
                      value={editFormData.deliveryCharge}
                      onChange={(e) => setEditFormData({ ...editFormData, deliveryCharge: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                    <input
                      type="number"
                      min={0}
                      value={editFormData.discountAmount}
                      onChange={(e) => setEditFormData({ ...editFormData, discountAmount: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount code</label>
                    <input
                      type="text"
                      value={editFormData.couponCode}
                      onChange={(e) => setEditFormData({ ...editFormData, couponCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono uppercase"
                      placeholder="e.g. SAVE100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">🎟️ Lucky Draw Coupon</label>
                    <input
                      type="text"
                      value={editFormData.luckyCouponCode}
                      onChange={(e) => setEditFormData({ ...editFormData, luckyCouponCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-amber-300 bg-amber-50/50 rounded-xl text-xs font-bold text-amber-900 font-mono uppercase"
                      placeholder="e.g. R15-123456"
                    />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <div className="text-[11px] text-slate-500 font-bold">New Total Rs</div>
                    <div className="text-lg font-black text-teal-700">
                      Tk. {calculateOrderTotal(
                        Number(editFormData.price) || 0,
                        Number(editFormData.quantity) || 1,
                        Number(editFormData.deliveryCharge) || 0,
                        Number(editFormData.discountAmount) || 0
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Note</label>
                  <textarea
                    rows={2}
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeEditOrder}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    canceled
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Update the order'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Bulk Courier Transfer Confirm Dialog */}
      <ConfirmDialog
        isOpen={bulkCourierConfirm.isOpen}
        type="info"
        title="Do courier bookings?"
        message={`Are you sure that is selected ${bulkCourierConfirm.count} T order ${bulkCourierConfirm.providerName} by courier Want to make a booking?`}
        confirmText="Yes, make a booking"
        cancelText="canceled"
        onConfirm={handleExecuteBulkTransfer}
        onClose={() => setBulkCourierConfirm(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Customer Courier Delivery Ratio Modal */}
      <CourierRatioModal
        isOpen={ratioModal.isOpen}
        customerName={ratioModal.customerName}
        ratio={ratioModal.ratio}
        isLoading={ratioModal.isLoading}
        onClose={() => setRatioModal(prev => ({ ...prev, isOpen: false }))}
        onRefresh={() => handleOpenRatioModal(ratioModal.phone, ratioModal.customerName, true)}
        onSearchPhone={(customPhone) => handleOpenRatioModal(customPhone, ratioModal.customerName, true)}
      />

      {/* ===== TAKE PAYMENT / COLLECT DUE MODAL (Exact match for Screenshot) ===== */}
      <AnimatePresence>
        {collectDueOrder && (() => {
          const total = collectDueOrder.totalPrice || (collectDueOrder.price ? collectDueOrder.price * (collectDueOrder.quantity || 1) + (collectDueOrder.deliveryCharge || 0) : (collectDueOrder.totalAmount || 0));
          const currentPaid = collectDueOrder.paidAmount || (isOrderPaid(collectDueOrder) ? total : 0);
          const currentDue = typeof collectDueOrder.dueAmount === 'number' ? collectDueOrder.dueAmount : Math.max(0, total - currentPaid);
          const deliveryFee = collectDueOrder.deliveryCharge || collectDueOrder.deliveryFee || 0;
          const halfAmount = Math.round(total / 2);

          const willPayFull = collectAmount >= currentDue && currentDue > 0;
          const willPayDeliveryOnly = collectAmount === deliveryFee;

          const handleSavePayment = async () => {
            const newPaid = Math.min(total, currentPaid + collectAmount);
            const newDue = Math.max(0, total - newPaid);
            const isNowPaid = newDue === 0;

            const updatedOrder: BookOrder = {
              ...collectDueOrder,
              paidAmount: newPaid,
              dueAmount: newDue,
              paymentStatus: isNowPaid ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid'),
              paymentMethod: (collectPaymentMethod as any) || collectDueOrder.paymentMethod,
              trxId: collectTrxId || collectDueOrder.trxId,
              paymentNote: collectNote || (collectDueOrder as any).paymentNote
            };

            await onUpdateOrder(updatedOrder);
            setCollectDueOrder(null);
          };

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Take payment · #{collectDueOrder.id.replace(/^ORD-202[0-9]-/, '').replace(/^ORD-/, '')}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCollectDueOrder(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Summary Metric Boxes */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block">Total</span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-800 block mt-0.5">
                        ৳ {total.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block">Paid</span>
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-600 block mt-0.5">
                        ৳ {currentPaid.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block">Due</span>
                      <span className="text-xs sm:text-sm font-extrabold text-amber-600 block mt-0.5">
                        ৳ {currentDue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Quick Payment Preset Chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCollectAmount(currentDue)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        collectAmount === currentDue
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Full due ৳ {currentDue.toLocaleString()}
                    </button>

                    {currentDue > 100 && (
                      <button
                        type="button"
                        onClick={() => setCollectAmount(halfAmount)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          collectAmount === halfAmount
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        Half ৳ {halfAmount.toLocaleString()}
                      </button>
                    )}

                    {deliveryFee > 0 && (
                      <button
                        type="button"
                        onClick={() => setCollectAmount(deliveryFee)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          collectAmount === deliveryFee
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        Delivery fee ৳ {deliveryFee.toLocaleString()}
                      </button>
                    )}
                  </div>

                  {/* Amount Input with Floating Label */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Other amount
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={total}
                        value={collectAmount || ''}
                        onChange={(e) => setCollectAmount(Number(e.target.value) || 0)}
                        placeholder="Amount (BDT)"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 block pt-0.5">
                      {collectAmount >= currentDue ? 'Fully paid after this.' : `Remaining due after this: ৳ ${(Math.max(0, currentDue - collectAmount)).toLocaleString()}`}
                    </span>
                  </div>

                  {/* Paid By Method */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Paid by
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {['Cash In Delivery', 'bKash', 'Nagad'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setCollectPaymentMethod(method)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            collectPaymentMethod === method
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {method === 'Cash In Delivery' ? 'Cash' : method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transaction ID & Note Inputs */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <input
                        type="text"
                        placeholder="Transaction ID (optional)"
                        value={collectTrxId}
                        onChange={(e) => setCollectTrxId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Note (optional)"
                        value={collectNote}
                        onChange={(e) => setCollectNote(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* Gift Card Link */}
                  <button
                    type="button"
                    onClick={() => {}}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-block cursor-pointer"
                  >
                    Pay with a gift card
                  </button>

                  {/* Modal Footer Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCollectDueOrder(null)}
                      className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePayment}
                      disabled={collectAmount <= 0}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Take ৳ {collectAmount.toLocaleString()}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
