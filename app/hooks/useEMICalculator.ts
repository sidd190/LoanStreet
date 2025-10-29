'use client'

import { useState, useEffect, useCallback } from 'react'

interface EMICalculation {
  emi: number
  totalInterest: number
  totalAmount: number
  monthlyBreakdown: Array<{
    month: number
    emi: number
    principal: number
    interest: number
    balance: number
  }>
}

export function useEMICalculator(
  loanAmount: number,
  interestRate: number,
  tenure: number
) {
  const [calculation, setCalculation] = useState<EMICalculation>({
    emi: 0,
    totalInterest: 0,
    totalAmount: 0,
    monthlyBreakdown: []
  })
  const [isCalculating, setIsCalculating] = useState(false)

  const calculateEMI = useCallback(() => {
    setIsCalculating(true)
    
    // Simulate calculation delay for better UX
    setTimeout(() => {
      const monthlyRate = interestRate / 100 / 12
      const months = tenure * 12
      
      let emi: number
      let totalAmount: number
      let totalInterest: number
      
      if (monthlyRate === 0) {
        emi = loanAmount / months
        totalAmount = loanAmount
        totalInterest = 0
      } else {
        emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
              (Math.pow(1 + monthlyRate, months) - 1)
        totalAmount = emi * months
        totalInterest = totalAmount - loanAmount
      }

      // Generate monthly breakdown
      const monthlyBreakdown = []
      let balance = loanAmount
      
      for (let month = 1; month <= months; month++) {
        const interestPayment = balance * monthlyRate
        const principalPayment = emi - interestPayment
        balance -= principalPayment
        
        monthlyBreakdown.push({
          month,
          emi: Math.round(emi),
          principal: Math.round(principalPayment),
          interest: Math.round(interestPayment),
          balance: Math.max(0, Math.round(balance))
        })
      }

      setCalculation({
        emi: Math.round(emi),
        totalInterest: Math.round(totalInterest),
        totalAmount: Math.round(totalAmount),
        monthlyBreakdown
      })
      
      setIsCalculating(false)
    }, 300)
  }, [loanAmount, interestRate, tenure])

  useEffect(() => {
    if (loanAmount > 0 && interestRate > 0 && tenure > 0) {
      calculateEMI()
    }
  }, [calculateEMI, loanAmount, interestRate, tenure])

  return {
    ...calculation,
    isCalculating,
    recalculate: calculateEMI
  }
}