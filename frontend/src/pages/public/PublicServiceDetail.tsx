import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { InfoIcon } from '@chakra-ui/icons'
import api from '../../api/client'
import { getUploadUrl } from '../../utils/uploadUrl'
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider'
import { useSettings } from '../../context/SettingsContext'

type Service = {
  id: string
  name: string
  shortDescription?: string | null
  heroImage?: string | null
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
  const { getSetting } = useSettings()

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
    <Box bg="gray.50" minH="100vh" pb={20}>
      <Box bg="brand.900" color="white" py={{ base: 14, md: 18 }} mb={12} position="relative" overflow="hidden">
        <Box
          position="absolute"
          inset={0}
          backgroundImage={`url('${service.heroImage ? getUploadUrl(service.heroImage) : getSetting('public_services_bg', 'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&q=80&w=2000')}')`}
          backgroundSize="cover"
          backgroundPosition="center"
          opacity={0.3}
        />
        <Box position="absolute" inset={0} bgGradient="linear(to-r, blackAlpha.800, blackAlpha.500)" />
        <Container maxW="container.xl" position="relative" zIndex={1}>
          <Flex align={{ base: 'flex-start', md: 'center' }} justify="space-between" gap={6} wrap="wrap">
            <Box>
              <Text color="brand.300" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" mb={2}>
                Usluga
              </Text>
              <Heading size="2xl" color="white" lineHeight="shorter">
                {service.name}
              </Heading>
              <Flex gap={2} mt={4} wrap="wrap">
                <Badge colorScheme="brand" variant="solid" px={3} py={1} rounded="full">
                  {service.durationMinutes} min
                </Badge>
              </Flex>
              {service.shortDescription ? (
                <Text color="gray.200" mt={4} maxW="3xl">
                  {service.shortDescription}
                </Text>
              ) : null}
            </Box>
            <Flex gap={3} mt={{ base: 4, md: 0 }}>
              <Button
                as={RouterLink}
                to={`/rezervacija?serviceId=${encodeURIComponent(service.id)}`}
                colorScheme="brand"
                _hover={{ transform: 'translateY(-1px)', shadow: 'lg' }}
                transition="all 0.2s"
              >
                Rezerviši
              </Button>
              <Button as={RouterLink} to="/usluge" variant="outline" colorScheme="whiteAlpha">
                Sve usluge
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl">
        {loadingPairs || items.length > 0 ? (
          <Box mb={6}>
            <Heading size="lg" color="gray.800" mb={2}>
              Galerija urađenih radova
            </Heading>
            <Text color="gray.600">
              Povucite sliku lijevo ili desno da vidite prije i poslije.
            </Text>
          </Box>
        ) : null}

        {loadingPairs && items.length === 0 ? (
          <Flex justify="center" py={14}>
            <Spinner size="xl" color="brand.500" thickness="4px" />
          </Flex>
        ) : items.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            py={{ base: 14, md: 20 }}
            bg="white"
            rounded="2xl"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <Flex
              w="56px"
              h="56px"
              rounded="full"
              align="center"
              justify="center"
              bg="brand.50"
              borderWidth="1px"
              borderColor="brand.100"
              mb={4}
            >
              <Icon as={InfoIcon} color="brand.500" boxSize={6} />
            </Flex>
            <Text color="gray.600" textAlign="center" maxW="lg" px={6}>
              Trenutno nema objavljenih urađenih radova za ovaj servis.
            </Text>
          </Flex>
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

