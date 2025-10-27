'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Menu, X, Phone, Mail } from 'lucide-react'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Top Bar */}
      <div className="bg-primary-900 text-white py-2 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                <span>support@quickloan.com</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span>RBI Licensed | Secure & Trusted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-lg' 
            : 'bg-white shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent"
              >
                QuickLoan
              </motion.div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="nav-link">Home</Link>
              <Link href="/services" className="nav-link">Services</Link>
              <Link href="/about" className="nav-link">About</Link>
              <Link href="/contact" className="nav-link">Contact</Link>
              <Link href="/apply" className="btn-primary">
                Apply Now
              </Link>
              <Link href="/admin" className="btn-secondary">
                Admin Login
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 py-4"
            >
              <div className="flex flex-col space-y-4">
                <Link href="/" className="nav-link">Home</Link>
                <Link href="/services" className="nav-link">Services</Link>
                <Link href="/about" className="nav-link">About</Link>
                <Link href="/contact" className="nav-link">Contact</Link>
                <Link href="/apply" className="btn-primary text-center">
                  Apply Now
                </Link>
                <Link href="/admin" className="btn-secondary text-center">
                  Admin Login
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>
    </>
  )
}