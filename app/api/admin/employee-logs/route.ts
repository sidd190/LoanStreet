import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndRole } from '@/lib/middleware/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return withAuthAndRole(['ADMIN'])(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url)
      const employeeId = searchParams.get('employeeId')
      const limit = parseInt(searchParams.get('limit') || '100')
      const offset = parseInt(searchParams.get('offset') || '0')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      // Build where clause
      const whereClause: any = {}
      
      if (employeeId) {
        whereClause.employeeId = employeeId
      }

      if (startDate || endDate) {
        whereClause.timestamp = {}
        if (startDate) {
          whereClause.timestamp.gte = new Date(startDate)
        }
        if (endDate) {
          whereClause.timestamp.lte = new Date(endDate)
        }
      }

      // Get action logs
      const logs = await prisma.employeeActionLog.findMany({
        where: whereClause,
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          employeeId: true,
          employeeName: true,
          action: true,
          details: true,
          timestamp: true,
          ipAddress: true,
          userAgent: true
        }
      })

      const totalCount = await prisma.employeeActionLog.count({
        where: whereClause
      })

      // Get summary statistics
      const actionSummary = await prisma.employeeActionLog.groupBy({
        by: ['action'],
        where: whereClause,
        _count: {
          action: true
        },
        orderBy: {
          _count: {
            action: 'desc'
          }
        }
      })

      const employeeSummary = await prisma.employeeActionLog.groupBy({
        by: ['employeeId', 'employeeName'],
        where: whereClause,
        _count: {
          employeeId: true
        },
        orderBy: {
          _count: {
            employeeId: 'desc'
          }
        }
      })

      return NextResponse.json({
        success: true,
        logs,
        summary: {
          actions: actionSummary,
          employees: employeeSummary
        },
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      })
    } catch (error) {
      console.error('Admin employee logs fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch employee logs' },
        { status: 500 }
      )
    }
  })
}