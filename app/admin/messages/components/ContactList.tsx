'use client'

import { motion } from 'framer-motion'
import { User, MessageSquare } from 'lucide-react'
import { Contact, Message } from '../types'
import LoadingSpinner from '../../../components/LoadingSpinner'

interface ContactListProps {
  contacts: Contact[]
  selectedContact: Contact | null
  onSelectContact: (contact: Contact) => void
  conversations: Record<string, Message[]>
  loading?: boolean
}

export default function ContactList({
  contacts,
  selectedContact,
  onSelectContact,
  conversations,
  loading = false
}: ContactListProps) {
  const getLastMessage = (contact: Contact): Message | null => {
    const contactMessages = conversations[contact.id] || []
    return contactMessages.length > 0 ? contactMessages[contactMessages.length - 1] : null
  }

  const getUnreadCount = (contact: Contact): number => {
    const contactMessages = conversations[contact.id] || []
    return contactMessages.filter(msg => 
      msg.direction === 'INBOUND' && msg.status !== 'READ'
    ).length
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No contacts found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {contacts.map((contact, index) => {
        const lastMessage = getLastMessage(contact)
        const unreadCount = getUnreadCount(contact)
        const isSelected = selectedContact?.id === contact.id

        return (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectContact(contact)}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
              isSelected ? 'bg-primary-50 border-primary-200 shadow-sm' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                  isSelected 
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600' 
                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}>
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  contact.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`text-sm font-semibold truncate ${
                    isSelected ? 'text-primary-900' : 'text-gray-900'
                  }`}>
                    {contact.name}
                  </h3>
                  {lastMessage && (
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {lastMessage ? (
                      <div className="flex items-center space-x-1">
                        {lastMessage.direction === 'OUTBOUND' && (
                          <span className="text-xs text-gray-400">You:</span>
                        )}
                        <p className="text-sm text-gray-600 truncate">
                          {lastMessage.content}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No messages yet</p>
                    )}
                  </div>
                  
                  {unreadCount > 0 && (
                    <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center ml-2 flex-shrink-0">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>

                {/* Contact metadata */}
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-400">{contact.phone}</span>
                  {contact.tags && contact.tags.length > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {contact.tags[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}