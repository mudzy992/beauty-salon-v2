export type RescheduleMode = 'actual_overrun' | 'manual_minutes' | 'use_break_only'

export interface RescheduleProposalItem {
  id: string
  clientId: string
  serviceName: string
  clientName: string
  oldStartTime: string
  oldEndTime: string
  newStartTime: string
  newEndTime: string
  shiftMinutes: number
  reducedBreakMinutes?: number
}

export interface RescheduleProposal {
  mode?: RescheduleMode
  overrunMinutes?: number
  delayMinutes: number
  shiftMinutes: number
  includeBreaks?: boolean
  items: RescheduleProposalItem[]
}

export declare function normalizeRescheduleProposal(value: unknown): RescheduleProposal | null
