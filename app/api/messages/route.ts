import { NextRequest, NextResponse } from 'next/server';
import { createMessageProcessor } from '@/lib/messageProcessor';
import { withAuthAndRole } from '@/lib/middleware/auth';
import { logger } from '@/lib/logger';
import DataService from '@/lib/dataService';

/**
 * Get messages with filtering and pagination
 * GET /api/messages - Both admin and employee can access
 */
export async function GET(request: NextRequest) {
  return withAuthAndRole(['ADMIN', 'EMPLOYEE'])(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const contactId = searchParams.get('contactId') || undefined;
      const campaignId = searchParams.get('campaignId') || undefined;
      const type = searchParams.get('type') as 'SMS' | 'WHATSAPP' | undefined;
      const direction = searchParams.get('direction') as 'INBOUND' | 'OUTBOUND' | undefined;
      const status = searchParams.get('status') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      // Parse date filters
      const dateFromStr = searchParams.get('dateFrom');
      const dateToStr = searchParams.get('dateTo');
      const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
      const dateTo = dateToStr ? new Date(dateToStr) : undefined;

      // Validate limit
      if (limit > 100) {
        return NextResponse.json(
          { error: 'Limit cannot exceed 100' },
          { status: 400 }
        );
      }

      // Use DataService for consistency
      const messages = await DataService.getMessages();
      
      // Apply filters
      let filteredMessages = messages;
      
      if (contactId) {
        filteredMessages = filteredMessages.filter(m => m.contactId === contactId);
      }
      
      if (campaignId) {
        filteredMessages = filteredMessages.filter(m => m.campaignId === campaignId);
      }
      
      if (type) {
        filteredMessages = filteredMessages.filter(m => m.type === type);
      }
      
      if (direction) {
        filteredMessages = filteredMessages.filter(m => m.direction === direction);
      }
      
      if (status) {
        filteredMessages = filteredMessages.filter(m => m.status === status);
      }
      
      if (dateFrom) {
        filteredMessages = filteredMessages.filter(m => new Date(m.createdAt) >= dateFrom);
      }
      
      if (dateTo) {
        filteredMessages = filteredMessages.filter(m => new Date(m.createdAt) <= dateTo);
      }

      // Apply pagination
      const total = filteredMessages.length;
      const paginatedMessages = filteredMessages.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        messages: paginatedMessages,
        pagination: {
          total,
          limit,
          offset,
          hasMore: total > offset + limit,
        },
      });
    } catch (error) {
      logger.error('Messages list API error', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}