import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware/auth';
import { createMessageProcessor } from '@/lib/messageProcessor';
import { logger } from '@/lib/logger';

/**
 * Get conversation thread for a specific contact
 * Requirements: 4.5 - Message routing and conversation management based on user roles
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const messageProcessor = createMessageProcessor();
    const result = await messageProcessor.getConversationThread(
      contactId,
      authResult.user.id,
      limit
    );

    if (!result.contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({
      conversation: result.messages,
      contact: result.contact,
      messageCount: result.messages.length,
    });
  } catch (error) {
    logger.error('Failed to get conversation thread', error);
    return NextResponse.json(
      { error: 'Failed to retrieve conversation' },
      { status: 500 }
    );
  }
}