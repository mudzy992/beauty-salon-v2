import { useEffect, useState } from 'react';
import { Box, Container, Heading, Spinner, Text, SimpleGrid, Image, Flex, Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, useDisclosure, Link } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { getUploadUrl } from '../../utils/uploadUrl';

interface GalleryImage {
  id: string;
  uploadId: string;
  sortOrder: number;
  upload?: { pathOriginal: string; pathThumb?: string | null; pathMedium?: string | null };
}

interface GalleryCategory {
  id: string;
  name: string;
  sortOrder: number;
  images?: GalleryImage[];
}

const MotionBox = motion(Box as any);

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

export default function PublicGallery() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<GalleryCategory[]>('/api/gallery/categories')
      .then(async (r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        const withImages = await Promise.all(
          list.map((c) =>
            api.get<GalleryCategory>(`/api/gallery/categories/${c.id}`).then((res) => res.data)
          )
        );
        setCategories(withImages);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);


  return (
    <Box bg="gray.50" minH="100vh" pt={10} pb={20}>
      <Box bg="brand.900" color="white" py={16} mb={12} textAlign="center" position="relative" overflow="hidden">
        <Box
          position="absolute"
          inset={0}
          backgroundImage={`url('${getSetting('public_gallery_bg', 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&q=80&w=2000')}')`}
          backgroundSize="cover"
          backgroundPosition="center"
          opacity={0.3}
        />
        <Container maxW="container.lg" position="relative" zIndex={1}>
          <Heading size="2xl" mb={4}>
            {getSetting('public_gallery_title', 'Galerija Naših Radova')}
          </Heading>
          <Text fontSize="lg" color="gray.200">
            {getSetting('public_gallery_subtitle', 'Zavirite u naš svijet ljepote i uvjerite se u stručnost naših frizera i stilista.')}
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
          <MotionBox variants={stagger} initial="hidden" animate="visible">
            {categories.map((cat) => (
              <Box key={cat.id} mb={16}>
                <Heading size="lg" mb={8} color="gray.800" borderLeftWidth="4px" borderColor="brand.400" pl={4}>
                  {cat.name}
                </Heading>
                
                {cat.images?.length ? (
                  <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
                    {cat.images
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((img) => {
                        const thumbUrl = img.upload
                          ? getUploadUrl(img.upload.pathMedium || img.upload.pathThumb || img.upload.pathOriginal)
                          : '';
                        const originalUrl = img.upload ? getUploadUrl(img.upload.pathOriginal) : '';
                        return (
                          <MotionBox
                            key={img.id}
                            variants={fadeScale}
                            overflow="hidden"
                            rounded="xl"
                            bg="gray.100"
                            aspectRatio={1}
                            shadow="sm"
                            role="group"
                            position="relative"
                            cursor="pointer"
                            onClick={() => {
                              if (originalUrl) {
                                setLightboxSrc(originalUrl);
                                onOpen();
                              }
                            }}
                          >
                            {thumbUrl ? (
                              <Image
                                src={thumbUrl}
                                alt=""
                                objectFit="cover"
                                w="full"
                                h="full"
                                transition="transform 0.5s ease"
                                _groupHover={{ transform: 'scale(1.05)' }}
                              />
                            ) : (
                              <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center">
                                <Text color="gray.400">—</Text>
                              </Box>
                            )}
                            <Box
                              position="absolute"
                              inset={0}
                              bg="blackAlpha.400"
                              opacity={0}
                              transition="opacity 0.3s"
                              _groupHover={{ opacity: 1 }}
                            />
                          </MotionBox>
                        );
                      })}
                  </SimpleGrid>
                ) : (
                  <Text color="gray.400" fontStyle="italic">{t('common.noData')}</Text>
                )}
              </Box>
            ))}
          </MotionBox>
        )}
      </Container>

      <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent bg="transparent" boxShadow="none" maxW="90vw" maxH="90vh">
          <ModalCloseButton color="white" size="lg" zIndex={2} _hover={{ bg: 'whiteAlpha.200' }} />
          <ModalBody p={0} display="flex" flexDir="column" alignItems="center" justifyContent="center">
            {lightboxSrc && (
              <>
                <Image
                  src={lightboxSrc}
                  alt=""
                  maxW="full"
                  maxH="85vh"
                  objectFit="contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <Link
                  href={lightboxSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="white"
                  fontSize="sm"
                  mt={2}
                  _hover={{ textDecoration: 'underline' }}
                >
                  Otvori original u novom prozoru
                </Link>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
