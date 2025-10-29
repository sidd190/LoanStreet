import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Unauthorized access',
    message: 'You do not have permission to access this resource',
    code: 'INSUFFICIENT_PERMISSIONS'
  }, { status: 403 })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Unauthorized access',
    message: 'You do not have permission to perform this action',
    code: 'INSUFFICIENT_PERMISSIONS'
  }, { status: 403 })
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Unauthorized access',
    message: 'You do not have permission to modify this resource',
    code: 'INSUFFICIENT_PERMISSIONS'
  }, { status: 403 })
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Unauthorized access',
    message: 'You do not have permission to delete this resource',
    code: 'INSUFFICIENT_PERMISSIONS'
  }, { status: 403 })
}