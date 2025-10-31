/**
 * Error Monitoring and Alerting System for WhatsApp API Integration
 * Requirements: 8.3, 8.5 - Create detailed error logging and reporting
 */

import { logger } from './logger';
import { auditLogger, AuditEventType } from './security/auditLogger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ErrorAlert {
  id: string;
  type: 'API_FAILURE' | 'SERVICE_DEGRADATION' | 'FALLBACK_ACTIVATED' | 'RATE_LIMIT_EXCEEDED' | 'WEBHOOK_FAILURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  service: 'WHATSAPP' | 'SMS' | 'WEBHOOK' | 'SYSTEM';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
}

export interface ErrorThreshold {
  type: string;
  timeWindow: number; // in milliseconds
  maxOccurrences: number;
  severity: ErrorAlert['severity'];
}

export class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private errorCounts: Map<string, { count: number; firstSeen: Date; lastSeen: Date }> = new Map();
  private activeAlerts: Map<string, ErrorAlert> = new Map();
  private thresholds: ErrorThreshold[] = [
    {
      type: 'WHATSAPP_API_FAILURE',
      timeWindow: 5 * 60 * 1000, // 5 minutes
      maxOccurrences: 10,
      severity: 'HIGH',
    },
    {
      type: 'SMS_API_FAILURE',
      timeWindow: 5 * 60 * 1000, // 5 minutes
      maxOccurrences: 15,
      severity: 'MEDIUM',
    },
    {
      type: 'WEBHOOK_PROCESSING_FAILURE',
      timeWindow: 10 * 60 * 1000, // 10 minutes
      maxOccurrences: 20,
      severity: 'MEDIUM',
    },
    {
      type: 'FALLBACK_ACTIVATION',
      timeWindow: 15 * 60 * 1000, // 15 minutes
      maxOccurrences: 50,
      severity: 'HIGH',
    },
    {
      type: 'RATE_LIMIT_EXCEEDED',
      timeWindow: 1 * 60 * 1000, // 1 minute
      maxOccurrences: 1,
      severity: 'CRITICAL',
    },
  ];

  private constructor() {
    // Start cleanup interval for old error counts
    setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 1000); // Every minute
  }

  public static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  /**
   * Report an error occurrence
   */
  async reportError(
    type: string,
    service: ErrorAlert['service'],
    message: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const now = new Date();
      const errorKey = `${type}_${service}`;
      
      // Update error count
      const existing = this.errorCounts.get(errorKey);
      if (existing) {
        existing.count++;
        existing.lastSeen = now;
      } else {
        this.errorCounts.set(errorKey, {
          count: 1,
          firstSeen: now,
          lastSeen: now,
        });
      }

      // Check if this error type exceeds thresholds
      await this.checkThresholds(type, service, message, details);

      // Log the error
      logger.error(`Error reported: ${type}`, {
        service,
        message,
        details,
        errorKey,
        count: this.errorCounts.get(errorKey)?.count,
      });

      // Audit log the error
      await auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        `Error reported: ${type}`,
        {
          service,
          message,
          details,
          timestamp: now.toISOString(),
        }
      );

    } catch (error) {
      logger.error('Failed to report error', {
        originalType: type,
        originalService: service,
        originalMessage: message,
        reportingError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Report successful operation (for tracking recovery)
   */
  async reportSuccess(
    type: string,
    service: ErrorAlert['service'],
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const errorKey = `${type}_${service}`;
      
      // Reset error count on success
      this.errorCounts.delete(errorKey);
      
      // Check if we should resolve any active alerts
      await this.checkForResolution(type, service);

      logger.debug(`Success reported: ${type}`, {
        service,
        details,
      });

    } catch (error) {
      logger.error('Failed to report success', {
        type,
        service,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get current error statistics
   */
  getErrorStatistics(): {
    activeErrors: number;
    activeAlerts: number;
    errorsByService: Record<string, number>;
    alertsBySeverity: Record<string, number>;
  } {
    const errorsByService: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

    // Count errors by service
    for (const [key, data] of this.errorCounts.entries()) {
      const service = key.split('_').pop() || 'UNKNOWN';
      errorsByService[service] = (errorsByService[service] || 0) + data.count;
    }

    // Count alerts by severity
    for (const alert of this.activeAlerts.values()) {
      if (!alert.resolved) {
        alertsBySeverity[alert.severity]++;
      }
    }

    return {
      activeErrors: this.errorCounts.size,
      activeAlerts: Array.from(this.activeAlerts.values()).filter(a => !a.resolved).length,
      errorsByService,
      alertsBySeverity,
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ErrorAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): ErrorAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Resolve an alert manually
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert || alert.resolved) {
        return false;
      }

      alert.resolved = true;
      alert.resolvedAt = new Date();

      // Log resolution
      await auditLogger.logEvent(
        AuditEventType.SYSTEM_ALERT_RESOLVED,
        `Alert resolved: ${alert.type}`,
        {
          alertId,
          resolvedBy,
          service: alert.service,
          severity: alert.severity,
          duration: alert.resolvedAt.getTime() - alert.timestamp.getTime(),
        }
      );

      logger.info('Alert resolved', {
        alertId,
        type: alert.type,
        service: alert.service,
        resolvedBy,
      });

      return true;

    } catch (error) {
      logger.error('Failed to resolve alert', {
        alertId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get error trends for analytics
   */
  async getErrorTrends(
    timeRange: { start: Date; end: Date },
    groupBy: 'hour' | 'day' = 'hour'
  ): Promise<{
    timeline: Array<{ timestamp: string; count: number; type: string; service: string }>;
    summary: { totalErrors: number; errorsByType: Record<string, number>; errorsByService: Record<string, number> };
  }> {
    try {
      // This would typically query a database for historical error data
      // For now, we'll return current active errors
      const timeline: Array<{ timestamp: string; count: number; type: string; service: string }> = [];
      const errorsByType: Record<string, number> = {};
      const errorsByService: Record<string, number> = {};

      for (const [key, data] of this.errorCounts.entries()) {
        const [type, service] = key.split('_');
        
        timeline.push({
          timestamp: data.lastSeen.toISOString(),
          count: data.count,
          type,
          service,
        });

        errorsByType[type] = (errorsByType[type] || 0) + data.count;
        errorsByService[service] = (errorsByService[service] || 0) + data.count;
      }

      const totalErrors = Object.values(errorsByType).reduce((sum, count) => sum + count, 0);

      return {
        timeline,
        summary: {
          totalErrors,
          errorsByType,
          errorsByService,
        },
      };

    } catch (error) {
      logger.error('Failed to get error trends', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        timeline: [],
        summary: { totalErrors: 0, errorsByType: {}, errorsByService: {} },
      };
    }
  }

  // Private methods

  private async checkThresholds(
    type: string,
    service: ErrorAlert['service'],
    message: string,
    details: Record<string, any>
  ): Promise<void> {
    const errorKey = `${type}_${service}`;
    const errorData = this.errorCounts.get(errorKey);
    
    if (!errorData) return;

    // Find applicable threshold
    const threshold = this.thresholds.find(t => 
      type.includes(t.type) || t.type === 'ALL'
    );

    if (!threshold) return;

    // Check if threshold is exceeded
    const timeWindow = Date.now() - threshold.timeWindow;
    if (errorData.firstSeen.getTime() > timeWindow && errorData.count >= threshold.maxOccurrences) {
      await this.createAlert(type, service, threshold.severity, message, details, errorData);
    }
  }

  private async createAlert(
    type: string,
    service: ErrorAlert['service'],
    severity: ErrorAlert['severity'],
    message: string,
    details: Record<string, any>,
    errorData: { count: number; firstSeen: Date; lastSeen: Date }
  ): Promise<void> {
    const alertId = `${type}_${service}_${Date.now()}`;
    
    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      alert => alert.type === type && alert.service === service && !alert.resolved
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.occurrenceCount = errorData.count;
      existingAlert.lastOccurrence = errorData.lastSeen;
      existingAlert.details = { ...existingAlert.details, ...details };
      return;
    }

    const alert: ErrorAlert = {
      id: alertId,
      type: type as ErrorAlert['type'],
      severity,
      service,
      message,
      details,
      timestamp: new Date(),
      resolved: false,
      occurrenceCount: errorData.count,
      firstOccurrence: errorData.firstSeen,
      lastOccurrence: errorData.lastSeen,
    };

    this.activeAlerts.set(alertId, alert);

    // Log alert creation
    await auditLogger.logEvent(
      AuditEventType.SYSTEM_ALERT_CREATED,
      `Alert created: ${type}`,
      {
        alertId,
        type,
        service,
        severity,
        occurrenceCount: errorData.count,
        timeWindow: errorData.lastSeen.getTime() - errorData.firstSeen.getTime(),
      }
    );

    logger.warn('Alert created', {
      alertId,
      type,
      service,
      severity,
      message,
      occurrenceCount: errorData.count,
    });

    // Send notifications for critical alerts
    if (severity === 'CRITICAL') {
      await this.sendCriticalAlertNotification(alert);
    }
  }

  private async checkForResolution(type: string, service: ErrorAlert['service']): Promise<void> {
    const relatedAlerts = Array.from(this.activeAlerts.values()).filter(
      alert => alert.type === type && alert.service === service && !alert.resolved
    );

    for (const alert of relatedAlerts) {
      // Auto-resolve if no errors in the last 10 minutes
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      if (alert.lastOccurrence.getTime() < tenMinutesAgo) {
        await this.resolveAlert(alert.id, 'AUTO_RESOLVED');
      }
    }
  }

  private cleanupOldErrors(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [key, data] of this.errorCounts.entries()) {
      if (data.lastSeen.getTime() < oneHourAgo) {
        this.errorCounts.delete(key);
      }
    }

    // Clean up old resolved alerts (keep for 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt.getTime() < oneDayAgo) {
        this.activeAlerts.delete(key);
      }
    }
  }

  private async sendCriticalAlertNotification(alert: ErrorAlert): Promise<void> {
    try {
      // Create system notification for critical alerts
      await prisma.activity.create({
        data: {
          type: 'SYSTEM_ALERT',
          title: `CRITICAL ALERT: ${alert.type}`,
          description: `Critical error in ${alert.service}: ${alert.message}`,
          userId: 'system',
          metadata: {
            alertId: alert.id,
            severity: alert.severity,
            service: alert.service,
            occurrenceCount: alert.occurrenceCount,
            details: alert.details,
          },
        },
      });

      logger.error('Critical alert notification sent', {
        alertId: alert.id,
        type: alert.type,
        service: alert.service,
      });

    } catch (error) {
      logger.error('Failed to send critical alert notification', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const errorMonitoring = ErrorMonitoringService.getInstance();

// Convenience functions
export const reportError = (
  type: string,
  service: ErrorAlert['service'],
  message: string,
  details?: Record<string, any>
) => errorMonitoring.reportError(type, service, message, details);

export const reportSuccess = (
  type: string,
  service: ErrorAlert['service'],
  details?: Record<string, any>
) => errorMonitoring.reportSuccess(type, service, details);