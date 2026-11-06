export interface DispatchParams {
  order: {
    id: string;
    customerName: string;
    phone: string;
    address: string;
    district?: string;
    totalPrice: number;
    status: string;
    productTitle?: string;
    paymentMethod?: string;
    steadfastTrackingCode?: string;
  };
}

export class SteadfastCourierService {
  private static readonly DEFAULT_API_KEY = 'w31xqya3s08mfpqgsj5n7vjxnmarxaqj';
  private static readonly DEFAULT_SECRET_KEY = '5nwxokmj1o3vp0h5qk3idpvb';
  private static readonly DEFAULT_BASE_URL = 'https://portal.packzy.com/api/v1';

  private static getConfig() {
    const apiKey = (process.env.STEADFAST_API_KEY || this.DEFAULT_API_KEY).trim();
    const secretKey = (process.env.STEADFAST_SECRET_KEY || this.DEFAULT_SECRET_KEY).trim();
    const baseUrl = (process.env.STEADFAST_BASE_URL || this.DEFAULT_BASE_URL).replace(/\/$/, '').trim();
    if (!apiKey || !secretKey) throw new Error('Steadfast credentials are not configured on the server');
    return { apiKey, secretKey, baseUrl };
  }

  private static async request(path: string, init?: RequestInit) {
    const { apiKey, secretKey, baseUrl } = this.getConfig();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        ...init?.headers
      },
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || (data.status && Number(data.status) >= 400)) {
      throw new Error(data.message || `Steadfast returned HTTP ${response.status}`);
    }
    return data;
  }

  static async testConnection() {
    const data = await this.request('/get_balance');
    if (Number(data.status) !== 200) throw new Error(data.message || 'Steadfast credentials were rejected');
    return { success: true, balance: Number(data.current_balance || 0), message: 'Steadfast API connection verified' };
  }

  static async dispatchOrder(params: DispatchParams) {
    const { order } = params;
    if (!order?.id || !order.customerName || !order.phone || !order.address) {
      throw new Error('Order name, phone, address, and invoice are required');
    }
    if (order.steadfastTrackingCode) throw new Error('This order already has a Steadfast tracking code');

    try {
      const pm = (order.paymentMethod || '').trim().toLowerCase();
      const isCod = !pm || pm === 'cod' || pm.includes('cash');
      const isPrepaid = !isCod;
      const codAmount = isPrepaid ? 0 : Number(order.totalPrice || 0);

      const resData = await this.request('/create_order', {
        method: "POST",
        body: JSON.stringify({
          invoice: order.id,
          recipient_name: order.customerName,
          recipient_phone: order.phone,
          recipient_address: `${order.address}${order.district ? `, ${order.district}` : ''}`,
          cod_amount: codAmount,
          note: order.productTitle || 'Ecommerce Parcel'
        })
      });

      if (Number(resData.status) === 200 && (resData.consignment?.consignment_id || resData.consignment?.tracking_code)) {
        const trackingCode = String(resData.consignment.consignment_id || resData.consignment.tracking_code);
        return {
          success: true,
          trackingCode,
          message: "Parcel entry has been successfully made to Steadfast Courier!"
        };
      }

      throw new Error(resData.message || "Steadfast did not return a tracking code");
    } catch (error: any) {
      console.error("Steadfast API error:", error);
      throw new Error(error?.message || "Courier dispatch failed");
    }
  }

  static async getStatus(trackingCode: string) {
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(trackingCode)) throw new Error('Invalid Steadfast tracking code');
    const isNumeric = /^\d+$/.test(trackingCode);
    const endpoint = isNumeric ? `/status_by_cid/${encodeURIComponent(trackingCode)}` : `/status_by_trackingcode/${encodeURIComponent(trackingCode)}`;
    const data = await this.request(endpoint);
    if (Number(data.status) !== 200 || !data.delivery_status) throw new Error(data.message || 'Courier status unavailable');
    return { success: true, status: String(data.delivery_status) };
  }

  static async checkDeliveryRatio(phone: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Valid 11-digit phone number is required');
    }

    try {
      // 1. Try modern official score endpoint: /fraud_check/score/{phone}
      let scoreData = await this.request(`/fraud_check/score/${encodeURIComponent(cleanPhone)}`).catch(() => null);

      // 2. Fallback to legacy endpoint if score endpoint fails
      if (!scoreData || scoreData.status === 404) {
        scoreData = await this.request(`/fraud_check/${encodeURIComponent(cleanPhone)}`).catch(() => null);
      }

      if (scoreData) {
        const payload = scoreData.data || scoreData;

        // If score endpoint returns null for delivery_ratio (or volume_band is 'none'),
        // it means this number has no finished parcels / no courier history on Steadfast.
        const hasHistory = payload.delivery_ratio !== null && payload.delivery_ratio !== undefined;

        // Extract delivery & cancellation ratio directly from Steadfast
        const deliveryRatio = hasHistory
          ? Number(payload.delivery_ratio)
          : (payload.total_parcels ? Math.round((Number(payload.total_delivered || 0) / Number(payload.total_parcels)) * 100) : null);

        const cancellationRatio = payload.cancellation_ratio !== undefined && payload.cancellation_ratio !== null
          ? Number(payload.cancellation_ratio)
          : (payload.total_parcels ? Math.round((Number(payload.total_cancelled || 0) / Number(payload.total_parcels)) * 100) : 0);

        // Extract Volume Band / Range: e.g. "10+", "25+", "50+", "100+" or exact number
        const volumeRange = payload.volume_range || (payload.volume_band !== 'none' && payload.volume_band ? payload.volume_band : (payload.total_parcels ? `${payload.total_parcels}` : '0'));
        const totalReports = Number(payload.total_reports ?? (Array.isArray(payload.total_fraud_reports) ? payload.total_fraud_reports.length : 0));

        const deliveredCount = payload.delivered_count ?? payload.total_delivered ?? null;
        const cancelledCount = payload.cancelled_count ?? payload.total_cancelled ?? null;

        return {
          success: true,
          phone: cleanPhone,
          hasHistory,
          deliveryRatio,
          cancellationRatio,
          volumeRange,
          volumeBand: payload.volume_band || 'unknown',
          totalReports,
          deliveredCount,
          cancelledCount,
          source: 'steadfast'
        };
      }

      return {
        success: false,
        phone: cleanPhone,
        message: 'No records found for this number'
      };
    } catch (err: any) {
      return {
        success: false,
        phone: cleanPhone,
        message: err.message || 'Steadfast fraud check failed'
      };
    }
  }
}
