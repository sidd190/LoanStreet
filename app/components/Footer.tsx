'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Shield,
  Award,
  Clock
} from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Trust Indicators */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center"
            >
              <Shield className="w-8 h-8 text-secondary-400 mr-3" />
              <div>
                <p className="font-semibold">RBI Licensed</p>
                <p className="text-sm text-gray-400">Regulated & Secure</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center"
            >
              <Award className="w-8 h-8 text-secondary-400 mr-3" />
              <div>
                <p className="font-semibold">10,000+ Happy Customers</p>
                <p className="text-sm text-gray-400">4.9/5 Rating</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center"
            >
              <Clock className="w-8 h-8 text-secondary-400 mr-3" />
              <div>
                <p className="font-semibold">24-Hour Approval</p>
                <p className="text-sm text-gray-400">Quick Processing</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              QuickLoan
            </h3>
            <p className="text-gray-400 mb-6">
              Your trusted partner for all financial needs. Fast, secure, and reliable loan services across India.
            </p>
            <div className="flex space-x-4">
              <motion.a
                whileHover={{ scale: 1.1 }}
                href="#"
                className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.1 }}
                href="#"
                className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.1 }}
                href="#"
                className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.1 }}
                href="#"
                className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </motion.a>
            </div>
          </motion.div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="font-semibold mb-4 text-lg">Our Services</h4>
            <ul className="space-y-3 text-gray-400">
              <li><Link href="/services/personal" className="hover:text-primary-400 transition-colors">Personal Loans</Link></li>
              <li><Link href="/services/business" className="hover:text-primary-400 transition-colors">Business Loans</Link></li>
              <li><Link href="/services/home" className="hover:text-primary-400 transition-colors">Home Loans</Link></li>
              <li><Link href="/services/gold" className="hover:text-primary-400 transition-colors">Gold Loans</Link></li>
              <li><Link href="/calculator" className="hover:text-primary-400 transition-colors">EMI Calculator</Link></li>
            </ul>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="font-semibold mb-4 text-lg">Quick Links</h4>
            <ul className="space-y-3 text-gray-400">
              <li><Link href="/about" className="hover:text-primary-400 transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary-400 transition-colors">Contact</Link></li>
              <li><Link href="/careers" className="hover:text-primary-400 transition-colors">Careers</Link></li>
              <li><Link href="/privacy" className="hover:text-primary-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary-400 transition-colors">Terms of Service</Link></li>
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h4 className="font-semibold mb-4 text-lg">Contact Us</h4>
            <div className="space-y-4 text-gray-400">
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-primary-400 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-white">+91 98765 43210</p>
                  <p className="text-sm">Mon-Sat 9AM-7PM</p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-primary-400 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-white">support@quickloan.com</p>
                  <p className="text-sm">24/7 Email Support</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-primary-400 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-white">Mumbai Office</p>
                  <p className="text-sm">123 Business District, Mumbai 400001</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; 2024 QuickLoan. All rights reserved. | Licensed by RBI | NBFC Registration No: 12345
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Terms of Service
              </Link>
              <Link href="/complaints" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Grievance Redressal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}