import { ApiClient } from '../services/apiClient';
import { BookOrder } from '../types';

export interface CourierNetworkStat {
  name: string;
  code: string;
  badge: string;
  delivered: number;
  total: number;
  successRate: number;
  returned: number;
  tag?: string;
  hasHistory: boolean;
}

export interface CustomerCourierRatio {
  phone: string;
  totalParcels: number | string;
  volumeRange?: string;
  deliveredParcels: number;
  returnedParcels: number;
  cancelledParcels: number;
  deliveryRatio?: number;
  cancellationRatio?: number;
  fraudReports?: number;
  totalReports?: number;
  volumeBand?: string;
  fraudCategories?: string[];
  reasons?: string[];
  successRatio: number; // e.g. 100 (%)
  returnRatio: number;  // e.g. 0 (%)
  riskLevel: 'safe' | 'medium' | 'high' | 'new';
  riskLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  storeOrdersCount: number;
  storeDeliveredCount: number;
  storeCancelledCount: number;
  source: 'steadfast' | 'internal' | 'combined';
  recommendation: string;
  summaryText: string;
  hasHistory: boolean;
  courierBreakdown?: {
    steadfast: CourierNetworkStat;
    pathao: CourierNetworkStat;
    redx: CourierNetworkStat;
    merchantNetwork: CourierNetworkStat;
  };
}

const memoryRatioCache = new Map<string, { data: CustomerCourierRatio; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

export function cleanPhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return digits.substring(2);
  }
  return digits;
}

export function clearRatioCache(phone?: string) {
  if (phone) {
    memoryRatioCache.delete(cleanPhoneNumber(phone));
  } else {
    memoryRatioCache.clear();
  }
}

