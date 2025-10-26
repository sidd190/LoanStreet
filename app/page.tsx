'use client'

import { motion } from 'framer-motion'
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
  FileText
} from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">QuickLoan</h1>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-700 hover:text-primary-600">Services</a>
              <a href="#about" className="text-gray-700 hover:text-primary-600">About</a>
              <a href="#contact" className="text-gray-700 hover:text-primary-600">Contact</a>
              <Link href="/admin" className="btn-primary">Admin Login</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="gradient-bg text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                Get Your Dream Loan in 
                <span className="text-yellow-400"> 24 Hours</span>
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                Instant approval, minimal documentation, and competitive interest rates. 
                Your financial freedom is just one click away.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-yellow-400 hover:bg-yellow-500 text-primary-900 font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 shadow-lg hover:shadow-xl">
                  Apply Now
                </button>
                <button className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200">
                  Calculate EMI
                </button>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold mb-6">Quick Loan Calculator</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Loan Amount</label>
                    <input type="range" min="50000" max="5000000" className="w-full" />
                    <div className="flex justify-between text-sm mt-1">
                      <span>₹50K</span>
                      <span className="font-bold">₹2,50,000</span>
                      <span>₹50L</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tenure (Years)</label>
                    <input type="range" min="1" max="7" className="w-full" />
                    <div className="flex justify-between text-sm mt-1">
                      <span>1 Year</span>
                      <span className="font-bold">3 Years</span>
                      <span>7 Years</span>
                    </div>
                  </div>
                  <div className="bg-yellow-400 text-primary-900 p-4 rounded-lg mt-6">
                    <div className="text-center">
                      <p className="text-sm">Monthly EMI</p>
                      <p className="text-2xl font-bold">₹8,456</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose QuickLoan?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We make lending simple, fast, and transparent with cutting-edge technology and customer-first approach.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Clock,
                title: "24-Hour Approval",
                description: "Get your loan approved within 24 hours with our streamlined process"
              },
              {
                icon: Shield,
                title: "100% Secure",
                description: "Bank-grade security ensures your personal and financial data is protected"
              },
              {
                icon: CheckCircle,
                title: "Minimal Documentation",
                description: "Just basic documents required. No lengthy paperwork or hidden charges"
              },
              {
                icon: Users,
                title: "Expert Support",
                description: "Dedicated relationship managers to guide you through every step"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="card text-center hover:shadow-xl transition-all duration-300"
              >
                <feature.icon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Loan Services</h2>
            <p className="text-xl text-gray-600">Tailored financial solutions for every need</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: CreditCard,
                title: "Personal Loans",
                amount: "₹50K - ₹50L",
                rate: "10.99% onwards",
                features: ["No collateral required", "Flexible tenure", "Quick disbursal"]
              },
              {
                icon: Calculator,
                title: "Business Loans",
                amount: "₹1L - ₹1Cr",
                rate: "12.99% onwards", 
                features: ["Working capital", "Equipment financing", "Business expansion"]
              },
              {
                icon: FileText,
                title: "Home Loans",
                amount: "₹5L - ₹5Cr",
                rate: "8.99% onwards",
                features: ["Low interest rates", "Long tenure", "Tax benefits"]
              }
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="card hover:shadow-xl transition-all duration-300 group"
              >
                <service.icon className="w-12 h-12 text-primary-600 mb-4 group-hover:scale-110 transition-transform duration-200" />
                <h3 className="text-2xl font-bold mb-2">{service.title}</h3>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-primary-600">{service.amount}</span>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-600">Interest Rate:</span>
                  <span className="font-semibold text-secondary-600">{service.rate}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-secondary-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full btn-primary group-hover:bg-primary-700">
                  Apply Now <ArrowRight className="w-4 h-4 ml-2 inline" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <div className="flex justify-center mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
              ))}
            </div>
            <p className="text-xl text-gray-600">4.9/5 rating from 10,000+ happy customers</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Rajesh Kumar",
                location: "Mumbai",
                text: "Got my personal loan approved in just 18 hours! The process was incredibly smooth and the team was very supportive."
              },
              {
                name: "Priya Sharma", 
                location: "Delhi",
                text: "Best interest rates in the market. The EMI calculator helped me plan my finances perfectly. Highly recommended!"
              },
              {
                name: "Amit Patel",
                location: "Bangalore", 
                text: "Excellent customer service and transparent process. No hidden charges and quick disbursal. Thank you QuickLoan!"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="card"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.location}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <p className="text-xl text-gray-600 mb-8">
                Ready to get your loan? Contact our experts today for personalized assistance.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center">
                  <Phone className="w-6 h-6 text-primary-600 mr-4" />
                  <div>
                    <p className="font-semibold">Call Us</p>
                    <p className="text-gray-600">+91 98765 43210</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="w-6 h-6 text-primary-600 mr-4" />
                  <div>
                    <p className="font-semibold">Email Us</p>
                    <p className="text-gray-600">support@quickloan.com</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-6 h-6 text-primary-600 mr-4" />
                  <div>
                    <p className="font-semibold">Visit Us</p>
                    <p className="text-gray-600">123 Business District, Mumbai, India</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="card"
            >
              <h3 className="text-2xl font-bold mb-6">Quick Loan Inquiry</h3>
              <form className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option>Select Loan Type</option>
                  <option>Personal Loan</option>
                  <option>Business Loan</option>
                  <option>Home Loan</option>
                </select>
                <input
                  type="number"
                  placeholder="Loan Amount Required"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <textarea
                  placeholder="Additional Requirements"
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                ></textarea>
                <button type="submit" className="w-full btn-primary">
                  Submit Inquiry
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">QuickLoan</h3>
              <p className="text-gray-400">
                Your trusted partner for all financial needs. Fast, secure, and reliable loan services.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Personal Loans</li>
                <li>Business Loans</li>
                <li>Home Loans</li>
                <li>EMI Calculator</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About Us</li>
                <li>Contact</li>
                <li>Careers</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>FAQs</li>
                <li>Terms of Service</li>
                <li>Complaint Resolution</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 QuickLoan. All rights reserved. | Licensed by RBI</p>
          </div>
        </div>
      </footer>
    </div>
  )
}