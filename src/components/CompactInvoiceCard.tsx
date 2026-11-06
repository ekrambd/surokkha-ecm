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
          width: 1.5,
          height: 32,
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
      width: 70,
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
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden font-sans">
      
      {/* Top Action Bar (Matching Screenshot 1) */}
      <div className="p-3 sm:px-4 sm:py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xs text-slate-800">ইনভয়েস</span>
          <p className="text-[11px] text-slate-400 hidden sm:inline">
            {order.steadfastTrackingCode ? `ট্র্যাকিং: ${order.steadfastTrackingCode}` : 'ট্র্যাকিং আইডি নেই; বারকোড খালি থাকবে।'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1 পাতা / 2 পাতা toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold text-slate-600 border border-slate-200">
            <button
              onClick={() => setPageCopies('1')}
              className={`px-2 py-0.5 rounded cursor-pointer ${pageCopies === '1' ? 'bg-white shadow-2xs text-slate-900' : 'hover:text-slate-900'}`}
            >
              ১ / পাতা
            </button>
            <button
              onClick={() => setPageCopies('2')}
              className={`px-2 py-0.5 rounded cursor-pointer ${pageCopies === '2' ? 'bg-white shadow-2xs text-slate-900' : 'hover:text-slate-900'}`}
            >
              ২ / পাতা
            </button>
          </div>

          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">হোয়াটসঅ্যাপ</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Invoice Inner Paper (Exact design from screenshot 1) */}
      <div className="p-4 sm:p-5 overflow-x-auto bg-slate-50/30 flex justify-center">
        <div 
          ref={printRef}
          className="w-full max-w-[620px] bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs text-slate-900 text-xs"
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-3 border-b border-slate-200">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900">{storeName}</span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] rounded font-medium">Customer Copy</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                {storeAddress} · {storePhone}
              </p>
            </div>

            {/* Top Right Barcode + INV ID */}
            <div className="flex flex-col items-end">
              <svg ref={barcodeRef} className="max-w-[130px] h-7"></svg>
              <div className="flex items-center gap-1 font-mono font-bold text-xs mt-0.5 text-slate-700">
                <span>INV #{order.id.replace('ORD-', '')}</span>
                <button onClick={() => handleCopy(order.id, 'id')} className="text-slate-400 hover:text-slate-600">
                  {copiedField === 'id' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Details Row: Bill To & Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 text-xs border-b border-slate-200">
            {/* Bill To */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 text-[11px] font-semibold">Bill To:</span>
                <span className="font-bold text-slate-900">{order.customerName}</span>
                <button onClick={() => handleCopy(order.customerName, 'name')} className="text-slate-400 hover:text-slate-600">
                  {copiedField === 'name' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
                <span className="font-mono text-slate-700 font-semibold">{order.phone}</span>
                <button onClick={() => handleCopy(order.phone, 'phone')} className="text-slate-400 hover:text-slate-600">
                  {copiedField === 'phone' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <span>{order.address}{order.thana ? `, ${order.thana}` : ''}{order.district ? `, ${order.district}` : ''}</span>
                <button onClick={() => handleCopy(order.address, 'addr')} className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
                  {copiedField === 'addr' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Meta Table */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <div>
                <span className="text-slate-400">Date:</span> <strong className="text-slate-700">{dtStr}</strong>
              </div>
              <div>
                <span className="text-slate-400">Method:</span> <strong className="text-slate-700">{order.paymentMethod || 'Cash on Delivery'}</strong>
              </div>
              <div>
                <span className="text-slate-400">Courier:</span> <strong className="text-slate-700">{order.courierProvider ? order.courierProvider.toUpperCase() : 'Steadfast'}</strong>
              </div>
              <div>
                <span className="text-slate-400">Status:</span> <strong className="text-slate-700">{order.status}</strong>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                  <th className="py-1.5 w-6">#</th>
                  <th className="py-1.5">Item Description</th>
                  <th className="py-1.5 text-right w-20">Rate</th>
                  <th className="py-1.5 text-center w-12">Qty</th>
                  <th className="py-1.5 text-right w-20">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, idx: number) => {
                    const price = item.variant?.price || item.product?.price || item.price || 0;
                    const qty = item.quantity || 1;
                    return (
                      <tr key={idx}>
                        <td className="py-2 text-slate-400 font-mono text-[11px]">{String(idx + 1).padStart(2, '0')}</td>
                        <td className="py-2">
                          <p className="font-bold text-slate-900 leading-tight uppercase">{item.product?.title || item.title}</p>
                          {(item.variant?.name || item.sku) && (
                            <span className="text-[10px] text-slate-400">({item.variant?.name || item.sku})</span>
                          )}
                        </td>
                        <td className="py-2 text-right font-mono text-slate-700">{price.toFixed(2)}</td>
                        <td className="py-2 text-center font-mono text-slate-700">{qty}</td>
                        <td className="py-2 text-right font-mono font-bold text-slate-900">{(price * qty).toFixed(2)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-2 text-slate-400 font-mono text-[11px]">01</td>
                    <td className="py-2 font-bold text-slate-900 uppercase">{order.productTitle || 'Product'}</td>
                    <td className="py-2 text-right font-mono text-slate-700">{(order.price || 0).toFixed(2)}</td>
                    <td className="py-2 text-center font-mono text-slate-700">{order.quantity || 1}</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">{((order.price || 0) * (order.quantity || 1)).toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Row: QR & Feedback + Subtotal / Total Breakdown */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-start gap-4">
            
            {/* Feedback QR */}
            <div className="flex items-center gap-2 max-w-[240px]">
              {qrCodeDataUrl && (
                <div className="w-12 h-12 shrink-0 border border-slate-200 rounded p-0.5 bg-white">
                  <img src={qrCodeDataUrl} alt="QR" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="text-[10px] text-slate-500 leading-tight">
                <p className="font-bold text-slate-800">আপনার অভিজ্ঞতা কেমন? · Share Feedback</p>
                <p className="text-slate-400 text-[9px] mt-0.5">QR স্ক্যান করে অর্ডার ও পণ্যের রিভিউ দিন।</p>
              </div>
            </div>

            {/* Totals */}
            <div className="w-48 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">৳ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className="font-mono">৳ {deliveryCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                <span>Total</span>
                <span className="font-mono">৳ {grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 bg-slate-50 px-2 py-1 rounded">
                <span>COD / Due</span>
                <span className="font-mono">৳ {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer note & Authorized Sign */}
          <div className="pt-4 flex justify-between items-end text-[10px] text-slate-400">
            <span>Thank you for your business. — {storeName}</span>
            <span className="text-slate-400 border-t border-slate-300 pt-1 px-3">Authorized Sign</span>
          </div>

        </div>
      </div>
    </div>
  );
}
