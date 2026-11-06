/**
 * SMS in BD (smsinbd.com) Gateway Service
 * Provides modern API integration for order notification, OTP, and bulk SMS.
 */

export interface SendSmsOptions {
  phone: string;
  message: string;
  senderId?: string;
  apiKey?: string;
}

export class SmsInBdService {
  private static readonly BASE_URL = 'https://login.smsinbd.com/api/external/v1';

  private static getCredentials(customApiKey?: string, customSenderId?: string) {
    const apiKey = customApiKey || process.env.SMSINBD_API_KEY || 'smsk_6jffMCulKhJfomMuS7iHVbvSP6an9x70b5Uj1Tye';
    const senderId = customSenderId || process.env.SMSINBD_SENDER_ID || '8809606776711';
    return { apiKey, senderId };
  }

  /**
   * Normalizes Bangladeshi phone numbers into 880XXXXXXXXXX or +880XXXXXXXXXX
   */
  public static normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('880')) return digits;
    if (digits.startsWith('01') && digits.length === 11) return '88' + digits;
    if (digits.startsWith('1') && digits.length === 10) return '880' + digits;
    return digits;
  }

  /**
   * Send single SMS via modern external API endpoint
   */
  public static async sendSms(options: SendSmsOptions): Promise<{ success: boolean; data?: any; error?: string }> {
    const { apiKey, senderId } = this.getCredentials(options.apiKey, options.senderId);
    const cleanPhone = this.normalizePhone(options.phone);

    if (!cleanPhone || cleanPhone.length < 11) {
      return { success: false, error: 'Invalid Bangladeshi phone number' };
    }

    try {
      const response = await fetch(`${this.BASE_URL}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey
        },
        body: JSON.stringify({
          sender_id: senderId,
          phone: cleanPhone,
          message: options.message
        })
      });

      const resData = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          error: resData?.message || `SMS Gateway HTTP ${response.status}`
        };
      }

      return {
        success: true,
        data: resData
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to dispatch SMS'
      };
    }
  }

  /**
   * Send Order Confirmation SMS to Customer
   */
  public static async sendOrderConfirmationSms(order: {
    customerName: string;
    phone: string;
    id: string;
    totalAmount?: number;
    price?: number;
  }) {
    const total = order.totalAmount || order.price || 0;
    const msg = `ধন্যবাদ ${order.customerName}! Shostir Bazar-এ আপনার অর্ডার #${order.id} নিশ্চিত হয়েছে। মোট বিল: ৳${total}। কুরিয়ারে দ্রুত পাঠানো হচ্ছে।`;
    return this.sendSms({
      phone: order.phone,
      message: msg
    });
  }
}
