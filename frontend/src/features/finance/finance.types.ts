export interface IncomeBook {
  id: string
  year: number
  month: number
  totalRevenue: number | string
  totalTips: number | string
  openedAt: string
  closedAt: string | null
  entries?: IncomeEntry[]
  manualEntries?: IncomeBookManualEntry[]
  lockEvents?: IncomeBookLockEvent[]
  manualAudits?: IncomeBookManualEntryAudit[]
}

export interface IncomeEntry {
  id: string
  amount: number | string
  tipAmount: number | string
  date: string
  dailyLogEntryId: string
  dailyLogEntry?: {
    id: string
    date: string
    actualPrice: number | string
    tipAmount: number | string
    notes: string | null
    status: string
    isManual: boolean
    service?: { name: string }
    stylistProfile?: { user?: { username: string; firstName: string | null; lastName: string | null } }
    client?: { user?: { username: string } }
  }
}

export interface IncomeBookManualEntry {
  id: string
  date: string
  serviceId: string
  stylistProfileId: string | null
  clientId?: string | null
  amount: number | string
  tipAmount: number | string
  notes: string | null
  createdAt: string
  updatedAt: string
  service?: { id: string; name: string }
  stylistProfile?: { id: string; user?: { username: string; firstName: string | null; lastName: string | null } }
  client?: {
    id: string
    username: string
    firstName: string | null
    lastName: string | null
    gender?: 'MALE' | 'FEMALE' | null
  }
  createdBy?: { id: string; username: string }
}

export interface IncomeBookLockEvent {
  id: string
  action: string
  reason: string | null
  createdAt: string
  createdBy?: { id: string; username: string }
}

export interface IncomeBookManualEntryAudit {
  id: string
  manualEntryId: string | null
  action: string
  beforeJson: unknown | null
  afterJson: unknown | null
  createdAt: string
  createdBy?: { id: string; username: string }
}

export interface ServiceOption {
  id: string
  name: string
  price?: number | string
  gender?: 'MALE' | 'FEMALE'
}

export interface StylistOption {
  id: string
  user?: { username: string; firstName: string | null; lastName: string | null }
}

export interface ClientOption {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  gender?: 'MALE' | 'FEMALE' | null
}

export interface ExpenseBook {
  id: string
  year: number
  month: number
  isClosed: boolean
  openedAt: string
  closedAt: string | null
  lockEvents?: {
    id: string
    action: string
    reason: string | null
    createdAt: string
    createdBy?: { id: string; username: string }
  }[]
}

export interface ExpenseTemplate {
  id: string
  name: string
  description: string | null
  requiresAttachmentPerItem: boolean
  fields?: TemplateField[]
}

export interface TemplateField {
  id: string
  fieldName: string
  fieldType: string
  isRequired: boolean
  sortOrder: number
  defaultValue: string | null
}

export interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  isActive: boolean
  isFixed: boolean
  templateId: string
  template?: ExpenseTemplate
}

export interface ExpenseAttachment {
  id: string
  description: string | null
  upload?: { id: string; pathOriginal: string; pathThumb: string; originalName: string }
}

export interface Expense {
  id: string
  title: string
  totalAmount: number | string
  notes: string | null
  createdAt: string
  category?: ExpenseCategory
  fieldValues?: {
    id: string
    fieldId: string
    value: string
    field?: { fieldName: string; fieldType: string; defaultValue?: string | null }
  }[]
  attachments?: ExpenseAttachment[]
}

export type LineItem = { name: string; qty: number; price: number }

