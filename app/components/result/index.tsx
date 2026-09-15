'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { useBoolean } from 'ahooks'
import { t } from 'i18next'
import produce from 'immer'
import cn from 'classnames'
import NoData from '../no-data'
import TextGenerationRes from './item'
import Toast from '@/app/components/base/toast'
import { sendCompletionMessage, sendWorkflowMessage, updateFeedback } from '@/service'
import type { Feedbacktype, PromptConfig, VisionFile, VisionSettings, WorkflowProcess } from '@/types/app'
import { NodeRunningStatus, TransferMethod, WorkflowRunningStatus } from '@/types/app'
import Loading from '@/app/components/base/loading'
import { sleep } from '@/utils'
import { ClockIcon } from '@heroicons/react/24/outline'
import type { WorkflowHistoryItem } from '@/types/history'
import { extractHistoryTitle, formatExactTime } from '@/utils/history-storage'
import { APP_ID } from '@/config'

export type IResultProps = {
  isWorkflow: boolean
  isCallBatchAPI: boolean
  isPC: boolean
  isMobile: boolean
  isError: boolean
  promptConfig: PromptConfig | null
  inputs: Record<string, any>
  controlSend?: number
  controlRetry?: number
  controlStopResponding?: number
  onShowRes: () => void
  taskId?: number
  onCompleted: (completionRes: string, taskId?: number, success?: boolean) => void
  visionConfig: VisionSettings
  completionFiles: VisionFile[]
  historyItem?: WorkflowHistoryItem | null
  onExitHistory?: () => void
  onWorkflowRunFinished?: (item: WorkflowHistoryItem) => void
}

