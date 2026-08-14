import { useEffect, useState, type ReactNode } from 'react'
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native'
import { Image, type ImageProps } from 'expo-image'

import { MEDIA_FALLBACK } from '../constants/media-fallback'

type MediaImageProps = Omit<ImageProps, 'source'> & {
  uri?: string | null
}

export const MediaImage = ({ uri, contentFit = 'cover', onError, ...props }: MediaImageProps) => {
  const [failed, setFailed] = useState(false)
  const remote = uri?.trim() ?? ''
  const source = !remote || failed ? MEDIA_FALLBACK : { uri: remote }
  useEffect(() => {
    setFailed(false)
  }, [remote])
  return (
    <Image
      {...props}
      source={source}
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
