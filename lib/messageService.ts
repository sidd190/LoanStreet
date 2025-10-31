/**
 * Enhanced Message Service with Error Handling and Fallbacks
 * Requirements: 8.3, 8.5 - Implement comprehensive error handling and automatic fallback to SMS
 */

import { createSMSFreshService, createFallbackSMSService, SMSFreshResponse, SMSFreshTextParams, SMSFreshMediaParams, SMSFreshOTPParams, SMSFreshReplyParams } from './smsFreshService';
import { logger } from './logger';
import { auditLogger, AuditEventType } from './security/auditLogger';
import { reportError, reportSuccess } from './errorMonitoring';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MessageServiceConfig {
  enableFallback: boolean;
  fallbackDelay: number; // Delay before attempting fallback (ms)
  maxRetries: number;
  retryDelay: number; // Base delay for exponential backoff (ms)
  healthCheckInterval: number; // How often to check service health (ms)
}

export interface MessageSendOptions {
  priority: 'low' | 'normal' | 'high' | 'urgent';
  enableFallback: boolean;
  fallbackToSMS: boolean;
  retryOnFailure: boolean;
  trackDelivery: boolean;
}

export interface MessageSendResult extends SMSFreshResponse {
  method: 'whatsapp' | 'sms';
  fallbackUsed: boolean;
  retryCount: number;
  totalTime: number;
  errors: string[];
}

