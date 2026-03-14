import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Heading, Spinner, Text, SimpleGrid, Link, Flex, Icon } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowForwardIcon, CalendarIcon } from '@chakra-ui/icons';
import api from '../../api/client';
import { useSettings } from '../../context/SettingsContext';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

const MotionBox = motion(Box as any);

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PublicBlogList() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<BlogPost[]>('/api/blog', { params: { published: 'true' } })
      .then((r) => setPosts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box bg="gray.50" minH="100vh" pt={10} pb={20}>
      <Box bg="white" py={16} mb={12} borderBottomWidth="1px" borderColor="gray.200" textAlign="center" position="relative" overflow="hidden">
        <Box
          position="absolute"
          inset={0}
          backgroundImage={`url('${getSetting('public_blog_bg', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=2000')}')`}
          backgroundSize="cover"
          backgroundPosition="center"
          opacity={0.1}
        />
        <Container maxW="container.lg" position="relative" zIndex={1}>
          <Text color="brand.500" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" mb={2}>
            {getSetting('public_blog_subtitle', 'Novosti & Savjeti')}
          </Text>
          <Heading size="2xl" color="brand.900">
            {getSetting('public_blog_title', 'Naš Frizerski Blog')}
          </Heading>
        </Container>
      </Box>

      <Container maxW="container.lg">
        {loading ? (
          <Flex justify="center" py={20}>
            <Spinner size="xl" color="brand.500" thickness="4px" />
          </Flex>
        ) : posts.length === 0 ? (
          <Text textAlign="center" color="gray.500" fontSize="lg">{t('common.noData')}</Text>
        ) : (
          <MotionBox variants={stagger} initial="hidden" animate="visible">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
              {posts.map((p) => (
                <MotionBox
                  key={p.id}
                  variants={fadeUp}
                  bg="white"
                  rounded="2xl"
                  overflow="hidden"
                  shadow="sm"
                  _hover={{ shadow: 'lg', transform: 'translateY(-4px)' }}
                  transition="all 0.3s"
                >
                  <Link as={RouterLink} to={`/blog/${p.slug}`} _hover={{ textDecoration: 'none' }} display="block" p={8}>
                    <Flex align="center" gap={2} color="gray.500" fontSize="sm" mb={3}>
                      <Icon as={CalendarIcon} />
                      <Text>{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('bs-BA') : ''}</Text>
                    </Flex>
                    <Heading size="md" mb={4} color="gray.800" lineHeight="tall">
                      {p.title}
                    </Heading>
                    <Flex align="center" color="brand.500" fontWeight="semibold" fontSize="sm">
                      Pročitaj više <Icon as={ArrowForwardIcon} ml={2} />
                    </Flex>
                  </Link>
                </MotionBox>
              ))}
            </SimpleGrid>
          </MotionBox>
        )}
      </Container>
    </Box>
  );
}
