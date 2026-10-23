import { useEffect, useState, type ReactNode } from 'react'
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native'
import { Image, type ImageProps } from 'expo-image'

import { MEDIA_FALLBACK } from '../constants/media-fallback'
import { useAuthStore } from '../store/authStore'

type MediaImageProps = Omit<ImageProps, 'source'> & {
  uri?: string | null
}

export const MediaImage = ({ uri, contentFit = 'cover', onError, ...props }: MediaImageProps) => {
  const [failed, setFailed] = useState(false)
  const token = useAuthStore((state) => state.token)
  const remote = uri?.trim() ?? ''
  const isProtected =
    remote.includes('/api/uploads/content?') ||
    remote.includes('/api/media/consents/')
  const source =
    !remote || failed
      ? MEDIA_FALLBACK
      : {
          uri: remote,
          ...(remote.includes('/api/uploads/content?') && token
            ? { headers: { Authorization: `Bearer ${token}` } }
            : {}),
        }
  useEffect(() => {
    setFailed(false)
  }, [remote])
  return (
    <Image
      {...props}
      source={source}
      cachePolicy={isProtected ? 'none' : 'memory-disk'}
      contentFit={contentFit}
      onError={(event) => {
        if (!remote || failed) return
        setFailed(true)
        onError?.(event)
      }}
    />
  )
}

type MediaBackdropProps = {
  uri?: string | null
  style?: StyleProp<ViewStyle>
  imageStyle?: StyleProp<ImageStyle>
  children?: ReactNode
}

export const MediaBackdrop = ({ uri, style, imageStyle, children }: MediaBackdropProps) => (
  <View style={[style, styles.backdrop]}>
    <MediaImage uri={uri} style={[StyleSheet.absoluteFill, imageStyle]} />
    {children}
  </View>
)

const styles = StyleSheet.create({
  backdrop: { overflow: 'hidden' },
})
