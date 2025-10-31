import axios, { AxiosResponse } from 'axios';
import { logger } from './logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types for SMSFresh API integration
export interface SMSFreshConfig {
  apiKey: string;
  apiUrl: string;
  timeout?: number;
  retryAttempts?: number;
  enableQueue?: boolean;
  maxQueueSize?: number;
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
  errorCode?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'failed' | 'queued' | 'retry';
  data?: any;
  retryCount?: number;
  queuedAt?: string;
  sentAt?: string;
}

export interface MessageQueue {
  id: string;
  type: 'whatsapp_text' | 'whatsapp_media' | 'whatsapp_otp' | 'whatsapp_reply' | 'sms';
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  error?: string;
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
  private messageQueue: Map<string, MessageQueue> = new Map();
  private isProcessingQueue = false;
  private queueProcessingInterval?: NodeJS.Timeout;

  constructor(config: SMSFreshConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      enableQueue: true,
      maxQueueSize: 1000,
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

    // Initialize queue processing if enabled
    if (this.config.enableQueue) {
      this.startQueueProcessing();
    }
  }

  /**
   * Send normal text WhatsApp message with enhanced error handling and queuing
   * Requirements: 8.1, 8.3
   */
  async sendWhatsAppText(params: SMSFreshTextParams, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'): Promise<SMSFreshResponse> {
    try {
      const payload = {
        type: 'whatsapp',
        recipients: this.formatPhoneNumbers(params.phone),
        template: params.templateName,
        parameters: params.parameters || [],
      };

      // Check if we should queue the message or send immediately
      if (this.config.enableQueue && priority !== 'urgent') {
        return await this.queueMessage('whatsapp_text', payload, priority);
      }

      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/whatsapp/text', payload)
      );

      const result = {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent' as const,
        data: response.data,
        sentAt: new Date().toISOString(),
      };

      // Log successful send
      await this.logMessageSend(result, payload, 'whatsapp_text');
      
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: this.extractErrorMessage(error),
        errorCode: this.extractErrorCode(error),
        deliveryStatus: 'failed' as const,
      };

      // Log failed send
      await this.logMessageSend(errorResult, params, 'whatsapp_text', error);
      
