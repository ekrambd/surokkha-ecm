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
      signal: AbortSignal.timeout(5000)
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
      // Official Steadfast API 2026 update:
      // Old endpoint (/fraud_check/{phone}) was sunset on 27 Sept 2026 and returns 0.
      // New official endpoint is: GET /fraud_check/score/{phone}
      let resData = await this.request(`/fraud_check/score/${encodeURIComponent(cleanPhone)}`).catch((err) => {
        console.warn(`[Steadfast] /fraud_check/score/${cleanPhone} error:`, err?.message || err);
        return null;
      });
      
      // Fallback to old endpoint if score endpoint fails
      if (!resData) {
        resData = await this.request(`/fraud_check/${encodeURIComponent(cleanPhone)}`).catch((err) => {
          console.warn(`[Steadfast] /fraud_check/${cleanPhone} error:`, err?.message || err);
          return null;
        });
      }

      console.log(`[Steadfast] Fraud check response for ${cleanPhone}:`, JSON.stringify(resData));

      if (resData) {
        const payload = resData.data || resData;

        // Support new score endpoint properties
        const deliveryRatioNum = payload.delivery_ratio !== undefined && payload.delivery_ratio !== null ? Number(payload.delivery_ratio) : null;
        const cancellationRatioNum = payload.cancellation_ratio !== undefined && payload.cancellation_ratio !== null ? Number(payload.cancellation_ratio) : 0;
        const volumeRangeStr = payload.volume_range || payload.volume_band || '';
        
        // Delivered and parcel counts
        const deliveredCount = payload.delivered_count !== null && payload.delivered_count !== undefined 
          ? Number(payload.delivered_count) 
          : Number(payload.total_delivered || 0);
          
        const cancelledCount = payload.cancelled_count !== null && payload.cancelled_count !== undefined 
          ? Number(payload.cancelled_count) 
          : Number(payload.total_cancelled || 0);

        const totalParcels = Number(payload.Total_parcels ?? payload.total_parcels ?? payload.total_orders ?? (deliveredCount + cancelledCount));
        
        const fraudReportsRaw = payload.total_fraud_reports ?? payload.total_reports ?? [];
        const totalReports = Array.isArray(fraudReportsRaw) ? fraudReportsRaw.length : Number(fraudReportsRaw || 0);

        // History detection: check if delivery_ratio is provided OR volume_range indicates parcels OR counts > 0
        const hasHistory = (deliveryRatioNum !== null && !isNaN(deliveryRatioNum)) || 
                           (volumeRangeStr && volumeRangeStr !== '0') || 
                           totalParcels > 0;

        let finalDeliveryRatio = deliveryRatioNum;
        if (finalDeliveryRatio === null && totalParcels > 0) {
          finalDeliveryRatio = Math.round((deliveredCount / totalParcels) * 100);
        }

        let finalCancellationRatio = cancellationRatioNum;
        if ((finalCancellationRatio === 0 || finalCancellationRatio === null) && totalParcels > 0 && cancelledCount > 0) {
          finalCancellationRatio = Math.round((cancelledCount / totalParcels) * 100);
        }

        return {
          success: true,
          phone: cleanPhone,
          hasHistory,
          deliveryRatio: finalDeliveryRatio,
          cancellationRatio: finalCancellationRatio,
          totalParcels: totalParcels > 0 ? totalParcels : (volumeRangeStr || '10+'),
          deliveredCount,
          cancelledCount,
          totalReports,
          volumeRange: volumeRangeStr || (totalParcels > 0 ? `${totalParcels}` : '0'),
          volumeBand: payload.volume_band || '',
          fraudCategories: Array.isArray(payload.fraud_categories) ? payload.fraud_categories : [],
          reasons: Array.isArray(payload.reasons) ? payload.reasons : [],
          score: payload.score,
          level: payload.level,
          source: 'steadfast'
        };
      }

      return {
        success: false,
        phone: cleanPhone,
        message: 'No records found'
      };
    } catch (err: any) {
      return {
        success: true,
        phone: cleanPhone,
        hasHistory: false,
        deliveryRatio: null,
        cancellationRatio: 0,
        totalParcels: 0,
        deliveredCount: 0,
        cancelledCount: 0,
        totalReports: 0,
        volumeRange: '0',
        source: 'steadfast',
        message: err?.message || 'Steadfast fraud check failed'
      };
    }
  }
}
