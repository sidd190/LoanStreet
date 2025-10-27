'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Clock, 
  Shield, 
  Users, 
  Star, 
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calculator,
  FileText,
  TrendingUp,
  Award,
  Zap,
  Target
} from 'lucide-react'
import Link from 'next/link'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AnimatedSection from './components/AnimatedSection'

export default function HomePage() {
  const [loanAmount, setLoanAmount] = useState(250000)
  const [tenure, setTenure] = useState(3)
  const [emi, setEmi] = useState(8456)

  useEffect(() => {
    const rate = 12 / 100 / 12
    const months = tenure * 12
    const calculatedEmi = (loanAmount * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1)
    setEmi(Math.round(calculatedEmi))
  }, [loanAmount, tenure])

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
          <div className="absolute inset-0 opacity-20"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-white"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center bg-secondary-500/20 text-secondary-300 px-4 py-2 rounded-full text-sm font-medium mb-6"
              >
                <Zap className="w-4 h-4 mr-2" />
                RBI Licensed & Trusted by 10,000+ Customers
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Get Your Dream Loan in{' '}
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  24 Hours
                </span>
              </h1>
              
              <p className="text-xl mb-8 text-blue-100 leading-relaxed">
                Instant approval, minimal documentation, and competitive interest rates. 
                Your financial freedom is just one click away.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/apply">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-primary-900 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 shadow-lg hover:shadow-2xl"
                  >
                    Apply Now
                  </motion.button>
                </Link>
                <Link href="/calculator">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 backdrop-blur-sm"
                  >
                    Calculate EMI
                  </motion.button>
                </Link>
              </div>

              <div className="flex items-center space-x-8 text-sm">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-secondary-400 mr-2" />
                  <span>100% Secure</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-secondary-400 mr-2" />
                  <span>Quick Approval</span>
                </div>
                <div className="flex items-center">
                  <Award className="w-5 h-5 text-secondary-400 mr-2" />
                  <span>4.9★ Rating</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
                <h3 className="text-2xl font-bold mb-6 text-white">Quick Loan Calculator</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-white">
                      Loan Amount: ₹{loanAmount.toLocaleString()}
                    </label>
                    <input 
                      type="range" 
                      min="50000" 
                      max="5000000" 
                      step="25000"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs mt-2 text-blue-200">
                      <span>₹50K</span>
                      <span>₹50L</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-3 text-white">
                      Tenure: {tenure} Years
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="7" 
                      value={tenure}
                      onChange={(e) => setTenure(Number(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs mt-2 text-blue-200">
                      <span>1 Year</span>
                      <span>7 Years</span>
                    </div>
                  </div>
                  <motion.div
                    key={emi}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="bg-gradient-to-r from-yellow-400 to-orange-400 text-primary-900 p-6 rounded-2xl mt-6"
                  >
                    <div className="text-center">
                      <p className="text-sm font-medium">Monthly EMI</p>
                      <p className="text-3xl font-bold">₹{emi.toLocaleString()}</p>
                      <p className="text-xs mt-1">Interest Rate: 12% p.a.</p>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-secondary-500 text-white p-3 rounded-full shadow-lg"
              >
                <TrendingUp className="w-6 h-6" />
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 bg-yellow-400 text-primary-900 p-3 rounded-full shadow-lg"
              >
                <Target className="w-6 h-6" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4"
            >
              <Star className="w-4 h-4 mr-2" />
              Why 10,000+ Customers Trust Us
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose QuickLoan?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We make lending simple, fast, and transparent with cutting-edge technology and customer-first approach.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Clock,
                title: "24-Hour Approval",
                description: "Get your loan approved within 24 hours with our streamlined process",
                color: "from-blue-500 to-blue-600"
              },
              {
                icon: Shield,
                title: "100% Secure",
                description: "Bank-grade security ensures your personal and financial data is protected",
                color: "from-green-500 to-green-600"
              },
              {
                icon: CheckCircle,
                title: "Minimal Documentation",
                description: "Just basic documents required. No lengthy paperwork or hidden charges",
                color: "from-purple-500 to-purple-600"
              },
              {
                icon: Users,
                title: "Expert Support",
                description: "Dedicated relationship managers to guide you through every step",
                color: "from-orange-500 to-orange-600"
              }
            ].map((feature, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <motion.div
                  whileHover={{ 
                    y: -10,
                    transition: { duration: 0.3 }
                  }}
                  className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 mx-auto`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900 group-hover:text-primary-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
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