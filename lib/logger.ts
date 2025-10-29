// Enhanced logging system for data source tracking
import { errorTracker, ErrorCategory } from './security/errorTracking'
import { auditLogger, AuditEventType } from './security/auditLogger'

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export enum DataSource {
  API = 'API',
  DATABASE = 'DATABASE',
  FALLBACK_JSON = 'FALLBACK_JSON',
  CACHE = 'CACHE'
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  source: DataSource
  operation: string
  message: string
  data?: any
  error?: any
}

class Logger {
  private static logs: LogEntry[] = []
  private static maxLogs = 1000

  private static getIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.SUCCESS: return '✅'
      case LogLevel.INFO: return 'ℹ️'
      case LogLevel.WARN: return '⚠️'
      case LogLevel.ERROR: return '❌'
      default: return '📝'
    }
  }

  private static getSourceIcon(source: DataSource): string {
    switch (source) {
      case DataSource.API: return '🌐'
      case DataSource.DATABASE: return '🗄️'
      case DataSource.FALLBACK_JSON: return '📁'
      case DataSource.CACHE: return '💾'
      default: return '📊'
    }
  }

  private static addLog(entry: LogEntry) {
    this.logs.unshift(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }
  }

  static logDataSource(
    level: LogLevel,
    source: DataSource,
    operation: string,
    message: string,
    data?: any,
    error?: any
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      operation,
      message,
      data,
      error
    }

    this.addLog(entry)

    // Console output with enhanced formatting
    const icon = this.getIcon(level)
    const sourceIcon = this.getSourceIcon(source)
    const timestamp = new Date().toLocaleTimeString()
    
    const logMessage = `${icon} ${sourceIcon} [${timestamp}] ${operation}: ${message}`
    
    switch (level) {
      case LogLevel.SUCCESS:
        console.log(`%c${logMessage}`, 'color: #22c55e; font-weight: bold')
        break
      case LogLevel.INFO:
        console.log(`%c${logMessage}`, 'color: #3b82f6')
        break
      case LogLevel.WARN:
        console.warn(`%c${logMessage}`, 'color: #f59e0b; font-weight: bold')
        if (error) console.warn('Error details:', error)
        break
      case LogLevel.ERROR:
        console.error(`%c${logMessage}`, 'color: #ef4444; font-weight: bold')
        if (error) console.error('Error details:', error)
        break
    }

    if (data && process.env.NODE_ENV === 'development') {
      console.log('Data:', data)
    }
  }

  static success(source: DataSource, operation: string, message: string, data?: any) {
    this.logDataSource(LogLevel.SUCCESS, source, operation, message, data)
  }

  static info(source: DataSource, operation: string, message: string, data?: any) {
    this.logDataSource(LogLevel.INFO, source, operation, message, data)
  }

  static warn(source: DataSource, operation: string, message: string, error?: any) {
    this.logDataSource(LogLevel.WARN, source, operation, message, undefined, error)
  }

  static error(source: DataSource, operation: string, message: string, error?: any) {
    this.logDataSource(LogLevel.ERROR, source, operation, message, undefined, error)
    
    // Track error in security system
    if (error) {
      errorTracker.trackError(error, {
        timestamp: new Date()
      }, {
        source,
        operation,
        dataSource: true
      }).catch(err => console.error('Failed to track error:', err))
    }
  }

  static getLogs(): LogEntry[] {
    return [...this.logs]
  }

  static clearLogs() {
    this.logs = []
  }

  // Special method for fallback scenarios
  static fallbackWarning(operation: string, apiError: any, fallbackCount?: number) {
    const message = fallbackCount 
      ? `API failed, using ${fallbackCount} fallback records from JSON data`
      : 'API failed, using fallback data from JSON files'
    
    this.warn(DataSource.FALLBACK_JSON, operation, message, apiError)
    
    // Additional console message for visibility
    console.log(`%c🚨 FALLBACK MODE: ${operation}`, 'color: #f59e0b; font-weight: bold; background: #fef3c7; padding: 4px 8px; border-radius: 4px;')
    console.log(`%c   Using hardcoded JSON data instead of live database`, 'color: #92400e; font-style: italic;')
  }
}

export default Logger
export const logger = Logger