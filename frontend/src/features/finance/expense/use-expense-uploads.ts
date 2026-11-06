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
  const activeUploadsRef = useRef(0)
  const pendingGenerationRef = useRef(0)
  const [pendingUploads, setPendingUploads] = useState<{ id: string; name: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const beginUpload = () => {
    activeUploadsRef.current += 1
    setIsUploading(true)
  }

  const endUpload = () => {
    activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1)
    setIsUploading(activeUploadsRef.current > 0)
  }

  const uploadOne = async (file: File) => {
    const id = await uploadExpenseFile(file)
    return { id, name: file.name }
  }

  const handleBulkFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const generation = pendingGenerationRef.current
    beginUpload()
    try {
      const results = await Promise.allSettled(Array.from(files).map((file) => uploadOne(file)))
      if (generation !== pendingGenerationRef.current) return

      const uploaded = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      )
      if (uploaded.length) setPendingUploads((prev) => [...prev, ...uploaded])

      const failed = results.find((result) => result.status === 'rejected')
      if (failed?.status === 'rejected') {
        params.onError(failed.reason, t('finance.expenseForm.uploadFailed'))
      }
    } catch (err) {
      if (generation === pendingGenerationRef.current) {
        params.onError(err, t('finance.expenseForm.uploadFailed'))
      }
    } finally {
      endUpload()
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFieldUpload = async (fieldId: string, fieldName: string, file: File) => {
    const generation = pendingGenerationRef.current
    beginUpload()
    try {
      const uploaded = await uploadOne(renameFileForLabel(file, fieldName))
      if (generation !== pendingGenerationRef.current) return
      params.onFieldAttachments({
        ...params.fieldAttachments,
        [fieldId]: { uploadId: uploaded.id, name: uploaded.name },
      })
    } catch (err) {
      if (generation === pendingGenerationRef.current) {
        params.onError(err, t('finance.expenseForm.uploadFailed'))
      }
    } finally {
      endUpload()
    }
  }

  const handleLineUpload = async (index: number, name: string, file: File) => {
    const generation = pendingGenerationRef.current
    beginUpload()
    try {
      const uploaded = await uploadOne(renameFileForLabel(file, name))
      if (generation !== pendingGenerationRef.current) return
      const next = [...params.lineAttachments]
      while (next.length < params.lineItemsLength) next.push(null)
      next[index] = { uploadId: uploaded.id, name: uploaded.name }
      params.onLineAttachments(next)
    } catch (err) {
      if (generation === pendingGenerationRef.current) {
        params.onError(err, t('finance.expenseForm.uploadFailed'))
      }
    } finally {
      endUpload()
    }
  }

  const resetPending = () => {
    pendingGenerationRef.current += 1
    setPendingUploads([])
  }

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
