'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  Star,
  MessageSquare,
  Edit,
  Eye,
  MoreVertical
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { formatCurrency } from '../../../lib/utils'

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [selectedLead, setSelectedLead] = useState(null)
  const [showLeadModal, setShowLeadModal] = useState(false)

  const mockLeads = [
    {
      id: '1',
      name: 'Rajesh Kumar',
      phone: '+919876543210',
      email: 'rajesh@email.com',
      loanType: 'PERSONAL',
      loanAmount: 500000,
      status: 'INTERESTED',
      priority: 'HIGH',
      score: 85,
      source: 'Website Form',
      assignedTo: 'Admin User',
      createdAt: '2024-10-24T10:30:00',
      lastContact: '2024-10-24T14:30:00',
      notes: 'Interested in personal loan for home renovation. Good credit score.',
      activities: [
        { type: 'CALL', title: 'Initial call completed', time: '2024-10-24T14:30:00' },
        { type: 'EMAIL', title: 'Sent loan details', time: '2024-10-24T11:00:00' },
        { type: 'NOTE', title: 'Lead created from website', time: '2024-10-24T10:30:00' }
      ]
    },
    {
      id: '2',
      name: 'Priya Sharma',
      phone: '+919876543211',
      email: 'priya@email.com',
      loanType: 'BUSINESS',
      loanAmount: 1200000,
      status: 'QUALIFIED',
      priority: 'URGENT',
      score: 92,
      source: 'WhatsApp Campaign',
      assignedTo: 'Employee User',
      createdAt: '2024-10-23T15:45:00',
      lastContact: '2024-10-24T09:15:00',
      notes: 'Business owner looking to expand. Strong financials.',
      activities: [
        { type: 'MEETING', title: 'In-person meeting scheduled', time: '2024-10-24T09:15:00' },
        { type: 'WHATSAPP', title: 'Responded to campaign', time: '2024-10-23T16:00:00' }
      ]
    },
    {
      id: '3',
      name: 'Amit Patel',
      phone: '+919876543212',
      email: 'amit@email.com',
      loanType: 'HOME',
      loanAmount: 2500000,
      status: 'PROPOSAL_SENT',
      priority: 'HIGH',
      score: 78,
      source: 'Referral',
      assignedTo: 'Admin User',
      createdAt: '2024-10-22T11:20:00',
      lastContact: '2024-10-23T16:45:00',
      notes: 'First-time home buyer. Proposal sent, awaiting response.',
      activities: [
        { type: 'EMAIL', title: 'Loan proposal sent', time: '2024-10-23T16:45:00' },
        { type: 'CALL', title: 'Discussed requirements', time: '2024-10-23T10:30:00' }
      ]
    }
  ]

  useEffect(() => {
    setLeads(mockLeads)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800'
      case 'CONTACTED': return 'bg-yellow-100 text-yellow-800'
      case 'INTERESTED': return 'bg-green-100 text-green-800'
      case 'QUALIFIED': return 'bg-purple-100 text-purple-800'
      case 'PROPOSAL_SENT': return 'bg-orange-100 text-orange-800'
      case 'NEGOTIATION': return 'bg-pink-100 text-pink-800'
      case 'CLOSED_WON': return 'bg-emerald-100 text-emerald-800'
      case 'CLOSED_LOST': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-yellow-600'
      case 'LOW': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const calculateLeadScore = (lead: any) => {
    let score = 0
    
    // Loan amount scoring (higher amount = higher score)
    if (lead.loanAmount >= 1000000) score += 30
    else if (lead.loanAmount >= 500000) score += 20
    else score += 10
    
    // Response time scoring
    if (lead.lastContact) {
      const daysSinceContact = Math.floor((Date.now() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceContact <= 1) score += 25
      else if (daysSinceContact 