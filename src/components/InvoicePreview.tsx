import React, { useRef, useState, useEffect } from 'react';
import { BookOrder } from '../types';
import { ArrowLeft, Printer, MessageCircle, Copy, CheckCircle, Tag } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { isOrderCod, isOrderPaid } from '../lib/orderPaymentUtils';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface Props {
  order: BookOrder;
  onBack?: () => void;
}

export function InvoicePreview({ order, onBack }: Props) {
  const { ecomSettings, instituteInfo } = useAppStore();
  const [format, setFormat] = useState<'A4' | 'A5' | '3in'>('A5');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Steadfast / courier consignment details
  const parcelId = order.steadfastTrackingCode || order.pathaoTrackingCode || order.id.replace('ORD-', '');
  const trackingNumber = (order as any).consignmentId || order.steadfastTrackingCode 
    ? `SFR${(order.steadfastTrackingCode || order.id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}` 
    : (order.steadfastTrackingCode || `SFR${order.id.replace(/[^0-9]/g, '')}`);

  // Generate real Code128 Barcode and real QR code
  useEffect(() => {
    if (barcodeRef.current && parcelId) {
      try {
        JsBarcode(barcodeRef.current, parcelId, {
          format: 'CODE128',
          lineColor: '#000000',
          width: format === '3in' ? 1.8 : 1.7,
          height: format === '3in' ? 44 : 38,
          displayValue: true,
          fontSize: 12,
          font: 'monospace',
          fontOptions: 'bold',
          textMargin: 3,
          margin: 0
        });
      } catch (err) {
        console.error('JsBarcode error:', err);
      }
    }

    // Generate real QR Code pointing to tracking or parcel verification URL
    const qrPayload = `https://portal.packzy.com/tracking?tracking_code=${parcelId}`;
    QRCode.toDataURL(qrPayload, {
      width: format === '3in' ? 84 : 76,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('QRCode error:', err));
  }, [parcelId, format]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const windowPrint = window.open('', '', 'width=900,height=750');
    if (!windowPrint) return;

    const pageStyle = format === '3in' 
      ? '@page { size: 80mm auto; margin: 3mm; }'
      : format === 'A5'
      ? '@page { size: A5 landscape; margin: 8mm; }'
      : '@page { size: A4 portrait; margin: 10mm; }';
    
    windowPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.id}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${pageStyle}
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; background: #fff !important; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="bg-white flex justify-center p-2">
          ${printContent.innerHTML}
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
    const text = `*Invoice Details:*\nInvoice No: ${order.id}\nParcel ID: ${parcelId}\nTotal Amount: ৳ ${(order.totalAmount || order.totalPrice || 0).toLocaleString()}\nCustomer: ${order.customerName}`;
    const url = `https://wa.me/${order.phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formattedDate = formatDate(order.createdAt);
  const storeName = (ecomSettings?.storeName || instituteInfo?.name || 'shostirbazar').toLowerCase();
  const storePhone = instituteInfo?.phone || ecomSettings?.supportPhone || '01859776717';
  const storeAddress = instituteInfo?.address || ecomSettings?.storeAddress || 'C - block , 73 no basha, Uposhohor D block Primary school er pechone.';
  const merchantId = (ecomSettings as any)?.steadfastMerchantId || 'DU8ZHEMW';

  // Order items calculation
  const totalAmount = order.totalAmount || order.totalPrice || 0;
  const noteContent = order.notes || (order.items && order.items.length > 0 
    ? order.items.map((i: any) => `${i.product?.title || i.title || ''} (x${i.quantity || 1})`).join(', ') 
    : (order.productTitle ? `${order.productTitle} (x${order.quantity || 1})` : ''));

  return (
    <div className="bg-slate-100 min-h-screen p-3 sm:p-6 font-sans">
      
      {/* Top Controls Toolbar */}
      <div className="max-w-4xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to parcel
            </button>
          )}
          <span className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-xs">
            Label
          </span>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
        </div>

        {/* Paper Size Selector + Print Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex bg-white p-0.5 rounded-lg border border-slate-300 shadow-xs text-xs font-bold">
            {(['A4', 'A5', '3in'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  format === fmt 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00A86B] hover:bg-[#00925c] text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print invoice
          </button>
        </div>
      </div>

      {/* Invoice Document Canvas */}
      <div className="flex justify-center">
        <div 
          ref={printRef}
          className={`bg-white border border-slate-300 shadow-md text-slate-900 transition-all ${
            format === '3in'
              ? 'w-full max-w-[340px] p-5 rounded-2xl'
              : format === 'A5'
              ? 'w-full max-w-[650px] p-8 rounded-2xl'
              : 'w-full max-w-[760px] p-10 rounded-2xl'
          }`}
        >
          {/* Header Section */}
          <div className={`${format === '3in' ? 'space-y-4' : 'flex justify-between items-start gap-4'} mb-4`}>
            {/* Merchant Details */}
            <div className="space-y-0.5 text-xs">
              <h1 className="text-xl font-black lowercase tracking-tight text-slate-900">{storeName}</h1>
              <p className="text-slate-600 font-semibold text-[11px]">Merchant ID: {merchantId}</p>
              <p className="text-slate-600 text-[11px] font-mono">{storePhone}</p>
              <p className="text-slate-500 text-[10px] leading-relaxed max-w-[280px]">
                {storeAddress}
              </p>
            </div>

            {/* Invoice Meta */}
            <div className={`${format === '3in' ? 'border-t border-slate-100 pt-3' : 'text-right'} space-y-1`}>
              <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900">INVOICE</h2>
              <div className="text-xs space-y-0.5 font-medium">
                <div className={`flex ${format === '3in' ? 'justify-between' : 'justify-end gap-3'}`}>
                  <span className="text-slate-500">Invoice no</span>
                  <span className="font-mono font-bold text-slate-900">#{order.id.replace('ORD-', 'ORD-2026-')}</span>
                </div>
                <div className={`flex ${format === '3in' ? 'justify-between' : 'justify-end gap-3'}`}>
                  <span className="text-slate-500">Parcel ID</span>
                  <span className="font-mono font-bold text-slate-900">{parcelId}</span>
                </div>
                <div className={`flex ${format === '3in' ? 'justify-between' : 'justify-end gap-3'}`}>
                  <span className="text-slate-500">Date</span>
                  <span className="font-semibold text-slate-900">{formattedDate}</span>
                </div>
                <div className={`flex ${format === '3in' ? 'justify-between' : 'justify-end gap-3'}`}>
                  <span className="text-slate-500">Tracking</span>
                  <span className="font-mono font-bold text-slate-900">{trackingNumber}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b-2 border-slate-900 my-4"></div>

          {/* Deliver To + Real Barcode & QR Code Section */}
          <div className={`${format === '3in' ? 'space-y-4' : 'flex items-start justify-between gap-6'} mb-6`}>
            {/* Customer Details */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                DELIVER TO
              </span>
              <h3 className="text-sm font-black text-slate-900">{order.customerName}</h3>
              <p className="font-mono font-bold text-slate-800 text-xs">{order.phone}</p>
              <p className="text-slate-600 text-xs max-w-[260px] leading-relaxed">
                {order.address}{order.thana ? `, ${order.thana}` : ''}{order.district ? `, ${order.district}` : ''}
              </p>
            </div>

            {/* Real Barcode & QR Code Block */}
            <div className={`flex ${format === '3in' ? 'flex-col items-center gap-3 pt-2' : 'items-center gap-4'} shrink-0`}>
              {/* Real Code128 Barcode rendered with SVG */}
              <div className="flex flex-col items-center">
                <svg ref={barcodeRef} className="max-w-[200px] h-auto"></svg>
              </div>

              {/* Real QR Code */}
              {qrCodeDataUrl && (
                <div className="w-[74px] h-[74px] border border-slate-200 rounded p-0.5 shrink-0 bg-white shadow-2xs">
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Description & Amount Table */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-slate-600 pb-2 border-b border-slate-200">
              <span>DESCRIPTION</span>
              <span>AMOUNT</span>
            </div>
            
            <div className="py-3 flex justify-between items-center text-xs border-b border-slate-100">
              <span className="font-bold text-slate-900">Parcel #{parcelId}</span>
              <span className="font-mono font-bold text-slate-900">৳{totalAmount.toLocaleString()}</span>
            </div>

            <div className="pt-2 text-xs">
              <button className="text-[#00A86B] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer">
                + Add item description
              </button>
            </div>
          </div>

          {/* Amount To Collect Box */}
          <div className="my-5 p-3 sm:p-4 rounded-xl border-2 border-[#52c41a] bg-[#f6ffed] flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
              AMOUNT TO COLLECT
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
              ৳{totalAmount.toLocaleString()}
            </span>
          </div>

          {/* Note Section */}
          {noteContent && (
            <div className="border-l-2 border-slate-300 pl-3 py-1 my-4 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-0.5">
                NOTE
              </span>
              <p className="text-slate-800 font-medium leading-relaxed">{noteContent}</p>
            </div>
          )}

          {/* Footer with Powered by Steadfast */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>Thank you for your order.</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span>Powered by</span>
              <span className="font-black text-slate-900 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-[#00A86B] fill-current" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                steadfast
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">steadfast.com.bd</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
