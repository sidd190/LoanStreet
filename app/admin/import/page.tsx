'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Users,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { processContactData, parseCSV, generateSampleCSV } from '../../../lib/dataProcessor'
import toast from 'react-hot-toast'

export default function DataImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [importHistory, setImportHistory] = useState([
    {
      id: '1',
      filename: 'contacts_batch_1.csv',
      totalRows: 1500,
      successRows: 1450,
      errorRows: 50,
      status: 'COMPLETED',
      createdAt: '2024-10-24T10:30:00'
    },
    {
      id: '2',
      filename: 'leads_october.csv',
      totalRows: 800,
      successRows: 780,
      errorRows: 20,
      status: 'COMPLETED',
      createdAt: '2024-10-23T15:45:00'
    }
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setResults(null)
    }
  }

  const processFile = async () => {
    if (!file) return

    setProcessing(true)
    try {
      const text = await file.text()
      const rawData = parseCSV(text)
      const processedResults = processContactData(rawData)
      
      setResults(processedResults)
      
      if (processedResults.stats.success > 0) {
        toast.success(`Successfully processed ${processedResults.stats.success} contacts`)
      }
      
      if (processedResults.stats.errors > 0) {
        toast.error(`${processedResults.stats.errors} rows had errors`)
      }

    } catch (error) {
      toast.error('Error processing file')
      console.error('File processing error:', error)
    } finally {
      setProcessing(false)
    }
  }

  const downloadSample = () => {
    const sampleCSV = generateSampleCSV()
    const blob = new Blob([sampleCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_contacts.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Sample CSV downloaded')
  }

  const importContacts = async () => {
    if (!results || results.success.length === 0) return

    try {
      // In a real app, this would send data to your API
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: results.success,
          filename: file?.name
        })
      })

      if (response.ok) {
        toast.success(`${results.success.length} contacts imported successfully!`)
        setFile(null)
        setResults(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        toast.error('Failed to import contacts')
      }
    } catch (error) {
      toast.error('Error importing contacts')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Import</h1>
            <p className="text-gray-600 mt-1">Import contacts from CSV files with automatic data cleaning</p>
          </div>
          <button
            onClick={downloadSample}
            className="btn-secondary flex items-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Sample CSV
          </button>
        </div>

        {/* Upload Section */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload CSV File</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {!file ? (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your CSV file</h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary"
                >
                  Choose File
                </button>
              </div>
            ) : (
              <div>
                <FileText className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{file.name}</h3>
                <p className="text-gray-600 mb-4">
                  Size: {(file.size / 1024).toFixed(2)} KB
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={processFile}
                    disabled={processing}
                    className="btn-primary flex items-center"
                  >
                    {processing ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 mr-2" />
                    )}
                    {processing ? 'Processing...' : 'Process File'}
                  </button>
                  <button
                    onClick={() => {
                      setFile(null)
                      setResults(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="btn-secondary"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Processing Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Required columns: Name, Phone (or Mobile/Number)</li>
              <li>• Optional columns: Email, Tags</li>
              <li>• Phone numbers will be automatically formatted to +91XXXXXXXXXX</li>
              <li>• Duplicate phone numbers will be detected and skipped</li>
              <li>• Invalid phone numbers and emails will be flagged</li>
            </ul>
          </div>
        </div>

        {/* Processing Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Processing Results</h2>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Users className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Total Rows</p>
                <p className="text-2xl font-bold text-gray-900">{results.stats.total}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Success</p>
                <p className="text-2xl font-bold text-green-600">{results.stats.success}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">{results.stats.errors}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Users className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Duplicates</p>
                <p className="text-2xl font-bold text-yellow-600">{results.stats.duplicates}</p>
              </div>
            </div>

            {/* Success Preview */}
            {results.success.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Valid Contacts ({results.success.length})
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {results.success.slice(0, 10).map((contact: any, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <p className="font-medium">{contact.name || 'No Name'}</p>
                          <p className="text-sm text-gray-600">{contact.phone}</p>
                          {contact.email && <p className="text-sm text-gray-500">{contact.email}</p>}
                        </div>
                        {contact.tags && (
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.map((tag: string, tagIndex: number) => (
                              <span key={tagIndex} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {results.success.length > 10 && (
                      <p className="text-center text-gray-500 text-sm">
                        ... and {results.success.length - 10} more contacts
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {results.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Errors ({results.errors.length})
                </h3>
                <div className="bg-red-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {results.errors.slice(0, 5).map((error: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border border-red-200">
                        <p className="text-sm font-medium text-red-800">Row {error.row}: {error.error}</p>
                        <p className="text-xs text-red-600 mt-1">
                          Data: {JSON.stringify(error.data)}
                        </p>
                      </div>
                    ))}
                    {results.errors.length > 5 && (
                      <p className="text-center text-red-600 text-sm">
                        ... and {results.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Import Button */}
            {results.success.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={importContacts}
                  className="btn-primary flex items-center"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Import {results.success.length} Contacts
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Import History */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Import History</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Filename</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Rows</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Success</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Errors</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        {item.filename}
                      </div>
                    </td>
                    <td className="py-3 px-4">{item.totalRows.toLocaleString()}</td>
                    <td className="py-3 px-4 text-green-600">{item.successRows.toLocaleString()}</td>
                    <td className="py-3 px-4 text-red-600">{item.errorRows.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-1 text-gray-500 hover:text-gray-700">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}