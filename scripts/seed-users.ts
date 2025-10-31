import { createUser } from '../lib/auth'

async function seedUsers() {
  try {
    console.log('🌱 Seeding default users...')

    // Create admin user
    try {
      await createUser('admin@quickloan.com', 'admin123', 'Admin User', 'ADMIN')
      console.log('✅ Admin user created')
    } catch (error) {
      console.log('ℹ️ Admin user already exists')
    }

    // Create employee user
    try {
      await createUser('employee@quickloan.com', 'emp123', 'Employee User', 'EMPLOYEE')
      console.log('✅ Employee user created')
    } catch (error) {
      console.log('ℹ️ Employee user already exists')
    }

    console.log('🎉 User seeding completed!')
  } catch (error) {
    console.error('❌ Error seeding users:', error)
  }
}

seedUsers()