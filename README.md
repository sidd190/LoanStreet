# QuickLoan - Loan Agent Platform

A comprehensive full-stack loan agent platform built with Next.js, featuring a stunning frontend for customer conversions and a powerful admin panel for marketing automation, WhatsApp/SMS campaigns, and lead management.

## 🚀 Features

### Frontend (Customer-Facing)
- **Stunning Landing Page**: Modern, conversion-optimized design inspired by leading loan websites
- **Interactive Loan Calculator**: Real-time EMI calculations
- **Responsive Design**: Mobile-first approach with smooth animations
- **Service Showcase**: Personal, Business, and Home loan products
- **Customer Testimonials**: Social proof and trust building
- **Contact Forms**: Lead capture and inquiry management

### Admin Panel
- **Role-Based Access Control**: Admin and Employee roles with different permissions
- **Campaign Management**: Create, schedule, and monitor SMS/WhatsApp campaigns
- **Contact Management**: Import, organize, and segment customer data
- **Message Center**: Send/receive messages, manage conversations
- **Lead Management**: Track and nurture potential customers
- **Data Processing**: Automatic phone number formatting and validation
- **Analytics Dashboard**: Campaign performance and conversion metrics
- **Automation System**: Cron jobs for scheduled campaigns and data processing

### Key Capabilities
- **Multi-Channel Messaging**: SMS and WhatsApp integration via SMSFresh API
- **Data Import & Processing**: CSV upload with automatic data cleaning
- **Phone Number Standardization**: Handles various Indian phone number formats
- **Campaign Automation**: Scheduled campaigns with progress tracking
- **Response Management**: Centralized inbox for customer responses
- **Lead Scoring**: Priority-based lead management system

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: Prisma ORM with SQLite (easily switchable to PostgreSQL/MySQL)
- **Authentication**: Custom JWT-based auth system
- **API Integration**: SMSFresh for SMS/WhatsApp services
- **File Processing**: CSV parsing and data validation
- **Automation**: Node-cron for scheduled tasks

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd loan-agent-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## 🔐 Demo Credentials

### Admin Access
- **Email**: admin@quickloan.com
- **Password**: admin123
- **Permissions**: Full access to all features

### Employee Access  
- **Email**: employee@quickloan.com
- **Password**: emp123
- **Permissions**: Limited to messages and leads (no campaign creation)

## 📁 Project Structure

```
├── app/
│   ├── admin/                 # Admin panel pages
│   │   ├── campaigns/         # Campaign management
│   │   ├── components/        # Shared admin components
│   │   ├── dashboard/         # Admin dashboard
│   │   └── page.tsx          # Admin login
│   ├── api/                  # API routes
│   │   ├── auth/             # Authentication endpoints
│   │   └── dashboard/        # Dashboard data
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── lib/
│   └── utils.ts              # Utility functions
├── prisma/
│   └── schema.prisma         # Database schema
└── README.md
```

## 🎯 Admin Panel Features

### Dashboard
- Real-time statistics and KPIs
- Campaign performance charts
- Recent activity feed
- Quick action buttons

### Campaign Management (Admin Only)
- Create SMS/WhatsApp campaigns
- Schedule campaigns for future delivery
- Monitor campaign progress and metrics
- Pause/resume active campaigns

### Contact Management (Admin Only)
- Import contacts via CSV upload
- Automatic phone number formatting
- Contact segmentation and tagging
- Duplicate detection and merging

### Message Center (Admin & Employee)
- Unified inbox for all conversations
- Send individual messages
- Message status tracking (sent/delivered/read)
- Response management

### Lead Management (Admin & Employee)
- Lead capture from website forms
- Lead assignment and tracking
- Priority-based lead scoring
- Activity logging and notes

### Data Import (Admin Only)
- CSV file upload and processing
- Automatic data validation and cleaning
- Error reporting and correction
- Bulk contact import

### Automation (Admin Only)
- Scheduled campaign execution
- Automatic lead assignment
- Data processing workflows
- Cron job management

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# SMSFresh API (to be configured)
SMSFRESH_API_KEY="your_api_key_here"
SMSFRESH_API_URL="https://api.smsfresh.com"

# JWT Secret
JWT_SECRET="your_jwt_secret_here"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### SMSFresh Integration
The platform is designed to integrate with SMSFresh API for SMS and WhatsApp messaging. Configure your API credentials in the environment variables and update the messaging service in `lib/messaging.ts`.

## 📊 Database Schema

The application uses Prisma ORM with the following main entities:

- **Users**: Admin and employee accounts
- **Contacts**: Customer contact information
- **Campaigns**: Marketing campaigns (SMS/WhatsApp)
- **Messages**: Individual messages and conversations
- **Leads**: Potential customers and loan applications
- **Activities**: User actions and system events

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Database Migration
```bash
npx prisma migrate deploy
```

### Environment Setup
- Configure production database (PostgreSQL recommended)
- Set up SMSFresh API credentials
- Configure domain and SSL certificates
- Set up monitoring and logging

## 🔒 Security Features

- Role-based access control
- JWT token authentication
- Input validation and sanitization
- SQL injection prevention via Prisma
- XSS protection
- CSRF protection

## 📈 Performance Optimizations

- Server-side rendering with Next.js
- Image optimization
- Code splitting and lazy loading
- Database query optimization
- Caching strategies
- CDN integration ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Roadmap

- [ ] Advanced analytics and reporting
- [ ] WhatsApp Business API integration
- [ ] AI-powered lead scoring
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Advanced automation workflows
- [ ] Integration with CRM systems
- [ ] Voice call integration
- [ ] Document management system
- [ ] Advanced security features

---

Built with ❤️ for the Indian lending industry