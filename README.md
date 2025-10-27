# QuickLoan - Comprehensive Loan Agent Platform

A full-stack loan agent platform built with Next.js, featuring a stunning frontend for conversions and a powerful admin panel for marketing automation, WhatsApp/SMS campaigns, and lead management.

## 🚀 Features

### Frontend (Customer-Facing)
- **Modern, Conversion-Optimized Design**: Beautiful landing pages with smooth animations using Framer Motion
- **Multi-Page Structure**: Home, Services, About, Contact, Apply, and Calculator pages
- **Interactive Loan Calculator**: Real-time EMI calculations with amortization schedules
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Loan Application Flow**: Multi-step application process with validation
- **Service Pages**: Detailed information about different loan products

### Admin Panel
- **Role-Based Access Control**: Admin and Employee roles with different permissions
- **Dashboard Analytics**: Comprehensive metrics and performance tracking
- **Campaign Management**: Create and manage WhatsApp/SMS marketing campaigns
- **Contact Management**: Import, organize, and manage customer contacts
- **Lead Management**: Track and score leads with automated prioritization
- **Message Center**: Send and receive WhatsApp/SMS messages
- **Data Import**: CSV import with automatic data cleaning and validation
- **Automation & Workflows**: Cron jobs for automated campaigns and follow-ups
- **Analytics & Reporting**: Detailed campaign performance and conversion tracking

### Advanced Features
- **Data Processing**: Automatic phone number formatting and validation
- **Lead Scoring**: AI-powered lead prioritization based on multiple factors
- **Automation System**: Scheduled campaigns, welcome messages, and follow-ups
- **SMS Fresh Integration**: Ready for SMS/WhatsApp API integration
- **Bulk Operations**: Handle thousands of contacts efficiently
- **Real-time Updates**: Live dashboard updates and notifications

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: Prisma ORM with SQLite (easily switchable to PostgreSQL/MySQL)
- **Authentication**: NextAuth.js
- **Animations**: Framer Motion, AOS
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Automation**: Node-cron for scheduled tasks

## 📁 Project Structure

```
loan-agent-platform/
├── app/                          # Next.js App Router
│   ├── components/              # Shared components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── AnimatedSection.tsx
│   ├── admin/                   # Admin panel
│   │   ├── components/
│   │   ├── dashboard/
│   │   ├── campaigns/
│   │   ├── messages/
│   │   ├── leads/
│   │   ├── import/
│   │   ├── analytics/
│   │   └── automation/
│   ├── api/                     # API routes
│   │   ├── auth/
│   │   ├── contacts/
│   │   └── dashboard/
│   ├── about/                   # About page
│   ├── services/                # Services page
│   ├── contact/                 # Contact page
│   ├── apply/                   # Loan application
│   ├── calculator/              # EMI calculator
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Homepage
├── lib/                         # Utility libraries
│   ├── dataProcessor.ts         # CSV processing utilities
│   ├── leadScoring.ts          # Lead scoring algorithms
│   └── cronJobs.ts             # Automation system
├── prisma/                      # Database schema
│   └── schema.prisma
└── public/                      # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

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

4. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   
   # SMS Fresh API (when available)
   SMSFRESH_API_KEY="your-api-key"
   SMSFRESH_API_URL="https://api.smsfresh.com"
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

### Default Admin Credentials
- **Admin**: admin@quickloan.com / admin123
- **Employee**: employee@quickloan.com / emp123

## 📊 Key Features Breakdown

### 1. Data Import & Processing
- **CSV Upload**: Drag-and-drop CSV import with real-time validation
- **Data Cleaning**: Automatic phone number formatting (+91 prefix handling)
- **Duplicate Detection**: Identifies and handles duplicate contacts
- **Error Reporting**: Detailed error logs with suggestions for fixes
- **Batch Processing**: Handles large datasets efficiently

### 2. Lead Scoring System
- **Multi-Factor Scoring**: Response time, engagement, loan amount, source quality
- **Automatic Prioritization**: HIGH, MEDIUM, LOW, URGENT categories
- **Insights Generation**: AI-powered recommendations for each lead
- **Bulk Processing**: Score thousands of leads simultaneously
- **Historical Tracking**: Monitor score changes over time

### 3. Automation & Workflows
- **Welcome Messages**: Instant welcome messages for new leads
- **Follow-up Campaigns**: Automated re-engagement for inactive leads
- **Lead Scoring Updates**: Daily automated scoring updates
- **Data Cleanup**: Automatic removal of old data
- **Campaign Management**: Auto-start scheduled campaigns

### 4. Analytics & Reporting
- **Campaign Performance**: Detailed metrics for each campaign
- **Channel Analysis**: WhatsApp vs SMS vs Email performance
- **Lead Source Tracking**: ROI analysis by acquisition channel
- **Conversion Funnels**: Track leads through the entire journey
- **Export Capabilities**: CSV/Excel export for external analysis

## 🔧 Configuration

### SMS Fresh Integration
When you receive your SMS Fresh API credentials, update the configuration:

```typescript
// lib/smsConfig.ts
export const SMS_CONFIG = {
  apiKey: process.env.SMSFRESH_API_KEY,
  apiUrl: process.env.SMSFRESH_API_URL,
  defaultSender: 'QKLOAN'
}
```

### Cron Job Schedules
Customize automation schedules in `lib/cronJobs.ts`:

```typescript
const schedules = {
  welcomeMessages: '*/5 * * * *',    // Every 5 minutes
  followupMessages: '0 10 * * *',    // Daily at 10 AM
  leadScoring: '0 2 * * *',          // Daily at 2 AM
  dataCleanup: '0 1 * * 0'           // Weekly on Sunday
}
```

## 📱 Mobile Responsiveness

The platform is fully responsive with:
- Mobile-first design approach
- Touch-friendly interfaces
- Optimized forms for mobile input
- Responsive tables and charts
- Mobile-optimized admin panel

## 🔒 Security Features

- **Role-based access control** (Admin/Employee)
- **JWT authentication** with NextAuth.js
- **Input validation** and sanitization
- **SQL injection protection** with Prisma
- **Rate limiting** on API endpoints
- **Secure password hashing** with bcrypt

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Performance Optimizations

- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic route-based code splitting
- **Lazy Loading**: Components and images loaded on demand
- **Database Indexing**: Optimized database queries
- **Caching**: API response caching where appropriate
- **Bundle Analysis**: Regular bundle size monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@quickloan.com
- Documentation: [Wiki](link-to-wiki)

## 🎯 Roadmap

- [ ] WhatsApp Business API integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] AI-powered chatbot
- [ ] Multi-language support
- [ ] Advanced reporting features
- [ ] Integration with banking APIs
- [ ] Document management system

---

**Built with ❤️ for loan agents in India**