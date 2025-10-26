'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  Send, 
  MessageSquare, 
  Phone, 
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'

export default function MessagesPage() {
  const [messages, setMessages] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const mockMessages = [
    {
      id: '1',
      contactId: 'c1',
      contactName: 'Rajesh Kumar',
      contactPhone: '+919876543210',
      lastMessage: 'I am interested in a personal loan of ₹3L',
      lastMessageTime: '2024-10-24T14:30:00',
      unreadCount: 2,
      status: 'REPLIED',
      type: 'WHATSAPP',
      conversation: [
        {
          id: 'm1',
          content: 'Get instant personal loans up to ₹5L with minimal documentation. Apply now!',
          direction: 'OUTBOUND',
          timestamp: '2024-10-24T10:00:00',
          status: 'DELIVERED'
        },
        {
          id: 'm2', 
          content: 'I am interested in a personal loan of ₹3L',
          direction: 'INBOUND',
          timestamp: '2024-10-24T14:30:00',
          status: 'READ'
        },
        {
          id: 'm3',
          content: 'What documents do I need?',
          direction: 'INBOUND', 
          timestamp: '2024-10-24T14:32:00',
          status: 'READ'
        }
      ]
    },
    {
      id: '2',
      contactId: 'c2',
      contactName: 'Priya Sharma',
      contactPhone: '+919876543211',
      lastMessage: 'Thank you for the information',
      lastMessageTime: '2024-10-24T12:15:00',
      unreadCount: 0,
      status: 'DELIVERED',
      type: 'SMS',
      conversation: [
        {
          id: 'm4',
          content: 'Business loans available at 12.99% interest rate. Contact us for more details.',
          direction: 'OUTBOUND',
          timestamp: '2024-10-24T09:00:00',
          status: 'DELIVERED'
        },
        {
          id: 'm5',
          content: 'Thank you for the information',
          direction: 'INBOUND',
          timestamp: '2024-10-24T12:15:00',
          status: 'READ'
        }
      ]
    }
  ]

  useEffect(() => {
    setMessages(mockMessages)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT': return <Clock className="w-4 h-4 text-gray-400" />
      case 'DELIVERED': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'READ': return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'REPLIED': return <MessageSquare className="w-4 h-4 text-purple-500" />
      case 'FAILED': return <AlertCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'WHATSAPP' ? '📱' : '💬'
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return
    
    // Add message to conversation (mock)
    const updatedMessages = messages.map(msg => {
      if (msg.id === selectedConversation.id) {
        return {
          ...msg,
          conversation: [
            ...msg.conversation,
            {
              id: `m${Date.now()}`,
              content: newMessage,
              direction: 'OUTBOUND',
              timestamp: new Date().toISOString(),
              status: 'SENT'
            }
          ]
        }
      }
      return msg
    })
    
    setMessages(updatedMessages)
    setSelectedConversation(updatedMessages.find(m => m.id === selectedConversation.id))
    setNewMessage('')
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-8rem)] flex">
        {/* Conversations List */}
        <div className="w-1/3 bg-white rounded-l-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {mockMessages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => setSelectedConversation(message)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === message.id ? 'bg-primary-50 border-primary-200' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {message.contactName}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">{getTypeIcon(message.type)}</span>
                        {getStatusIcon(message.status)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{message.contactPhone}</p>
                    <p className="text-sm text-gray-600 truncate">{message.lastMessage}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {new Date(message.lastMessageTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {message.unreadCount > 0 && (
                        <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {message.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-r-xl shadow-sm border-t border-r border-b border-gray-100 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedConversation.contactName}</h3>
                    <p className="text-sm text-gray-500">{selectedConversation.contactPhone}</p>
                  </div>
                  <div className="ml-auto flex items-center space-x-2">
                    <span className="text-sm">{getTypeIcon(selectedConversation.type)}</span>
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.conversation.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.direction === 'OUTBOUND' 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <div className={`flex items-center justify-between mt-1 ${
                        msg.direction === 'OUTBOUND' ? 'text-primary-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">
                          {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {msg.direction === 'OUTBOUND' && (
                          <div className="ml-2">
                            {getStatusIcon(msg.status)}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}