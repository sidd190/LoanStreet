# Security and Logging Infrastructure

This document outlines the comprehensive security and logging infrastructure implemented for the loan agent platform.

## Overview

The security infrastructure provides multiple layers of protection including input validation, rate limiting, secure file uploads, comprehensive logging, monitoring, and error tracking.

## Components

### 1. Input Validation and Sanitization (`validation.ts`)

- **Zod Schema Validation**: Comprehensive validation schemas for all data types
- **HTML Sanitization**: XSS prevention using DOMPurify
- **Phone Number Validation**: Indian mobile number format validation
- **File Upload Validation**: Secure file type and size validation
- **Pagination Validation**: Safe pagination parameter handling

**Key Features:**
- Email, phone, name, password validation schemas
- Campaign, contact, message, lead validation
- Generic validation function with detailed error reporting
- Input sanitization to prevent XSS attacks

### 2. Rate Limiting (`rateLimiter.ts`)

- **Multiple Rate Limiters**: Different limits for different operations
- **In-Memory Storage**: Fast rate limit checking (Redis recommended for production)
- **Configurable Limits**: Customizable windows and thresholds
- **External API Rate Limiting**: Special handling for third-party API calls

**Rate Limit Types:**
- API: 100 requests per 15 minutes
- Authentication: 5 attempts per 15 minutes
- Strict: 10 requests per 15 minutes (sensitive operations)
- Upload: 20 uploads per hour
- Messaging: 10 messages per minute

### 3. Secure File Upload (`fileUpload.ts`)

- **File Type Validation**: MIME type and extension checking
- **Magic Number Validation**: Content-based file type verification
- **Security Scanning**: Dangerous file pattern detection
- **Size Limits**: Configurable file size restrictions
- **Secure Naming**: Automatic secure filename generation

**Supported File Types:**
- Spreadsheets: CSV, XLS, XLSX (10MB max)
- Images: JPEG, PNG, GIF, WebP (5MB max)
- Videos: MP4, MPEG, MOV, AVI (50MB max)
- Documents: PDF, DOC, DOCX, TXT (10MB max)

### 4. Security Middleware (`middleware.ts`)

- **Comprehensive Security Headers**: XSS, CSRF, clickjacking protection
- **Input Sanitization Middleware**: Automatic input cleaning
- **Request Validation**: Schema-based request validation
- **CORS Handling**: Configurable cross-origin resource sharing
- **Request Logging**: Security-focused request monitoring

**Security Headers:**
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
- X-XSS-Protection

### 5. Audit Logging (`auditLogger.ts`)

- **Comprehensive Event Tracking**: All user actions and system events
- **Buffered Logging**: Efficient batch processing
- **Security Alerts**: Automatic threat detection
- **Compliance Support**: Audit trail for regulatory requirements
- **Retention Management**: Automatic log cleanup

**Event Types:**
- Authentication: Login, logout, password changes
- Data Access: View operations on sensitive data
- Data Modification: Create, update, delete operations
- System Events: Errors, configuration changes
- Security Events: Violations, suspicious activity

### 6. System Monitoring (`monitoring.ts`)

- **Health Checks**: Automated service health monitoring
- **Performance Metrics**: Response time and throughput tracking
- **External API Monitoring**: Third-party service status
- **Resource Monitoring**: Memory and connection tracking
- **Alert Generation**: Automatic issue detection

**Monitored Services:**
- Database connectivity
- SMSFresh API availability
- File system access
- Authentication system

### 7. Error Tracking (`errorTracking.ts`)

- **Intelligent Error Categorization**: Automatic error classification
- **Pattern Recognition**: Security threat detection
- **Error Aggregation**: Duplicate error grouping
- **Performance Impact**: Error-related performance tracking
- **Resolution Tracking**: Error lifecycle management

**Error Categories:**
- Authentication, Authorization, Validation
- Database, External API, File System
- Network, Business Logic, System
- Security, Rate Limit

## Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Logging Configuration
NODE_ENV=production
LOG_LEVEL=info
```

### Security Configuration (`config.ts`)

The security configuration file contains all security-related settings:

- Password policies
- Session management
- Rate limiting rules
- File upload restrictions
- Security headers
- Audit settings

## API Endpoints

### System Health
- `GET /api/admin/system/health` - System health status and metrics

### Audit Logs
- `GET /api/admin/system/audit-logs` - Retrieve audit logs with filtering

### Security Alerts
- `GET /api/admin/system/security-alerts` - View security alerts
- `POST /api/admin/system/security-alerts/resolve` - Resolve security alerts

## Usage Examples

### Using Security Middleware

```typescript
import { withSecurity } from '@/lib/security/middleware'
import { campaignSchema } from '@/lib/security/validation'

export const POST = withSecurity({
  rateLimit: 'api',
  requireAuth: true,
  validateSchema: campaignSchema
})(async (request, validatedData) => {
  // Your handler code here
})
```

### Logging User Actions

```typescript
import { logDataModification } from '@/lib/security/auditLogger'

await logDataModification(
  'campaign',
  'create',
  user,
  campaignId,
  { campaignName: 'Test Campaign' }
)
```

### Tracking Errors

```typescript
import { trackError } from '@/lib/security/errorTracking'

try {
  // Your code here
} catch (error) {
  await trackError(error, {
    userId: user.id,
    endpoint: '/api/campaigns',
    method: 'POST'
  })
}
```

### Recording Performance

```typescript
import { recordPerformance } from '@/lib/security/monitoring'

const startTime = Date.now()
// Your operation here
recordPerformance(
  'campaign:create',
  Date.now() - startTime,
  true
)
```

## Security Best Practices

1. **Input Validation**: Always validate and sanitize user inputs
2. **Rate Limiting**: Apply appropriate rate limits to all endpoints
3. **Authentication**: Use JWT tokens with proper expiration
4. **Authorization**: Implement role-based access control
5. **Logging**: Log all security-relevant events
6. **Monitoring**: Monitor system health and performance
7. **Error Handling**: Track and categorize all errors
8. **File Uploads**: Validate file types and scan for threats

## Production Considerations

1. **Database Storage**: Replace in-memory storage with database/Redis
2. **Log Rotation**: Implement proper log rotation and archival
3. **Alerting**: Set up real-time alerts for critical issues
4. **Backup**: Regular backup of audit logs and security data
5. **Compliance**: Ensure compliance with relevant regulations
6. **Performance**: Monitor and optimize security overhead
7. **Updates**: Keep security dependencies updated

## Monitoring and Alerts

The system automatically generates alerts for:

- Failed authentication attempts
- Rate limit violations
- Security pattern matches
- System health issues
- Performance degradation
- Critical errors

All alerts are logged and can be viewed through the admin panel.

## Compliance Features

- **Audit Trail**: Complete audit trail of all user actions
- **Data Access Logging**: Detailed logging of data access
- **Retention Policies**: Configurable log retention
- **Export Capabilities**: Audit log export for compliance reporting
- **User Activity Tracking**: Comprehensive user activity monitoring

This security infrastructure provides enterprise-grade security and monitoring capabilities while maintaining performance and usability.