      return errorResult;
    }
  }

  /**
   * Send WhatsApp message with media attachments with enhanced error handling
   * Requirements: 8.1, 8.3
   */
  async sendWhatsAppMedia(params: SMSFreshMediaParams, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'): Promise<SMSFreshResponse> {
    try {
      // Validate media URL before sending
      if (!this.isValidMediaUrl(params.mediaUrl)) {
        return {
          success: false,
          error: 'Invalid media URL provided',
          errorCode: 'INVALID_MEDIA_URL',
          deliveryStatus: 'failed',
        };
      }

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

      // Check if we should queue the message or send immediately
      if (this.config.enableQueue && priority !== 'urgent') {
        return await this.queueMessage('whatsapp_media', payload, priority);
      }

      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/whatsapp/media', payload)
      );

      const result = {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent' as const,
        data: response.data,
        sentAt: new Date().toISOString(),
      };

      // Log successful send
      await this.logMessageSend(result, payload, 'whatsapp_media');
      
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: this.extractErrorMessage(error),
        errorCode: this.extractErrorCode(error),
        deliveryStatus: 'failed' as const,
      };

      // Log failed send
      await this.logMessageSend(errorResult, params, 'whatsapp_media', error);
      
      return errorResult;
    }
  }

  /**
   * Send authentication OTP message with high priority
   * Requirements: 8.1, 8.3
   */
  async sendAuthOTP(params: SMSFreshOTPParams): Promise<SMSFreshResponse> {
    try {
      // Validate OTP format
      if (!this.isValidOTP(params.otp)) {
        return {
          success: false,
          error: 'Invalid OTP format',
          errorCode: 'INVALID_OTP_FORMAT',
          deliveryStatus: 'failed',
        };
      }

      const payload = {
        type: 'whatsapp',
        recipients: this.formatPhoneNumbers(params.phone),
        template: params.templateName,
        parameters: [params.otp],
        priority: 'high', // OTP messages should have high priority
      };

      // OTP messages are always sent immediately (urgent priority)
      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/whatsapp/otp', payload)
      );

      const result = {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent' as const,
        data: response.data,
        sentAt: new Date().toISOString(),
      };

      // Log successful send
      await this.logMessageSend(result, payload, 'whatsapp_otp');
      
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: this.extractErrorMessage(error),
        errorCode: this.extractErrorCode(error),
        deliveryStatus: 'failed' as const,
      };

      // Log failed send
      await this.logMessageSend(errorResult, params, 'whatsapp_otp', error);
      
      return errorResult;
    }
  }

  /**
   * Send reply text message (for customer responses) with enhanced handling
   * Requirements: 8.1, 8.3
   */
  async sendReplyText(params: SMSFreshReplyParams, priority: 'low' | 'normal' | 'high' | 'urgent' = 'high'): Promise<SMSFreshResponse> {
    try {
      // Validate message content
      if (!params.text || params.text.trim().length === 0) {
        return {
          success: false,
          error: 'Message content cannot be empty',
          errorCode: 'EMPTY_MESSAGE_CONTENT',
          deliveryStatus: 'failed',
        };
      }

      if (params.text.length > 4096) {
        return {
          success: false,
          error: 'Message content exceeds maximum length (4096 characters)',
          errorCode: 'MESSAGE_TOO_LONG',
          deliveryStatus: 'failed',
        };
      }

      const payload = {
        type: 'whatsapp',
        recipient: this.formatPhoneNumber(params.phone),
        message: params.text,
        isReply: true,
      };

      // Reply messages are typically high priority, but can be queued if not urgent
      if (this.config.enableQueue && priority !== 'urgent') {
        return await this.queueMessage('whatsapp_reply', payload, priority);
      }

      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/whatsapp/reply', payload)
      );

      const result = {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent' as const,
        data: response.data,
        sentAt: new Date().toISOString(),
      };

      // Log successful send
      await this.logMessageSend(result, payload, 'whatsapp_reply');
      
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: this.extractErrorMessage(error),
        errorCode: this.extractErrorCode(error),
        deliveryStatus: 'failed' as const,
      };

      // Log failed send
      await this.logMessageSend(errorResult, params, 'whatsapp_reply', error);
      
      return errorResult;
    }
  }

  /**
   * Send SMS message (fallback option) with enhanced error handling
   * Requirements: 8.3, 8.5
   */
  async sendSMS(params: SMSFreshTextParams, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'): Promise<SMSFreshResponse> {
    try {
      const payload = {
        type: 'sms',
        recipients: this.formatPhoneNumbers(params.phone),
        template: params.templateName,
        parameters: params.parameters || [],
      };

      // Check if we should queue the message or send immediately
      if (this.config.enableQueue && priority !== 'urgent') {
        return await this.queueMessage('sms', payload, priority);
      }

      const response: AxiosResponse = await this.executeWithRetry(
        () => this.axiosInstance.post('/messages/sms', payload)
      );

      const result = {
        success: true,
        messageId: response.data.messageId,
        deliveryStatus: 'sent' as const,
        data: response.data,
        sentAt: new Date().toISOString(),
      };

      // Log successful send
      await this.logMessageSend(result, payload, 'sms');
      
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: this.extractErrorMessage(error),
        errorCode: this.extractErrorCode(error),
        deliveryStatus: 'failed' as const,
      };

      // Log failed send
      await this.logMessageSend(errorResult, params, 'sms', error);
      
      return errorResult;
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

  /**
   * Queue message for later processing
   */
  private async queueMessage(type: MessageQueue['type'], payload: any, priority: 'low' | 'normal' | 'high' | 'urgent'): Promise<SMSFreshResponse> {
    try {
      if (this.messageQueue.size >= this.config.maxQueueSize!) {
        return {
          success: false,
          error: 'Message queue is full',
          errorCode: 'QUEUE_FULL',
          deliveryStatus: 'failed',
        };
      }

      const queueId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const queueItem: MessageQueue = {
        id: queueId,
        type,
        payload,
        priority,
        retryCount: 0,
        maxRetries: this.config.retryAttempts || 3,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.messageQueue.set(queueId, queueItem);

      logger.info('Message queued for processing', {
        queueId,
        type,
        priority,
        queueSize: this.messageQueue.size,
      });

      return {
        success: true,
        messageId: queueId,
        deliveryStatus: 'queued',
        queuedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to queue message', error);
      return {
        success: false,
        error: 'Failed to queue message',
        errorCode: 'QUEUE_ERROR',
        deliveryStatus: 'failed',
      };
    }
  }

  /**
   * Start processing the message queue
   */
  private startQueueProcessing(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
    }

    this.queueProcessingInterval = setInterval(async () => {
      if (!this.isProcessingQueue && this.messageQueue.size > 0) {
        await this.processQueue();
      }
    }, 5000); // Process queue every 5 seconds

    logger.info('Message queue processing started');
  }

  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    try {
      const pendingMessages = Array.from(this.messageQueue.values())
        .filter(item => item.status === 'pending' && (!item.nextRetryAt || item.nextRetryAt <= new Date()))
        .sort((a, b) => {
          // Sort by priority (urgent > high > normal > low) then by creation time
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

      // Process up to 5 messages at a time to avoid overwhelming the API
      const messagesToProcess = pendingMessages.slice(0, 5);

      for (const queueItem of messagesToProcess) {
        await this.processQueuedMessage(queueItem);
      }
    } catch (error) {
      logger.error('Error processing message queue', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Process a single queued message
   */
  private async processQueuedMessage(queueItem: MessageQueue): Promise<void> {
    try {
      queueItem.status = 'processing';
      queueItem.updatedAt = new Date();
      this.messageQueue.set(queueItem.id, queueItem);

      let result: SMSFreshResponse;

      switch (queueItem.type) {
        case 'whatsapp_text':
          result = await this.executeWithRetry(() => 
            this.axiosInstance.post('/messages/whatsapp/text', queueItem.payload)
          );
          break;
        case 'whatsapp_media':
          result = await this.executeWithRetry(() => 
            this.axiosInstance.post('/messages/whatsapp/media', queueItem.payload)
          );
          break;
        case 'whatsapp_otp':
          result = await this.executeWithRetry(() => 
            this.axiosInstance.post('/messages/whatsapp/otp', queueItem.payload)
          );
          break;
        case 'whatsapp_reply':
          result = await this.executeWithRetry(() => 
            this.axiosInstance.post('/messages/whatsapp/reply', queueItem.payload)
          );
          break;
        case 'sms':
          result = await this.executeWithRetry(() => 
            this.axiosInstance.post('/messages/sms', queueItem.payload)
          );
          break;
        default:
          throw new Error(`Unknown message type: ${queueItem.type}`);
      }

      // Mark as completed
      queueItem.status = 'completed';
      queueItem.updatedAt = new Date();
      this.messageQueue.set(queueItem.id, queueItem);

      // Log successful processing
      await this.logMessageSend({
        success: true,
        messageId: result.data?.messageId || queueItem.id,
        deliveryStatus: 'sent',
        data: result.data,
        sentAt: new Date().toISOString(),
      }, queueItem.payload, queueItem.type);

      logger.info('Queued message processed successfully', {
        queueId: queueItem.id,
        type: queueItem.type,
        messageId: result.data?.messageId,
      });

      // Remove from queue after successful processing
      setTimeout(() => {
        this.messageQueue.delete(queueItem.id);
      }, 60000); // Keep for 1 minute for status checking

    } catch (error) {
      queueItem.retryCount++;
      
      if (queueItem.retryCount >= queueItem.maxRetries) {
        queueItem.status = 'failed';
        queueItem.error = this.extractErrorMessage(error);
        
        // Log failed processing
        await this.logMessageSend({
          success: false,
          error: queueItem.error,
          errorCode: this.extractErrorCode(error),
          deliveryStatus: 'failed',
          retryCount: queueItem.retryCount,
        }, queueItem.payload, queueItem.type, error);

        logger.error('Queued message failed after max retries', {
          queueId: queueItem.id,
          type: queueItem.type,
          retryCount: queueItem.retryCount,
          error: queueItem.error,
        });
      } else {
        queueItem.status = 'pending';
        queueItem.nextRetryAt = new Date(Date.now() + Math.pow(2, queueItem.retryCount) * 1000);
        
        logger.warn('Queued message failed, scheduling retry', {
          queueId: queueItem.id,
          type: queueItem.type,
          retryCount: queueItem.retryCount,
          nextRetryAt: queueItem.nextRetryAt,
          error: this.extractErrorMessage(error),
        });
      }

      queueItem.updatedAt = new Date();
      this.messageQueue.set(queueItem.id, queueItem);
    }
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): { size: number; pending: number; processing: number; failed: number } {
    const items = Array.from(this.messageQueue.values());
    return {
      size: items.length,
      pending: items.filter(item => item.status === 'pending').length,
      processing: items.filter(item => item.status === 'processing').length,
      failed: items.filter(item => item.status === 'failed').length,
    };
  }

  /**
   * Clear failed messages from queue
   */
  public clearFailedMessages(): number {
    const failedItems = Array.from(this.messageQueue.entries())
      .filter(([_, item]) => item.status === 'failed');
    
    failedItems.forEach(([id, _]) => {
      this.messageQueue.delete(id);
    });

    logger.info('Cleared failed messages from queue', { count: failedItems.length });
    return failedItems.length;
  }

  /**
   * Stop queue processing
   */
  public stopQueueProcessing(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = undefined;
    }
    logger.info('Message queue processing stopped');
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

  private extractErrorCode(error: any): string {
    if (error.response?.data?.code) {
      return error.response.data.code;
    }
    if (error.response?.status) {
      return `HTTP_${error.response.status}`;
    }
    if (error.code) {
      return error.code;
    }
    return 'UNKNOWN_ERROR';
  }

  private isValidMediaUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  private isValidOTP(otp: string): boolean {
    // OTP should be 4-8 digits
    return /^\d{4,8}$/.test(otp);
  }

  private async logMessageSend(
    result: Partial<SMSFreshResponse>,
    payload: any,
    type: string,
    error?: any
  ): Promise<void> {
    try {
      // Create audit log entry
      const logData = {
        type: 'SMSFRESH_API_CALL',
        action: `send_${type}`,
        success: result.success || false,
        messageId: result.messageId,
        errorCode: result.errorCode,
        error: result.error,
        payload: {
          recipients: payload.recipients || payload.recipient,
          template: payload.template,
          messageType: type,
        },
        timestamp: new Date().toISOString(),
      };

      // Log to application logger
      if (result.success) {
        logger.info('SMSFresh message sent successfully', logData);
      } else {
        logger.error('SMSFresh message send failed', { ...logData, error });
      }

      // Store in database for audit trail (optional, based on requirements)
      // This could be implemented if audit logging to database is required
      
    } catch (logError) {
      logger.error('Failed to log message send', logError);
      // Don't throw error as logging failure shouldn't break message sending
    }
  }
}

// Singleton instance
let smsFreshServiceInstance: SMSFreshService | null = null;

export function createSMSFreshService(config?: Partial<SMSFreshConfig>): SMSFreshService {
  if (!smsFreshServiceInstance || config) {
    const defaultConfig: SMSFreshConfig = {
      apiKey: process.env.SMSFRESH_API_KEY || '',
      apiUrl: process.env.SMSFRESH_API_URL || '',
      timeout: 30000,
      retryAttempts: 3,
      enableQueue: process.env.NODE_ENV === 'production', // Enable queue in production
      maxQueueSize: 1000,
      ...config,
    };

    if (!defaultConfig.apiKey || !defaultConfig.apiUrl) {
      throw new Error('SMSFresh API configuration is missing. Please set SMSFRESH_API_KEY and SMSFRESH_API_URL environment variables.');
    }

    smsFreshServiceInstance = new SMSFreshService(defaultConfig);
  }

  return smsFreshServiceInstance;
}

/**
 * Create a fallback SMS service for when WhatsApp is unavailable
 */
export function createFallbackSMSService(): {
  sendSMS: (params: SMSFreshTextParams, priority?: 'low' | 'normal' | 'high' | 'urgent') => Promise<SMSFreshResponse>;
  isAvailable: () => Promise<boolean>;
} {
  const smsService = createSMSFreshService();
  
  return {
    sendSMS: (params: SMSFreshTextParams, priority = 'normal') => smsService.sendSMS(params, priority),
    isAvailable: async () => {
      try {
        const balanceResult = await smsService.getAccountBalance();
        return balanceResult.success;
      } catch {
        return false;
      }
    }
  };
}

export { SMSFreshService };