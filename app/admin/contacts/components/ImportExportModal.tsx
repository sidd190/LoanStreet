'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Eye,
  Trash2,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import DataService, { Contact } from '../../../../lib/dataService'

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
  contacts: Contact[]
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  duplicates: number
  preview?: Contact[]
}

interface ExportOptions {
  format: 'csv' | 'json'
  fields: string[]
  includeHeaders: boolean
  dateFormat: 'iso' | 'readable'
}

const AVAILABLE_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'tags', label: 'Tags', required: false },
  { key: 'source', label: 'Source', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'totalMessages', label: 'Total Messages', required: false },
  { key: 'totalCampaigns', label: 'Total Campaigns', required: false },
  { key: 'responseRate', label: 'Response Rate', required: false },
  { key: 'lastContact', label: 'Last Contact', required: false },
  { key: 'createdAt', label: 'Created Date', required: false },
  { key: 'updatedAt', label: 'Updated Date', required: false }
]

export default function ImportExportModal({ 
  isOpen, 
  onClose, 
  onImportComplete, 
  contacts 
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Export options
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    fields: ['name', 'phone', 'email', 'tags', 'source', 'status', 'createdAt'],
    includeHeaders: true,
    dateFormat: 'readable'
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import')
      return
    }

    setLoading(true)
    try {
      const result = await DataService.importContacts(selectedFile)
      setImportResult(result)
      
      if (result.success) {
        toast.success(`Successfully imported ${result.imported} contacts`)
        onImportComplete()
      } else {
        toast.error('Import completed with errors')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import contacts')
      setImportResult({
        success: false,
        imported: 0,
        errors: ['Failed to process file'],
        duplicates: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      let exportData: any[]
      
      if (exportOptions.format === 'csv') {
        // Prepare CSV data
        const headers = exportOptions.fields.map(field => 
          AVAILABLE_FIELDS.find(f => f.key === field)?.label || field
        )
        
        const rows = contacts.map(contact => 
          exportOptions.fields.map(field => {
            let value = contact[field as keyof Contact]
            
            // Handle special formatting
            if (field === 'tags' && Array.isArray(value)) {
              value = value.join(';')
            } else if ((field === 'createdAt' || field === 'updatedAt' || field === 'lastContact') && value) {
              if (exportOptions.dateFormat === 'readable') {
                value = new Date(value as string).toLocaleString()
              }
            }
            
            return value || ''
          })
        )
        
        const csvContent = [
          exportOptions.includeHeaders ? headers.join(',') : null,
          ...rows.map(row => row.join(','))
        ].filter(Boolean).join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        // JSON export
        const jsonData = contacts.map(contact => {
          const exportContact: any = {}
          exportOptions.fields.forEach(field => {
            exportContact[field] = contact[field as keyof Contact]
          })
          return exportContact
        })
        
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }
      
      toast.success(`Exported ${contacts.length} contacts`)
      onClose()
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export contacts')
    } finally {
      setLoading(false)
    }
  }

  const toggleField = (fieldKey: string) => {
    const field = AVAILABLE_FIELDS.find(f => f.key === fieldKey)
    if (field?.required) return // Can't toggle required fields
    
    setExportOptions(prev => ({
      ...prev,
      fields: prev.fields.includes(fieldKey)
        ? prev.fields.filter(f => f !== fieldKey)
        : [...prev.fields, fieldKey]
    }))
  }

  const downloadTemplate = () => {
    const headers = ['name', 'phone', 'email', 'tags', 'source', 'status']
    const sampleData = [
      'John Doe,+91-9876543210,john@example.com,personal-loan;high-priority,Website Form,ACTIVE',
      'Jane Smith,+91-9876543211,jane@example.com,business-loan,WhatsApp Campaign,ACTIVE'
    ]
    
    const csvContent = [
      headers.join(','),
      ...sampleData
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts_import_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Template downloaded')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import/Export Contacts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'import', label: 'Import', icon: Upload },
            { id: 'export', label: 'Export', icon: Download }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Import Instructions */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-2">Import Instructions</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Upload a CSV file with contact information</li>
                      <li>• Required fields: Name, Phone</li>
                      <li>• Optional fields: Email, Tags (semicolon-separated), Source, Status</li>
                      <li>• Duplicate phone numbers will be detected and skipped</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Template Download */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Download Template</h4>
                  <p className="text-sm text-gray-600">Get a sample CSV file with the correct format</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </button>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {selectedFile ? (
                    <div className="flex items-center justify-center">
                      <FileText className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="ml-4 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Click to select a CSV file</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Browse Files
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Import Results */}
              {importResult && (
                <div className={`rounded-lg p-4 border ${
                  importResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start">
                    {importResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-medium mb-2 ${
                        importResult.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        Import {importResult.success ? 'Completed' : 'Failed'}
                      </h4>
                      
                      <div className="text-sm space-y-1">
                        <p>Imported: {importResult.imported} contacts</p>
                        {importResult.duplicates > 0 && (
                          <p>Duplicates skipped: {importResult.duplicates}</p>
                        )}
                        {importResult.errors.length > 0 && (
                          <div>
                            <p className="font-medium">Errors:</p>
                            <ul className="list-disc list-inside ml-4">
                              {importResult.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || loading}
                  className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Contacts
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Export Options */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Format
                    </label>
                    <select
                      value={exportOptions.format}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select
                      value={exportOptions.dateFormat}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, dateFormat: e.target.value as any }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="readable">Readable (MM/DD/YYYY)</option>
                      <option value="iso">ISO Format</option>
                    </select>
                  </div>
                </div>

                {exportOptions.format === 'csv' && (
                  <div className="mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeHeaders}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include column headers</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Field Selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Select Fields to Export</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_FIELDS.map(field => (
                    <label key={field.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.fields.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                        disabled={field.required}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className={`ml-2 text-sm ${
                        field.required ? 'text-gray-900 font-medium' : 'text-gray-700'
                      }`}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Export Summary</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Total contacts: {contacts.length}</p>
                  <p>Selected fields: {exportOptions.fields.length}</p>
                  <p>Format: {exportOptions.format.toUpperCase()}</p>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleExport}
                  disabled={loading || exportOptions.fields.length === 0}
                  className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export Contacts
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}