'use client'

import { useState, useRef } from 'react'
import { 
  Send, 
  Paperclip, 
  Smile, 
  Image, 
  FileText, 
  X,
  Loader2
} from 'lucide-react'
import EmojiPicker from './EmojiPicker'

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'SMS' | 'WHATSAPP') => Promise<void>
  onTypingIndicator?: (isTyping: boolean) => void
  disabled?: boolean
  placeholder?: string
}

export default function MessageInput({
  onSendMessage,
  onTypingIndicator,
  disabled = false,
  placeholder = "Type a message..."
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [messageType, setMessageType] = useState<'SMS' | 'WHATSAPP'>('WHATSAPP')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSend = async () => {
    if (!message.trim() || disabled || sending) return

    try {
      setSending(true)
      await onSendMessage(message.trim(), messageType)
      setMessage('')
      setShowEmojiPicker(false)
      setShowAttachmentMenu(false)
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    
    // Handle typing indicator
    if (onTypingIndicator) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Send typing start
      onTypingIndicator(true)
      
      // Auto-stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTypingIndicator(false)
      }, 2000)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
    textareaRef.current?.focus()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Handle file upload logic here
    console.log('File selected:', file)
    setShowAttachmentMenu(false)
    
    // Reset file input
    e.target.value = ''
  }

  const attachmentOptions = [
    {
      icon: Image,
      label: 'Photo',
      accept: 'image/*',
      color: 'text-green-600'
    },
    {
      icon: FileText,
      label: 'Document',
      accept: '.pdf,.doc,.docx,.txt',
      color: 'text-blue-600'
    }
  ]

  return (
    <div className="p-4 border-t border-gray-200 bg-gray-50">
      {/* Message Type Selector */}
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-xs text-gray-500">Send via:</span>
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setMessageType('WHATSAPP')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              messageType === 'WHATSAPP'
                ? 'bg-green-100 text-green-700 font-medium'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setMessageType('SMS')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              messageType === 'SMS'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            SMS
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex items-end space-x-3">
        {/* Attachment Button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attachment Menu */}
          {showAttachmentMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[120px]">
              {attachmentOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <option.icon className={`w-4 h-4 ${option.color}`} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          
          {/* Character count for SMS */}
          {messageType === 'SMS' && message.length > 0 && (
            <div className="absolute bottom-1 right-3 text-xs text-gray-400">
              {message.length}/160
            </div>
          )}
        </div>

        {/* Emoji Button */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2">
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
          className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  )
}