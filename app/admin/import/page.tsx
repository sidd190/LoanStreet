'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import RouteProtection from '../../components/RouteProtection'
import { 
  Upload, 
  FileText,
  Users,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Eye,
  Trash2
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import toast from 'react-hot-toast'

interface ImportedContact {
  name: string
  phone: string
  email?: string
  loanType?: string
  loanAmount?: number
  source?: string
  status: 'valid' | 'invalid' | 'duplicate'
  errors?: string[]
}

function ImportContactsContent() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([])
  const [importResults, setImportResults] = useState<{
    total: number
    valid: number
    invalid: number
    duplicates: number
  } | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (selectedFile: File) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Please upload a CSV or Excel file')
      return
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB')
      return
    }
    
    setFile(selectedFile)
    toast.success('File selected successfully')
  }

  const processFile = async () => {
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      if (result.success) {
        setImportedContacts(result.contacts)
        setImportResults(result.summary)
        toast.success('File processed successfully')
      } else {
        throw new Error(result.message || 'Processing failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to process file')
      
      // Simulate processing for demo
      simulateImport()
    } finally {
      setImporting(false)
    }
  }

  const simulateImport = () => {
    // Simulate file processing for demo
    const sampleContacts: ImportedContact[] = [
      {
        name: 'Rajesh Kumar',
        phone: '9876543210',
        email: 'rajesh@example.com',
        loanType: 'PERSONAL',
        loanAmount: 500000,
        source: 'Import',
        status: 'valid'
      },
      {
        name: 'Priya Sharma',
        phone: '9876543211',
        email: 'priya@example.com',
        loanType: 'HOME',
        loanAmount: 2500000,
        source: 'Import',
        status: 'valid'
      },
      {
        name: 'Invalid Contact',
        phone: '123',
        email: 'invalid-email',
        status: 'invalid',
        errors: ['Invalid phone number', 'Invalid email format']
      },
      {
        name: 'Amit Singh',
        phone: '9876543210',
        email: 'amit@example.com',
        status: 'duplicate',
        errors: ['Phone number already exists']
      }
    ]
    
    setImportedContacts(sampleContacts)
    setImportResults({
      total: sampleContacts.length,
      valid: sampleContacts.filter(c => c.status === 'valid').length,
      invalid: sampleContacts.filter(c => c.status === 'invalid').length,
      duplicates: sampleContacts.filter(c => c.status === 'duplicate').length
    })
  }

  const importValidContacts = async () => {
    const validContacts = importedContacts.filter(c => c.status === 'valid')
    
    if (validContacts.length === 0) {
      toast.error('No valid contacts to import')
      return
    }

    try {
      setImporting(true)
      
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ contacts: validContacts })
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success(`Successfully imported ${validContacts.length} contacts`)
        router.push('/admin/contacts')
      } else {
        throw new Error(result.message || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import contacts')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = `name,phone,email,loanType,loanAmount,source
Rajesh Kumar,9876543210,rajesh@example.com,PERSONAL,500000,Website
Priya Sharma,9876543211,priya@example.com,HOME,2500000,Referral
Amit Singh,9876543212,amit@example.com,BUSINESS,1000000,Campaign`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return CheckCircle
      case 'invalid': return XCircle
      case 'duplicate': return AlertTriangle
      default: return AlertTriangle
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600'
      case 'invalid': return 'text-red-600'
      case 'duplicate': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Import Contacts</h1>
              <p className="text-gray-600 mt-1">
                Upload CSV or Excel files to import contacts in bulk
              </p>
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload File</h2>
              
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                
                {file ? (
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <div className="flex justify-center space-x-3 mt-4">
                      <button
                        onClick={processFile}
                        disabled={importing}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        {importing ? 'Processing...' : 'Process File'}
                      </button>
                      <button
                        onClick={() => setFile(null)}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">
                      Drop your file here, or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports CSV and Excel files up to 10MB
                    </p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </motion.div>

            {/* Import Results */}
            {importResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Import Results</h2>
                  {importResults.valid > 0 && (
                    <button
                      onClick={importValidContacts}
                      disabled={importing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Import {importResults.valid} Valid Contacts
                    </button>
                  )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{importResults.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResults.valid}</div>
                    <div className="text-sm text-gray-600">Valid</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResults.invalid}</div>
                    <div className="text-sm text-gray-600">Invalid</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{importResults.duplicates}</div>
                    <div className="text-sm text-gray-600">Duplicates</div>
                  </div>
                </div>

                {/* Contacts List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {importedContacts.map((contact, index) => {
                    const StatusIcon = getStatusIcon(contact.status)
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <StatusIcon className={`w-5 h-5 ${getStatusColor(contact.status)}`} />
                          <div>
                            <h3 className="font-medium text-gray-900">{contact.name}</h3>
                            <p className="text-sm text-gray-600">{contact.phone}</p>
                            {contact.email && (
                              <p className="text-sm text-gray-600">{contact.email}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            contact.status === 'valid' 
                              ? 'bg-green-100 text-green-800'
                              : contact.status === 'invalid'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {contact.status}
                          </span>
                          {contact.errors && contact.errors.length > 0 && (
                            <div className="mt-1">
                              {contact.errors.map((error, errorIndex) => (
                                <p key={errorIndex} className="text-xs text-red-600">
                                  {error}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
              
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                  <p>Download the template file to see the required format</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                  <p>Fill in your contact data following the template structure</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                  <p>Upload your CSV or Excel file</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">4</span>
                  <p>Review the validation results and import valid contacts</p>
                </div>
              </div>
            </motion.div>

            {/* Required Fields */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Required Fields</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">name</span>
                  <span className="text-red-500">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">phone</span>
                  <span className="text-red-500">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">email</span>
                  <span className="text-gray-500">Optional</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">loanType</span>
                  <span className="text-gray-500">Optional</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">loanAmount</span>
                  <span className="text-gray-500">Optional</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">source</span>
                  <span className="text-gray-500">Optional</span>
                </div>
              </div>
            </motion.div>

            {/* File Formats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Supported Formats</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">CSV Files</p>
                    <p className="text-xs text-gray-500">Comma-separated values</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Excel Files</p>
                    <p className="text-xs text-gray-500">.xlsx, .xls formats</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Maximum file size is 10MB. Large files may take longer to process.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default function ImportContactsPage() {
  return (
    <RouteProtection requiredRole="ADMIN">
      <ImportContactsContent />
    </RouteProtection>
  )
}