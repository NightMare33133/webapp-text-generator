import type { WorkflowHistoryItem } from '@/types/history'

const STORAGE_KEY_PREFIX = 'dify_workflow_history_'
const MAX_HISTORY_COUNT = 50

export const getHistoryKey = (appId: string) => `${STORAGE_KEY_PREFIX}${appId || 'default'}`

export const getHistoryList = (appId: string): WorkflowHistoryItem[] => {
  if (typeof window === 'undefined')
    return []

  try {
    const raw = localStorage.getItem(getHistoryKey(appId))
    if (!raw)
      return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  }
  catch (e) {
    console.error('Failed to load workflow history from localStorage', e)
    return []
  }
}

export const saveHistoryItem = (item: WorkflowHistoryItem): WorkflowHistoryItem[] => {
  if (typeof window === 'undefined')
    return []

  try {
    const list = getHistoryList(item.appId)
    // Remove duplicate if id already exists
    const filtered = list.filter(i => i.id !== item.id)
    const updated = [item, ...filtered].slice(0, MAX_HISTORY_COUNT)
    localStorage.setItem(getHistoryKey(item.appId), JSON.stringify(updated))
    return updated
  }
  catch (e) {
    console.error('Failed to save workflow history item to localStorage', e)
    return []
  }
}

export const deleteHistoryItem = (appId: string, id: string): WorkflowHistoryItem[] => {
  if (typeof window === 'undefined')
    return []

  try {
    const list = getHistoryList(appId)
    const updated = list.filter(i => i.id !== id)
    localStorage.setItem(getHistoryKey(appId), JSON.stringify(updated))
    return updated
  }
  catch (e) {
    console.error('Failed to delete workflow history item', e)
    return []
  }
}

export const clearHistoryList = (appId: string): void => {
  if (typeof window === 'undefined')
    return

  try {
    localStorage.removeItem(getHistoryKey(appId))
  }
  catch (e) {
    console.error('Failed to clear workflow history', e)
  }
}

export const extractHistoryTitle = (inputs: Record<string, any>): string => {
  if (!inputs || Object.keys(inputs).length === 0)
    return '未命名任务'

  // Prefer common task keys
  const priorityKeys = ['想要生成的网页', '网页需求', 'query', 'prompt', 'title', 'instruction', 'topic']
  for (const key of priorityKeys) {
    if (inputs[key] && typeof inputs[key] === 'string' && inputs[key].trim()) {
      const clean = inputs[key].trim().replace(/\n+/g, ' ')
      return clean.length > 35 ? `${clean.slice(0, 35)}...` : clean
    }
  }

  // Fallback to first non-empty string value
  for (const key of Object.keys(inputs)) {
    const val = inputs[key]
    if (typeof val === 'string' && val.trim()) {
      const clean = val.trim().replace(/\n+/g, ' ')
      return clean.length > 35 ? `${clean.slice(0, 35)}...` : clean
    }
  }

  return '未命名任务'
}

export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now()
  const diffMs = Math.max(0, now - timestamp)
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 45)
    return '刚刚'
  if (diffMin < 60)
    return `${diffMin} 分钟前`
  if (diffHour < 24)
    return `${diffHour} 小时前`
  if (diffDay < 7)
    return `${diffDay} 天前`

  const d = new Date(timestamp)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export const formatExactTime = (timestamp: number): string => {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
