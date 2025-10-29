'use client'

import React from 'react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  MessageCircle,
  Send,
  CheckCircle,
  User,
  Building,
  Globe
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AnimatedSection from '../components/AnimatedSection'

const contactMethods = [
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Speak directly with our loan experts',
    contact: '+91 98765 43210',
    availability: 'Mon-Sat 9AM-7PM',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Mail,
    title: 'Email Us',
    description: '24/7 email support for all queries',
    contact: 'support@quickloan.com',
    availability: '24/7 Response',
    color: 'from-green-500 to-green-600'
  },
  {
    icon: MessageCircle,
    title: 'Live Chat',
    description: 'Instant chat support on our website',
    contact: 'Available on website',
    availability: 'Mon-Sat 9AM-9PM',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: MapPin,
    title: 'Visit Us',
    description: 'Meet us at our office locations',
    contact: 'Multiple locations',
    availability: 'By appointment',
    color: 'from-orange-500 to-orange-600'
  }
]

const offices = [
  {
    city: 'Mumbai',
    address: '123 Business District, Bandra Kurla Complex, Mumbai 400051',
    phone: '+91 98765 43210',
    email: 'mumbai@quickloan.com',
    isHeadquarters: true
  },
  {
    city: 'Delhi',
    address: '456 Connaught Place, New Delhi 110001',
    phone: '+91 98765 43211',
    email: 'delhi@quickloan.com',
    isHeadquarters: false
  },
  {
    city: 'Bangalore',
    address: '789 MG Road, Bangalore 560001',
    phone: '+91 98765 43212',
    email: 'bangalore@quickloan.com',
    isHeadquarters: false
  },
  {
    city: 'Pune',
    address: '321 FC Road, Pune 411005',
    phone: '+91 98765 43213',
    email: 'pune@quickloan.com',
    isHeadquarters: false
  }
]

const faqs = [
  {
    question: 'What documents are required for a loan application?',
    answer: 'Basic documents include identity proof (Aadhar/PAN), address proof, income proof (salary slips/ITR), and bank statements for the last 6 months.'
  },
  {
    question: 'How long does the loan approval process take?',
    answer: 'Our streamlined process ensures approval within 24 hours for most applications, with funds disbursed within 48 hours of approval.'
  },
  {
    question: 'What is the minimum and maximum loan amount?',
    answer: 'Loan amounts vary by product: Personal loans (₹50K-₹50L), Business loans (₹1L-₹1Cr), Home loans (₹5L-₹5Cr).'
  },
  {
    question: 'Can I prepay my loan without penalties?',
    answer: 'Yes, we offer flexible prepayment options with minimal or no prepayment charges depending on your loan type and tenure.'
  }
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    loanType: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        loanType: ''
      })
    }, 2000)
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white py-20">
        <div className="absolute inset-0 bg-gray-900/10 opacity-20"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center bg-secondary-500/20 text-secondary-300 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              We're Here to Help
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Have questions about our loan products? Need assistance with your application? 
              Our expert team is ready to help you every step of the way.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-600">
              Choose the most convenient way to reach us
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {contactMethods.map((method, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 text-center border border-gray-100"
                >
                  <div className={`w-16 h-16 bg-gradient-to-r ${method.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                    <method.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{method.title}</h3>
                  <p className="text-gray-600 mb-4">{method.description}</p>
                  <p className="font-semibold text-primary-600 mb-2">{method.contact}</p>
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {method.availability}
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <AnimatedSection>
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
                
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-secondary-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600">
                      Thank you for contacting us. We'll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="mt-4 btn-primary"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => updateFormData('name', e.target.value)}
                          className="input-field"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => updateFormData('email', e.target.value)}
                          className="input-field"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => updateFormData('phone', e.target.value)}
                          className="input-field"
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Loan Type
                        </label>
                        <select
                          value={formData.loanType}
                          onChange={(e) => updateFormData('loanType', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Select loan type</option>
                          <option value="personal">Personal Loan</option>
                          <option value="business">Business Loan</option>
                          <option value="home">Home Loan</option>
                          <option value="gold">Gold Loan</option>
                          <option value="vehicle">Vehicle Loan</option>
                          <option value="education">Education Loan</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => updateFormData('subject', e.target.value)}
                        className="input-field"
                        placeholder="Enter subject"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message *
                      </label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={(e) => updateFormData('message', e.target.value)}
                        className="input-field"
                        rows={5}
                        placeholder="Enter your message"
                      />
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </div>
                      ) : (
                        <>
                          Send Message <Send className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </motion.button>
                  </form>
                )}
              </div>
            </AnimatedSection>

            {/* Office Locations */}
            <AnimatedSection delay={0.2}>
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Offices</h2>
                  <p className="text-gray-600 mb-8">
                    Visit us at any of our office locations across India for personalized assistance.
                  </p>
                </div>

                <div className="space-y-6">
                  {offices.map((office, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 5 }}
                      className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-primary-200 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                          {office.city}
                          {office.isHeadquarters && (
                            <span className="ml-2 bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">
                              Headquarters
                            </span>
                          )}
                        </h3>
                        <Building className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{office.address}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          <span>{office.phone}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span>{office.email}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions about our loan services
            </p>
          </AnimatedSection>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center mt-12">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary">
                <Phone className="w-4 h-4 mr-2" />
                Call Us Now
              </button>
              <button className="btn-secondary">
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Live Chat
              </button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  )
}