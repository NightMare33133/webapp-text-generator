'use client'
import type { FC } from 'react'
import React, { useEffect, useMemo, useState } from 'react'
import cn from 'classnames'
import copy from 'copy-to-clipboard'
import BlockIcon from './block-icon'
import { AlertCircle, AlertTriangle } from '@/app/components/base/icons/line/alertsAndFeedback'
import { CheckCircle, Loading02 } from '@/app/components/base/icons/line/general'
import { ChevronRight } from '@/app/components/base/icons/line/arrows'
import { Clipboard, ClipboardCheck } from '@/app/components/base/icons/line/files'
import { Markdown } from '@/app/components/base/markdown'
import type { NodeTracing } from '@/types/app'

type Props = {
  nodeInfo: NodeTracing
  hideInfo?: boolean
  expand?: boolean
}

type TabType = 'output' | 'input' | 'process' | 'meta'

const NodePanel: FC<Props> = ({ nodeInfo, hideInfo = false, expand }) => {
  const [collapseState, setCollapseState] = useState<boolean>(expand !== undefined ? !expand : true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const hasInputs = useMemo(() => {
    if (!nodeInfo.inputs) return false
    if (typeof nodeInfo.inputs === 'object') return Object.keys(nodeInfo.inputs).length > 0
    return true
  }, [nodeInfo.inputs])

  const hasOutputs = useMemo(() => {
    if (!nodeInfo.outputs) return false
    if (typeof nodeInfo.outputs === 'object') return Object.keys(nodeInfo.outputs).length > 0
    return true
  }, [nodeInfo.outputs])

  const hasProcessData = useMemo(() => {
    if (!nodeInfo.process_data) return false
    if (typeof nodeInfo.process_data === 'object') return Object.keys(nodeInfo.process_data).length > 0
    return true
  }, [nodeInfo.process_data])

  const defaultTab = useMemo<TabType>(() => {
    if (hasOutputs) return 'output'
    if (hasInputs) return 'input'
    if (hasProcessData) return 'process'
    return 'meta'
  }, [hasOutputs, hasInputs, hasProcessData])

  const [activeTab, setActiveTab] = useState<TabType>(defaultTab)

  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  const getTime = (time: number) => {
    if (time < 1)
      return `${(time * 1000).toFixed(0)} ms`
    if (time > 60)
      return `${parseInt(Math.round(time / 60).toString())}m ${(time % 60).toFixed(1)}s`
    return `${time.toFixed(2)}s`
  }

  const getTokenCount = (tokens: number) => {
    if (!tokens) return '0'
    if (tokens < 1000)
      return `${tokens}`
    if (tokens >= 1000 && tokens < 1000000)
      return `${parseFloat((tokens / 1000).toFixed(2))}K`
    return `${parseFloat((tokens / 1000000).toFixed(2))}M`
  }

  useEffect(() => {
    if (expand !== undefined)
      setCollapseState(!expand)
    else
      setCollapseState(!nodeInfo.expand)
  }, [expand, nodeInfo.expand])

  const handleCopy = (data: any, key: string) => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    copy(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1600)
  }

  const renderDataBody = (data: any) => {
    if (data === null || data === undefined) {
      return (
        <div className="py-4 text-center text-xs text-gray-400 italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
          暂无数据 (Empty)
        </div>
      )
    }

    if (typeof data === 'string') {
      const isRichMarkdown = data.includes('#') || data.includes('```') || data.includes('http://') || data.includes('https://') || (data.includes('\n') && data.length > 80)
      return (
        <div className="rounded-lg bg-gray-50 p-3 border border-gray-200/80 max-h-[380px] overflow-y-auto text-xs text-gray-800">
          {isRichMarkdown ? (
            <div className="prose prose-xs max-w-none break-words">
              <Markdown content={data} />
            </div>
          ) : (
            <pre className="font-mono whitespace-pre-wrap break-words leading-relaxed">{data}</pre>
          )}
        </div>
      )
    }

    let jsonStr = ''
    try {
      jsonStr = JSON.stringify(data, null, 2)
    } catch {
      jsonStr = String(data)
    }

    return (
      <div className="relative">
        <pre className="rounded-lg bg-gray-50 p-3 border border-gray-200/80 font-mono text-xs text-gray-800 leading-relaxed overflow-x-auto max-h-[380px] whitespace-pre-wrap break-words">
          {jsonStr}
        </pre>
      </div>
    )
  }

  return (
    <div className={cn('px-2 py-1', hideInfo && '!px-0 !py-0.5')}>
      <div className={cn(
        'group transition-all bg-white border border-gray-200/80 rounded-xl shadow-xs hover:border-gray-300 hover:shadow-sm',
        !collapseState && 'ring-1 ring-primary-500/20 border-primary-200 shadow-sm'
      )}>
        {/* Node Header */}
        <div
          className={cn(
            'flex items-center pl-2.5 pr-3 cursor-pointer select-none transition-colors rounded-xl',
            hideInfo ? 'py-2' : 'py-2.5',
            !collapseState && 'rounded-b-none border-b border-gray-100 bg-gray-50/40'
          )}
          onClick={() => setCollapseState(!collapseState)}
        >
          {/* Collapse Chevron Arrow */}
          <ChevronRight
            className={cn(
              'shrink-0 mr-1.5 w-3.5 h-3.5 text-gray-400 transition-transform duration-200 group-hover:text-gray-600',
              !collapseState && 'rotate-90 text-primary-600'
            )}
          />

          {/* Node Icon */}
          <BlockIcon
            size={hideInfo ? 'xs' : 'sm'}
            className="shrink-0 mr-2"
            type={nodeInfo.node_type}
            toolIcon={nodeInfo.extras?.icon || nodeInfo.extras}
          />

          {/* Node Title & Type Badge */}
          <div className="grow min-w-0 flex items-center space-x-1.5 mr-2">
            <span
              className={cn(
                'text-gray-800 text-[13px] leading-[18px] font-semibold truncate',
                hideInfo && '!text-xs',
                !collapseState && 'text-primary-700 font-bold'
              )}
              title={nodeInfo.title}
            >
              {nodeInfo.title}
            </span>
            {nodeInfo.node_type && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200/60 uppercase">
                {nodeInfo.node_type}
              </span>
            )}
          </div>

          {/* Node Status / Metrics */}
          <div className="shrink-0 flex items-center space-x-2">
            {nodeInfo.status !== 'running' && (
              <div className="text-gray-500 text-xs leading-[18px] font-mono">
                {getTime(nodeInfo.elapsed_time || 0)}
                {!!nodeInfo.execution_metadata?.total_tokens && (
                  <span className="ml-1.5 text-gray-400">
                    · {getTokenCount(nodeInfo.execution_metadata.total_tokens)} toks
                  </span>
                )}
              </div>
            )}

            {nodeInfo.status === 'succeeded' && (
              <CheckCircle className="w-3.5 h-3.5 text-[#12B76A]" />
            )}
            {nodeInfo.status === 'failed' && (
              <AlertCircle className="w-3.5 h-3.5 text-[#F04438]" />
            )}
            {nodeInfo.status === 'stopped' && (
              <AlertTriangle className="w-3.5 h-3.5 text-[#F79009]" />
            )}
            {nodeInfo.status === 'running' && (
              <div className="flex items-center text-primary-600 text-xs leading-[16px] font-medium">
                <Loading02 className="mr-1 w-3.5 h-3.5 animate-spin" />
                <span>运行中</span>
              </div>
            )}
          </div>
        </div>

        {/* Node Expanded Details Panel */}
        {!collapseState && (
          <div className="p-3 bg-white rounded-b-xl transition-all duration-200">
            {/* Error Callout */}
            {nodeInfo.error && (
              <div className="mb-3 p-3 rounded-lg bg-red-50/90 border border-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="grow min-w-0">
                  <div className="text-xs font-semibold text-red-800 mb-0.5">节点执行失败 (Execution Error)</div>
                  <div className="font-mono text-xs text-red-700 whitespace-pre-wrap break-words">{nodeInfo.error}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(nodeInfo.error, 'error')}
                  className="shrink-0 p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                  title="复制错误信息"
                >
                  {copiedKey === 'error' ? (
                    <ClipboardCheck className="w-3.5 h-3.5 text-red-700" />
                  ) : (
                    <Clipboard className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2.5">
              <div className="flex items-center space-x-1">
                {hasOutputs && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('output')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                      activeTab === 'output'
                        ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    输出 (Output)
                  </button>
                )}
                {hasInputs && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('input')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                      activeTab === 'input'
                        ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    输入 (Input)
                  </button>
                )}
                {hasProcessData && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('process')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                      activeTab === 'process'
                        ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    过程数据 (Process)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('meta')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                    activeTab === 'meta'
                      ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  指标 (Metrics)
                </button>
              </div>

              {/* Copy Current Tab Button */}
              {activeTab !== 'meta' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'output') handleCopy(nodeInfo.outputs, 'tab_output')
                    if (activeTab === 'input') handleCopy(nodeInfo.inputs, 'tab_input')
                    if (activeTab === 'process') handleCopy(nodeInfo.process_data, 'tab_process')
                  }}
                  className="flex items-center space-x-1 text-xs text-gray-500 hover:text-primary-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                >
                  {copiedKey === `tab_${activeTab}` ? (
                    <>
                      <ClipboardCheck className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-green-600 font-medium">已复制</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Tab Contents */}
            <div className="mt-1">
              {activeTab === 'output' && renderDataBody(nodeInfo.outputs)}
              {activeTab === 'input' && renderDataBody(nodeInfo.inputs)}
              {activeTab === 'process' && renderDataBody(nodeInfo.process_data)}
              {activeTab === 'meta' && (
                <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-200 text-xs space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">耗时 (Elapsed Time)</span>
                    <span className="font-mono text-gray-800 font-medium">{getTime(nodeInfo.elapsed_time || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">消耗 Token (Total Tokens)</span>
                    <span className="font-mono text-gray-800 font-medium">{nodeInfo.execution_metadata?.total_tokens || 0}</span>
                  </div>
                  {!!nodeInfo.execution_metadata?.total_price && (
                    <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                      <span className="text-gray-500">预估费用 (Total Cost)</span>
                      <span className="font-mono text-gray-800 font-medium">
                        {nodeInfo.execution_metadata.total_price} {nodeInfo.execution_metadata.currency || 'USD'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">执行状态 (Status)</span>
                    <span className="font-mono text-gray-800 font-medium capitalize">{nodeInfo.status}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">节点 ID (Node ID)</span>
                    <span className="font-mono text-gray-700 text-[11px] select-all">{nodeInfo.node_id}</span>
                  </div>
                  {nodeInfo.id && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500">执行 ID (Execution ID)</span>
                      <span className="font-mono text-gray-700 text-[11px] select-all">{nodeInfo.id}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NodePanel
