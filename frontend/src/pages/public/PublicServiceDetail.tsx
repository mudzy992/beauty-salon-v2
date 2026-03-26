import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
} from '@chakra-ui/react'
import api from '../../api/client'
import { getUploadUrl } from '../../utils/uploadUrl'
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider'

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

const PAGE_SIZE = 12

export default function PublicServiceDetail() {
  const { serviceId } = useParams()
  const [service, setService] = useState<Service | null>(null)
  const [loadingService, setLoadingService] = useState(true)

  const [items, setItems] = useState<BeforeAfterPair[]>([])
  const [loadingPairs, setLoadingPairs] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const id = useMemo(() => (serviceId ?? '').trim(), [serviceId])

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
      <Box py={16}>
        <Flex justify="center">
          <Spinner size="xl" color="brand.500" thickness="4px" />
        </Flex>
      </Box>
    )
  }

  if (!service) {
    return (
      <Box py={16}>
        <Container maxW="container.lg">
          <Heading size="lg" mb={3}>
            Servis nije pronađen
          </Heading>
          <Text color="gray.600" mb={6}>
            Molimo provjerite link ili se vratite na listu usluga.
          </Text>
          <Button as={RouterLink} to="/usluge" variant="outline" colorScheme="brand">
            Nazad na usluge
          </Button>
        </Container>
      </Box>
    )
  }

  return (
    <Box bg="gray.50" minH="100vh" pt={10} pb={20}>
      <Container maxW="container.xl">
        <Flex align="flex-start" justify="space-between" gap={6} wrap="wrap" mb={10}>
          <Box>
            <Text color="brand.500" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" mb={2}>
              Usluga
            </Text>
            <Heading size="2xl" color="brand.900">
              {service.name}
            </Heading>
            <Flex gap={2} mt={3} wrap="wrap">
              <Badge colorScheme="brand" variant="subtle" px={2} py={1} rounded="md">
                {service.durationMinutes} min
              </Badge>
            </Flex>
            {service.shortDescription ? (
              <Text color="gray.600" mt={4} maxW="3xl">
                {service.shortDescription}
              </Text>
            ) : null}
          </Box>
          <Flex gap={3} mt={{ base: 4, md: 0 }}>
            <Button as={RouterLink} to="/rezervacija" colorScheme="brand">
              Rezerviši
            </Button>
            <Button as={RouterLink} to="/usluge" variant="outline" colorScheme="brand">
              Sve usluge
            </Button>
          </Flex>
        </Flex>

        <Box mb={6}>
          <Heading size="lg" color="gray.800" mb={2}>
            Galerija urađenih radova
          </Heading>
          <Text color="gray.600">
            Povucite sliku lijevo ili desno da vidite prije i poslije.
          </Text>
        </Box>

        {loadingPairs && items.length === 0 ? (
          <Flex justify="center" py={14}>
            <Spinner size="xl" color="brand.500" thickness="4px" />
          </Flex>
        ) : items.length === 0 ? (
          <Text color="gray.500" py={10}>
            Nema dostupnih before/after transformacija za ovaj servis.
          </Text>
        ) : (
          <>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
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
                <Spinner size="lg" color="brand.500" />
              </Flex>
            ) : null}
          </>
        )}
      </Container>
    </Box>
  )
}

