/**
 * SMSFresh WhatsApp API Integration Service
 * Handles all WhatsApp messaging through SMSFresh API
 */

import Logger, { DataSource } from './logger'

export interface WhatsAppMessage {
  phone: string
  text: string
  templateName?: string
  params?: string[]
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  messageType?: 'normal' | 'auth'
}

export interface WhatsAppResponse {
  success: boolean
  messageId?: string
  status?: string
  error?: string
  details?: any
}

export interface WhatsAppTemplate {
  name: string
  content: string
  category: string
  language: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  components?: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
    text?: string
    parameters?: string[]
  }[]
}

class SMSFreshService {
  private readonly baseUrl: string
  private readonly user: string
  private readonly pass: string
  private readonly sender: string

  constructor() {
    this.baseUrl = process.env.SMSFRESH_API_URL || 'http://trans.smsfresh.co/api/sendmsg.php'
    this.user = process.env.SMSFRESH_USER || ''
    this.pass = process.env.SMSFRESH_PASS || ''
    this.sender = process.env.SMSFRESH_SENDER || 'BUZWAP'

    if (!this.user || !this.pass) {
      Logger.warn(DataSource.API, 'smsfresh', 'SMSFresh credentials not configured')
    }
  }

  /**
   * Send a normal WhatsApp message
   */
  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      Logger.info(DataSource.API, 'smsfresh', `Sending WhatsApp message to ${message.phone}`)

      const params = new URLSearchParams({
        user: this.user,
        pass: this.pass,
        sender: this.sender,
        phone: this.formatPhoneNumber(message.phone),
        text: message.templateName || message.text,
        priority: 'wa',
        stype: message.messageType || 'normal'
      })

      // Add parameters if provided
      if (message.params && message.params.length > 0) {
        params.append('Params', message.params.join(','))
      }

      // Add media if provided
      if (message.mediaUrl && message.mediaType) {
        params.append('htype', message.mediaType)
        params.append('url', message.mediaUrl)
      }