export class MessageService {
  private config: MessageServiceConfig;
  private whatsappService: any;
  private smsService: any;
  private serviceHealth: {
    whatsapp: { available: boolean; lastCheck: Date; errorCount: number };
    sms: { available: boolean; lastCheck: Date; errorCount: number };
  };
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config?: Partial<MessageServiceConfig>) {
    this.config = {
      enableFallback: true,
      fallbackDelay: 5000, // 5 seconds
      maxRetries: 3,
      retryDelay: 1000, // 1 second base delay
      healthCheckInterval: 60000, // 1 minute
      ...config,
    };

    this.whatsappService = createSMSFreshService();
    this.smsService = createFallbackSMSService();

    this.serviceHealth = {
      whatsapp: { available: true, lastCheck: new Date(), errorCount: 0 },
      sms: { available: true, lastCheck: new Date(), errorCount: 0 },
    };

    this.startHealthChecking();
  }

  /**
   * Send WhatsApp text message with comprehensive error handling and fallback
   */
  async sendWhatsAppText(
    params: SMSFreshTextParams,
    options: Partial<MessageSendOptions> = {}
  ): Promise<MessageSendResult> {
    const startTime = Date.now();
    const opts: MessageSendOptions = {
      priority: 'normal',
      enableFallback: this.config.enableFallback,
      fallbackToSMS: true,
      retryOnFailure: true,
      trackDelivery: true,
      ...options,
    };

    const result: MessageSendResult = {
      success: false,
      method: 'whatsapp',
      fallbackUsed: false,
      retryCount: 0,
      totalTime: 0,
      errors: [],
    };

    try {
      // Check WhatsApp service health first
      if (!this.serviceHealth.whatsapp.available && opts.enableFallback) {
        logger.warn('WhatsApp service unavailable, attempting SMS fallback immediately');
        return await this.fallbackToSMS(params, opts, result, startTime);
      }

      // Attempt WhatsApp send with retries
      const whatsappResult = await this.sendWithRetry(
        () => this.whatsappService.sendWhatsAppText(params, opts.priority),
        opts.retryOnFailure ? this.config.maxRetries : 1,
        'whatsapp_text'
      );

      if (whatsappResult.success) {
        result.success = true;
        result.messageId = whatsappResult.messageId;
        result.deliveryStatus = whatsappResult.deliveryStatus;
        result.data = whatsappResult.data;
        result.retryCount = whatsappResult.retryCount || 0;
        
        // Report success for error monitoring
        await reportSuccess('WHATSAPP_TEXT_SEND', 'WHATSAPP', {
          messageId: whatsappResult.messageId,
          recipients: params.phone.length,
        });
      } else {
        result.errors.push(whatsappResult.error || 'WhatsApp send failed');
        
        // Report error for monitoring
        await reportError(
          'WHATSAPP_TEXT_SEND_FAILURE',
          'WHATSAPP',
          whatsappResult.error || 'WhatsApp text send failed',
          {
            recipients: params.phone.length,
            errorCode: whatsappResult.errorCode,
            retryCount: whatsappResult.retryCount,
          }
        );
        
        // Attempt fallback if enabled
        if (opts.enableFallback && opts.fallbackToSMS) {
          logger.info('WhatsApp send failed, attempting SMS fallback', {
            error: whatsappResult.error,
            recipients: params.phone.length,
          });
          
          // Report fallback activation
          await reportError(
            'FALLBACK_ACTIVATION',
            'WHATSAPP',
            'WhatsApp failed, activating SMS fallback',
            {
              originalError: whatsappResult.error,
              recipients: params.phone.length,
            }
          );
          
          return await this.fallbackToSMS(params, opts, result, startTime);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      
      logger.error('WhatsApp text send failed with exception', {
        error: errorMessage,
        recipients: params.phone.length,
      });

      // Report exception for monitoring
      await reportError(
        'WHATSAPP_API_EXCEPTION',
        'WHATSAPP',
        `WhatsApp API exception: ${errorMessage}`,
        {
          recipients: params.phone.length,
          stackTrace: error instanceof Error ? error.stack : undefined,
        }
      );

      // Attempt fallback if enabled
      if (opts.enableFallback && opts.fallbackToSMS) {
        await reportError(
          'FALLBACK_ACTIVATION',
          'WHATSAPP',
          'WhatsApp exception, activating SMS fallback',
          { originalError: errorMessage, recipients: params.phone.length }
        );
        
        return await this.fallbackToSMS(params, opts, result, startTime);
      }
    }

    result.totalTime = Date.now() - startTime;
    await this.logMessageAttempt(result, params, 'whatsapp_text');
    
    return result;
  }

  /**
   * Send WhatsApp media message with error handling and fallback
   */
  async sendWhatsAppMedia(
    params: SMSFreshMediaParams,
    options: Partial<MessageSendOptions> = {}
  ): Promise<MessageSendResult> {
    const startTime = Date.now();
    const opts: MessageSendOptions = {
      priority: 'normal',
      enableFallback: this.config.enableFallback,
      fallbackToSMS: true, // Will send text-only version via SMS
      retryOnFailure: true,
      trackDelivery: true,
      ...options,
    };

    const result: MessageSendResult = {
      success: false,
      method: 'whatsapp',
      fallbackUsed: false,
      retryCount: 0,
      totalTime: 0,
      errors: [],
    };

    try {
      // Check WhatsApp service health first
      if (!this.serviceHealth.whatsapp.available && opts.enableFallback) {
        logger.warn('WhatsApp service unavailable, attempting SMS fallback for media message');
        return await this.fallbackMediaToSMS(params, opts, result, startTime);
      }

      // Attempt WhatsApp media send with retries
      const whatsappResult = await this.sendWithRetry(
        () => this.whatsappService.sendWhatsAppMedia(params, opts.priority),
        opts.retryOnFailure ? this.config.maxRetries : 1,
        'whatsapp_media'
      );

      if (whatsappResult.success) {
        result.success = true;
        result.messageId = whatsappResult.messageId;
        result.deliveryStatus = whatsappResult.deliveryStatus;
        result.data = whatsappResult.data;
        result.retryCount = whatsappResult.retryCount || 0;
      } else {
        result.errors.push(whatsappResult.error || 'WhatsApp media send failed');
        
        // Attempt fallback if enabled
        if (opts.enableFallback && opts.fallbackToSMS) {
          logger.info('WhatsApp media send failed, attempting SMS fallback', {
            error: whatsappResult.error,
            mediaType: params.mediaType,
            recipients: params.phone.length,
          });
          
          return await this.fallbackMediaToSMS(params, opts, result, startTime);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      
      logger.error('WhatsApp media send failed with exception', {
        error: errorMessage,
        mediaType: params.mediaType,
        recipients: params.phone.length,
      });

      // Attempt fallback if enabled
      if (opts.enableFallback && opts.fallbackToSMS) {
        return await this.fallbackMediaToSMS(params, opts, result, startTime);
      }
    }

    result.totalTime = Date.now() - startTime;
    await this.logMessageAttempt(result, params, 'whatsapp_media');
    
    return result;
  }

  /**
   * Send OTP message with high priority and fallback
   */
  async sendOTP(
    params: SMSFreshOTPParams,
    options: Partial<MessageSendOptions> = {}
  ): Promise<MessageSendResult> {
    const startTime = Date.now();
    const opts: MessageSendOptions = {
      priority: 'urgent', // OTP messages are always urgent
      enableFallback: true, // Always enable fallback for OTP
      fallbackToSMS: true,
      retryOnFailure: true,
      trackDelivery: true,
      ...options,
    };

    const result: MessageSendResult = {
      success: false,
      method: 'whatsapp',
      fallbackUsed: false,
      retryCount: 0,
      totalTime: 0,
      errors: [],
    };

    try {
      // For OTP, try WhatsApp first but fallback quickly if it fails
      const whatsappResult = await this.sendWithRetry(
        () => this.whatsappService.sendAuthOTP(params),
        2, // Reduced retries for OTP to ensure quick delivery
        'whatsapp_otp'
      );

      if (whatsappResult.success) {
        result.success = true;
        result.messageId = whatsappResult.messageId;
        result.deliveryStatus = whatsappResult.deliveryStatus;
        result.data = whatsappResult.data;
        result.retryCount = whatsappResult.retryCount || 0;
      } else {
        result.errors.push(whatsappResult.error || 'WhatsApp OTP send failed');
        
        // Immediate fallback for OTP messages
        logger.warn('WhatsApp OTP send failed, immediate SMS fallback', {
          error: whatsappResult.error,
          recipients: params.phone.length,
        });
        
        return await this.fallbackOTPToSMS(params, opts, result, startTime);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      
      logger.error('WhatsApp OTP send failed with exception', {
        error: errorMessage,
        recipients: params.phone.length,
      });

      // Immediate fallback for OTP messages
      return await this.fallbackOTPToSMS(params, opts, result, startTime);
    }

    result.totalTime = Date.now() - startTime;
    await this.logMessageAttempt(result, params, 'whatsapp_otp');
    
    return result;
  }

  /**
   * Send reply message with error handling
   */
  async sendReply(
    params: SMSFreshReplyParams,
    options: Partial<MessageSendOptions> = {}
  ): Promise<MessageSendResult> {
    const startTime = Date.now();
    const opts: MessageSendOptions = {
      priority: 'high', // Replies are high priority
      enableFallback: this.config.enableFallback,
      fallbackToSMS: true,
      retryOnFailure: true,
      trackDelivery: true,
      ...options,
    };

    const result: MessageSendResult = {
      success: false,
      method: 'whatsapp',
      fallbackUsed: false,
      retryCount: 0,
      totalTime: 0,
      errors: [],
    };

    try {
      // Check WhatsApp service health first
      if (!this.serviceHealth.whatsapp.available && opts.enableFallback) {
        logger.warn('WhatsApp service unavailable, attempting SMS fallback for reply');
        return await this.fallbackReplyToSMS(params, opts, result, startTime);
      }

      // Attempt WhatsApp reply send with retries
      const whatsappResult = await this.sendWithRetry(
        () => this.whatsappService.sendReplyText(params, opts.priority),
        opts.retryOnFailure ? this.config.maxRetries : 1,
        'whatsapp_reply'
      );

      if (whatsappResult.success) {
        result.success = true;
        result.messageId = whatsappResult.messageId;
        result.deliveryStatus = whatsappResult.deliveryStatus;
        result.data = whatsappResult.data;
        result.retryCount = whatsappResult.retryCount || 0;
      } else {
        result.errors.push(whatsappResult.error || 'WhatsApp reply send failed');
        
        // Attempt fallback if enabled
        if (opts.enableFallback && opts.fallbackToSMS) {
          logger.info('WhatsApp reply send failed, attempting SMS fallback', {
            error: whatsappResult.error,
            recipient: params.phone,
          });
          
          return await this.fallbackReplyToSMS(params, opts, result, startTime);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      
      logger.error('WhatsApp reply send failed with exception', {
        error: errorMessage,
        recipient: params.phone,
      });

      // Attempt fallback if enabled
      if (opts.enableFallback && opts.fallbackToSMS) {
        return await this.fallbackReplyToSMS(params, opts, result, startTime);
      }
    }

    result.totalTime = Date.now() - startTime;
    await this.logMessageAttempt(result, params, 'whatsapp_reply');
    
    return result;
  }

  /**
   * Get service health status
   */
  getServiceHealth(): typeof this.serviceHealth {
    return { ...this.serviceHealth };
  }

  /**
   * Force health check for all services
   */
  async checkServiceHealth(): Promise<void> {
    await Promise.all([
      this.checkWhatsAppHealth(),
      this.checkSMSHealth(),
    ]);
  }

  /**
   * Stop health checking
   */
  stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  // Private methods

  private async sendWithRetry(
    operation: () => Promise<SMSFreshResponse>,
    maxRetries: number,
    operationType: string
  ): Promise<SMSFreshResponse & { retryCount?: number }> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (result.success) {
          return { ...result, retryCount: attempt };
        }
        
        lastError = new Error(result.error || 'Operation failed');
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(result.error)) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        lastError = error;
        
        // Wait before retry
        if (attempt < maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Max retries exceeded',
      retryCount: maxRetries,
    };
  }

  private isNonRetryableError(error?: string): boolean {
    if (!error) return false;
    
    const nonRetryableErrors = [
      'invalid phone number',
      'invalid template',
      'invalid media url',
      'invalid otp format',
      'message too long',
      'unauthorized',
      'forbidden',
      'bad request',
    ];
    
    return nonRetryableErrors.some(nonRetryable => 
      error.toLowerCase().includes(nonRetryable)
    );
  }

  private async fallbackToSMS(
    params: SMSFreshTextParams,
    options: MessageSendOptions,
    result: MessageSendResult,
    startTime: number
  ): Promise<MessageSendResult> {
    try {
      // Wait for fallback delay if configured
      if (this.config.fallbackDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.fallbackDelay));
      }

      const smsResult = await this.sendWithRetry(
        () => this.smsService.sendSMS(params, options.priority),
        options.retryOnFailure ? this.config.maxRetries : 1,
        'sms_fallback'
      );

      result.method = 'sms';
      result.fallbackUsed = true;
      result.success = smsResult.success;
      result.messageId = smsResult.messageId;
      result.deliveryStatus = smsResult.deliveryStatus;
      result.data = smsResult.data;
      result.retryCount = (result.retryCount || 0) + (smsResult.retryCount || 0);

      if (!smsResult.success) {
        result.errors.push(smsResult.error || 'SMS fallback failed');
      }

      logger.info('SMS fallback completed', {
        success: smsResult.success,
        messageId: smsResult.messageId,
        recipients: params.phone.length,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`SMS fallback failed: ${errorMessage}`);
      
      logger.error('SMS fallback failed with exception', {
        error: errorMessage,
        recipients: params.phone.length,
      });
    }

    result.totalTime = Date.now() - startTime;
    await this.logMessageAttempt(result, params, 'sms_fallback');
    
    return result;
  }

  private async fallbackMediaToSMS(
    params: SMSFreshMediaParams,
    options: MessageSendOptions,
    result: MessageSendResult,
    startTime: number
  ): Promise<MessageSendResult> {
    try {
      // Convert media message to text-only SMS
      const textParams: SMSFreshTextParams = {
        phone: params.phone,
        templateName: params.templateName,
        parameters: [
          ...(params.parameters || []),
          `Media: ${params.mediaUrl}`, // Include media URL in text
        ],
      };

      return await this.fallbackToSMS(textParams, options, result, startTime);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Media to SMS fallback failed: ${errorMessage}`);
      
      result.totalTime = Date.now() - startTime;
      await this.logMessageAttempt(result, params, 'media_sms_fallback');
      
      return result;
    }
  }

  private async fallbackOTPToSMS(
    params: SMSFreshOTPParams,
    options: MessageSendOptions,
    result: MessageSendResult,
    startTime: number
  ): Promise<MessageSendResult> {
    try {
      // Convert OTP to SMS format
      const textParams: SMSFreshTextParams = {
        phone: params.phone,
        templateName: params.templateName,
        parameters: [params.otp],
      };

      return await this.fallbackToSMS(textParams, options, result, startTime);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`OTP to SMS fallback failed: ${errorMessage}`);
      
      result.totalTime = Date.now() - startTime;
      await this.logMessageAttempt(result, params, 'otp_sms_fallback');
      
      return result;
    }
  }

  private async fallbackReplyToSMS(
    params: SMSFreshReplyParams,
    options: MessageSendOptions,
    result: MessageSendResult,
    startTime: number
  ): Promise<MessageSendResult> {
    try {
      // Convert reply to SMS format
      const textParams: SMSFreshTextParams = {
        phone: [params.phone],
        templateName: 'reply_message', // Use a generic reply template
        parameters: [params.text],
      };

      return await this.fallbackToSMS(textParams, options, result, startTime);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Reply to SMS fallback failed: ${errorMessage}`);
      
      result.totalTime = Date.now() - startTime;
      await this.logMessageAttempt(result, params, 'reply_sms_fallback');
      
      return result;
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.checkServiceHealth();
    }, this.config.healthCheckInterval);

    // Initial health check
    this.checkServiceHealth();
  }

  private async checkWhatsAppHealth(): Promise<void> {
    try {
      const result = await this.whatsappService.getAccountBalance();
      
      this.serviceHealth.whatsapp.available = result.success;
      this.serviceHealth.whatsapp.lastCheck = new Date();
      
      if (result.success) {
        this.serviceHealth.whatsapp.errorCount = 0;
      } else {
        this.serviceHealth.whatsapp.errorCount++;
      }
      
    } catch (error) {
      this.serviceHealth.whatsapp.available = false;
      this.serviceHealth.whatsapp.lastCheck = new Date();
      this.serviceHealth.whatsapp.errorCount++;
      
      logger.warn('WhatsApp health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCount: this.serviceHealth.whatsapp.errorCount,
      });
    }
  }

  private async checkSMSHealth(): Promise<void> {
    try {
      const result = await this.smsService.isAvailable();
      
      this.serviceHealth.sms.available = result;
      this.serviceHealth.sms.lastCheck = new Date();
      
      if (result) {
        this.serviceHealth.sms.errorCount = 0;
      } else {
        this.serviceHealth.sms.errorCount++;
      }
      
    } catch (error) {
      this.serviceHealth.sms.available = false;
      this.serviceHealth.sms.lastCheck = new Date();
      this.serviceHealth.sms.errorCount++;
      
      logger.warn('SMS health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCount: this.serviceHealth.sms.errorCount,
      });
    }
  }

  private async logMessageAttempt(
    result: MessageSendResult,
    params: any,
    operationType: string
  ): Promise<void> {
    try {
      await auditLogger.logEvent(
        result.success ? AuditEventType.SMSFRESH_API_CALL : AuditEventType.SMSFRESH_API_ERROR,
        `Message send attempt: ${operationType}`,
        {
          success: result.success,
          method: result.method,
          fallbackUsed: result.fallbackUsed,
          retryCount: result.retryCount,
          totalTime: result.totalTime,
          errors: result.errors,
          recipients: Array.isArray(params.phone) ? params.phone.length : 1,
        }
      );
      
    } catch (error) {
      logger.error('Failed to log message attempt', {
        operationType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Singleton instance
let messageServiceInstance: MessageService | null = null;

export function createMessageService(config?: Partial<MessageServiceConfig>): MessageService {
  if (!messageServiceInstance || config) {
    messageServiceInstance = new MessageService(config);
  }
  return messageServiceInstance;
}

export function getMessageService(): MessageService {
  if (!messageServiceInstance) {
    messageServiceInstance = new MessageService();
  }
  return messageServiceInstance;
}