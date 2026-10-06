/**
 * App-wide toasts, rendered once by the app layout (`AppToasts`). Uses the same pill as the
 * landing page (`BaseToast`) so notifications look identical everywhere.
 */
export interface Notice {
  id: number
  icon: string
  label: string
  tone: 'success' | 'error' | 'info'
}

const icons: Record<Notice['tone'], string> = {
  success: 'ph:check-bold',
  error: 'ph:warning-bold',
  info: 'ph:info-bold',
}

let nextId = 1

export function useNotify() {
  const notices = useState<Notice[]>('notify:list', () => [])

  const dismiss = (id: number) => {
    notices.value = notices.value.filter(n => n.id !== id)
  }

  const push = (label: string, tone: Notice['tone'] = 'success', { icon, timeout = 3800 }: { icon?: string; timeout?: number } = {}) => {
    const notice = { id: nextId++, label, tone, icon: icon ?? icons[tone] }
    notices.value = [...notices.value.slice(-2), notice]
    if (timeout) setTimeout(() => dismiss(notice.id), timeout)
    return notice.id
  }

  return {
    notices,
    dismiss,
    success: (label: string, icon?: string) => push(label, 'success', { icon }),
    error: (label: string) => push(label, 'error', { timeout: 6000 }),
    info: (label: string, icon?: string) => push(label, 'info', { icon }),
  }
}
