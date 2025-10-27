'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  CreditCard, 
  Building, 
  Home, 
  Coins, 
  Car, 
  GraduationCap,
  CheckCircle,
  ArrowRight,
  Calculator,
  Clock,
  Shield,
  Users
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AnimatedSection from '../components/AnimatedSection'

const services = [
  {
    id: 'personal',
    icon: CreditCard,
    title: 'Personal Loans',
    subtitle: 'For all your personal needs',
    amount: '₹50K - ₹50L',
    rate: '10.99% onwards',
    tenure: '1-7 years',
    features: [
      'No collateral required',
      'Flexible repayment options',
      'Quick disbursal in 24 hours',
      'Minimal documentation',
      'Competitive interest rates'
    ],
    description: 'Whether it\'s a wedding, vacation, medical emergency, or home renovation, our personal loans provide the financial flexibility you need.',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    id: 'business',
    icon: Building,
    title: 'Business Loans',
    subtitle: 'Fuel your business growth',
    amount: '₹1L - ₹1Cr',
    rate: '12.99% onwards',
    tenure: '1-5 years',
    features: [
      'Working capital financing',
      'Equipment purchase loans',
      'Business expansion funding',
      'Inventory financing',
      'Flexible repayment terms'
    ],
    description: 'Scale your business with our tailored business loan solutions. From startups to established enterprises, we support your growth journey.',
    gradient: 'from-green-500 to-green-600'
  },
  {
    id: 'home',
    icon: Home,
    title: 'Home Loans',
    subtitle: 'Make your dream home a reality',
    amount: '₹5L - ₹5Cr',
    rate: '8.99% onwards',
    tenure: '5-30 years',
    features: [
      'Low interest rates',
      'Long repayment tenure',
      'Tax benefits under 80C & 24B',
      'Balance transfer facility',
      'Top-up loan options'
    ],
    description: 'Turn your dream of owning a home into reality with our competitive home loan rates and flexible repayment options.',
    gradient: 'from-purple-500 to-purple-600'
  },
  {
    id: 'gold',
    icon: Coins,
    title: 'Gold Loans',
    subtitle: 'Instant loans against gold',
    amount: '₹10K - ₹1Cr',
    rate: '9.99% onwards',
    tenure: '6 months - 3 years',
    features: [
      'Instant approval & disbursal',
      'Secure gold storage',
      'Flexible repayment options',
      'No income proof required',
      'Competitive gold valuation'
    ],
    description: 'Get instant cash against your gold jewelry with our secure and transparent gold loan process.',
    gradient: 'from-yellow-500 to-yellow-600'
  },
  {
    id: 'vehicle',
    icon: Car,
    title: 'Vehicle Loans',
    subtitle: 'Drive your dream vehicle',
    amount: '₹1L - ₹50L',
    rate: '11.99% onwards',
    tenure: '1-7 years',
    features: [
      'New & used vehicle financing',
      'Up to 90% financing',
      'Quick approval process',
      'Flexible EMI options',
      'Insurance assistance'
    ],
    description: 'Whether it\'s a car, bike, or commercial vehicle, we provide comprehensive vehicle financing solutions.',
    gradient: 'from-red-500 to-red-600'
  },
  {
    id: 'education',
    icon: GraduationCap,
    title: 'Education Loans',
    subtitle: 'Invest in your future',
    amount: '₹50K - ₹1Cr',
    rate: '10.99% onwards',
    tenure: '5-15 years',
    features: [
      'Covers tuition & living expenses',
      'Moratorium period available',
      'Tax benefits under 80E',
      'Covers domestic & international studies',
      'Co-applicant facility'
    ],
    description: 'Don\'t let financial constraints limit your educational aspirations. Our education loans cover all your academic needs.',
    gradient: 'from-indigo-500 to-indigo-600'
  }
]

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white py-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center bg-secondary-500/20 text-secondary-300 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Shield className="w-4 h-4 mr-2" />
              Comprehensive Loan Solutions
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Our Loan Services
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              Tailored financial solutions for every need. From personal loans to business funding, 
              we have the right loan product for you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/apply">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 text-primary-900 font-bold py-4 px-8 rounded-xl"
                >
                  Apply Now
                </motion.button>
              </Link>
              <Link href="/calculator">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-4 px-8 rounded-xl transition-all duration-300"
                >
                  Calculate EMI
                </motion.button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {services.map((service, index) => (
              <AnimatedSection key={service.id} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center">
                      <div className={`w-16 h-16 bg-gradient-to-r ${service.gradient} rounded-2xl flex items-center justify-center mr-4`}>
                        <service.icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{service.title}</h3>
                        <p className="text-gray-600">{service.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="font-bold text-primary-600">{service.amount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Interest Rate</p>
                      <p className="font-bold text-secondary-600">{service.rate}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Tenure</p>
                      <p className="font-bold text-gray-700">{service.tenure}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>

                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Key Features:</h4>
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-secondary-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Link href={`/apply?service=${service.id}`} className="flex-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        className="w-full btn-primary"
                      >
                        Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                      </motion.button>
                    </Link>
                    <Link href="/calculator">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        className="btn-secondary"
                      >
                        <Calculator className="w-4 h-4" />
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Our Services?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We combine technology with personalized service to deliver the best loan experience.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Clock,
                title: 'Quick Processing',
                description: '24-hour approval with minimal documentation'
              },
              {
                icon: Shield,
                title: 'Secure & Trusted',
                description: 'RBI licensed with bank-grade security'
              },
              {
                icon: Users,
                title: 'Expert Support',
                description: 'Dedicated relationship managers for guidance'
              },
              {
                icon: Calculator,
                title: 'Transparent Pricing',
                description: 'No hidden charges, clear terms & conditions'
              }
            ].map((benefit, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}