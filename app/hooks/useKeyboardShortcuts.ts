'use client'

import { useEffect, useCallback, useRef } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  target?: 'document' | 'window' | HTMLElement
}

export function useKeyboardShortcuts({ 
  shortcuts, 
  enabled = true, 
  target = 'document' 
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)
  
  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when user is typing in input fields
    const activeElement = document.activeElement
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       activeElement.tagName === 'SELECT' ||
       activeElement.getAttribute('contenteditable') === 'true')
    ) {
      return
    }

    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase()
      const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey
      const altMatch = !!shortcut.altKey === event.altKey
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey
      const metaMatch = !!shortcut.metaKey === event.metaKey

      return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch
    })

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault()
      }
      matchingShortcut.action()
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const targetElement = target === 'document' 
      ? document 
      : target === 'window' 
        ? window 
        : target

    if (targetElement) {
      targetElement.addEventListener('keydown', handleKeyDown as EventListener)
      return () => {
        targetElement.removeEventListener('keydown', handleKeyDown as EventListener)
      }
    }
  }, [handleKeyDown, enabled, target])

  return {
    shortcuts: shortcutsRef.current
  }
}

// Hook for common admin shortcuts
export function useAdminShortcuts() {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        // Navigate to new campaign
        window.location.href = '/admin/campaigns/create'
      },
      description: 'Create new campaign'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        // Focus search
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      },
      description: 'Focus search'
    },
    {
      key: 'd',
      ctrlKey: true,
      action: () => {
        // Navigate to dashboard
        window.location.href = '/admin/dashboard'
      },
      description: 'Go to dashboard'
    },
    {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      action: () => {
        // Navigate to contacts
        window.location.href = '/admin/contacts'
      },
      description: 'Go to contacts'
    },
    {
      key: 'm',
      ctrlKey: true,
      shiftKey: true,
      action: () => {
        // Navigate to messages
        window.location.href = '/admin/messages'
      },
      description: 'Go to messages'
    },
    {
      key: 'l',
      ctrlKey: true,
      shiftKey: true,
      action: () => {
        // Navigate to leads
        window.location.href = '/admin/leads'
      },
      description: 'Go to leads'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => {
        // Refresh page
        window.location.reload()
      },
      description: 'Refresh page'
    },
    {
      key: '?',
      shiftKey: true,
      action: () => {
        // Show keyboard shortcuts help
        showKeyboardShortcutsHelp()
      },
      description: 'Show keyboard shortcuts'
    }
  ]

  return useKeyboardShortcuts({ shortcuts })
}

// Function to show keyboard shortcuts help modal
function showKeyboardShortcutsHelp() {
  // Create and show a modal with keyboard shortcuts
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
          <button id="close-shortcuts" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Create new campaign</span>
            <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + N</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Focus search</span>
            <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + K</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Go to dashboard</span>
            <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + D</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Go to contacts</span>
            <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + Shift + C</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Go to messages</span>
            <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + Shift + M</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Go to leads</span>
            <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + Shift + L</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Refresh page</span>
            <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl + R</kbd>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Show shortcuts</span>
            <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">?</kbd>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Close modal handlers
  const closeModal = () => {
    document.body.removeChild(modal)
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal()
    }
  })

  const closeButton = modal.querySelector('#close-shortcuts')
  if (closeButton) {
    closeButton.addEventListener('click', closeModal)
  }

  // Close on escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal()
      document.removeEventListener('keydown', handleEscape)
    }
  }
  document.addEventListener('keydown', handleEscape)
}

// Hook for table navigation shortcuts
export function useTableShortcuts(options: {
  onSelectAll?: () => void
  onDelete?: () => void
  onEdit?: () => void
  onRefresh?: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'a',
      ctrlKey: true,
      action: () => {
        if (options.onSelectAll) {
          options.onSelectAll()
        }
      },
      description: 'Select all items'
    },
    {
      key: 'Delete',
      action: () => {
        if (options.onDelete) {
          options.onDelete()
        }
      },
      description: 'Delete selected items'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => {
        if (options.onEdit) {
          options.onEdit()
        }
      },
      description: 'Edit selected item'
    },
    {
      key: 'F5',
      action: () => {
        if (options.onRefresh) {
          options.onRefresh()
        }
      },
      description: 'Refresh data',
      preventDefault: true
    }
  ]

  return useKeyboardShortcuts({ shortcuts })
}

// Hook for form shortcuts
export function useFormShortcuts(options: {
  onSave?: () => void
  onCancel?: () => void
  onReset?: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        if (options.onSave) {
          options.onSave()
        }
      },
      description: 'Save form'
    },
    {
      key: 'Escape',
      action: () => {
        if (options.onCancel) {
          options.onCancel()
        }
      },
      description: 'Cancel/Close form'
    },
    {
      key: 'r',
      ctrlKey: true,
      shiftKey: true,
      action: () => {
        if (options.onReset) {
          options.onReset()
        }
      },
      description: 'Reset form'
    }
  ]

  return useKeyboardShortcuts({ shortcuts })
}