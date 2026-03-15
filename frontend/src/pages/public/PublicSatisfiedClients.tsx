import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Spinner,
  Flex,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import api from '../../api/client';
import { getUploadUrl } from '../../utils/uploadUrl';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';

const MotionBox = motion(Box as any);
const PAGE_SIZE = 12;

interface BeforeAfterPair {
  id: string;
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
}

export default function PublicSatisfiedClients() {
  const [items, setItems] = useState<BeforeAfterPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (nextOffset: number, append: boolean) => {
    if (nextOffset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const { data } = await api.get<{ items: BeforeAfterPair[]; hasMore: boolean; nextOffset: number }>(
        '/api/daily-log/before-after',
        { params: { limit: PAGE_SIZE, offset: nextOffset } },
      );
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems((prev) => (append ? [...prev, ...list] : list));
      setHasMore(data?.hasMore ?? false);
      setOffset(data?.nextOffset ?? nextOffset + list.length);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadPage(offset, true);
      },
      { rootMargin: '200px', threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, offset, loadPage]);

  return (
    <Box py={12} bg="gray.50" minH="60vh">
      <Container maxW="container.xl">
        <Box textAlign="center" mb={10}>
          <Text color="brand.500" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" mb={2}>
            Transformacije
          </Text>
          <Heading size="2xl" color="brand.900">
            Zadovoljni klijenti
          </Heading>
          <Text color="gray.600" mt={2} maxW="xl" mx="auto">
            Povucite sliku lijevo ili desno da vidite prije i poslije.
          </Text>
        </Box>
        {loading && items.length === 0 ? (
          <Flex justify="center" py={16}>
            <Spinner size="xl" color="brand.500" thickness="4px" />
          </Flex>
        ) : items.length === 0 ? (
          <Text textAlign="center" color="gray.500" py={12}>
            Nema prikazanih transformacija.
          </Text>
        ) : (
          <>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
              {items.map((pair) => (
                <MotionBox
                  key={pair.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <BeforeAfterSlider
                    beforeSrc={getUploadUrl(pair.before.pathMedium ?? pair.before.pathThumb ?? pair.before.pathOriginal)}
                    afterSrc={getUploadUrl(pair.after.pathMedium ?? pair.after.pathThumb ?? pair.after.pathOriginal)}
                    alt="Prije / Poslije"
                    aspectRatio={1}
                  />
                </MotionBox>
              ))}
            </SimpleGrid>
            <Box ref={sentinelRef} h={4} mt={8} />
            {loadingMore && (
              <Flex justify="center" py={8}>
                <Spinner size="lg" color="brand.500" />
              </Flex>
            )}
          </>
        )}
        <Box textAlign="center" mt={10}>
          <Button as={RouterLink} to="/" variant="outline" colorScheme="brand">
            Nazad na početnu
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
