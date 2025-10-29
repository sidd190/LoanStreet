/**
 * Message Templates and Formatting Utilities
 * Provides predefined templates and formatting functions for SMSFresh messages
 */

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'SMS' | 'WHATSAPP';
  category: 'MARKETING' | 'TRANSACTIONAL' | 'OTP' | 'NOTIFICATION';
  template: string;
  parameters: string[];
  description: string;
  mediaSupported: boolean;
}

/**
 * Predefined message templates for loan agent platform
 */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // Marketing Templates
  {
    id: 'personal_loan_promo',
    name: 'Personal Loan Promotion',
    type: 'WHATSAPP',
    category: 'MARKETING',
    template: 'Hi {{name}}, Get instant personal loans up to ₹{{amount}} at just {{rate}}% interest rate. Apply now! Call {{phone}} or visit {{website}}',
    parameters: ['name', 'amount', 'rate', 'phone', 'website'],
    description: 'Promotional message for personal loans',
    mediaSupported: true,
  },
  {
    id: 'business_loan_promo',
    name: 'Business Loan Promotion',
    type: 'WHATSAPP',
    category: 'MARKETING',
    template: 'Dear {{name}}, Expand your business with our flexible business loans. Get up to ₹{{amount}} with easy EMIs. Contact us at {{phone}}',
    parameters: ['name', 'amount', 'phone'],
    description: 'Promotional message for business loans',
    mediaSupported: true,
  },
  {
    id: 'home_loan_promo',
    name: 'Home Loan Promotion',
    type: 'WHATSAPP',
    category: 'MARKETING',
    template: 'Hi {{name}}, Make your dream home a reality! Get home loans at {{rate}}% interest rate. Apply today! {{website}}',
    parameters: ['name', 'rate', 'website'],
    description: 'Promotional message for home loans',
    mediaSupported: true,
  },

  // Transactional Templates
  {
    id: 'application_received',
    name: 'Application Received',
    type: 'WHATSAPP',
    category: 'TRANSACTIONAL',
    template: 'Dear {{name}}, Your loan application (ID: {{applicationId}}) has been received. We will review and get back to you within {{timeframe}}. Thank you!',
    parameters: ['name', 'applicationId', 'timeframe'],
    description: 'Confirmation message when loan application is received',
    mediaSupported: false,
  },
  {
    id: 'application_approved',
    name: 'Application Approved',
    type: 'WHATSAPP',
    category: 'TRANSACTIONAL',
    template: 'Congratulations {{name}}! Your loan application (ID: {{applicationId}}) for ₹{{amount}} has been approved. Please visit our office with required documents.',
    parameters: ['name', 'applicationId', 'amount'],
    description: 'Notification when loan application is approved',
    mediaSupported: false,
  },
  {
    id: 'application_rejected',
    name: 'Application Rejected',
    type: 'WHATSAPP',
    category: 'TRANSACTIONAL',
    template: 'Dear {{name}}, We regret to inform you that your loan application (ID: {{applicationId}}) could not be approved at this time. For more details, call {{phone}}',
    parameters: ['name', 'applicationId', 'phone'],
    description: 'Notification when loan application is rejected',
    mediaSupported: false,
  },
  {
    id: 'document_required',
    name: 'Documents Required',
    type: 'WHATSAPP',
    category: 'TRANSACTIONAL',
    template: 'Hi {{name}}, To process your loan application (ID: {{applicationId}}), please submit: {{documents}}. Upload at {{website}} or visit our office.',
    parameters: ['name', 'applicationId', 'documents', 'website'],
    description: 'Request for additional documents',
    mediaSupported: true,
  },

  // OTP Templates
  {
    id: 'otp_verification',
    name: 'OTP Verification',
    type: 'WHATSAPP',
    category: 'OTP',
    template: 'Your OTP for loan application verification is: {{otp}}. Valid for {{validity}} minutes. Do not share with anyone.',
    parameters: ['otp', 'validity'],
    description: 'OTP message for verification',
    mediaSupported: false,
  },
  {
    id: 'login_otp',
    name: 'Login OTP',
    type: 'SMS',
    category: 'OTP',
    template: 'Your login OTP is: {{otp}}. Valid for {{validity}} minutes. Do not share this OTP with anyone.',
    parameters: ['otp', 'validity'],
    description: 'OTP message for login verification',
    mediaSupported: false,
  },

  // Notification Templates
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    type: 'WHATSAPP',
    category: 'NOTIFICATION',
    template: 'Dear {{name}}, Your loan EMI of ₹{{amount}} is due on {{dueDate}}. Please make the payment to avoid late charges. Pay online: {{paymentLink}}',
    parameters: ['name', 'amount', 'dueDate', 'paymentLink'],
    description: 'EMI payment reminder',
    mediaSupported: false,
  },
  {
    id: 'payment_received',
    name: 'Payment Received',
    type: 'WHATSAPP',
    category: 'NOTIFICATION',
    template: 'Thank you {{name}}! Your payment of ₹{{amount}} has been received. Transaction ID: {{transactionId}}. Outstanding balance: ₹{{balance}}',
    parameters: ['name', 'amount', 'transactionId', 'balance'],
    description: 'Payment confirmation message',
    mediaSupported: false,
  },
  {
    id: 'follow_up',
    name: 'Follow Up',
    type: 'WHATSAPP',
    category: 'NOTIFICATION',
    template: 'Hi {{name}}, This is a follow-up on your loan inquiry. Our executive {{executiveName}} will call you shortly. For immediate assistance, call {{phone}}',
    parameters: ['name', 'executiveName', 'phone'],
    description: 'Follow-up message for leads',
    mediaSupported: false,
  },
];

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find(template => template.id === templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: MessageTemplate['category']): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter(template => template.category === category);
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: 'SMS' | 'WHATSAPP'): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter(template => template.type === type);
}

