/**
 * Security configuration and constants
 */

// Password policy configuration
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*(),.?":{}|<>',
  preventCommonPasswords: true,
  preventUserInfoInPassword: true,
} as const

// Session configuration
export const SESSION_CONFIG = {
  tokenExpiry: '24h',
  refreshTokenExpiry: '7d',
  maxConcurrentSessions: 3,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
  rememberMeExpiry: '30d',
} as const

// Rate limiting configuration
export const RATE_LIMITS = {
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  
  // Sensitive operations
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  
  // File uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours
  },
  
  // Messaging operations
  messaging: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },
  
  // External API calls
  external: {
    smsFresh: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
    },
  },
} as const

// File upload security configuration
export const FILE_UPLOAD_CONFIG = {
  maxFileSize: {
    spreadsheet: 10 * 1024 * 1024, // 10MB
    image: 5 * 1024 * 1024, // 5MB
    video: 50 * 1024 * 1024, // 50MB
    document: 10 * 1024 * 1024, // 10MB
  },
  
  allowedMimeTypes: {
    spreadsheet: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
      'text/plain'
    ],
    image: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    video: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo'
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  },
  
  maxFiles: {
    default: 1,
    bulk: 5,
  },
  
  quarantineEnabled: true,
  virusScanEnabled: false, // Enable when virus scanning service is available
} as const

// Input validation configuration
export const INPUT_VALIDATION = {
  maxStringLength: {
    name: 100,
    email: 254,
    phone: 15,
    message: 1000,
    description: 2000,
    url: 2048,
    general: 500,
  },
  
  allowedCharacters: {
    name: /^[a-zA-Z\s\-'\.]+$/,
    phone: /^[0-9\+\-\s\(\)]+$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  },
  
  sanitization: {
    removeHtml: true,
    trimWhitespace: true,
    normalizeUnicode: true,
  },
} as const

// Security headers configuration
export const SECURITY_HEADERS = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
  
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  xXSSProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: [],
  },
} as const

// Encryption configuration
export const ENCRYPTION_CONFIG = {
  bcrypt: {
    saltRounds: 12,
  },
  
  jwt: {
    algorithm: 'HS256' as const,
    issuer: 'loan-agent-platform',
    audience: 'loan-agent-users',
  },
  
  aes: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
  },
} as const

// Audit and logging configuration
export const AUDIT_CONFIG = {
  logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  events: {
    authentication: {
      login: true,
      logout: true,
      failedLogin: true,
      passwordChange: true,
      passwordReset: true,
    },
    
    dataAccess: {
      contactView: true,
      contactExport: true,
      campaignView: true,
      messageView: true,
      leadView: true,
    },
    
    dataModification: {
      contactCreate: true,
      contactUpdate: true,
      contactDelete: true,
      campaignCreate: true,
      campaignUpdate: true,
      campaignDelete: true,
      messageSend: true,
      leadCreate: true,
      leadUpdate: true,
      leadDelete: true,
    },
    
    systemEvents: {
      fileUpload: true,
      bulkOperations: true,
      configurationChanges: true,
      errorOccurrences: true,
    },
  },
  
  retention: {
    auditLogs: 90, // days
    errorLogs: 30, // days
    accessLogs: 7, // days
  },
} as const

// Environment-specific security settings
export const ENVIRONMENT_CONFIG = {
  development: {
    httpsOnly: false,
    secureCookies: false,
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    debugMode: true,
  },
  
  production: {
    httpsOnly: true,
    secureCookies: true,
    corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    debugMode: false,
  },
  
  test: {
    httpsOnly: false,
    secureCookies: false,
    corsOrigins: ['http://localhost:3000'],
    debugMode: true,
  },
} as const

// Get current environment configuration
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development'
  return ENVIRONMENT_CONFIG[env as keyof typeof ENVIRONMENT_CONFIG] || ENVIRONMENT_CONFIG.development
}

// Common passwords to prevent (subset for demonstration)
export const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'qwerty123', 'admin123', 'root', 'toor', 'pass', '12345678'
] as const

// Suspicious activity patterns
export const SECURITY_PATTERNS = {
  suspiciousUserAgents: [
    'sqlmap', 'nikto', 'nmap', 'masscan', 'nessus', 'openvas',
    'burpsuite', 'owasp', 'w3af', 'skipfish'
  ],
  
  suspiciousIPs: [
    // Add known malicious IP ranges or specific IPs
    // This would typically be loaded from a threat intelligence feed
  ],
  
  suspiciousPaths: [
    '/admin', '/wp-admin', '/phpmyadmin', '/.env', '/config',
    '/backup', '/test', '/debug', '/.git', '/api/v1/admin'
  ],
  
  sqlInjectionPatterns: [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i
  ],
  
  xssPatterns: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi
  ],
} as const