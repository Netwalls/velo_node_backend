import axios from 'axios';
const MONOLITH_URL = process.env.MONOLITH_URL;

export class NotificationService {
  static async notifyRegistration(userId: string, payload: any) {
    if (MONOLITH_URL) {
      try {
        await axios.post(`${MONOLITH_URL}/internal/notifications/registration`, { userId, payload });
        return;
      } catch (err) {
        console.warn('Forward to monolith notification failed', err);
      }
    }
    console.log('NotifyRegistration:', userId, payload);
  }

  static async notifyLogin(userId: string, payload: any) {
    if (MONOLITH_URL) {
      try {
        await axios.post(`${MONOLITH_URL}/internal/notifications/login`, { userId, payload });
        return;
      } catch (err) {
        console.warn('Forward to monolith notification failed', err);
      }
    }
    console.log('NotifyLogin:', userId, payload);
  }

  static async notifyOTPVerified(userId: string, payload: any) {
    if (MONOLITH_URL) {
      try {
        await axios.post(`${MONOLITH_URL}/internal/notifications/otp-verified`, { userId, payload });
        return;
      } catch (err) {
        console.warn('Forward to monolith notification failed', err);
      }
    }
    console.log('NotifyOTPVerified:', userId, payload);
  }

  static async createNotification(userId: string, type: string, title: string, body: string, meta?: any) {
    if (MONOLITH_URL) {
      try {
        await axios.post(`${MONOLITH_URL}/internal/notifications/create`, { userId, type, title, body, meta });
        return;
      } catch (err) {
        console.warn('Forward to monolith create notification failed', err);
      }
    }
    console.log('CreateNotification:', { userId, type, title, body, meta });
  }
}
