'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import AnimatedSection from './AnimatedSection'

const testimonials = [
  {
    name: 'Rajesh Kumar',
    role: 'Business Owner',
    location: 'Mumbai',
    rating: 5,
    text: 'QuickLoan helped me expand my business with their fast approval process. Got my loan in just 18 hours!',
    image: '/api/placeholder/80/80'
  },
  {
    name: 'Priya Sharma',
    role: 'Software Engineer',
    location: 'Bangalore',
    rating: 5,
    text: 'Excellent service and transparent pricing. The EMI calculator helped me plan my finances perfectly.',
    image: '/api/placeholder/80/80'
  },
  {
    name: 'Amit Patel',
    role: 'Doctor',
    location: 'Delhi',
    rating: 5,
    text: 'Professional team and hassle-free documentation. Highly recommend for personal loans.',
    image: '/api/placeholder/80/80'
  }
]

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4"
          >
            <Star className="w-4 h-4 mr-2" />
            Customer Reviews
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of satisfied customers who trust QuickLoan for their financial needs.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <AnimatedSection key={index} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -10, scale: 1.02 }}
                className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 relative"
              >
                {/* Quote icon */}
                <div className="absolute top-6 right-6 text-primary-200">
                  <Quote className="w-8 h-8" />
                </div>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-gray-600 mb-6 leading-relaxed italic">
                  "{testimonial.text}"
                </p>

                {/* Customer info */}
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}, {testimonial.location}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}