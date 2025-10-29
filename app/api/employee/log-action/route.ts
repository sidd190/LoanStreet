import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  return withAuthAndRole(['EMPLOYEE'])(request, async (req) => {
    try {
      const { action, details, timestamp } = await req.json()
      
      if (!action) {
        return NextResponse.json(
          { success: false, message: 'Action is required' },
          { status: 400 }
        )
      }

      // Create action log entry
      const actionLog = await prisma.employeeActionLog.create({
        data: {
          employeeId: req.user!.id,
          employeeName: req.user!.name,
          action,
          details: details || {},
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Action logged successfully',
        logId: actionLog.id
      })
    } catch (error) {
      console.error('Employee action logging error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to log action' },
        { status: 500 }
      )
    }
  })
}