/**
 * Web Push Notification Handler
 * Standalone notification helper without Firebase client dependencies.
 */
export async function requestNotificationPermission(_phone?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return 'granted';
    }
  } catch (error) {
    console.warn('Notification permission request:', error);
  }
  return null;
}
