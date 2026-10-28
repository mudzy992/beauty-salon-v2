import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { renameFileForLabel } from './expense-attachment-match'
import { uploadExpenseFile } from '../api/expense-books.api'
import type { PendingAtt } from './expense-form-state'

type Params = {
  fieldAttachments: Record<string, PendingAtt>
  lineAttachments: (PendingAtt | null)[]
  lineItemsLength: number
  onFieldAttachments: (next: Record<string, PendingAtt>) => void
  onLineAttachments: (next: (PendingAtt | null)[]) => void
  onError: (err: unknown, message: string) => void
}

export const useExpenseUploads = (params: Params) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingUploads, setPendingUploads] = useState<{ id: string; name: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadOne = async (file: File) => {
    const id = await uploadExpenseFile(file)
    return { id, name: file.name }
  }

  const handleBulkFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setIsUploading(true)
    try {
      const uploaded = await Promise.all(Array.from(files).map((file) => uploadOne(file)))
      setPendingUploads((prev) => [...prev, ...uploaded])
    } catch (err) {
      params.onError(err, t('finance.expenseForm.uploadFailed'))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFieldUpload = async (fieldId: string, fieldName: string, file: File) => {
    setIsUploading(true)
    try {
      const uploaded = await uploadOne(renameFileForLabel(file, fieldName))
      params.onFieldAttachments({
        ...params.fieldAttachments,
        [fieldId]: { uploadId: uploaded.id, name: uploaded.name },
      })
    } catch (err) {
      params.onError(err, t('finance.expenseForm.uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleLineUpload = async (index: number, name: string, file: File) => {
    setIsUploading(true)
    try {
      const uploaded = await uploadOne(renameFileForLabel(file, name))
      const next = [...params.lineAttachments]
      while (next.length < params.lineItemsLength) next.push(null)
      next[index] = { uploadId: uploaded.id, name: uploaded.name }
      params.onLineAttachments(next)
    } catch (err) {
      params.onError(err, t('finance.expenseForm.uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  const resetPending = () => setPendingUploads([])

  return {
    fileInputRef,
    pendingUploads,
    setPendingUploads,
    isUploading,
    handleBulkFiles,
    handleFieldUpload,
    handleLineUpload,
    resetPending,
  }
}
