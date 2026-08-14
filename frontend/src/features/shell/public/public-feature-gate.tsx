import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSettings } from '../../../context/SettingsContext'
import { isPublicFeatureOn } from './public-features'

export function PublicFeatureGate({
  flag,
  children,
}: {
  flag: 'public_feature_blog' | 'public_feature_gallery' | 'public_feature_reviews'
  children: ReactNode
}) {
  const { getSetting, loading } = useSettings()
  if (loading) return null
  if (!isPublicFeatureOn(getSetting, flag)) return <Navigate to="/" replace />
  return children
}
