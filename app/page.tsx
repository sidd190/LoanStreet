"use client";

import React from "react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
  Target,
  Upload,
} from "lucide-react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AnimatedSection from "./components/AnimatedSection";
import ParticleBackground from "./components/ParticleBackground";
import ScrollToTop from "./components/ScrollToTop";
import TestimonialsSection from "./components/TestimonialsSection";

export default function HomePage() {
  const [loanAmount, setLoanAmount] = useState(250000);
  const [tenure, setTenure] = useState(3);
  const [emi, setEmi] = useState(8456);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rate = 12 / 100 / 12;
    const months = tenure * 12;
    const calculatedEmi =
      (loanAmount * rate * Math.pow(1 + rate, months)) /
      (Math.pow(1 + rate, months) - 1);
    setEmi(Math.round(calculatedEmi));
  }, [loanAmount, tenure]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);

      // Hero section animations
      const tl = gsap.timeline();
      tl.from(".hero-title", {
        duration: 1,
        y: 100,
        opacity: 0,
        ease: "power3.out",
      })
        .from(
          ".hero-subtitle",
          { duration: 0.8, y: 50, opacity: 0, ease: "power3.out" },
          "-=0.5"
        )
        .from(
          ".hero-buttons",
          { duration: 0.8, y: 30, opacity: 0, ease: "power3.out" },
          "-=0.3"
        )
        .from(
          ".hero-stats",
          {
            duration: 0.8,
            y: 20,
            opacity: 0,
            stagger: 0.1,
            ease: "power3.out",
          },
          "-=0.3"
        );

      // Calculator floating animation
      gsap.to(".calculator-float", {
        y: -20,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });

      // Features section scroll animation
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
        y: 100,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
      });

      // 3D tilt effect for cards
      const cards = document.querySelectorAll(".tilt-card");
      cards.forEach((card) => {
        card.addEventListener("mousemove", (e: any) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = (y - centerY) / 10;
          const rotateY = (centerX - x) / 10;

          gsap.to(card, {
            duration: 0.3,
            rotateX: rotateX,
            rotateY: rotateY,
            transformPerspective: 1000,
            ease: "power2.out",
          });
        });

        card.addEventListener("mouseleave", () => {
          gsap.to(card, {
            duration: 0.3,
            rotateX: 0,
            rotateY: 0,
            ease: "power2.out",
          });
        });
      });
    }
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative overflow-hidden min-h-screen flex items-center"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
          <ParticleBackground />
          <div className="absolute inset-0 bg-gray-900/20 animate-pulse"></div>

          {/* Floating geometric shapes */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-secondary-400/20 rounded-full animate-float"></div>
          <div className="absolute top-40 right-20 w-16 h-16 bg-yellow-400/20 rotate-45 animate-bounce-slow"></div>
          <div className="absolute bottom-40 left-20 w-12 h-12 bg-orange-400/20 rounded-full animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-40 w-24 h-24 bg-primary-400/20 rotate-12 animate-float"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="hero-title inline-flex items-center bg-secondary-500/20 text-secondary-300 px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                <Zap className="w-4 h-4 mr-2" />
                RBI Licensed & Trusted by 10,000+ Customers
              </div>

              <h1 className="hero-title text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Get Your Dream Loan in{" "}
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent animate-pulse">
                  24 Hours
                </span>
              </h1>

              <p className="hero-subtitle text-xl mb-8 text-blue-100 leading-relaxed">
                Instant approval, minimal documentation, and competitive
                interest rates. Your financial freedom is just one click away.
              </p>

              <div className="hero-buttons flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/apply">
                  <motion.button
                    whileHover={{
                      scale: 1.05,
                      y: -2,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="group bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-primary-900 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 shadow-lg hover:shadow-2xl relative overflow-hidden"
                  >
                    <span className="relative z-10">Apply Now</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </motion.button>
                </Link>
                <Link href="/calculator">
                  <motion.button
                    whileHover={{
                      scale: 1.05,
                      y: -2,
                      backgroundColor: "rgba(255,255,255,0.1)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 backdrop-blur-sm"
                  >
                    Calculate EMI
                  </motion.button>
                </Link>
              </div>

              <div className="hero-stats flex flex-wrap items-center gap-4 sm:gap-8 text-sm">
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
            </div>

            <div className="relative calculator-float">
              <div className="tilt-card bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 transform-gpu">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
                <h3 className="text-2xl font-bold mb-6 text-white relative z-10">
                  Quick Loan Calculator
                </h3>
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
                    initial={{ scale: 0.9, rotateY: -10 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    whileHover={{ scale: 1.02, rotateY: 2 }}
                    className="bg-gradient-to-r from-yellow-400 to-orange-400 text-primary-900 p-6 rounded-2xl mt-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform-gpu"
                  >
                    <div className="text-center">
                      <p className="text-sm font-medium">Monthly EMI</p>
                      <p className="text-3xl font-bold">
                        ₹{emi.toLocaleString()}
                      </p>
                      <p className="text-xs mt-1">Interest Rate: 12% p.a.</p>
                    </div>
                  </motion.div>
                </div>
              </div>

              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-4 -right-4 bg-secondary-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <TrendingUp className="w-6 h-6" />
              </motion.div>
              <motion.div
                animate={{
                  y: [0, 15, 0],
                  rotate: [0, -5, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -bottom-4 -left-4 bg-yellow-400 text-primary-900 p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <Target className="w-6 h-6" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        ref={featuresRef}
        className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden"
      >
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary-100 rounded-full opacity-50 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-24 h-24 bg-secondary-100 rounded-full opacity-50 animate-bounce-slow"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
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
              We make lending simple, fast, and transparent with cutting-edge
              technology and customer-first approach.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Clock,
                title: "24-Hour Approval",
                description:
                  "Get your loan approved within 24 hours with our streamlined process",
                color: "from-blue-500 to-blue-600",
              },
              {
                icon: Shield,
                title: "100% Secure",
                description:
                  "Bank-grade security ensures your personal and financial data is protected",
                color: "from-green-500 to-green-600",
              },
              {
                icon: CheckCircle,
                title: "Minimal Documentation",
                description:
                  "Just basic documents required. No lengthy paperwork or hidden charges",
                color: "from-purple-500 to-purple-600",
              },
              {
                icon: Users,
                title: "Expert Support",
                description:
                  "Dedicated relationship managers to guide you through every step",
                color: "from-orange-500 to-orange-600",
              },
            ].map((feature, index) => (
              <div key={index} className="feature-card">
                <motion.div
                  whileHover={{
                    y: -15,
                    rotateY: 5,
                    scale: 1.02,
                    transition: { duration: 0.3 },
                  }}
                  className="tilt-card group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 transform-gpu"
                >
                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity duration-500`}
                  ></div>

                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>

                  <motion.div
                    whileHover={{
                      scale: 1.15,
                      rotate: [0, -5, 5, 0],
                      transition: { duration: 0.5 },
                    }}
                    className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-shadow duration-300 relative z-10`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </motion.div>

                  <h3 className="text-xl font-bold mb-4 text-gray-900 group-hover:text-primary-600 transition-colors duration-300 relative z-10">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed relative z-10">
                    {feature.description}
                  </p>

                  {/* Bottom accent line */}
                  <div
                    className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${feature.color} w-0 group-hover:w-full transition-all duration-500 rounded-b-3xl`}
                  ></div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Our Loan Services
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose from our wide range of loan products designed to meet your specific financial needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: CreditCard,
                title: "Personal Loan",
                description: "Quick personal loans for your immediate needs",
                features: ["Up to ₹25 Lakhs", "Minimal Documentation", "Quick Approval"],
                color: "from-blue-500 to-blue-600"
              },
              {
                icon: MapPin,
                title: "Home Loan",
                description: "Make your dream home a reality",
                features: ["Up to ₹5 Crores", "Competitive Rates", "Flexible Tenure"],
                color: "from-green-500 to-green-600"
              },
              {
                icon: CreditCard,
                title: "Business Loan",
                description: "Fuel your business growth",
                features: ["Up to ₹50 Lakhs", "Working Capital", "Equipment Finance"],
                color: "from-purple-500 to-purple-600"
              },
              {
                icon: CreditCard,
                title: "Vehicle Loan",
                description: "Drive your dream car today",
                features: ["Up to 90% Funding", "New & Used Cars", "Quick Processing"],
                color: "from-orange-500 to-orange-600"
              },
              {
                icon: FileText,
                title: "Education Loan",
                description: "Invest in your future",
                features: ["Study Abroad", "Professional Courses", "Flexible Repayment"],
                color: "from-pink-500 to-pink-600"
              },
              {
                icon: CreditCard,
                title: "Gold Loan",
                description: "Instant cash against gold",
                features: ["Instant Approval", "Competitive Rates", "Flexible Tenure"],
                color: "from-yellow-500 to-yellow-600"
              }
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group"
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${service.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{service.title}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href={`/apply?service=${service.title.toLowerCase().replace(' ', '-')}`}>
                  <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 group-hover:bg-primary-100 group-hover:text-primary-700">
                    Apply Now
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple Application Process
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get your loan approved in just 4 easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Apply Online",
                description: "Fill out our simple online application form",
                icon: FileText
              },
              {
                step: "02", 
                title: "Document Upload",
                description: "Upload required documents securely",
                icon: Upload
              },
              {
                step: "03",
                title: "Quick Verification",
                description: "Our team verifies your application",
                icon: CheckCircle
              },
              {
                step: "04",
                title: "Get Approved",
                description: "Receive funds in your account within 24 hours",
                icon: CreditCard
              }
            ].map((process, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center relative"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <process.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {process.step}
                  </div>
                  {index < 3 && (
                    <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gray-300">
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gray-300 rounded-full"></div>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{process.title}</h3>
                <p className="text-gray-600">{process.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Your Loan?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have achieved their financial goals with us
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/apply">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-primary-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Apply Now
                </motion.button>
              </Link>
              <Link href="/contact">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300"
                >
                  Contact Us
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
