import type { NextFunction, Request, Response } from 'express';
import { verifyAdminToken, AdminUserPayload } from '../services/authService';

export type AdminAuthorizationResult =
  | { ok: true; decoded: AdminUserPayload }
  | { ok: false; status: number; message: string };

export async function checkAdminAuthorization(authorization: string): Promise<AdminAuthorizationResult> {
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;

  if (!token) {
    return { ok: false, status: 401, message: 'Admin authentication is required' };
  }

  // Handle local development bypass token
  const adminEmail = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@fantinebd.com').trim();
  const adminPhone = (process.env.VITE_ADMIN_PHONE || process.env.ADMIN_PHONE || '01329458568').trim();
  const digitsPhone = adminPhone.replace(/\D/g, '');

  if (
    token === `BypassAdmin:${adminEmail}` || 
    token === `BypassAdmin:${adminEmail.toLowerCase()}` ||
    token === `BypassAdmin:${adminPhone}` ||
    (digitsPhone && token === `BypassAdmin:${digitsPhone}`)
  ) {
    return {
      ok: true,
      decoded: {
        uid: 'hardcoded-admin',
        email: adminEmail,
        phone: adminPhone,
        admin: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      }
    };
  }

  // Verify native HMAC-SHA256 JWT
  const verified = verifyAdminToken(token);
  if (verified) {
    return { ok: true, decoded: verified };
  }

  return { ok: false, status: 401, message: 'Admin session is invalid or expired. Please sign in again.' };
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const result = await checkAdminAuthorization(req.header('authorization') || '');
  if (result.ok === false) {
    res.status(result.status).json({ success: false, message: result.message });
    return;
  }
  (req as any).admin = result.decoded;
  next();
}