const Result: FC<IResultProps> = ({
  isWorkflow,
  isCallBatchAPI,
  isPC,
  isMobile,
  isError,
  promptConfig,
  inputs,
  controlSend,
  controlRetry,
  controlStopResponding,
  onShowRes,
  taskId,
  onCompleted,
  visionConfig,
  completionFiles,
  historyItem,
  onExitHistory,
  onWorkflowRunFinished,
}) => {
  const [isResponsing, { setTrue: setResponsingTrue, setFalse: setResponsingFalse }] = useBoolean(false)
  useEffect(() => {
    if (controlStopResponding)
      setResponsingFalse()
  }, [controlStopResponding])

  const [completionRes, doSetCompletionRes] = useState('')
  const completionResRef = useRef('')
  const setCompletionRes = (res: string) => {
    completionResRef.current = res
    doSetCompletionRes(res)
  }
  const getCompletionRes = () => completionResRef.current
  const [workflowProcessData, doSetWorkflowProccessData] = useState<WorkflowProcess>()
  const workflowProcessDataRef = useRef<WorkflowProcess>()
  const setWorkflowProccessData = (data: WorkflowProcess) => {
    workflowProcessDataRef.current = data
    doSetWorkflowProccessData(data)
  }
  const getWorkflowProccessData = () => workflowProcessDataRef.current

  const activeCompletionRes = historyItem ? historyItem.outputs : completionRes
  const activeProcessData = historyItem ? historyItem.workflowProcessData : workflowProcessData

  const { notify } = Toast
  const isNoData = !completionRes

  const [messageId, setMessageId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedbacktype>({
    rating: null,
  })

  const handleFeedback = async (feedback: Feedbacktype) => {
    await updateFeedback({ url: `/messages/${messageId}/feedbacks`, body: { rating: feedback.rating } })
    setFeedback(feedback)
  }

  const logError = (message: string) => {
    notify({ type: 'error', message })
  }

  const checkCanSend = () => {
    // batch will check outer
    if (isCallBatchAPI)
      return true

    const prompt_variables = promptConfig?.prompt_variables
    if (!prompt_variables || prompt_variables?.length === 0)
      return true

    let hasEmptyInput = ''
    const requiredVars = prompt_variables?.filter(({ key, name, required }) => {
      const res = (!key || !key.trim()) || (!name || !name.trim()) || (required || required === undefined || required === null)
      return res
    }) || [] // compatible with old version
    requiredVars.forEach(({ key, name }) => {
      if (hasEmptyInput)
        return

      if (!inputs[key])
        hasEmptyInput = name
    })

    if (hasEmptyInput) {
      logError(t('appDebug.errorMessage.valueOfVarRequired', { key: hasEmptyInput }))
      return false
    }
    if (completionFiles.find(item => item.transfer_method === TransferMethod.local_file && !item.upload_file_id)) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForImgUpload') })
      return false
    }
    return !hasEmptyInput
  }

  const handleSend = async () => {
    if (isResponsing) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForResponse') })
      return false
    }

    if (!checkCanSend())
      return

    const data: Record<string, any> = {
      inputs,
    }
    if (visionConfig.enabled && completionFiles && completionFiles?.length > 0) {
      data.files = completionFiles.map((item) => {
        if (item.transfer_method === TransferMethod.local_file) {
          return {
            ...item,
            url: '',
          }
        }
        return item
      })
    }

    setMessageId(null)
    setFeedback({
      rating: null,
    })
    setCompletionRes('')

    const res: string[] = []
    let tempMessageId = ''

    if (!isPC)
      onShowRes()

    setResponsingTrue()
    let isEnd = false
    let isTimeout = false;
    (async () => {
      await sleep(1000 * 60) // 1min timeout
      if (!isEnd) {
        setResponsingFalse()
        onCompleted(getCompletionRes(), taskId, false)
        isTimeout = true
      }
    })()

    if (isWorkflow) {
      sendWorkflowMessage(
        data,
        {
          onWorkflowStarted: ({ workflow_run_id }) => {
            tempMessageId = workflow_run_id
            setWorkflowProccessData({
              status: WorkflowRunningStatus.Running,
              tracing: [],
              expand: false,
            })
            setResponsingFalse()
          },
          onNodeStarted: ({ data }) => {
            setWorkflowProccessData(produce(getWorkflowProccessData()!, (draft) => {
              draft.expand = true
              draft.tracing!.push({
                ...data,
                status: NodeRunningStatus.Running,
                expand: true,
              } as any)
            }))
          },
          onNodeFinished: ({ data }) => {
            setWorkflowProccessData(produce(getWorkflowProccessData()!, (draft) => {
              const currentIndex = draft.tracing!.findIndex(trace => trace.node_id === data.node_id)
              if (currentIndex > -1 && draft.tracing) {
                draft.tracing[currentIndex] = {
                  ...(draft.tracing[currentIndex].extras
                    ? { extras: draft.tracing[currentIndex].extras }
                    : {}),
                  ...data,
                  expand: !!data.error,
                } as any
              }
            }))
          },
          onWorkflowFinished: ({ data }) => {
            if (isTimeout)
              return
            if (data.error) {
              notify({ type: 'error', message: data.error })
              setResponsingFalse()
              onCompleted(getCompletionRes(), taskId, false)
              if (onWorkflowRunFinished) {
                onWorkflowRunFinished({
                  id: data.id || tempMessageId || `${Date.now()}`,
                  appId: APP_ID || 'default',
                  createdAt: Date.now(),
                  title: extractHistoryTitle(inputs),
                  inputs: { ...inputs },
                  outputs: data.error,
                  status: 'failed',
                  workflowProcessData: getWorkflowProccessData(),
                  totalDuration: data.elapsed_time,
                  totalTokens: data.total_tokens,
                })
              }
              isEnd = true
              return
            }
            const currentData = getWorkflowProccessData()
            const finalProcessData = currentData ? produce(currentData, (draft) => {
              draft.status = WorkflowRunningStatus.Succeeded
            }) : undefined

            if (finalProcessData)
              setWorkflowProccessData(finalProcessData)

            let outputText = ''
            if (!data.outputs)
              outputText = ''
            else if (typeof data.outputs === 'string')
              outputText = data.outputs
            else if (Object.keys(data.outputs).length > 1)
              outputText = JSON.stringify(data.outputs, null, 2)
            else
              outputText = data.outputs[Object.keys(data.outputs)[0]]

            setCompletionRes(outputText)
            setResponsingFalse()
            setMessageId(tempMessageId)
            onCompleted(outputText, taskId, true)

            if (onWorkflowRunFinished) {
              onWorkflowRunFinished({
                id: data.id || tempMessageId || `${Date.now()}`,
                appId: APP_ID || 'default',
                createdAt: data.created_at ? (data.created_at > 1e11 ? data.created_at : data.created_at * 1000) : Date.now(),
                title: extractHistoryTitle(inputs),
                inputs: { ...inputs },
                outputs: outputText,
                status: 'succeeded',
                workflowProcessData: finalProcessData,
                totalDuration: data.elapsed_time,
                totalTokens: data.total_tokens,
              })
            }
            isEnd = true
          },
        },
      )
    }
    else {
      sendCompletionMessage(data, {
        onData: (data: string, _isFirstMessage: boolean, { messageId }) => {
          tempMessageId = messageId
          res.push(data)
          setCompletionRes(res.join(''))
        },
        onCompleted: () => {
          if (isTimeout)
            return

          setResponsingFalse()
          setMessageId(tempMessageId)
          onCompleted(getCompletionRes(), taskId, true)
          isEnd = true
        },
        onError() {
          if (isTimeout)
            return

          setResponsingFalse()
          onCompleted(getCompletionRes(), taskId, false)
          isEnd = true
        },
      })
    }
  }

  useEffect(() => {
    if (controlSend)
      handleSend()
  }, [controlSend])

  useEffect(() => {
    if (controlRetry)
      handleSend()
  }, [controlRetry])

  const renderTextGenerationRes = () => (
    <TextGenerationRes
      isWorkflow={isWorkflow}
      workflowProcessData={activeProcessData}
      className='mt-1'
      isError={isError || (historyItem?.status === 'failed')}
      onRetry={handleSend}
      content={activeCompletionRes}
      messageId={historyItem ? historyItem.id : messageId}
      isInWebApp
      onFeedback={handleFeedback}
      feedback={feedback}
      isMobile={isMobile}
      isLoading={isCallBatchAPI ? (!activeCompletionRes && isResponsing) : false}
      taskId={isCallBatchAPI ? ((taskId as number) < 10 ? `0${taskId}` : `${taskId}`) : undefined}
    />
  )

  const hasContent = !!activeCompletionRes || !!activeProcessData

  return (
    <div className={cn(!hasContent && !isCallBatchAPI && 'h-full')}>
      {!isCallBatchAPI && (
        (isResponsing && !activeCompletionRes)
          ? (
            <div className='flex h-full w-full justify-center items-center'>
              <Loading type='area' />
            </div>)
          : (
            <>
              {!hasContent
                ? <NoData />
                : (
                  <div className='flex flex-col h-full'>
                    {historyItem && (
                      <div className='flex items-center justify-between px-3.5 py-2 mb-2 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-900 shrink-0 shadow-xs'>
                        <div className='flex items-center gap-2 overflow-hidden'>
                          <ClockIcon className='w-4 h-4 text-amber-600 shrink-0' />
                          <span className='truncate'>
                            正在查看历史快照：<strong className='font-semibold'>{historyItem.title}</strong>
                            <span className='ml-1 text-amber-600 font-normal'>（{formatExactTime(historyItem.createdAt)}）</span>
                          </span>
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          <button
                            type='button'
                            onClick={onExitHistory}
                            className='px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-medium hover:bg-amber-100/60 transition-colors shadow-2xs'
                          >
                            返回实时视图
                          </button>
                        </div>
                      </div>
                    )}
                    {renderTextGenerationRes()}
                  </div>
                )
              }
            </>
          )
      )}
      {isCallBatchAPI && (
        <div className='mt-2'>
          {renderTextGenerationRes()}
        </div>
      )}
    </div>
  )
}
export default React.memo(Result)
