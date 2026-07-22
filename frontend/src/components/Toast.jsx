/**
 * Toast — Lightweight notification component with auto-dismiss.
 * Supports success, error, and info variants.
 *
 * Usage:
 *   const { toasts, addToast, removeToast } = useToast()
 *   addToast('User created!', 'success')
 *
 *   <ToastContainer toasts={toasts} removeToast={removeToast} />
 */
import { useState, useCallback, useEffect } from 'react'
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineInformationCircle, HiOutlineX } from 'react-icons/hi'

/* ---- Hook ---- */
let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type, duration }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

/* ---- Single Toast ---- */
function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration)
    return () => clearTimeout(timer)
  }, [toast, onRemove])

  const icons = {
    success: <HiOutlineCheckCircle />,
    error: <HiOutlineExclamationCircle />,
    info: <HiOutlineInformationCircle />,
  }

  return (
    <div className={`toast toast-${toast.type}`}>
      <span className="toast-icon">{icons[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        <HiOutlineX />
      </button>
    </div>
  )
}

/* ---- Container ---- */
export function ToastContainer({ toasts, removeToast }) {
  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  )
}

export default function Toast({ type = 'info', message, onClose }) {
  if (!message) return null
  return (
    <div className="toast-container">
      <ToastItem toast={{ id: 1, message, type, duration: 4000 }} onRemove={onClose || (() => {})} />
    </div>
  )
}
