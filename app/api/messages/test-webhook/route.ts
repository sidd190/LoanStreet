import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * Test endpoint for webhook functionality
 * This endpoint simulates incoming webhook calls for testing message routing
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin users can test webhooks
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admin users can test webhook functionality' },
        { status: 403 }
      );
    }

    const { testType, phone, message, messageId } = await request.json();

    if (!testType || !phone) {
      return NextResponse.json(
        { error: 'Test type and phone number are required' },
        { status: 400 }
      );
    }

    // Simulate different webhook scenarios
    let webhookPayload;
    
    switch (testType) {
      case 'incoming_message':
        webhookPayload = {
          messageId: messageId || `test_${Date.now()}`,
          phone: phone,
          status: 'replied',
          content: message || 'Test incoming message for routing',
          timestamp: new Date().toISOString(),
          type: 'WHATSAPP',
        };
        break;
        
      case 'delivery_status':
        webhookPayload = {
          messageId: messageId || `test_${Date.now()}`,
          phone: phone,
          status: 'delivered',
          timestamp: new Date().toISOString(),
          type: 'WHATSAPP',
        };
        break;
        
      case 'read_receipt':
        webhookPayload = {
          messageId: messageId || `test_${Date.now()}`,
          phone: phone,
          status: 'read',
          timestamp: new Date().toISOString(),
          type: 'WHATSAPP',
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: incoming_message, delivery_status, or read_receipt' },
          { status: 400 }
        );
    }

    // Make internal request to webhook endpoint
    const webhookUrl = new URL('/api/webhooks/smsfresh', request.url);
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-webhook': 'true', // Mark as test
      },
      body: JSON.stringify(webhookPayload),
    });

    const webhookResult = await webhookResponse.json();

    logger.info('Webhook test completed', {
      testType,
      phone,
      webhookPayload,
      webhookResult,
      testedBy: authResult.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook test completed successfully',
      testType,
      webhookPayload,
      webhookResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Webhook test failed', error);
    return NextResponse.json(
      { error: 'Webhook test failed' },
      { status: 500 }
    );
  }
}

/**
 * Get available test scenarios
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admin users can access webhook testing' },
        { status: 403 }
      );
    }

    const testScenarios = [
      {
        type: 'incoming_message',
        name: 'Incoming Message',
        description: 'Simulates a customer sending a message',
        requiredFields: ['phone', 'message'],
        optionalFields: ['messageId'],
      },
      {
        type: 'delivery_status',
        name: 'Delivery Status Update',
        description: 'Simulates a message delivery confirmation',
        requiredFields: ['phone'],
        optionalFields: ['messageId'],
      },
      {
        type: 'read_receipt',
        name: 'Read Receipt',
        description: 'Simulates a message being read by the recipient',
        requiredFields: ['phone'],
        optionalFields: ['messageId'],
      },
    ];

    return NextResponse.json({
      testScenarios,
      instructions: {
        endpoint: '/api/messages/test-webhook',
        method: 'POST',
        authentication: 'Bearer token required (admin only)',
        examplePayload: {
          testType: 'incoming_message',
          phone: '9876543210',
          message: 'I am interested in a personal loan',
          messageId: 'optional_test_id',
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get webhook test scenarios', error);
    return NextResponse.json(
      { error: 'Failed to retrieve test scenarios' },
      { status: 500 }
    );
  }
}