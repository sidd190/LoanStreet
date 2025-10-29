import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return withAuthAndRole(['EMPLOYEE'])(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url)
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      // Get action logs for the current employee
      const logs = await prisma.employeeActionLog.findMany({
        where: {
          employeeId: req.user!.id
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          action: true,
          details: true,
          timestamp: true,
          ipAddress: true
        }
      })

      const totalCount = await prisma.employeeActionLog.count({
        where: {
          employeeId: req.user!.id
        }
      })

      return NextResponse.json({
        success: true,
        logs,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      })
    } catch (error) {
      console.error('Employee action logs fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch action logs' },
        { status: 500 }
      )
    }
  })
}