'use client'

import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { 
  Calculator, 
  TrendingUp, 
  PieChart, 
  BarChart3,
  Download,
  Share2,
  RefreshCw
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AnimatedSection from '../components/AnimatedSection'

export default function CalculatorPage() {
  const [loanAmount, setLoanAmount] = useState(500000)
  const [interestRate, setInterestRate] = useState(12)
  const [tenure, setTenure] = useState(3)
  const [emi, setEmi] = useState(0)
  const [totalInterest, setTotalInterest] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const emiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    calculateEMI()
  }, [loanAmount, interestRate, tenure])

  useEffect(() => {
    if (emiRef.current) {
      gsap.fromTo(emiRef.current, 
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
      )
    }
  }, [emi])

  const calculateEMI = () => {
    const monthlyRate = interestRate / 100 / 12
    const months = tenure * 12
    
    if (monthlyRate === 0) {
      const calculatedEmi = loanAmount / months
      setEmi(calculatedEmi)
      setTotalInterest(0)
      setTotalAmount(loanAmount)
    } else {
      const calculatedEmi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                           (Math.pow(1 + monthlyRate, months) - 1)
      const calculatedTotalAmount = calculatedEmi * months
      const calculatedTotalInterest = calculatedTotalAmount - loanAmount
      
      setEmi(calculatedEmi)
      setTotalInterest(calculatedTotalInterest)
      setTotalAmount(calculatedTotalAmount)
    }
  }

  const resetCalculator = () => {
    setLoanAmount(500000)
    setInterestRate(12)
    setTenure(3)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const generateAmortizationSchedule = () => {
    const schedule = []
    let balance = loanAmount
    const monthlyRate = interestRate / 100 / 12
    
    for (let month = 1; month <= tenure * 12; month++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = emi - interestPayment
      balance -= principalPayment
      
      schedule.push({
        month,
        emi: emi,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance)
      })
    }
    
    return schedule
  }

  const amortizationSchedule = generateAmortizationSchedule()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Free EMI Calculator
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Loan EMI Calculator
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Calculate your monthly EMI, total interest, and plan your loan repayment with our advanced calculator.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Calculator Input */}
            <AnimatedSection>
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Calculate Your EMI</h2>
                  <button
                    onClick={resetCalculator}
                    className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Loan Amount */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        Loan Amount
                      </label>
                      <span className="text-lg font-bold text-primary-600">
                        {formatCurrency(loanAmount)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50000"
                      max="10000000"
                      step="25000"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>₹50K</span>
                      <span>₹1Cr</span>
                    </div>
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        Interest Rate (% p.a.)
                      </label>
                      <span className="text-lg font-bold text-secondary-600">
                        {interestRate}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="24"
                      step="0.25"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>6%</span>
                      <span>24%</span>
                    </div>
                  </div>

                  {/* Tenure */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        Loan Tenure
                      </label>
                      <span className="text-lg font-bold text-gray-700">
                        {tenure} {tenure === 1 ? 'Year' : 'Years'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={tenure}
                      onChange={(e) => setTenure(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>1 Year</span>
                      <span>30 Years</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8">
                  <button className="flex-1 btn-primary">
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </button>
                  <button className="btn-secondary">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </AnimatedSection>

            {/* Results */}
            <AnimatedSection delay={0.2}>
              <div className="space-y-6">
                {/* EMI Result Card */}
                <div
                  ref={emiRef}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="text-center">
                    <p className="text-primary-100 mb-2">Monthly EMI</p>
                    <p className="text-4xl font-bold mb-4">{formatCurrency(emi)}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-primary-200">Total Interest</p>
                        <p className="font-semibold">{formatCurrency(totalInterest)}</p>
                      </div>
                      <div>
                        <p className="text-primary-200">Total Amount</p>
                        <p className="font-semibold">{formatCurrency(totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Breakdown Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                  >
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-secondary-100 rounded-xl flex items-center justify-center mr-3">
                        <TrendingUp className="w-5 h-5 text-secondary-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Principal</p>
                        <p className="font-bold text-gray-900">{formatCurrency(loanAmount)}</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                  >
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mr-3">
                        <PieChart className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Interest</p>
                        <p className="font-bold text-gray-900">{formatCurrency(totalInterest)}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Pie Chart Representation */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-primary-500 rounded mr-3"></div>
                        <span className="text-sm text-gray-600">Principal Amount</span>
                      </div>
                      <span className="font-semibold">
                        {((loanAmount / totalAmount) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-orange-500 rounded mr-3"></div>
                        <span className="text-sm text-gray-600">Total Interest</span>
                      </div>
                      <span className="font-semibold">
                        {((totalInterest / totalAmount) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Visual Bar */}
                  <div className="mt-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500 transition-all duration-500"
                      style={{ width: `${(loanAmount / totalAmount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Amortization Schedule */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Amortization Schedule</h2>
              <p className="text-gray-600">Detailed month-wise breakdown of your loan repayment</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Month</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">EMI</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Principal</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Interest</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {amortizationSchedule.slice(0, 12).map((row, index) => (
                      <motion.tr
                        key={row.month}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">{row.month}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(row.emi)}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-600">
                          {formatCurrency(row.principal)}
                        </td>
                        <td className="px-6 py-4 text-sm text-orange-600">
                          {formatCurrency(row.interest)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatCurrency(row.balance)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {amortizationSchedule.length > 12 && (
                <div className="px-6 py-4 bg-gray-50 text-center">
                  <button className="btn-outline text-sm">
                    View Complete Schedule ({amortizationSchedule.length} months)
                  </button>
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  )
}