'use client'

import React, { useState } from 'react'
import {
  MagnifyingGlassIcon,
  TrashIcon,
  ClockIcon,
  InboxIcon,
} from '@heroicons/react/24/outline'
import type { WorkflowHistoryItem } from '@/types/history'
import HistoryItem from './history-item'

type HistoryPanelProps = {
  items: WorkflowHistoryItem[]
  selectedId?: string | null
  onSelect: (item: WorkflowHistoryItem) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  items,
  selectedId,
  onSelect,
  onDelete,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim())
      return true
    const q = searchQuery.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      Object.values(item.inputs || {}).some(
        val => typeof val === 'string' && val.toLowerCase().includes(q),
      )
    )
  })

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(id)
  }

  const handleClearAll = () => {
    if (window.confirm('确定要清空所有历史执行记录吗？此操作不可撤销。'))
      onClearAll()
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Header bar */}
      <div className='flex items-center justify-between py-2 mb-3'>
        <div className='flex items-center gap-1.5 text-xs text-gray-500 font-medium'>
          <ClockIcon className='w-4 h-4 text-gray-400' />
          <span>共 {items.length} 条记录</span>
        </div>
        {items.length > 0 && (
          <button
            type='button'
            onClick={handleClearAll}
            className='inline-flex items-center gap-1 text-xs text-gray-400 hover:text-rose-600 transition-colors px-1.5 py-0.5 rounded hover:bg-rose-50'
            title='清空所有历史记录'
          >
            <TrashIcon className='w-3.5 h-3.5' />
            <span>清空全部</span>
          </button>
        )}
      </div>

      {/* Search Bar (only show if there are more than 3 items) */}
      {items.length > 3 && (
        <div className='relative mb-3'>
          <MagnifyingGlassIcon className='w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2' />
          <input
            type='text'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='搜索历史记录...'
            className='w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all'
          />
        </div>
      )}

      {/* List / Empty State */}
      <div className='grow overflow-y-auto pr-1 -mr-1'>
        {items.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center text-gray-400'>
            <div className='w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-gray-400'>
              <InboxIcon className='w-6 h-6' />
            </div>
            <div className='text-sm font-medium text-gray-600 mb-1'>暂无执行历史</div>
            <div className='text-xs text-gray-400 max-w-[220px]'>
              在“单次运行”中执行工作流，完成后将自动在此处持久化保存
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className='py-8 text-center text-xs text-gray-400'>
            未找到包含 “{searchQuery}” 的历史记录
          </div>
        ) : (
          filteredItems.map(item => (
            <HistoryItem
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              onSelect={onSelect}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default React.memo(HistoryPanel)
