import axios, { AxiosResponse } from 'axios';
import { logger } from './logger';

// Types for SMSFresh API integration
export interface SMSFreshConfig {
  apiKey: string;
  apiUrl: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface SMSFreshTextParams {
  phone: string[]; // 10-digit numbers without +91
  templateName: string;
  parameters?: string[];
}

export interface SMSFreshMediaParams extends SMSFreshTextParams {
  mediaType: 'image' | 'video' | 'document';
  mediaUrl: string;
}

export interface SMSFreshOTPParams {
  phone: string[];
  templateName: string;
  otp: string;
}

export interface SMSFreshReplyParams {
  phone: string;
  text: string;
}

export interface SMSFreshResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'failed';
  data?: any;
}

export interface SMSFreshWebhookPayload {
  messageId: string;
  phone: string;
  status: 'delivered' | 'read' | 'failed' | 'replied';
  content?: string;
  timestamp: string;
  type: 'SMS' | 'WHATSAPP';
}

class SMSFreshService {
  private config: SMSFreshConfig;
  private axiosInstance;

  constructor(config: SMSFreshConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.info('SMSFresh API Request', {
          url: config.url,
          method: config.method,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('SMSFresh API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.info('SMSFresh API Response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error('SMSFresh API Response Error', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send normal text WhatsApp message
   * Requirements: 4.1
   */
  async sendWhatsAppText(params: SMSFreshTextParams): Promise<SMSFreshResponse> {
    try {
      const payload = {
        type: 'whatsapp',
        recipients: this.formatPhoneNumbers(params.phone),
        template: params.templateName,
        parameters: params.parameters || [],
      };

      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/whatsapp/text', payload)
      );

      return {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent',
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp text message', error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Send WhatsApp message with media attachments
   * Requirements: 4.3
   */
  async sendWhatsAppMedia(params: SMSFreshMediaParams): Promise<SMSFreshResponse> {
    try {
      const payload = {
        type: 'whatsapp',
        recipients: this.formatPhoneNumbers(params.phone),
        template: params.templateName,
        parameters: params.parameters || [],
        media: {
          type: params.mediaType,
          url: params.mediaUrl,
        },
      };

      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/whatsapp/media', payload)
      );

      return {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent',
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp media message', error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Send authentication OTP message
   * Requirements: 4.4
   */
  async sendAuthOTP(params: SMSFreshOTPParams): Promise<SMSFreshResponse> {
    try {
      const payload = {
        type: 'whatsapp',
        recipients: this.formatPhoneNumbers(params.phone),
        template: params.templateName,
        parameters: [params.otp],
        priority: 'high', // OTP messages should have high priority
      };

      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/whatsapp/otp', payload)
      );

      return {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent',
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to send OTP message', error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Send reply text message (for customer responses)
   * Requirements: 4.2
   */
  async sendReplyText(params: SMSFreshReplyParams): Promise<SMSFreshResponse> {
    try {
      const payload = {
        type: 'whatsapp',
        recipient: this.formatPhoneNumber(params.phone),
        message: params.text,
        isReply: true,
      };

      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/whatsapp/reply', payload)
      );

      return {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent',
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to send reply text message', error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Send SMS message (fallback option)
   */
  async sendSMS(params: SMSFreshTextParams): Promise<SMSFreshResponse> {
    try {
      const payload = {
        type: 'sms',
        recipients: this.formatPhoneNumbers(params.phone),
        template: params.templateName,
        parameters: params.parameters || [],
      };

      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/sms', payload)
      );

      return {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent',
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to send SMS message', error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<SMSFreshResponse> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(
        `/messages/${messageId}/status`
      );

      return {
        success: true,
        deliveryStatus: response.data.status,
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to get message status', error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Get account balance and credits
   */
  async getAccountBalance(): Promise<SMSFreshResponse> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get('/account/balance');

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to get account balance', error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Validate webhook signature (for security)
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Failed to validate webhook signature', error);
      return false;
    }
  }

  // Private helper methods

  private formatPhoneNumbers(phones: string[]): string[] {
    return phones.map(phone => this.formatPhoneNumber(phone));
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Remove +91 prefix if present
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned.substring(2);
    }
    
    // Ensure 10-digit format
    if (cleaned.length === 10) {
      return cleaned;
    }
    
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt < this.config.retryAttempts!) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn(`SMSFresh API retry attempt ${attempt + 1} after ${delay}ms`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, attempt + 1);
      }
      throw error;
    }
  }

  private extractErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}

// Singleton instance
let smsFreshServiceInstance: SMSFreshService | null = null;

export function createSMSFreshService(): SMSFreshService {
  if (!smsFreshServiceInstance) {
    const config: SMSFreshConfig = {
      apiKey: process.env.SMSFRESH_API_KEY || '',
      apiUrl: process.env.SMSFRESH_API_URL || '',
    };

    if (!config.apiKey || !config.apiUrl) {
      throw new Error('SMSFresh API configuration is missing. Please set SMSFRESH_API_KEY and SMSFRESH_API_URL environment variables.');
    }

    smsFreshServiceInstance = new SMSFreshService(config);
  }

  return smsFreshServiceInstance;
}

export { SMSFreshService };