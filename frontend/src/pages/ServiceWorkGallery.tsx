import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
} from '@chakra-ui/react'
import api from '../api/client'
import { getUploadUrl } from '../utils/uploadUrl'
import { BeforeAfterSlider } from '../components/BeforeAfterSlider'

type Service = {
  id: string
  name: string
  shortDescription?: string | null
  durationMinutes: number
}

type BeforeAfterPair = {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  service?: { id: string; name: string }
  completedAt?: string | null
}

const PAGE_SIZE = 18

export default function ServiceWorkGallery() {
  const { serviceId } = useParams()
  const id = useMemo(() => (serviceId ?? '').trim(), [serviceId])

  const [service, setService] = useState<Service | null>(null)
  const [loadingService, setLoadingService] = useState(true)

  const [items, setItems] = useState<BeforeAfterPair[]>([])
  const [loadingPairs, setLoadingPairs] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadService = useCallback(async () => {
    if (!id) {
      setService(null)
      setLoadingService(false)
      return
    }
    setLoadingService(true)
    try {
      const { data } = await api.get<Service>(`/api/services/${id}`)
      setService(data)
    } catch {
      setService(null)
    } finally {
      setLoadingService(false)
    }
  }, [id])

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!id) return
      if (nextOffset === 0) setLoadingPairs(true)
      else setLoadingMore(true)
      try {
        const { data } = await api.get<{
          items: BeforeAfterPair[]
          hasMore: boolean
          nextOffset: number
        }>('/api/daily-log/before-after', {
          params: { serviceId: id, limit: PAGE_SIZE, offset: nextOffset },
        })
        const list = Array.isArray(data?.items) ? data.items : []
        setItems((prev) => (append ? [...prev, ...list] : list))
        setHasMore(data?.hasMore ?? false)
        setOffset(data?.nextOffset ?? nextOffset + list.length)
      } catch {
        setHasMore(false)
      } finally {
        setLoadingPairs(false)
        setLoadingMore(false)
      }
    },
    [id],
  )

  useEffect(() => {
    void loadService()
  }, [loadService])

  useEffect(() => {
    setItems([])
    setOffset(0)
    setHasMore(true)
    if (id) void loadPage(0, false)
  }, [id, loadPage])

  useEffect(() => {
    if (!hasMore || loadingMore || loadingPairs) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadPage(offset, true)
      },
      { rootMargin: '200px', threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadingPairs, offset, loadPage])

  if (loadingService) {
    return (
      <Flex justify="center" py={14}>
        <Spinner size="xl" />
      </Flex>
    )
  }

  return (
    <Box>
      <Flex align="flex-start" justify="space-between" gap={4} wrap="wrap" mb={6}>
        <Box>
          <Heading size="lg">Urađeni radovi</Heading>
          <Text color="gray.600" mt={1}>
            {service ? service.name : 'Servis'}
          </Text>
          {service ? (
            <Flex gap={2} mt={3} wrap="wrap">
              <Badge colorScheme="purple" variant="subtle">
                {service.durationMinutes} min
              </Badge>
            </Flex>
          ) : null}
        </Box>
        <Button as={RouterLink} to="/admin/services" variant="outline">
          Nazad
        </Button>
      </Flex>

      {loadingPairs && items.length === 0 ? (
        <Flex justify="center" py={14}>
          <Spinner size="xl" />
        </Flex>
      ) : items.length === 0 ? (
        <Text color="gray.500" py={10}>
          Nema available before/after transformacija za ovaj servis.
        </Text>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
            {items.map((pair) => (
              <Box key={pair.id}>
                <BeforeAfterSlider
                  beforeSrc={getUploadUrl(
                    pair.before.pathMedium ?? pair.before.pathThumb ?? pair.before.pathOriginal,
                  )}
                  afterSrc={getUploadUrl(
                    pair.after.pathMedium ?? pair.after.pathThumb ?? pair.after.pathOriginal,
                  )}
                  alt="Prije / Poslije"
                  aspectRatio={1}
                />
              </Box>
            ))}
          </SimpleGrid>
          <Box ref={sentinelRef} h={4} mt={8} />
          {loadingMore ? (
            <Flex justify="center" py={8}>
              <Spinner size="lg" />
            </Flex>
          ) : null}
        </>
      )}
    </Box>
  )
}

