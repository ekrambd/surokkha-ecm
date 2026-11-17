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
    <div className="bg-slate-100 min-h-screen p-3 sm:p-5 font-clean text-xs">
      
      {/* Top Controls Toolbar */}
      <div className="max-w-3xl mx-auto mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to parcel
            </button>
          )}
          <span className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-2xs">
            Label
          </span>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
        </div>

        {/* Paper Size Selector + Print Button */}
        <div className="flex items-center gap-2">
          <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs text-xs font-medium">
            {(['A4', 'A5', '3in'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  format === fmt 
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00A86B] hover:bg-[#00925c] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print invoice
          </button>
        </div>
      </div>

      {/* Invoice Document Canvas */}
      <div className="flex justify-center">
        <div 
          ref={printRef}
          className={`bg-white border border-slate-200 shadow-sm text-slate-800 transition-all font-clean leading-normal ${
            format === '3in'
              ? 'w-full max-w-[280px] p-3.5 rounded-xl text-[10px]'
              : format === 'A5'
              ? 'w-full max-w-[500px] p-5 rounded-xl text-[11px]'
              : 'w-full max-w-[620px] p-6 rounded-xl text-xs'
          }`}
        >
          {/* Header Section */}
          <div className={`${format === '3in' ? 'space-y-3' : 'flex justify-between items-start gap-4'} mb-3`}>
            {/* Merchant Details */}
            <div className="space-y-0.5">
              <h1 className="text-base font-bold lowercase tracking-tight text-slate-900">{storeName}</h1>
              <p className="text-slate-600 text-[10px]">Merchant ID: {merchantId}</p>
              <p className="text-slate-600 text-[10px] font-mono">{storePhone}</p>
              <p className="text-slate-500 text-[9px] leading-tight max-w-[240px]">
                {storeAddress}
              </p>
            </div>

            {/* Invoice Meta */}
            <div className={`${format === '3in' ? 'border-t border-slate-100 pt-2' : 'text-right'} space-y-0.5`}>
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">INVOICE</h2>
              <div className="text-[10px] space-y-0.5 text-slate-600 font-normal">
                <div className={`flex ${format === '3in' ? 'justify-between' : 'justify-end gap-2'}`}>
                  <span className="text-slate-400">Invoice:</span>
                  <span className="font-mono font-medium text-slate-800">#{order.id.replace('ORD-', '')}</span>
                </div>
                <div className={`flex ${format === '3in' ? 'justify-between' : 'justify-end gap-2'}`}>
                  <span className="text-slate-400">Parcel ID:</span>
                  <span className="font-mono font-medium text-slate-800">{parcelId}</span>
                </div>
                <div className={`flex ${format === '3in' ? 'justify-between' : 'justify-end gap-2'}`}>
                  <span className="text-slate-400">Date:</span>
                  <span className="font-medium text-slate-800">{formattedDate}</span>
                </div>
                <div className={`flex ${format === '3in' ? 'justify-between' : 'justify-end gap-2'}`}>
                  <span className="text-slate-400">Tracking:</span>
                  <span className="font-mono font-medium text-slate-800">{trackingNumber}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 my-2.5"></div>

          {/* Deliver To + Barcode & QR Code Section */}
          <div className={`${format === '3in' ? 'space-y-3' : 'flex items-start justify-between gap-4'} mb-3`}>
            {/* Customer Details */}
            <div className="space-y-0.5">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 block">
                DELIVER TO
              </span>
              <h3 className="text-xs font-semibold text-slate-900">{order.customerName}</h3>
              <p className="font-mono font-medium text-slate-700 text-[10px]">{order.phone}</p>
              <p className="text-slate-600 text-[10px] max-w-[240px] leading-tight">
                {order.address}{order.thana ? `, ${order.thana}` : ''}{order.district ? `, ${order.district}` : ''}
              </p>
            </div>

            {/* Barcode & QR Code Block */}
            <div className={`flex ${format === '3in' ? 'flex-col items-center gap-2 pt-1' : 'items-center gap-3'} shrink-0`}>
              <div className="flex flex-col items-center">
                <svg ref={barcodeRef} className="max-w-[150px] h-auto"></svg>
              </div>

              {qrCodeDataUrl && (
                <div className="w-[50px] h-[50px] border border-slate-200 rounded p-0.5 shrink-0 bg-white">
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Description & Amount Table */}
          <div className="mb-3">
            <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
              <span>DESCRIPTION</span>
              <span>AMOUNT</span>
            </div>
            
            <div className="py-2 flex justify-between items-center text-[11px] border-b border-slate-100">
              <span className="font-medium text-slate-800">Parcel #{parcelId}</span>
              <span className="font-mono font-semibold text-slate-900">৳{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Amount To Collect Box */}
          <div className="my-3 p-2.5 sm:p-3 rounded-lg border border-emerald-400 bg-emerald-50/60 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900">
              AMOUNT TO COLLECT (COD)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-800">
              ৳{totalAmount.toLocaleString()}
            </span>
          </div>

          {/* Note Section */}
          {noteContent && (
            <div className="border-l-2 border-slate-200 pl-2.5 py-0.5 my-2.5 text-[10px]">
              <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400 block">
                NOTE
              </span>
              <p className="text-slate-700 leading-snug">{noteContent}</p>
            </div>
          )}

          {/* Footer with Powered by Steadfast */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
            <span>Thank you for your order.</span>
            <div className="flex items-center gap-1.5 font-normal">
              <span>Powered by</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <svg className="w-3 h-3 text-[#00A86B] fill-current" viewBox="0 0 24 24">
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
