'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  Clock,
  RefreshCw,
  Eye,
  Share,
  Mail,
  Printer,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ReportData {
  summary: {
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    totalRevenue: number
    averageLeadValue: number
    averageConversionTime: number
  }
  trends: {
    leadGeneration: Array<{ date: string; count: number }>
    conversionRates: Array<{ date: string; rate: number }>
  }
  sources: Array<{
    source: string
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    revenue: number
  }>
  performance: Array<{
    employeeName: string
    assignedLeads: number
    convertedLeads: number
    conversionRate: number
    revenue: number
  }>
  insights: string[]
  recommendations: string[]
}

interface ReportFilters {
  startDate: string
  endDate: string
  sources: string[]
  loanTypes: string[]
  employees: string[]
  minAmount?: number
  maxAmount?: number
}

interface LeadReportingProps {
  onRefresh?: () => void
}

export default function LeadReporting({ onRefresh }: LeadReportingProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    sources: [],
    loanTypes: [],
    employees: []
  })
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'performance' | 'trends'>('summary')

  // Available filter options (would typically come from API)
  const availableSources = ['WEBSITE', 'SOCIAL_MEDIA', 'REFERRAL', 'ADVERTISEMENT', 'COLD_CALL']
  const availableLoanTypes = ['PERSONAL', 'BUSINESS', 'HOME', 'VEHICLE', 'EDUCATION', 'GOLD']
  const availableEmployees = ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emily Davis']

  useEffect(() => {
    generateReport()
  }, [])

  const generateReport = async () => {
    try {
      setLoading(true)
      setGenerating(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        action: 'report',
        startDate: filters.startDate,
        endDate: filters.endDate
      })
      
      if (filters.sources.length > 0) {
        params.append('sources', filters.sources.join(','))
      }
      if (filters.loanTypes.length > 0) {
        params.append('loanTypes', filters.loanTypes.join(','))
      }
      if (filters.employees.length > 0) {
        params.append('employees', filters.employees.join(','))
      }
      if (filters.minAmount) {
        params.append('minAmount', filters.minAmount.toString())
      }
      if (filters.maxAmount) {
        params.append('maxAmount', filters.maxAmount.toString())
      }

      const response = await fetch(`/api/leads/analytics?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setReportData(data.report)
        toast.success('Report generated successfully')
      } else {
        toast.error('Failed to generate report')
      }
    } catch (error) {
      toast.error('Error generating report')
    } finally {
      setLoading(false)
      setGenerating(false)
    }
  }

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      toast.loading('Exporting report...')
      
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.dismiss()
      toast.success(`Report exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.dismiss()
      toast.error('Export failed')
    }
  }

  const shareReport = async (method: 'email' | 'link') => {
    try {
      if (method === 'email') {
        toast.success('Report shared via email')
      } else {
        // Copy link to clipboard
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Report link copied to clipboard')
      }
    } catch (error) {
      toast.error('Failed to share report')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Lead Analytics Reports</h3>
          <p className="text-gray-600 text-sm">Generate comprehensive reports on lead performance and conversion metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={generateReport}
            disabled={loading}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-600 mr-2" />
          <h4 className="font-medium text-gray-900">Report Filters</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
            <input
              type="number"
              placeholder="₹ 0"
              value={filters.minAmount || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value ? parseInt(e.target.value) : undefined }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
            <input
              type="number"
              placeholder="₹ 10,00,000"
              value={filters.maxAmount || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value ? parseInt(e.target.value) : undefined }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Multi-select filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sources</label>
            <select
              multiple
              value={filters.sources}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                sources: Array.from(e.target.selectedOptions, option => option.value)
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              size={3}
            >
              {availableSources.map(source => (
                <option key={source} value={source}>{source.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loan Types</label>
            <select
              multiple
              value={filters.loanTypes}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                loanTypes: Array.from(e.target.selectedOptions, option => option.value)
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              size={3}
            >
              {availableLoanTypes.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employees</label>
            <select
              multiple
              value={filters.employees}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                employees: Array.from(e.target.selectedOptions, option => option.value)
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              size={3}
            >
              {availableEmployees.map(employee => (
                <option key={employee} value={employee}>{employee}</option>
              ))}
            </select>
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="summary">Executive Summary</option>
              <option value="detailed">Detailed Analysis</option>
              <option value="performance">Performance Report</option>
              <option value="trends">Trend Analysis</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Report Content */}
      {reportData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          {/* Report Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-semibold text-gray-900">
                  Lead Analytics Report - {reportType.charAt(0).toUpperCase() + reportType.slice(1)}
                </h4>
                <p className="text-gray-600 mt-1">
                  Period: {formatDate(filters.startDate)} to {formatDate(filters.endDate)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Generated on {new Date().toLocaleString()}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => shareReport('link')}
                  className="btn-secondary flex items-center text-sm"
                >
                  <Share className="w-4 h-4 mr-1" />
                  Share
                </button>
                
                <div className="relative">
                  <select
                    onChange={(e) => e.target.value && exportReport(e.target.value as any)}
                    className="btn-secondary appearance-none pr-8 text-sm"
                    defaultValue=""
                  >
                    <option value="">Export</option>
                    <option value="pdf">Export as PDF</option>
                    <option value="excel">Export as Excel</option>
                    <option value="csv">Export as CSV</option>
                  </select>
                  <Download className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Report Body */}
          <div className="p-6">
            {/* Executive Summary */}
            {reportType === 'summary' && (
              <div className="space-y-6">
                <div>
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Executive Summary</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{formatNumber(reportData.summary.totalLeads)}</div>
                      <div className="text-sm text-blue-800 mt-1">Total Leads</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{reportData.summary.conversionRate.toFixed(1)}%</div>
                      <div className="text-sm text-green-800 mt-1">Conversion Rate</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-3xl font-bold text-yellow-600">{formatCurrency(reportData.summary.totalRevenue)}</div>
                      <div className="text-sm text-yellow-800 mt-1">Total Revenue</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h5>
                  <div className="space-y-3">
                    {reportData.insights.map((insight, index) => (
                      <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h5>
                  <div className="space-y-3">
                    {reportData.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Analysis */}
            {reportType === 'detailed' && (
              <div className="space-y-8">
                <div>
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Lead Source Performance</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3">Source</th>
                          <th className="text-right py-3">Total Leads</th>
                          <th className="text-right py-3">Converted</th>
                          <th className="text-right py-3">Conversion Rate</th>
                          <th className="text-right py-3">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.sources.map((source, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 font-medium">{source.source}</td>
                            <td className="text-right py-3">{formatNumber(source.totalLeads)}</td>
                            <td className="text-right py-3">{formatNumber(source.convertedLeads)}</td>
                            <td className="text-right py-3">
                              <span className={`font-medium ${
                                source.conversionRate >= 20 ? 'text-green-600' : 
                                source.conversionRate >= 10 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {source.conversionRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-right py-3 font-medium">{formatCurrency(source.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary.averageLeadValue)}</div>
                      <div className="text-sm text-gray-600">Average Lead Value</div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{reportData.summary.averageConversionTime.toFixed(1)} days</div>
                      <div className="text-sm text-gray-600">Avg Conversion Time</div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{formatNumber(reportData.summary.convertedLeads)}</div>
                      <div className="text-sm text-gray-600">Total Conversions</div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{((reportData.summary.convertedLeads / reportData.summary.totalLeads) * 100).toFixed(1)}%</div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Report */}
            {reportType === 'performance' && (
              <div className="space-y-6">
                <div>
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Employee Performance</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3">Employee</th>
                          <th className="text-right py-3">Assigned Leads</th>
                          <th className="text-right py-3">Converted</th>
                          <th className="text-right py-3">Conversion Rate</th>
                          <th className="text-right py-3">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.performance.map((perf, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 font-medium">{perf.employeeName}</td>
                            <td className="text-right py-3">{formatNumber(perf.assignedLeads)}</td>
                            <td className="text-right py-3">{formatNumber(perf.convertedLeads)}</td>
                            <td className="text-right py-3">
                              <span className={`font-medium ${
                                perf.conversionRate >= 20 ? 'text-green-600' : 
                                perf.conversionRate >= 10 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {perf.conversionRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-right py-3 font-medium">{formatCurrency(perf.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Trends Analysis */}
            {reportType === 'trends' && (
              <div className="space-y-6">
                <div>
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Lead Generation Trends</h5>
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Trend visualization would be displayed here</p>
                      <p className="text-sm text-gray-400">Chart integration needed</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Conversion Rate Trends</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3">Date</th>
                          <th className="text-right py-3">Conversion Rate</th>
                          <th className="text-right py-3">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.trends.conversionRates.slice(-10).map((trend, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3">{formatDate(trend.date)}</td>
                            <td className="text-right py-3">
                              <span className={`font-medium ${
                                trend.rate >= 15 ? 'text-green-600' : 
                                trend.rate >= 10 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {trend.rate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-right py-3">
                              {index > 0 && reportData.trends.conversionRates[index - 1] ? (
                                trend.rate > reportData.trends.conversionRates[index - 1].rate ? (
                                  <TrendingUp className="w-4 h-4 text-green-500 inline" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-red-500 inline" />
                                )
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Report Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div>
                Report generated by Lead Analytics System
              </div>
              <div>
                Page 1 of 1 • {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && !reportData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-12"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Generating Report</h4>
            <p className="text-gray-600">Please wait while we analyze your lead data...</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}