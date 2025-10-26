import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Mock dashboard statistics
    // In production, this would query your database
    const stats = {
      totalContacts: 12543,
      totalCampaigns: 8,
      totalMessages: 45231,
      totalLeads: 1247,
      activeUsers: 5,
      conversionRate: 24.5,
      responseRate: 18.3,
      recentActivity: [
        {
          id: 1,
          type: 'campaign',
          title: 'Personal Loan Campaign launched',
          time: '2 hours ago',
          user: 'Admin User'
        },
        {
          id: 2,
          type: 'message',
          title: 'WhatsApp message sent to 500 contacts',
          time: '4 hours ago',
          user: 'Marketing Team'
        },
        {
          id: 3,
          type: 'lead',
          title: 'New lead: Rajesh Kumar - ₹5L Personal Loan',
          time: '6 hours ago',
          user: 'System'
        }
      ],
      campaignPerformance: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Messages Sent',
            data: [1200, 1900, 3000, 5000, 2000, 3000, 4500]
          },
          {
            label: 'Responses',
            data: [240, 380, 600, 1000, 400, 600, 900]
          }
        ]
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}