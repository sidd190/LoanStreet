import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quickloan.com' },
    update: {},
    create: {
      email: 'admin@quickloan.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Created admin user:', admin.email)

  // Create employee user
  const employeePassword = await bcrypt.hash('emp123', 12)
  const employee = await prisma.user.upsert({
    where: { email: 'employee@quickloan.com' },
    update: {},
    create: {
      email: 'employee@quickloan.com',
      password: employeePassword,
      name: 'Employee User',
      role: 'EMPLOYEE',
      isActive: true,
    },
  })

  console.log('✅ Created employee user:', employee.email)

  // Create some sample contacts
  const contacts = [
    {
      phone: '9876543210',
      name: 'John Doe',
      email: 'john@example.com',
      tags: JSON.stringify(['lead', 'personal-loan']),
    },
    {
      phone: '9876543211',
      name: 'Jane Smith',
      email: 'jane@example.com',
      tags: JSON.stringify(['prospect', 'business-loan']),
    },
    {
      phone: '9876543212',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      tags: JSON.stringify(['customer', 'home-loan']),
    },
  ]

  for (const contactData of contacts) {
    await prisma.contact.upsert({
      where: { phone: contactData.phone },
      update: {},
      create: contactData,
    })
  }

  console.log('✅ Created sample contacts')

  // Create sample campaigns
  const campaigns = [
    {
      name: 'Personal Loan Promotion',
      type: 'WHATSAPP',
      message: 'Get instant personal loans at lowest interest rates! Apply now.',
      status: 'COMPLETED',
      totalSent: 150,
      totalDelivered: 145,
      totalReplies: 23,
      createdById: admin.id,
    },
    {
      name: 'Business Loan Campaign',
      type: 'SMS',
      message: 'Expand your business with our flexible business loans.',
      status: 'RUNNING',
      totalSent: 200,
      totalDelivered: 195,
      totalReplies: 15,
      createdById: admin.id,
    },
  ]

  for (const campaignData of campaigns) {
    const existing = await prisma.campaign.findFirst({
      where: { name: campaignData.name }
    })
    
    if (!existing) {
      await prisma.campaign.create({
        data: campaignData,
      })
    }
  }

  console.log('✅ Created sample campaigns')

  // Create sample leads
  const leads = [
    {
      name: 'Alice Wilson',
      phone: '9876543213',
      email: 'alice@example.com',
      loanType: 'PERSONAL',
      loanAmount: 50000,
      status: 'INTERESTED',
      priority: 'HIGH',
      source: 'Website',
      assignedToId: employee.id,
    },
    {
      name: 'Charlie Brown',
      phone: '9876543214',
      email: 'charlie@example.com',
      loanType: 'BUSINESS',
      loanAmount: 200000,
      status: 'QUALIFIED',
      priority: 'URGENT',
      source: 'Referral',
      assignedToId: admin.id,
    },
  ]

  for (const leadData of leads) {
    const existing = await prisma.lead.findFirst({
      where: { phone: leadData.phone }
    })
    
    if (!existing) {
      await prisma.lead.create({
        data: leadData,
      })
    }
  }

  console.log('✅ Created sample leads')

  console.log('🎉 Database seed completed successfully!')
  console.log('\n📋 Demo Credentials:')
  console.log('Admin: admin@quickloan.com / admin123')
  console.log('Employee: employee@quickloan.com / emp123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })