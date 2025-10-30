'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  MessageSquare,
  Download,
  Image as ImageIcon,
  FileText
} from 'lucide-react'
import { Message } from '../types'
import LoadingSpinner from '../../../components/LoadingSpinner'

interface ConversationViewProps {
  messages: Message[]
  loading?: boolean
  contactName: string
}

export default function ConversationView({
  messages,
  loading = false,
  contactName
}: ConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return Clock
      case 'SENT': return CheckCircle
      case 'DELIVERED': return CheckCircle
      case 'READ': return CheckCircle
      case 'FAILED': return XCircle
      case 'REPLIED': return MessageSquare
      default: return AlertCircle
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-500'
      case 'SENT': return 'text-blue-500'
      case 'DELIVERED': return 'text-green-500'
      case 'READ': return 'text-green-600'
      case 'FAILED': return 'text-red-500'
      case 'REPLIED': return 'text-purple-500'
      default: return 'text-gray-500'
    }
  }

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}
    
    messages.forEach(message => {
      const dateKey = new Date(message.createdAt).toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })
    
    return groups
  }

  const renderMediaMessage = (message: Message) => {
    if (!message.mediaUrl) return null

    const mediaType = message.mediaType || 'image'
    
    switch (mediaType) {
      case 'image':
        return (
          <div className="mt-2">
            <img 
              src={message.mediaUrl} 
              alt="Shared image"
              className="max-w-xs rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => window.open(message.mediaUrl, '_blank')}
            />
          </div>
        )
      case 'video':
        return (
          <div className="mt-2">
            <video 
              src={message.mediaUrl}
              controls
              className="max-w-xs rounded-lg shadow-sm"
            />
          </div>
        )
      case 'document':
        return (
          <div className="mt-2 flex items-center space-x-2 p-3 bg-gray-50 rounded-lg max-w-xs">
            <FileText className="w-6 h-6 text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Document</p>
              <p className="text-xs text-gray-500">Click to download</p>
            </div>
            <button
              onClick={() => window.open(message.mediaUrl, '_blank')}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-500">Start a conversation with {contactName}</p>
        </div>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <AnimatePresence>
        {Object.entries(messageGroups).map(([dateKey, dayMessages]) => (
          <div key={dateKey}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                {formatDate(dayMessages[0].createdAt)}
              </div>
            </div>

            {/* Messages for this date */}
            {dayMessages.map((message, index) => {
              const isOutbound = message.direction === 'OUTBOUND'
              const StatusIcon = getStatusIcon(message.status)
              const statusColor = getStatusColor(message.status)
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-3`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                    isOutbound 
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}>
                    {/* Message type indicator */}
                    {message.type === 'SMS' && (
                      <div className={`text-xs mb-1 ${isOutbound ? 'text-primary-100' : 'text-gray-500'}`}>
                        SMS
                      </div>
                    )}
                    
                    {/* Message content */}
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    
                    {/* Media content */}
                    {renderMediaMessage(message)}
                    
                    {/* Message metadata */}
                    <div className={`flex items-center justify-between mt-2 text-xs ${
                      isOutbound ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(message.createdAt)}</span>
                      {isOutbound && (
                        <div className="flex items-center space-x-1 ml-2">
                          <StatusIcon className={`w-3 h-3 ${statusColor}`} />
                          <span className="capitalize">{message.status.toLowerCase()}</span>
                        </div>
                      )}
                    </div>

                    {/* Campaign info */}
                    {message.campaignName && (
                      <div className={`text-xs mt-1 ${isOutbound ? 'text-primary-200' : 'text-gray-400'}`}>
                        Campaign: {message.campaignName}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  )
}