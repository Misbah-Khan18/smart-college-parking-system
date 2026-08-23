import { useEffect } from 'react'
import { CheckIcon, AlertCircleIcon, XIcon } from './Icons'

export default function NotificationToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      onDismiss()
    }, 4500)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div className={`notification-toast toast-${toast.type || 'info'}`}>
      <div className="toast-icon">
        {toast.type === 'success' && <CheckIcon className="w-5 h-5" />}
        {toast.type === 'error' && <AlertCircleIcon className="w-5 h-5" />}
        {toast.type === 'info' && <span className="toast-info-dot">ℹ</span>}
      </div>
      <div className="toast-content">
        <h5 className="toast-title">{toast.title}</h5>
        <p className="toast-msg">{toast.message}</p>
      </div>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss alert">
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
