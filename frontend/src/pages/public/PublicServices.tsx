import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Spinner,
  Text,
  SimpleGrid,
  Flex,
  Badge,
  Link,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../api/client';
import { useSettings } from '../../context/SettingsContext';

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
}

interface ServiceCategory {
  id: string;
  name: string;
  subcategories?: { id: string; name: string; services?: ServiceOption[] }[];
}

const MotionBox = motion(Box as any);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PublicServices() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ServiceCategory[]>('/api/services/categories', { params: { activeOnly: 'true' } })
      .then(async (r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        const withServices = await Promise.all(
          list.map((c) =>
            api.get<ServiceCategory>(`/api/services/categories/${c.id}`).then((res) => res.data)
          )
        );
        setCategories(withServices);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box bg="gray.50" minH="100vh" pt={10} pb={20}>
      {/* HEADER */}
      <Box bg="brand.900" color="white" py={16} mb={12} textAlign="center" position="relative" overflow="hidden">
        <Box
          position="absolute"
          inset={0}
          backgroundImage={`url('${getSetting('public_services_bg', 'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&q=80&w=2000')}')`}
          backgroundSize="cover"
          backgroundPosition="center"
          opacity={0.3}
        />
        <Container maxW="container.lg" position="relative" zIndex={1}>
          <Heading size="2xl" mb={4}>
            {getSetting('public_services_title', 'Naše Frizerske Usluge')}
          </Heading>
          <Text fontSize="lg" color="gray.200">
            {getSetting('public_services_subtitle', 'Bilo da tražite moderno šišanje, spektakularnu boju ili dubinsku njegu kose, naš tim je tu da ispuni vaše želje.')}
          </Text>
        </Container>
      </Box>

      <Container maxW="container.xl">
        {loading ? (
          <Flex justify="center" py={20}>
            <Spinner size="xl" color="brand.500" thickness="4px" />
          </Flex>
        ) : categories.length === 0 ? (
          <Text textAlign="center" color="gray.500" fontSize="lg">{t('common.noData')}</Text>
        ) : (
          <MotionBox variants={containerVariants} initial="hidden" animate="visible">
            {categories.map((cat) => (
              <Box key={cat.id} mb={16}>
                <Heading size="xl" mb={8} color="brand.800" borderBottomWidth="2px" borderColor="brand.200" pb={2} display="inline-block">
                  {cat.name}
                </Heading>

                {cat.subcategories?.length ? (
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
                    {cat.subcategories.map((sub) => (
                      <MotionBox
                        key={sub.id}
                        variants={itemVariants}
                        bg="white"
                        p={6}
                        rounded="2xl"
                        shadow="sm"
                        _hover={{ shadow: 'md' }}
                        transition="all 0.3s"
                      >
                        <Heading size="md" mb={6} color="gray.700">
                          {sub.name}
                        </Heading>
                        {sub.services?.length ? (
                          <Box as="ul" listStyleType="none" m={0} p={0}>
                            {sub.services.map((s) => (
                              <Box
                                as="li"
                                key={s.id}
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                                py={3}
                                borderBottomWidth="1px"
                                borderColor="gray.100"
                                _last={{ borderBottomWidth: 0, pb: 0 }}
                              >
                                <Link
                                  as={RouterLink}
                                  to={`/usluge/${s.id}`}
                                  fontWeight="medium"
                                  color="gray.800"
                                  _hover={{ color: 'brand.600', textDecoration: 'underline' }}
                                >
                                  {s.name}
                                </Link>
                                <Badge colorScheme="brand" variant="subtle" px={2} py={1} rounded="md">
                                  {s.durationMinutes} min
                                </Badge>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Text color="gray.400" fontSize="sm">{t('common.noData')}</Text>
                        )}
                      </MotionBox>
                    ))}
                  </SimpleGrid>
                ) : (
                  <Text color="gray.500">{t('common.noData')}</Text>
                )}
              </Box>
            ))}
          </MotionBox>
        )}
      </Container>
    </Box>
  );
}
