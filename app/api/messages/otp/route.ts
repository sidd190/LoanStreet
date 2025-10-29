import { NextRequest, NextResponse } from 'next/server';
import { createMessageProcessor } from '@/lib/messageProcessor';
import { logger } from '@/lib/logger';

/**
 * Send OTP message API endpoint
 * POST /api/messages/otp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    // Validate required fields
    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^\d{10}$/;
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Must be 10 digits.' },
        { status: 400 }
      );
    }

    // Validate OTP format (typically 4-6 digits)
    const otpRegex = /^\d{4,6}$/;
    if (!otpRegex.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP format. Must be 4-6 digits.' },
        { status: 400 }
      );
    }

    const messageProcessor = createMessageProcessor();
    const result = await messageProcessor.sendOTP(normalizedPhone, otp);

    if (result.success) {
      logger.info('OTP sent via API', {
        phone: normalizedPhone,
        otp: otp.replace(/./g, '*'), // Log masked OTP for security
      });

      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully',
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send OTP' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('OTP send API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}