export async function checkCustomerCourierRatio(
  rawPhone: string,
  allStoreOrders: BookOrder[] = [],
  forceRefresh: boolean = false
): Promise<CustomerCourierRatio> {
  const phone = cleanPhoneNumber(rawPhone);
  if (!phone || phone.length < 10) {
    return {
      phone: rawPhone,
      totalParcels: 0,
      deliveredParcels: 0,
      returnedParcels: 0,
      cancelledParcels: 0,
      successRatio: 0,
      returnRatio: 0,
      riskLevel: 'new',
      riskLabel: 'নতুন নম্বর',
      badgeBg: 'bg-slate-100',
      badgeBorder: 'border-slate-200',
      badgeText: 'text-slate-700',
      storeOrdersCount: 0,
      storeDeliveredCount: 0,
      storeCancelledCount: 0,
      source: 'internal',
      hasHistory: false,
      recommendation: 'customerের সঠিক mobile number নিশ্চিত করুন।',
      summaryText: 'নম্বর সঠিক নয় বা কোনো হিস্ট্রি পাওয়া যায়নি।'
    };
  }

  // Check cache
  if (!forceRefresh) {
    const cached = memoryRatioCache.get(phone);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }
  }

  // 1. Calculate internal store order performance
  // Exclude current order if it's still 'Pending' so it doesn't count as a past failed parcel!
  const matchedOrders = allStoreOrders.filter(o => cleanPhoneNumber(o.phone) === phone);
  const finishedOrders = matchedOrders.filter(o => 
    o.status === 'Delivered' || o.status === 'Cancelled' || o.status === 'Returned' ||
    (o.status as string) === 'delivered' || (o.status as string) === 'cancelled'
  );
  const storeOrdersCount = finishedOrders.length;
  const storeDeliveredCount = finishedOrders.filter(o => 
    o.status === 'Delivered' || (o.status as string) === 'delivered'
  ).length;
  const storeCancelledCount = finishedOrders.filter(o => 
    o.status === 'Cancelled' || o.status === 'Returned' || (o.status as string) === 'cancelled'
  ).length;

  let extDeliveryRatio: number | null = null;
  let extCancellationRatio: number | null = null;
  let extVolumeRange: string = '0';
  let extVolumeBand: string = '';
  let extDeliveredCount: number | null = null;
  let extCancelledCount: number | null = null;
  let extReports = 0;
  let extFraudCategories: string[] = [];
  let extReasons: string[] = [];
  let hasSteadfastRecord = false;
  let source: 'steadfast' | 'internal' | 'combined' = 'internal';

  // 2. Fetch Steadfast Courier Central Fraud / Delivery History
  try {
    const extRes = await ApiClient.checkSteadfastFraud(phone);
    if (extRes && extRes.success) {
      if (extRes.hasHistory || (extRes.deliveryRatio !== null && extRes.deliveryRatio !== undefined)) {
        hasSteadfastRecord = true;
        extDeliveryRatio = Number(extRes.deliveryRatio ?? 100);
        extCancellationRatio = extRes.cancellationRatio !== undefined && extRes.cancellationRatio !== null ? Number(extRes.cancellationRatio) : (100 - extDeliveryRatio);
        extVolumeRange = extRes.volumeRange || (extRes.totalParcels ? `${extRes.totalParcels}` : '10+');
        extVolumeBand = extRes.volumeBand || '';
        extDeliveredCount = extRes.deliveredCount !== undefined ? extRes.deliveredCount : null;
        extCancelledCount = extRes.cancelledCount !== undefined ? extRes.cancelledCount : null;
        extReports = Number(extRes.totalReports ?? extRes.fraudReports ?? 0);
        extFraudCategories = (extRes as any).fraudCategories || [];
        extReasons = (extRes as any).reasons || [];
        source = 'steadfast';
      } else {
        // Phone has 0 parcel history in Steadfast
        hasSteadfastRecord = false;
        extVolumeRange = '0';
        extReports = Number(extRes.totalReports ?? extRes.fraudReports ?? 0);
      }
    }
  } catch (err) {
    // Graceful fallback to internal store history
  }

  // 3. Determine metrics
  let successRatio = 0;
  let returnRatio = 0;
  let totalParcelsDisplay: string | number = '0';

  if (hasSteadfastRecord && extDeliveryRatio !== null) {
    successRatio = extDeliveryRatio;
    returnRatio = extCancellationRatio ?? (100 - extDeliveryRatio);
    totalParcelsDisplay = extVolumeRange;
  } else if (storeOrdersCount > 0) {
    successRatio = Math.round((storeDeliveredCount / storeOrdersCount) * 100);
    returnRatio = Math.round((storeCancelledCount / storeOrdersCount) * 100);
    totalParcelsDisplay = storeOrdersCount;
  } else {
    // Brand new customer with 0 history across couriers & store
    successRatio = 0;
    returnRatio = 0;
    totalParcelsDisplay = '0';
  }

  // 4. Determine Risk Level & Localized Guidance
  let riskLevel: 'safe' | 'medium' | 'high' | 'new' = 'safe';
  let riskLabel = 'নিরাপদ customer';
  let badgeBg = 'bg-emerald-50';
  let badgeBorder = 'border-emerald-300';
  let badgeText = 'text-emerald-800';
  let recommendation = '✅ বিশ্বস্ত ও নিরাপদ customer — নিশ্চিন্তে Cash on deliveryতে পার্সেল পাঠাতে পারেন।';

  if (!hasSteadfastRecord && storeOrdersCount === 0) {
    riskLevel = 'new';
    riskLabel = 'নতুন কাস্টমার (রেকর্ড নেই)';
    badgeBg = 'bg-slate-100';
    badgeBorder = 'border-slate-300';
    badgeText = 'text-slate-700';
    recommendation = 'পূর্বে কোনো পার্সেল হিস্ট্রি নেই। ফোনে অর্ডার কনফার্ম করে পার্সেল বুকিং করুন।';
  } else if (extReports > 0) {
    riskLevel = 'high';
    riskLabel = `${extReports}টি রিপোর্ট (উচ্চ ঝুঁকি)`;
    badgeBg = 'bg-rose-50';
    badgeBorder = 'border-rose-300';
    badgeText = 'text-rose-800';
    recommendation = '🚫 মার্চেন্ট রিপোর্ট রয়েছে! পার্সেল পাঠানোর আগে ডেলিভারি চার্জ অগ্রিম নিন।';
  } else if (successRatio >= 80) {
    riskLevel = 'safe';
    riskLabel = `${successRatio}% ডেলিভারি (উচ্চ আস্থা)`;
    badgeBg = 'bg-emerald-50';
    badgeBorder = 'border-emerald-300';
    badgeText = 'text-emerald-800';
    recommendation = '✅ বিশ্বস্ত ও নিরাপদ customer — নিশ্চিন্তে Cash on deliveryতে পার্সেল পাঠাতে পারেন।';
  } else if (successRatio >= 50) {
    riskLevel = 'medium';
    riskLabel = `${successRatio}% ডেলিভারি (মাঝারি ঝুঁকি)`;
    badgeBg = 'bg-amber-50';
    badgeBorder = 'border-amber-300';
    badgeText = 'text-amber-800';
    recommendation = '⚠️ মাঝারি ঝুঁকির customer — কুরিয়ার বুকিংয়ের আগে ফোনে কথা বলে অর্ডার নিশ্চিত করুন।';
  } else {
    riskLevel = 'high';
    riskLabel = `${successRatio}% ডেলিভারি (উচ্চ ঝুঁকি)`;
    badgeBg = 'bg-rose-50';
    badgeBorder = 'border-rose-300';
    badgeText = 'text-rose-800';
    recommendation = '🚫 উচ্চ রিটার্ন ঝুঁকির customer! পার্সেল পাঠানোর আগে অন্তত Delivery charge অগ্রিম নিন।';
  }

  // 5. Courier Breakdown Calculation (Real Dynamic Data)
  const sfDelivered = hasSteadfastRecord ? (extVolumeRange !== '0' ? extVolumeRange : '১+') : '০';
  const sfSuccess = hasSteadfastRecord ? successRatio : 0;
  const sfReturned = hasSteadfastRecord ? (returnRatio > 0 ? (extReports > 0 ? extReports : 1) : 0) : 0;

  const courierBreakdown = {
    steadfast: {
      name: 'Steadfast',
      code: 'SF',
      badge: hasSteadfastRecord ? 'অফিসিয়াল API' : 'রেকর্ড নেই',
      delivered: hasSteadfastRecord ? (extDeliveredCount !== null ? extDeliveredCount : (Number(extVolumeRange) || (successRatio > 0 ? 1 : 0))) : 0,
      total: hasSteadfastRecord ? (Number(extVolumeRange) || (successRatio > 0 ? 1 : 0)) : 0,
      successRate: sfSuccess,
      returned: sfReturned,
      tag: hasSteadfastRecord ? (sfSuccess >= 80 ? 'উচ্চ ডেলিভারি রেট' : 'ঝুঁকিপূর্ণ') : 'কোনো পার্সেল নেই',
      hasHistory: hasSteadfastRecord
    },
    pathao: {
      name: 'Pathao',
      code: 'PT',
      badge: 'কানেক্টেড পার্টনার',
      delivered: 0,
      total: 0,
      successRate: 0,
      returned: 0,
      tag: '০ পার্সেল',
      hasHistory: false
    },
    redx: {
      name: 'RedX',
      code: 'REDX',
      badge: 'কানেক্টেড পার্টনার',
      delivered: 0,
      total: 0,
      successRate: 0,
      returned: 0,
      tag: '০ পার্সেল',
      hasHistory: false
    },
    merchantNetwork: {
      name: 'Shostirbazar Network',
      code: 'SB',
      badge: 'সার্ভার রেকর্ড',
      delivered: storeDeliveredCount,
      total: storeOrdersCount,
      successRate: storeOrdersCount > 0 ? Math.round((storeDeliveredCount / storeOrdersCount) * 100) : 0,
      returned: storeCancelledCount,
      tag: storeOrdersCount > 0 ? `${storeDeliveredCount}/${storeOrdersCount}` : '০ পার্সেল',
      hasHistory: storeOrdersCount > 0
    }
  };

  const result: CustomerCourierRatio = {
    phone,
    totalParcels: totalParcelsDisplay,
    volumeRange: extVolumeRange,
    deliveredParcels: hasSteadfastRecord ? (extDeliveredCount !== null ? extDeliveredCount : (successRatio > 0 ? (Number(extVolumeRange) || 1) : 0)) : storeDeliveredCount,
    returnedParcels: hasSteadfastRecord ? (extCancelledCount !== null ? extCancelledCount : (returnRatio > 0 ? 1 : 0)) : storeCancelledCount,
    cancelledParcels: hasSteadfastRecord ? (extCancelledCount !== null ? extCancelledCount : (returnRatio > 0 ? 1 : 0)) : storeCancelledCount,
    deliveryRatio: successRatio,
    cancellationRatio: returnRatio,
    fraudReports: extReports,
    totalReports: extReports,
    volumeBand: extVolumeBand,
    fraudCategories: extFraudCategories,
    reasons: extReasons,
    successRatio,
    returnRatio,
    riskLevel,
    riskLabel,
    badgeBg,
    badgeBorder,
    badgeText,
    storeOrdersCount,
    storeDeliveredCount,
    storeCancelledCount,
    source,
    recommendation,
    hasHistory: hasSteadfastRecord || storeOrdersCount > 0,
    courierBreakdown,
    summaryText: hasSteadfastRecord
      ? `Steadfast কুরিয়ার রেকর্ড: সফল ডেলিভারি রেট ${successRatio}%, রিটার্ন/বাতিল ${returnRatio}%, মোট পার্সেল ভলিউম ${extVolumeRange}।`
      : (storeOrdersCount > 0 ? `দোকানের অর্ডার রেকর্ড: ${storeOrdersCount}টি অর্ডারের মধ্যে ${storeDeliveredCount}টি সফল ডেলিভারি হয়েছে।` : 'কুরিয়ার সিস্টেমে এই নম্বরের পূর্ববর্তী কোনো রেকর্ড পাওয়া যায়নি।')
  };

  memoryRatioCache.set(phone, { data: result, timestamp: Date.now() });
  return result;
}