/**
 * Format message template with parameters
 */
export function formatMessage(
  templateId: string,
  parameters: Record<string, string>
): { success: boolean; message?: string; error?: string } {
  const template = getTemplate(templateId);
  
  if (!template) {
    return { success: false, error: `Template with ID '${templateId}' not found` };
  }

  let formattedMessage = template.template;
  
  // Replace template parameters
  for (const param of template.parameters) {
    const value = parameters[param];
    if (value === undefined || value === null) {
      return { 
        success: false, 
        error: `Missing required parameter: ${param}` 
      };
    }
    
    const regex = new RegExp(`{{${param}}}`, 'g');
    formattedMessage = formattedMessage.replace(regex, value.toString());
  }

  // Check for any unreplaced parameters
  const unreplacedParams = formattedMessage.match(/{{[^}]+}}/g);
  if (unreplacedParams) {
    return {
      success: false,
      error: `Unreplaced parameters found: ${unreplacedParams.join(', ')}`
    };
  }

  return { success: true, message: formattedMessage };
}

/**
 * Validate template parameters
 */
export function validateTemplateParameters(
  templateId: string,
  parameters: Record<string, string>
): { valid: boolean; missingParams?: string[]; extraParams?: string[] } {
  const template = getTemplate(templateId);
  
  if (!template) {
    return { valid: false };
  }

  const providedParams = Object.keys(parameters);
  const requiredParams = template.parameters;
  
  const missingParams = requiredParams.filter(param => !providedParams.includes(param));
  const extraParams = providedParams.filter(param => !requiredParams.includes(param));
  
  return {
    valid: missingParams.length === 0,
    missingParams: missingParams.length > 0 ? missingParams : undefined,
    extraParams: extraParams.length > 0 ? extraParams : undefined,
  };
}

/**
 * Get template suggestions based on loan type
 */
export function getTemplatesByLoanType(loanType: string): MessageTemplate[] {
  const loanTypeMap: Record<string, string[]> = {
    'PERSONAL': ['personal_loan_promo', 'application_received', 'follow_up'],
    'BUSINESS': ['business_loan_promo', 'application_received', 'follow_up'],
    'HOME': ['home_loan_promo', 'application_received', 'follow_up'],
    'VEHICLE': ['personal_loan_promo', 'application_received', 'follow_up'],
    'EDUCATION': ['personal_loan_promo', 'application_received', 'follow_up'],
  };

  const templateIds = loanTypeMap[loanType.toUpperCase()] || [];
  return templateIds.map(id => getTemplate(id)).filter(Boolean) as MessageTemplate[];
}

/**
 * Generate OTP
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return otp;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  return phone;
}

/**
 * Validate message content length
 */
export function validateMessageLength(
  message: string,
  type: 'SMS' | 'WHATSAPP'
): { valid: boolean; length: number; maxLength: number; error?: string } {
  const maxLengths = {
    SMS: 160,
    WHATSAPP: 4096,
  };
  
  const maxLength = maxLengths[type];
  const length = message.length;
  
  return {
    valid: length <= maxLength,
    length,
    maxLength,
    error: length > maxLength ? `Message exceeds maximum length of ${maxLength} characters` : undefined,
  };
}