import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { 
  MESSAGE_TEMPLATES, 
  getTemplate, 
  getTemplatesByCategory, 
  getTemplatesByType,
  formatMessage,
  validateTemplateParameters 
} from '@/lib/messageTemplates';
import { logger } from '@/lib/logger';

/**
 * Get message templates
 * GET /api/messages/templates
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as any;
    const type = searchParams.get('type') as 'SMS' | 'WHATSAPP';
    const templateId = searchParams.get('id');

    let templates;

    if (templateId) {
      // Get specific template
      const template = getTemplate(templateId);
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      templates = [template];
    } else if (category) {
      // Filter by category
      templates = getTemplatesByCategory(category);
    } else if (type) {
      // Filter by type
      templates = getTemplatesByType(type);
    } else {
      // Get all templates
      templates = MESSAGE_TEMPLATES;
    }

    return NextResponse.json({
      success: true,
      data: templates,
      total: templates.length,
    });
  } catch (error) {
    logger.error('Templates API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Format message template with parameters
 * POST /api/messages/templates
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, parameters, action = 'format' } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (action === 'validate') {
      // Validate parameters only
      const validation = validateTemplateParameters(templateId, parameters || {});
      return NextResponse.json({
        success: true,
        data: {
          template,
          validation,
        },
      });
    } else if (action === 'format') {
      // Format message with parameters
      if (!parameters) {
        return NextResponse.json(
          { error: 'Parameters are required for formatting' },
          { status: 400 }
        );
      }

      const result = formatMessage(templateId, parameters);
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          template,
          formattedMessage: result.message,
          parameters,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "validate" or "format"' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Template formatting API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}