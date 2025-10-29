import { NextRequest, NextResponse } from 'next/server';
import { createMessageProcessor } from '@/lib/messageProcessor';
import { authMiddleware } from '@/lib/middleware/auth';
import { logger } from '@/lib/logger';

/**
 * Get message statistics for dashboard
 * GET /api/messages/stats
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageProcessor = createMessageProcessor();
    const stats = await messageProcessor.getMessageStatistics(authResult.user.id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Message stats API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}