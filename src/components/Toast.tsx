import React from 'react'
import { Toast as ToastType } from '@/hooks/useToast'

interface ToastProps {
  toast: ToastType
  onClose: () => void
}

function Toast({ toast, onClose }: ToastProps) {
  const bgColors = {
    success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    error: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  }

  return (
    <div
      className={`${bgColors[toast.type]} px-4 py-3 rounded-lg shadow-lg mb-2 flex items-center justify-between min-w-[300px] max-w-md`}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-current opacity-70 hover:opacity-100"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  )
}

export default Toast

