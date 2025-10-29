'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Building, 
  FileText,
  CheckCircle,
  ArrowRight,
  Upload,
  Calendar,
  DollarSign
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AnimatedSection from '../components/AnimatedSection'

const loanTypes = [
  { id: 'personal', name: 'Personal Loan', icon: CreditCard },
  { id: 'business', name: 'Business Loan', icon: Building },
  { id: 'home', name: 'Home Loan', icon: MapPin },
  { id: 'gold', name: 'Gold Loan', icon: DollarSign },
  { id: 'vehicle', name: 'Vehicle Loan', icon: CreditCard },
  { id: 'education', name: 'Education Loan', icon: FileText }
]

const steps = [
  { id: 1, title: 'Personal Details', icon: User },
  { id: 2, title: 'Loan Information', icon: CreditCard },
  { id: 3, title: 'Employment Details', icon: Building },
  { id: 4, title: 'Documents', icon: FileText },
  { id: 5, title: 'Review & Submit', icon: CheckCircle }
]

export default function ApplyPage() {
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [formData, setFormData] = useState({
    // Personal Details
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    
    // Address
    address: '',
    city: '',
    state: '',
    pincode: '',
    
    // Loan Information
    loanType: searchParams?.get('service') || 'personal',
    loanAmount: '',
    tenure: '',
    purpose: '',
    
    // Employment Details
    employmentType: '',
    companyName: '',
    designation: '',
    workExperience: '',
    monthlyIncome: '',
    
    // Documents
    documents: {}
  })

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateCurrentStep = () => {
    const errors: string[] = []
    
    switch (currentStep) {
      case 1:
        if (!formData.firstName) errors.push('First Name is required')
        if (!formData.lastName) errors.push('Last Name is required')
        if (!formData.email) errors.push('Email is required')
        if (!formData.phone) errors.push('Phone Number is required')
        if (!formData.dateOfBirth) errors.push('Date of Birth is required')
        if (!formData.gender) errors.push('Gender is required')
        if (!formData.address) errors.push('Address is required')
        if (!formData.city) errors.push('City is required')
        if (!formData.state) errors.push('State is required')
        break
      case 2:
        if (!formData.loanType) errors.push('Loan Type is required')
        if (!formData.loanAmount) errors.push('Loan Amount is required')
        if (!formData.tenure) errors.push('Tenure is required')
        if (!formData.purpose) errors.push('Purpose of Loan is required')
        break
      case 3:
        if (!formData.employmentType) errors.push('Employment Type is required')
        if (!formData.companyName) errors.push('Company Name is required')
        if (!formData.monthlyIncome) errors.push('Monthly Income is required')
        if (!formData.workExperience) errors.push('Work Experience is required')
        break
      case 4:
        // Document upload is optional for now
        break
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  const nextStep = () => {
    if (!validateCurrentStep()) {
      return
    }
    if (currentStep < 5) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted:', formData)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Apply for Loan</h1>
            <p className="text-xl text-blue-100 mb-8">
              Complete your application in just 5 simple steps
            </p>
            
            {/* Progress Steps */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <motion.div
                      animate={{
                        backgroundColor: currentStep >= step.id ? '#22c55e' : 'rgba(255,255,255,0.2)',
                        scale: currentStep === step.id ? 1.1 : 1
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    >
                      {currentStep > step.id ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </motion.div>
                    {index < steps.length - 1 && (
                      <div className="w-8 h-0.5 bg-white/20 mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-3xl shadow-xl p-8"
          >
            <form onSubmit={handleSubmit}>
              {/* Step 1: Personal Details */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Details</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => updateFormData('firstName', e.target.value)}
                        className="input-field"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => updateFormData('lastName', e.target.value)}
                        className="input-field"
                        placeholder="Enter your last name"
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
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender *
                      </label>
                      <select
                        required
                        value={formData.gender}
                        onChange={(e) => updateFormData('gender', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Details</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address *
                        </label>
                        <textarea
                          required
                          value={formData.address}
                          onChange={(e) => updateFormData('address', e.target.value)}
                          className="input-field"
                          rows={3}
                          placeholder="Enter your complete address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.city}
                          onChange={(e) => updateFormData('city', e.target.value)}
                          className="input-field"
                          placeholder="Enter your city"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.state}
                          onChange={(e) => updateFormData('state', e.target.value)}
                          className="input-field"
                          placeholder="Enter your state"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Loan Information */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Loan Information</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Type *
                      </label>
                      <select
                        required
                        value={formData.loanType}
                        onChange={(e) => updateFormData('loanType', e.target.value)}
                        className="input-field"
                      >
                        {loanTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Amount *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.loanAmount}
                        onChange={(e) => updateFormData('loanAmount', e.target.value)}
                        className="input-field"
                        placeholder="Enter loan amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tenure (Years) *
                      </label>
                      <select
                        required
                        value={formData.tenure}
                        onChange={(e) => updateFormData('tenure', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select Tenure</option>
                        <option value="1">1 Year</option>
                        <option value="2">2 Years</option>
                        <option value="3">3 Years</option>
                        <option value="4">4 Years</option>
                        <option value="5">5 Years</option>
                        <option value="7">7 Years</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Purpose of Loan *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.purpose}
                        onChange={(e) => updateFormData('purpose', e.target.value)}
                        className="input-field"
                        placeholder="Purpose of loan"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Employment Details */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Employment Details</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employment Type *
                      </label>
                      <select
                        required
                        value={formData.employmentType}
                        onChange={(e) => updateFormData('employmentType', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select Employment Type</option>
                        <option value="salaried">Salaried</option>
                        <option value="self-employed">Self Employed</option>
                        <option value="business">Business Owner</option>
                        <option value="professional">Professional</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.companyName}
                        onChange={(e) => updateFormData('companyName', e.target.value)}
                        className="input-field"
                        placeholder="Enter company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monthly Income *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.monthlyIncome}
                        onChange={(e) => updateFormData('monthlyIncome', e.target.value)}
                        className="input-field"
                        placeholder="Enter monthly income"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Work Experience (Years) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.workExperience}
                        onChange={(e) => updateFormData('workExperience', e.target.value)}
                        className="input-field"
                        placeholder="Years of experience"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Documents */}
              {currentStep === 4 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Documents</h2>
                  <div className="space-y-6">
                    {[
                      'Identity Proof (Aadhar/PAN/Passport)',
                      'Address Proof (Utility Bill/Bank Statement)',
                      'Income Proof (Salary Slips/ITR)',
                      'Bank Statements (Last 6 months)'
                    ].map((doc, index) => (
                      <div key={index} className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-primary-400 transition-colors">
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-700 mb-1">{doc}</p>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                          <button
                            type="button"
                            className="mt-2 btn-outline text-sm"
                          >
                            Choose File
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {currentStep === 5 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Submit</h2>
                  <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">Application Summary</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><span className="font-medium">Name:</span> {formData.firstName} {formData.lastName}</p>
                        <p><span className="font-medium">Email:</span> {formData.email}</p>
                        <p><span className="font-medium">Phone:</span> {formData.phone}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Loan Type:</span> {formData.loanType}</p>
                        <p><span className="font-medium">Amount:</span> ₹{formData.loanAmount}</p>
                        <p><span className="font-medium">Tenure:</span> {formData.tenure} years</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Terms & Conditions</p>
                        <p>By submitting this application, you agree to our terms and conditions and authorize us to verify the information provided.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
                  <ul className="text-red-700 text-sm space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary flex items-center"
                  >
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Submit Application <CheckCircle className="w-4 h-4 ml-2" />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}