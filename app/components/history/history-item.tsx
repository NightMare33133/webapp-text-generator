'use client'

import React from 'react'
import cn from 'classnames'
import {
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import type { WorkflowHistoryItem } from '@/types/history'
import { formatExactTime, formatTimeAgo } from '@/utils/history-storage'

type HistoryItemProps = {
  item: WorkflowHistoryItem
  isSelected: boolean
  onSelect: (item: WorkflowHistoryItem) => void
  onDelete: (id: string, e: React.MouseEvent) => void
}

const HistoryItem: React.FC<HistoryItemProps> = ({
  item,
  isSelected,
  onSelect,
  onDelete,
}) => {
  const isSuccess = item.status === 'succeeded'
  const stepCount = item.workflowProcessData?.tracing?.length || 0

  return (
    <div
      onClick={() => onSelect(item)}
      className={cn(
        'group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left mb-2.5',
        isSelected
          ? 'bg-blue-50/50 border-primary-500 shadow-sm ring-1 ring-primary-400'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm',
      )}
    >
      {/* Top row: Status, Step Count, Time, Delete */}
      <div className='flex items-center justify-between gap-2 mb-2'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          {isSuccess ? (
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200'>
              <CheckCircleIcon className='w-3 h-3 text-emerald-600' />
              成功
            </span>
          ) : (
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200'>
              <XCircleIcon className='w-3 h-3 text-rose-600' />
              失败
            </span>
          )}

          {stepCount > 0 && (
            <span className='px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600'>
              {stepCount} 步
            </span>
          )}

          <span
            className='inline-flex items-center gap-1 text-[11px] text-gray-400'
            title={formatExactTime(item.createdAt)}
          >
            <ClockIcon className='w-3 h-3' />
            {formatTimeAgo(item.createdAt)}
          </span>
        </div>

        {/* Delete button */}
        <button
          type='button'
          onClick={(e) => onDelete(item.id, e)}
          title='删除此条记录'
          className='opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-opacity'
        >
          <TrashIcon className='w-3.5 h-3.5' />
        </button>
      </div>

      {/* Middle: Title */}
      <div className='text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-2'>
        {item.title}
      </div>

      {/* Bottom row: Metrics & Exact Time */}
      <div className='flex items-center justify-between text-[11px] text-gray-400 pt-1.5 border-t border-gray-100'>
        <div className='flex items-center gap-2'>
          {typeof item.totalDuration === 'number' && (
            <span>⏱️ {item.totalDuration.toFixed(1)}s</span>
          )}
          {typeof item.totalTokens === 'number' && item.totalTokens > 0 && (
            <span>
              🔤 {item.totalTokens >= 1000 ? `${(item.totalTokens / 1000).toFixed(1)}k` : item.totalTokens} toks
            </span>
          )}
        </div>
        <span className='text-[10px] text-gray-400 font-mono'>
          {formatExactTime(item.createdAt).slice(5, 16)}
        </span>
      </div>
    </div>
  )
}

export default React.memo(HistoryItem)
