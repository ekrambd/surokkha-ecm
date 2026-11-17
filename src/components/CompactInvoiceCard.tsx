import React, { useRef, useEffect, useState } from 'react';
import { BookOrder } from '../types';
import { Printer, MessageCircle, Copy, CheckCircle, ExternalLink, MoreHorizontal, QrCode as QrIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { isOrderCod, isOrderPaid } from '../lib/orderPaymentUtils';
import { dbService } from '../lib/dbService';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface Props {
  order: BookOrder;
  compact?: boolean;
}

export function CompactInvoiceCard({ order, compact = false }: Props) {
  const { ecomSettings, instituteInfo } = useAppStore();
  const [localSettings, setLocalSettings] = useState<any>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string>('');
  const [pageCopies, setPageCopies] = React.useState<'1' | '2'>('1');
  
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ecomSettings?.storeName) {
      dbService.getEcomSettings().then(st => setLocalSettings(st)).catch(() => {});
    }
  }, [ecomSettings?.storeName]);

  const activeSettings = ecomSettings || localSettings;

  const parcelId = order.steadfastTrackingCode || order.pathaoTrackingCode || order.id.replace('ORD-', '');
  const storeName = activeSettings?.storeName || instituteInfo?.name || 'SHOSTIR BAZAR';
  const storePhone = activeSettings?.contactPhone || activeSettings?.supportPhone || activeSettings?.hotlinePhone || instituteInfo?.phone || '01859776717';
  const storeAddress = activeSettings?.storeAddress || instituteInfo?.address || 'Dhaka, Bangladesh';

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, parcelId, {
          format: 'CODE128',
          lineColor: '#000000',
          width: 1.2,
          height: 24,
          displayValue: false,
          margin: 0
        });
      } catch (err) {
        console.error('Barcode error:', err);
      }
    }

    // Dynamic QR tracking or verification link
    const qrPayload = order.steadfastTrackingCode 
      ? `https://steadfast.com.bd/t/${encodeURIComponent(order.steadfastTrackingCode)}`
      : `${window.location.origin}/track?id=${encodeURIComponent(order.id)}`;

    QRCode.toDataURL(qrPayload, {
      width: 54,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(() => {});
  }, [parcelId, order.steadfastTrackingCode, order.id]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const windowPrint = window.open('', '', 'width=900,height=750');
    if (!windowPrint) return;

    windowPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.id}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; background: #fff !important; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="bg-white p-4 flex justify-center">
          ${printContent.innerHTML}
          ${pageCopies === '2' ? `<div class="my-6 border-b-2 border-dashed border-slate-300"></div>${printContent.innerHTML}` : ''}
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 400);
  };

  const handleWhatsApp = () => {
    const text = `*Invoice:* ${order.id}\nCustomer: ${order.customerName}\nAmount: ৳${order.totalAmount || order.totalPrice}\nDelivery: ${order.address}`;
    window.open(`https://wa.me/${order.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const dtStr = (() => {
    try {
      const d = new Date(order.createdAt);
      return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
    } catch {
      return order.createdAt;
    }
  })();

  const subtotal = order.totalPrice ? order.totalPrice - (order.deliveryCharge || 0) + (order.couponDiscount || order.discountAmount || 0) : ((order.price || 0) * (order.quantity || 1));
  const deliveryCharge = order.deliveryCharge || 0;
  const grandTotal = order.totalAmount || order.totalPrice || ((order.price || 0) * (order.quantity || 1) + deliveryCharge);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden font-clean text-xs">
      
      {/* Top Action Bar */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-slate-800">ইনভয়েস প্রিভিউ</span>
          <p className="text-[10px] text-slate-400 hidden sm:inline">
            {order.steadfastTrackingCode ? `ট্র্যাকিং: ${order.steadfastTrackingCode}` : 'ইনভয়েস রসিদ কপি'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1 পাতা / 2 পাতা toggle */}
          <div className="flex bg-slate-200/70 p-0.5 rounded-md text-[10px] font-medium text-slate-600 border border-slate-200">
            <button
              onClick={() => setPageCopies('1')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${pageCopies === '1' ? 'bg-white shadow-2xs text-slate-900 font-semibold' : 'hover:text-slate-900'}`}
            >
              ১ / পাতা
            </button>
            <button
              onClick={() => setPageCopies('2')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${pageCopies === '2' ? 'bg-white shadow-2xs text-slate-900 font-semibold' : 'hover:text-slate-900'}`}
            >
              ২ / পাতা
            </button>
          </div>

          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3 h-3" />
            <span className="hidden xs:inline">হোয়াটসঅ্যাপ</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3 h-3 text-slate-500" />
            <span>প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Invoice Inner Paper (Compact, clean font design) */}
      <div className="p-3 sm:p-4 overflow-x-auto bg-slate-50/40 flex justify-center">
        <div 
          ref={printRef}
          className="w-full max-w-[480px] bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-2xs text-slate-800 text-[11px] leading-normal"
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-2.5 border-b border-slate-200">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 tracking-tight">{storeName}</span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 text-[9px] rounded font-normal">Customer Copy</span>
              </div>
              <p className="text-[10px] text-slate-500 font-normal leading-tight">
                {storeAddress} · {storePhone}
              </p>
            </div>

            {/* Top Right Barcode + INV ID */}
            <div className="flex flex-col items-end">
              <svg ref={barcodeRef} className="max-w-[110px] h-6"></svg>
              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600 mt-0.5 font-medium">
                <span>INV #{order.id.replace('ORD-', '')}</span>
                <button onClick={() => handleCopy(order.id, 'id')} className="text-slate-400 hover:text-slate-600">
                  {copiedField === 'id' ? <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Details Row: Bill To & Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2.5 text-[10px] border-b border-slate-100">
            {/* Bill To */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-slate-400 text-[10px]">To:</span>
                <span className="font-semibold text-slate-900">{order.customerName}</span>
                <button onClick={() => handleCopy(order.customerName, 'name')} className="text-slate-400 hover:text-slate-600">
                  {copiedField === 'name' ? <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
                <span className="font-mono text-slate-700 font-medium">({order.phone})</span>
                <button onClick={() => handleCopy(order.phone, 'phone')} className="text-slate-400 hover:text-slate-600">
                  {copiedField === 'phone' ? <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
              </div>
              <div className="text-slate-600 text-[10px] leading-tight flex items-start gap-1">
                <span>{order.address}{order.thana ? `, ${order.thana}` : ''}{order.district ? `, ${order.district}` : ''}</span>
                <button onClick={() => handleCopy(order.address, 'addr')} className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
                  {copiedField === 'addr' ? <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
              </div>
            </div>

            {/* Meta Table */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-600">
              <div>
                <span className="text-slate-400">Date:</span> <span className="font-medium text-slate-800">{dtStr}</span>
              </div>
              <div>
                <span className="text-slate-400">Method:</span> <span className="font-medium text-slate-800">{order.paymentMethod || 'COD'}</span>
              </div>
              <div>
                <span className="text-slate-400">Courier:</span> <span className="font-medium text-slate-800">{order.courierProvider ? order.courierProvider.toUpperCase() : 'Steadfast'}</span>
              </div>
              <div>
                <span className="text-slate-400">Status:</span> <span className="font-medium text-slate-800">{order.status}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-1.5">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 text-[9px] uppercase font-semibold text-slate-400">
                  <th className="py-1 w-5">#</th>
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right w-16">Rate</th>
                  <th className="py-1 text-center w-8">Qty</th>
                  <th className="py-1 text-right w-16">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, idx: number) => {
                    const price = item.variant?.price || item.product?.price || item.price || 0;
                    const qty = item.quantity || 1;
                    return (
                      <tr key={idx}>
                        <td className="py-1 text-slate-400 font-mono text-[9px]">{String(idx + 1).padStart(2, '0')}</td>
                        <td className="py-1">
                          <p className="font-medium text-slate-900 leading-tight">{item.product?.title || item.title}</p>
                          {(item.variant?.name || item.sku) && (
                            <span className="text-[9px] text-slate-400">({item.variant?.name || item.sku})</span>
                          )}
                        </td>
                        <td className="py-1 text-right font-mono tabular-nums text-slate-600">{price.toFixed(0)}</td>
                        <td className="py-1 text-center font-mono tabular-nums text-slate-600">{qty}</td>
                        <td className="py-1 text-right font-mono tabular-nums font-semibold text-slate-900">{(price * qty).toFixed(0)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-1 text-slate-400 font-mono text-[9px]">01</td>
                    <td className="py-1 font-medium text-slate-900">{order.productTitle || 'Product'}</td>
                    <td className="py-1 text-right font-mono tabular-nums text-slate-600">{(order.price || 0).toFixed(0)}</td>
                    <td className="py-1 text-center font-mono tabular-nums text-slate-600">{order.quantity || 1}</td>
                    <td className="py-1 text-right font-mono tabular-nums font-semibold text-slate-900">{((order.price || 0) * (order.quantity || 1)).toFixed(0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Row: QR & Feedback + Subtotal / Total Breakdown */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-start gap-3">
            
            {/* Feedback QR */}
            <div className="flex items-center gap-1.5 max-w-[200px]">
              {qrCodeDataUrl && (
                <div className="w-10 h-10 shrink-0 border border-slate-200 rounded p-0.5 bg-white">
                  <img src={qrCodeDataUrl} alt="QR" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="text-[9px] text-slate-500 leading-tight">
                <p className="font-medium text-slate-800">পণ্য রিভিউ দিন · Share Review</p>
                <p className="text-slate-400 text-[8px] mt-0.5">QR স্ক্যান করে ট্র্যাকিং ও মতামত জানান</p>
              </div>
            </div>

            {/* Totals */}
            <div className="w-36 text-[10px] space-y-0.5">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono tabular-nums text-slate-700">৳ {subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Delivery:</span>
                <span className="font-mono tabular-nums text-slate-700">৳ {deliveryCharge.toFixed(0)}</span>
              </div>
              {Boolean(order.couponDiscount || order.discountAmount) && (
                <div className="flex justify-between text-rose-500">
                  <span>Discount:</span>
                  <span className="font-mono tabular-nums">- ৳ {(order.couponDiscount || order.discountAmount || 0).toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-0.5">
                <span>Total:</span>
                <span className="font-mono tabular-nums">৳ {grandTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded text-[10px]">
                <span>COD Due:</span>
                <span className="font-mono tabular-nums">৳ {grandTotal.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Footer note & Authorized Sign */}
          <div className="pt-2.5 mt-1 border-t border-slate-100 flex justify-between items-end text-[9px] text-slate-400">
            <span>Thank you for shopping with {storeName}.</span>
            <span className="text-slate-400 border-t border-dashed border-slate-300 pt-0.5 px-2">Authorized Sign</span>
          </div>

        </div>
      </div>
    </div>
  );
}
