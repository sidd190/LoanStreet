# 🏦 QuickLoan - Comprehensive Loan Management Platform

A modern, full-stack loan management platform with integrated WhatsApp messaging, lead management, and campaign automation. Built with Next.js, TypeScript, and Prisma.

![QuickLoan Platform](https://img.shields.io/badge/Platform-Next.js-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

## 🌟 Overview

QuickLoan is a comprehensive loan management platform designed for financial institutions to streamline their loan processes, manage customer relationships, and automate communications through WhatsApp integration. The platform provides both customer-facing loan application features and a powerful admin panel for loan officers and administrators.

## 🚀 Key Features

### 🏠 **Customer Portal**
- **Modern Landing Page**: Responsive design with loan calculator and service showcase
- **Loan Calculator**: Real-time EMI calculations with interactive sliders
- **Multiple Loan Types**: Personal, Business, Home, Vehicle, Education, and Gold loans
- **Service Information**: Detailed loan products with features and benefits
- **Application Process**: Step-by-step loan application guidance
- **Testimonials**: Customer success stories and reviews
- **Contact Forms**: Multiple ways for customers to get in touch

### 👨‍💼 **Admin Dashboard**
- **Real-time Analytics**: Live dashboard with key performance indicators
- **User Management**: Role-based access control (Admin/Employee)
- **Comprehensive Statistics**: Contacts, campaigns, messages, and lead metrics
- **Activity Monitoring**: Recent activity tracking and notifications
- **Quick Actions**: One-click access to common tasks
- **Responsive Design**: Mobile-friendly admin interface

### 📱 **WhatsApp Integration (SMSFresh API)**
- **Multi-Message Types**: Text, template, media, and OTP messages
- **8 Pre-configured Templates**:
  - `LOAN_WELCOME` - Welcome message with reference ID
  - `LOAN_APPROVED` - Loan approval notifications
  - `LOAN_REJECTED` - Loan rejection notifications
  - `DOCUMENT_REQUIRED` - Document request messages
  - `EMI_REMINDER` - Payment reminder notifications
  - `OTP_VERIFICATION` - Authentication messages
  - `LOAN_DISBURSED` - Disbursement confirmations
  - `FOLLOW_UP` - Application follow-up messages
- **Bulk Messaging**: Batch processing with rate limiting
- **Media Support**: Images, videos, and documents
- **Template Management**: Dynamic parameter substitution
- **Delivery Tracking**: Message status monitoring
- **Test Interface**: Built-in WhatsApp testing modal

### 📊 **Campaign Management**
- **Campaign Creation**: Visual campaign builder with template selection
- **Bulk Execution**: Send messages to multiple contacts simultaneously
- **Performance Tracking**: Campaign analytics and success metrics
- **Scheduling**: Schedule campaigns for optimal timing
- **Template Integration**: Use pre-approved WhatsApp templates
- **Contact Segmentation**: Target specific customer groups
- **Real-time Monitoring**: Track campaign progress and results

### 👥 **Contact Management**
- **Contact Database**: Comprehensive customer information storage
- **Import/Export**: CSV import and export functionality
- **Contact Segmentation**: Tag and categorize contacts
- **Communication History**: Complete message and interaction logs
- **Bulk Operations**: Mass updates and actions
- **Search & Filter**: Advanced contact search capabilities
- **Status Tracking**: Active, inactive, and blocked contact management

### 🎯 **Lead Management**
- **Lead Scoring**: Intelligent lead scoring algorithm
- **Lead Pipeline**: Visual lead progression tracking
- **Assignment System**: Automatic and manual lead assignment
- **Priority Management**: Urgent, high, medium, low priority levels
- **Conversion Tracking**: Lead to customer conversion analytics
- **Follow-up Automation**: Automated follow-up reminders
- **Lead Sources**: Track lead generation channels
- **Performance Analytics**: Lead conversion rates and metrics

### 💬 **Message Center**
- **Unified Inbox**: All WhatsApp, SMS, and email communications
- **Real-time Chat**: Live messaging interface
- **Message Templates**: Quick response templates
- **Conversation History**: Complete communication logs
- **Multi-channel Support**: WhatsApp, SMS, and email integration
- **Response Tracking**: Message delivery and read receipts
- **Bulk Messaging**: Send messages to multiple contacts
- **Media Sharing**: Share images, documents, and videos

### 📈 **Analytics & Reporting**
- **Dashboard Metrics**: Real-time KPI monitoring
- **Campaign Performance**: Detailed campaign analytics
- **Lead Analytics**: Lead generation and conversion metrics
- **Message Statistics**: Delivery rates and response analytics
- **Revenue Tracking**: Loan disbursement and revenue metrics
- **Custom Reports**: Generate detailed business reports
- **Data Export**: Export data for external analysis
- **Trend Analysis**: Historical data and trend visualization

### 🔐 **Security & Authentication**
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Admin and Employee role management
- **Permission System**: Granular permission controls
- **Session Management**: Secure session handling
- **Data Protection**: Encrypted sensitive information
- **Audit Logging**: Complete action audit trails
- **Security Headers**: Comprehensive security headers
- **CSRF Protection**: Cross-site request forgery protection

### 🛠️ **System Administration**
- **User Management**: Create and manage user accounts
- **System Settings**: Configure platform parameters
- **Database Management**: Data backup and recovery
- **API Management**: Monitor and manage API usage
- **Error Monitoring**: Comprehensive error tracking
- **Performance Monitoring**: System performance metrics
- **Maintenance Mode**: System maintenance capabilities
- **Configuration Management**: Environment and feature toggles

## 🏗️ **Technical Architecture**

### **Frontend**
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **UI Components**: Custom component library
- **Animations**: Framer Motion for smooth interactions
- **State Management**: React Context and hooks
- **Form Handling**: React Hook Form with validation
- **Icons**: Lucide React icon library

### **Backend**
- **Runtime**: Node.js with Next.js API routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT with secure cookie storage
- **API Design**: RESTful API with comprehensive error handling
- **File Upload**: Secure file handling and storage
- **Caching**: In-memory caching for performance
- **Logging**: Comprehensive application logging
- **Error Handling**: Graceful error handling and recovery

### **Integrations**
- **WhatsApp API**: SMSFresh API integration
- **Email Service**: SMTP configuration for notifications
- **File Storage**: Local and cloud storage options
- **Analytics**: Built-in analytics and reporting
- **Webhooks**: Webhook support for external integrations
- **API Documentation**: Comprehensive API documentation

## 📋 **Prerequisites**

- **Node.js**: Version 18.0 or higher
- **npm/yarn**: Package manager
- **Database**: SQLite (included) or PostgreSQL/MySQL
- **SMSFresh Account**: For WhatsApp messaging (optional)
- **SMTP Server**: For email notifications (optional)

## 🚀 **Quick Start**

### 1. **Clone Repository**
```bash
git clone <repository-url>
cd quickloan-platform
```

### 2. **Install Dependencies**
```bash
npm install
# or
yarn install
```

### 3. **Environment Setup**
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="24h"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# SMSFresh API (WhatsApp)
SMSFRESH_USER="your-username"
SMSFRESH_PASS="your-password"
SMSFRESH_SENDER="your-sender-id"
SMSFRESH_API_URL="http://trans.smsfresh.co/api/sendmsg.php"

# Email Configuration
SMTP_HOST="your-smtp-host"
SMTP_PORT="587"
SMTP_USER="your-email"
SMTP_PASS="your-password"
```

### 4. **Database Setup**
```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database with sample data
npx prisma db seed
```

### 5. **Start Development Server**
```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to see the application.

## 👤 **Default Accounts**

### **Admin Account**
- **Email**: `admin@quickloan.com`
- **Password**: `admin123`
- **Access**: Full platform access

### **Employee Account**
- **Email**: `employee@quickloan.com`
- **Password**: `emp123`
- **Access**: Limited to messages, leads, and dashboard

## 🧪 **Testing WhatsApp Integration**

### **1. Web Interface**
1. Login as admin
2. Go to dashboard
3. Click "Test WhatsApp" button
4. Use the test modal to send messages

### **2. Command Line**
```bash
# Test API connectivity
curl http://localhost:3000/api/test/whatsapp

# Send test message
./send-test-message.sh YOUR_PHONE_NUMBER
```

### **3. API Testing**
```bash
# Send template message
curl -X POST -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "phone": "9876543210",
    "templateName": "LOAN_WELCOME",
    "params": ["QL123456"]
  }' \
  http://localhost:3000/api/test/whatsapp
```

## 📚 **API Documentation**

### **Authentication Endpoints**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile

### **Dashboard Endpoints**
- `GET /api/dashboard/stats` - Get dashboard statistics

### **WhatsApp Endpoints**
- `GET /api/test/whatsapp` - Test WhatsApp API
- `POST /api/test/whatsapp` - Send test message
- `GET /api/whatsapp/templates` - Get available templates
- `POST /api/messages/send` - Send WhatsApp message

### **Campaign Endpoints**
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/[id]/execute` - Execute campaign

### **Contact Endpoints**
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `PATCH /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact

### **Lead Endpoints**
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `PATCH /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead

## 🔧 **Configuration**

### **Database Configuration**
The platform supports multiple database options:
- **SQLite** (default): Perfect for development and small deployments
- **PostgreSQL**: Recommended for production
- **MySQL**: Alternative production option

### **WhatsApp Configuration**
Configure SMSFresh API for WhatsApp messaging:
1. Sign up for SMSFresh account
2. Get API credentials
3. Update environment variables
4. Test connectivity using built-in tools

### **Email Configuration**
Set up SMTP for email notifications:
1. Configure SMTP server details
2. Test email functionality
3. Customize email templates

## 🚀 **Deployment**

### **Production Deployment**
1. **Environment Setup**
   ```bash
   NODE_ENV=production
   DATABASE_URL="your-production-database-url"
   JWT_SECRET="secure-production-secret"
   ```

2. **Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

3. **Build Application**
   ```bash
   npm run build
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

### **Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Vercel Deployment**
1. Connect repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

## 📊 **Performance Features**

- **Server-side Rendering**: Fast initial page loads
- **Static Generation**: Optimized static pages
- **Image Optimization**: Automatic image optimization
- **Code Splitting**: Efficient bundle loading
- **Caching**: Intelligent caching strategies
- **Database Optimization**: Optimized queries and indexing
- **CDN Integration**: Global content delivery
- **Compression**: Gzip and Brotli compression

## 🔒 **Security Features**

- **Authentication**: Secure JWT-based authentication
- **Authorization**: Role-based access control
- **Data Validation**: Input validation and sanitization
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **CSRF Protection**: Cross-site request forgery protection
- **Rate Limiting**: API rate limiting
- **Security Headers**: Comprehensive security headers

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

### **Documentation**
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [WhatsApp Integration Guide](WHATSAPP_INTEGRATION.md)

### **Getting Help**
- Check the [Issues](issues) page for common problems
- Review the [FAQ](docs/faq.md) for quick answers
- Contact support for technical assistance

### **Community**
- Join our [Discord](discord-link) for discussions
- Follow us on [Twitter](twitter-link) for updates
- Star the repository if you find it useful

## 🎯 **Roadmap**

### **Upcoming Features**
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Payment gateway integration
- [ ] Document management system
- [ ] Video call integration
- [ ] AI-powered lead scoring
- [ ] Advanced automation workflows

### **Version History**
- **v1.0.0** - Initial release with core features
- **v1.1.0** - WhatsApp integration and campaign management
- **v1.2.0** - Enhanced analytics and reporting
- **v1.3.0** - Mobile responsiveness improvements

---

## 🏆 **Features Summary**

✅ **Customer Portal** - Modern loan application interface  
✅ **Admin Dashboard** - Comprehensive management panel  
✅ **WhatsApp Integration** - Full messaging capabilities  
✅ **Campaign Management** - Bulk messaging and automation  
✅ **Contact Management** - Customer database and segmentation  
✅ **Lead Management** - Lead scoring and pipeline tracking  
✅ **Message Center** - Unified communication hub  
✅ **Analytics & Reporting** - Real-time insights and metrics  
✅ **Security & Authentication** - Role-based access control  
✅ **System Administration** - Complete platform management  

**QuickLoan** - Transforming loan management with modern technology and seamless customer experiences. 🚀

---

*Built with ❤️ using Next.js, TypeScript, and modern web technologies.*