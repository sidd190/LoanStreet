import { NextRequest, NextResponse } from 'next/server';
import { getMessageService } from '@/lib/messageService';
import { logger } from '@/lib/logger';
import { auditLogger, AuditEventType } from '@/lib/security/auditLogger';

/**
 * Messaging Service Health Monitoring API
 * Requirements: 8.3, 8.5 - Monitor messaging service health and manage fallbacks
 */

export async function GET(request: NextRequest) {
  try {
    const messageService = getMessageService();
    
    // Get current service health
    const health = messageService.getServiceHealth();
    
    // Force a health check to get latest status
    await messageService.checkServiceHealth();
    
    // Get updated health after check
    const updatedHealth = messageService.getServiceHealth();
    
    const response = {
      timestamp: new Date().toISOString(),
      services: {
        whatsapp: {
          available: updatedHealth.whatsapp.available,
          lastCheck: updatedHealth.whatsapp.lastCheck,
          errorCount: updatedHealth.whatsapp.errorCount,
          status: updatedHealth.whatsapp.available ? 'healthy' : 'unhealthy',
        },
        sms: {
          available: updatedHealth.sms.available,
          lastCheck: updatedHealth.sms.lastCheck,
          errorCount: updatedHealth.sms.errorCount,
          status: updatedHealth.sms.available ? 'healthy' : 'unhealthy',
        },
      },
      overall: {
        status: (updatedHealth.whatsapp.available || updatedHealth.sms.available) ? 'operational' : 'degraded',
        fallbackAvailable: updatedHealth.sms.available,
        primaryServiceAvailable: updatedHealth.whatsapp.available,
      },
    };
    
    // Log health check request
    await auditLogger.logEvent(
      AuditEventType.SYSTEM_HEALTH_CHECK,
      'Messaging service health check requested',
      {
        whatsappStatus: response.services.whatsapp.status,
        smsStatus: response.services.sms.status,
        overallStatus: response.overall.status,
      }
    );
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Failed to get messaging service health', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get service health',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    const messageService = getMessageService();
    
    switch (action) {
      case 'force_health_check':
        await messageService.checkServiceHealth();
        const health = messageService.getServiceHealth();
        
        await auditLogger.logEvent(
          AuditEventType.SYSTEM_HEALTH_CHECK,
          'Forced messaging service health check',
          {
            whatsappAvailable: health.whatsapp.available,
            smsAvailable: health.sms.available,
          }
        );
        
        return NextResponse.json({
          success: true,
          message: 'Health check completed',
          health,
        });
        
      case 'test_whatsapp':
        const { phone, message } = body;
        
        if (!phone || !message) {
          return NextResponse.json(
            { error: 'Phone and message are required for testing' },
            { status: 400 }
          );
        }
        
        const testResult = await messageService.sendWhatsAppText(
          {
            phone: [phone],
            templateName: 'test_message',
            parameters: [message],
          },
          {
            priority: 'normal',
            enableFallback: false, // Don't use fallback for testing
            fallbackToSMS: false,
            retryOnFailure: false,
            trackDelivery: true,
          }
        );
        
        await auditLogger.logEvent(
          AuditEventType.SMSFRESH_API_CALL,
          'WhatsApp service test message sent',
          {
            success: testResult.success,
            phone: phone.replace(/\d/g, '*'), // Mask phone for privacy
            messageId: testResult.messageId,
            errors: testResult.errors,
          }
        );
        
        return NextResponse.json({
          success: testResult.success,
          message: testResult.success ? 'Test message sent successfully' : 'Test message failed',
          result: testResult,
        });
        
      case 'test_sms':
        const { phone: smsPhone, message: smsMessage } = body;
        
        if (!smsPhone || !smsMessage) {
          return NextResponse.json(
            { error: 'Phone and message are required for testing' },
            { status: 400 }
          );
        }
        
        const smsTestResult = await messageService.sendWhatsAppText(
          {
            phone: [smsPhone],
            templateName: 'test_message',
            parameters: [smsMessage],
          },
          {
            priority: 'normal',
            enableFallback: true,
            fallbackToSMS: true, // Force SMS fallback
            retryOnFailure: false,
            trackDelivery: true,
          }
        );
        
        await auditLogger.logEvent(
          AuditEventType.SMSFRESH_API_CALL,
          'SMS fallback service test message sent',
          {
            success: smsTestResult.success,
            phone: smsPhone.replace(/\d/g, '*'), // Mask phone for privacy
            messageId: smsTestResult.messageId,
            fallbackUsed: smsTestResult.fallbackUsed,
            errors: smsTestResult.errors,
          }
        );
        
        return NextResponse.json({
          success: smsTestResult.success,
          message: smsTestResult.success ? 'SMS test message sent successfully' : 'SMS test message failed',
          result: smsTestResult,
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    logger.error('Failed to process messaging service action', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process action',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}