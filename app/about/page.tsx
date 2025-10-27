'use client'

import { motion } from 'framer-motion'
import { 
  Users, 
  Award, 
  Shield, 
  Target,
  Heart,
  Zap,
  TrendingUp,
  Globe,
  CheckCircle,
  Star
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AnimatedSection from '../components/AnimatedSection'

const stats = [
  { number: '10,000+', label: 'Happy Customers', icon: Users },
  { number: '₹500Cr+', label: 'Loans Disbursed', icon: TrendingUp },
  { number: '4.9/5', label: 'Customer Rating', icon: Star },
  { number: '24hrs', label: 'Average Approval Time', icon: Zap }
]

const values = [
  {
    icon: Shield,
    title: 'Trust & Transparency',
    description: 'We believe in complete transparency with no hidden charges and clear terms.',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Heart,
    title: 'Customer First',
    description: 'Every decision we make is centered around our customers\' financial well-being.',
    color: 'from-red-500 to-red-600'
  },
  {
    icon: Zap,
    title: 'Speed & Efficiency',
    description: 'We leverage technology to provide quick and efficient loan processing.',
    color: 'from-yellow-500 to-yellow-600'
  },
  {
    icon: Target,
    title: 'Innovation',
    description: 'Continuously improving our services with cutting-edge financial technology.',
    color: 'from-green-500 to-green-600'
  }
]

const team = [
  {
    name: 'Rajesh Kumar',
    position: 'CEO & Founder',
    image: '/api/placeholder/300/300',
    description: '15+ years in banking and financial services'
  },
  {
    name: 'Priya Sharma',
    position: 'CTO',
    image: '/api/placeholder/300/300',
    description: 'Technology leader with fintech expertise'
  },
  {
    name: 'Amit Patel',
    position: 'Head of Operations',
    image: '/api/placeholder/300/300',
    description: 'Operations expert ensuring smooth processes'
  },
  {
    name: 'Sneha Gupta',
    position: 'Head of Customer Success',
    image: '/api/placeholder/300/300',
    description: 'Dedicated to exceptional customer experience'
  }
]

export default function AboutPage() {
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
              <Award className="w-4 h-4 mr-2" />
              RBI Licensed NBFC
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              About QuickLoan
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              Empowering dreams through accessible and transparent financial solutions. 
              We're not just a lending company, we're your financial partners.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <motion.h3
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                    className="text-3xl font-bold text-gray-900 mb-2"
                  >
                    {stat.number}
                  </motion.h3>
                  <p className="text-gray-600 font-medium">{stat.label}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Founded in 2020, QuickLoan was born from a simple yet powerful vision: 
                  to make financial services accessible, transparent, and customer-centric. 
                  Our founders, with decades of combined experience in banking and technology, 
                  recognized the gap in the market for truly customer-focused lending.
                </p>
                <p>
                  What started as a small team of passionate individuals has grown into 
                  a trusted financial partner for thousands of customers across India. 
                  We've disbursed over ₹500 crores in loans, helping people achieve their 
                  dreams - from buying their first home to expanding their business.
                </p>
                <p>
                  Today, we continue to innovate and improve our services, leveraging 
                  cutting-edge technology while maintaining the personal touch that 
                  sets us apart. Our commitment remains unchanged: to be your trusted 
                  financial partner for life.
                </p>
              </div>
            </AnimatedSection>
            
            <AnimatedSection delay={0.2}>
              <div className="relative">
                <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-3xl p-8 text-white">
                  <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                  <p className="text-blue-100 mb-6">
                    To democratize access to financial services by providing quick, 
                    transparent, and affordable loan solutions that empower individuals 
                    and businesses to achieve their goals.
                  </p>
                  
                  <div className="space-y-3">
                    {[
                      'Customer-first approach',
                      'Transparent pricing',
                      'Quick processing',
                      'Technology-driven solutions'
                    ].map((item, index) => (
                      <div key={index} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-secondary-400 mr-3" />
                        <span className="text-blue-100">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Floating elements */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -right-4 bg-secondary-500 text-white p-3 rounded-full shadow-lg"
                >
                  <Globe className="w-6 h-6" />
                </motion.div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do and shape our company culture.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="text-center p-8 rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                >
                  <div className={`w-16 h-16 bg-gradient-to-r ${value.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                    <value.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Leadership Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Meet the experienced professionals leading QuickLoan towards a brighter financial future.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 text-center"
                >
                  <div className="w-24 h-24 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-primary-600 font-medium mb-3">{member.position}</p>
                  <p className="text-gray-600 text-sm">{member.description}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Awards & Recognition */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Awards & Recognition</h2>
            <p className="text-xl text-gray-600">
              Our commitment to excellence has been recognized by industry leaders.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Best Fintech Startup 2023',
                organization: 'India Fintech Awards',
                year: '2023'
              },
              {
                title: 'Customer Choice Award',
                organization: 'Banking & Finance Excellence',
                year: '2023'
              },
              {
                title: 'Digital Innovation Award',
                organization: 'NBFC Association of India',
                year: '2022'
              }
            ].map((award, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100"
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{award.title}</h3>
                  <p className="text-gray-600 mb-1">{award.organization}</p>
                  <p className="text-primary-600 font-semibold">{award.year}</p>
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