      const url = `${this.baseUrl}?${params.toString()}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'QuickLoan-WhatsApp-Service/1.0'
        }
      })

      const responseText = await response.text()
      
      if (response.ok) {
        Logger.success(DataSource.API, 'smsfresh', `WhatsApp message sent successfully to ${message.phone}`)
        
        return {
          success: true,
          messageId: this.extractMessageId(responseText),
          status: 'SENT',
          details: responseText
        }
      } else {
        Logger.error(DataSource.API, 'smsfresh', `Failed to send WhatsApp message to ${message.phone}`, {
          status: response.status,
          response: responseText
        })
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseText}`,
          details: responseText
        }
      }

    } catch (error) {
      Logger.error(DataSource.API, 'smsfresh', `WhatsApp message sending failed for ${message.phone}`, error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Send WhatsApp message with template
   */
  async sendTemplateMessage(
    phone: string, 
    templateName: string, 
    params?: string[]
  ): Promise<WhatsAppResponse> {
    return this.sendMessage({
      phone,
      text: templateName,
      templateName,
      params,
      messageType: 'normal'
    })
  }

  /**
   * Send WhatsApp message with media
   */
  async sendMediaMessage(
    phone: string,
    templateName: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document',
    params?: string[]
  ): Promise<WhatsAppResponse> {
    return this.sendMessage({
      phone,
      text: templateName,
      templateName,
      params,
      mediaUrl,
      mediaType,
      messageType: 'normal'
    })
  }

  /**
   * Send authentication OTP message
   */
  async sendOTPMessage(phone: string, templateName: string, otp: string): Promise<WhatsAppResponse> {
    return this.sendMessage({
      phone,
      text: templateName,
      templateName,
      params: [otp],
      messageType: 'auth'
    })
  }

  /**
   * Send normal text message (after customer replies)
   */
  async sendTextMessage(phone: string, text: string): Promise<WhatsAppResponse> {
    try {
      const params = new URLSearchParams({
        user: this.user,
        pass: this.pass,
        sender: this.sender,
        phone: this.formatPhoneNumber(phone),
        text: text,
        priority: 'wa',
        stype: 'normal',
        htype: 'normal'
      })

      const url = `${this.baseUrl}?${params.toString()}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'QuickLoan-WhatsApp-Service/1.0'
        }
      })

      const responseText = await response.text()
      
      if (response.ok) {
        Logger.success(DataSource.API, 'smsfresh', `WhatsApp text message sent successfully to ${phone}`)
        
        return {
          success: true,
          messageId: this.extractMessageId(responseText),
          status: 'SENT',
          details: responseText
        }
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseText}`,
          details: responseText
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Bulk send WhatsApp messages
   */
  async sendBulkMessages(messages: WhatsAppMessage[]): Promise<WhatsAppResponse[]> {
    Logger.info(DataSource.API, 'smsfresh', `Sending bulk WhatsApp messages to ${messages.length} recipients`)

    const results: WhatsAppResponse[] = []
    const batchSize = 10 // Process in batches to avoid overwhelming the API
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      
      const batchPromises = batch.map(message => 
        this.sendMessage(message).catch(error => ({
          success: false,
          error: error.message
        }))
      )
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < messages.length) {
        await this.delay(1000) // 1 second delay between batches
      }
    }

    const successCount = results.filter(r => r.success).length
    Logger.info(DataSource.API, 'smsfresh', `Bulk WhatsApp sending completed: ${successCount}/${messages.length} successful`)

    return results
  }

  /**
   * Get available WhatsApp templates (mock implementation)
   * In a real implementation, this would fetch from SMSFresh API
   */
  async getTemplates(): Promise<WhatsAppTemplate[]> {
    Logger.info(DataSource.API, 'smsfresh', 'Fetching WhatsApp templates')

    // Mock templates based on common loan scenarios
    const templates: WhatsAppTemplate[] = [
      {
        name: 'LOAN_WELCOME',
        content: 'Welcome to QuickLoan! Your loan application has been received. Reference ID: {{1}}',
        category: 'UTILITY',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Welcome to QuickLoan! Your loan application has been received. Reference ID: {{1}}',
            parameters: ['reference_id']
          }
        ]
      },
      {
        name: 'LOAN_APPROVED',
        content: 'Congratulations! Your loan of ₹{{1}} has been approved. Amount will be credited within 24 hours.',
        category: 'UTILITY',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Congratulations! Your loan of ₹{{1}} has been approved. Amount will be credited within 24 hours.',
            parameters: ['loan_amount']
          }
        ]
      },
      {
        name: 'LOAN_REJECTED',
        content: 'We regret to inform you that your loan application has been declined. Please contact us for more details.',
        category: 'UTILITY',
        language: 'en',
        status: 'APPROVED'
      },
      {
        name: 'DOCUMENT_REQUIRED',
        content: 'Hi {{1}}, we need additional documents for your loan application. Please upload: {{2}}',
        category: 'UTILITY',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Hi {{1}}, we need additional documents for your loan application. Please upload: {{2}}',
            parameters: ['customer_name', 'document_list']
          }
        ]
      },
      {
        name: 'EMI_REMINDER',
        content: 'Reminder: Your EMI of ₹{{1}} is due on {{2}}. Please ensure sufficient balance in your account.',
        category: 'UTILITY',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Reminder: Your EMI of ₹{{1}} is due on {{2}}. Please ensure sufficient balance in your account.',
            parameters: ['emi_amount', 'due_date']
          }
        ]
      },
      {
        name: 'OTP_VERIFICATION',
        content: 'Your OTP for QuickLoan verification is: {{1}}. Valid for 10 minutes. Do not share with anyone.',
        category: 'AUTHENTICATION',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Your OTP for QuickLoan verification is: {{1}}. Valid for 10 minutes. Do not share with anyone.',
            parameters: ['otp']
          }
        ]
      },
      {
        name: 'LOAN_DISBURSED',
        content: 'Great news! Your loan amount of ₹{{1}} has been credited to your account ending with {{2}}.',
        category: 'UTILITY',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Great news! Your loan amount of ₹{{1}} has been credited to your account ending with {{2}}.',
            parameters: ['loan_amount', 'account_number']
          }
        ]
      },
      {
        name: 'FOLLOW_UP',
        content: 'Hi {{1}}, we noticed you started a loan application. Need help completing it? Call us at 1800-XXX-XXXX',
        category: 'MARKETING',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Hi {{1}}, we noticed you started a loan application. Need help completing it? Call us at 1800-XXX-XXXX',
            parameters: ['customer_name']
          }
        ]
      }
    ]

    Logger.success(DataSource.API, 'smsfresh', `Retrieved ${templates.length} WhatsApp templates`)
    return templates
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      Logger.info(DataSource.API, 'smsfresh', 'Testing SMSFresh API connection')

      if (!this.user || !this.pass) {
        return {
          success: false,
          message: 'SMSFresh credentials not configured. Please set SMSFRESH_USER and SMSFRESH_PASS environment variables.'
        }
      }

      // Test with a dummy phone number (won't actually send)
      const testParams = new URLSearchParams({
        user: this.user,
        pass: this.pass,
        sender: this.sender,
        phone: '9999999999', // Test number
        text: 'TEST_CONNECTION',
        priority: 'wa',
        stype: 'normal'
      })

      const url = `${this.baseUrl}?${testParams.toString()}`
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'QuickLoan-WhatsApp-Service/1.0'
        }
      })

      const responseText = await response.text()

      if (response.ok) {
        Logger.success(DataSource.API, 'smsfresh', 'SMSFresh API connection test successful')
        return {
          success: true,
          message: 'SMSFresh API is accessible and credentials are valid',
          details: {
            status: response.status,
            response: responseText
          }
        }
      } else {
        Logger.warn(DataSource.API, 'smsfresh', 'SMSFresh API connection test failed', {
          status: response.status,
          response: responseText
        })
        return {
          success: false,
          message: `API returned HTTP ${response.status}`,
          details: {
            status: response.status,
            response: responseText
          }
        }
      }

    } catch (error) {
      Logger.error(DataSource.API, 'smsfresh', 'SMSFresh API connection test failed', error)
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      }
    }
  }

  /**
   * Format phone number for SMSFresh API (remove country code if present)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')
    
    // Remove country code if present (91 for India)
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = cleaned.substring(2)
    }
    
    // Ensure it's a 10-digit number
    if (cleaned.length !== 10) {
      Logger.warn(DataSource.API, 'smsfresh', `Invalid phone number format: ${phone}`)
    }
    
    return cleaned
  }

  /**
   * Extract message ID from SMSFresh response
   */
  private extractMessageId(response: string): string {
    // SMSFresh typically returns a response with message ID
    // This is a basic implementation - adjust based on actual response format
    const match = response.match(/id[:\s]*(\w+)/i)
    return match ? match[1] : `msg_${Date.now()}`
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get service status and configuration
   */
  getStatus(): {
    configured: boolean
    baseUrl: string
    user: string
    sender: string
  } {
    return {
      configured: !!(this.user && this.pass),
      baseUrl: this.baseUrl,
      user: this.user,
      sender: this.sender
    }
  }
}

// Export singleton instance
export const smsFreshService = new SMSFreshService()

// Factory function for creating service instance (for compatibility)
export function createSMSFreshService() {
  return smsFreshService
}

// Fallback SMS service (for compatibility)
export function createFallbackSMSService() {
  return smsFreshService
}

// Default export
export default smsFreshService