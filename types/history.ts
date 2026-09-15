import type { WorkflowProcess } from './app'

export type WorkflowHistoryItem = {
  id: string
  appId: string
  createdAt: number
  title: string
  inputs: Record<string, any>
  outputs: string
  status: 'succeeded' | 'failed'
  workflowProcessData?: WorkflowProcess
  totalDuration?: number
  totalTokens?: number
}
