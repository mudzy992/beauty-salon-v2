import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Heading, SimpleGrid, Card, CardBody, Text, Spinner, Button,
  Flex, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, ModalCloseButton, FormControl, FormLabel,
  Input, useToast, IconButton,
  Image, HStack, Textarea, NumberInput, NumberInputField,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import api from '../api/client';
import { getUploadUrl } from '../utils/uploadUrl';

interface GalleryImage {
  id: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
  uploadId: string;
  upload?: { pathOriginal: string; pathThumb: string; pathMedium: string };
}

interface GalleryCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  _count?: { images: number };
  images?: GalleryImage[];
}

export default function Gallery() {
  const { t } = useTranslation();
  const toast = useToast();
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [catImages, setCatImages] = useState<GalleryImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  const { isOpen: isCatOpen, onOpen: onCatOpen, onClose: onCatClose } = useDisclosure();
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', sortOrder: 0 });

  const { isOpen: isImgOpen, onOpen: onImgOpen, onClose: onImgClose } = useDisclosure();
  const [editImgId, setEditImgId] = useState<string | null>(null);
  const [imgForm, setImgForm] = useState({ title: '', description: '', sortOrder: 0 });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCategories = useCallback(() => {
    setLoading(true);
    api.get<GalleryCategory[]>('/api/gallery/categories')
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const loadImages = useCallback(async (catId: string) => {
    setSelectedCatId(catId);
    setImagesLoading(true);
    try {
      const { data } = await api.get<GalleryCategory>(`/api/gallery/categories/${catId}`);
      setCatImages(data.images ?? []);
    } catch {
      setCatImages([]);
    } finally {
      setImagesLoading(false);
    }
  }, []);

  const openCatForm = (c?: GalleryCategory) => {
    if (c) {
      setEditCatId(c.id);
      setCatForm({ name: c.name, description: c.description ?? '', sortOrder: c.sortOrder });
    } else {
      setEditCatId(null);
      setCatForm({ name: '', description: '', sortOrder: 0 });
    }
    onCatOpen();
  };

  const handleSaveCat = async () => {
    if (!catForm.name) return;
    setSaving(true);
    try {
      if (editCatId) {
        await api.patch(`/api/gallery/categories/${editCatId}`, catForm);
      } else {
        await api.post('/api/gallery/categories', catForm);
      }
      toast({ title: 'Sačuvano', status: 'success', isClosable: true });
      loadCategories();
      onCatClose();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!window.confirm('Obrisati kategoriju i sve slike?')) return;
    try {
      await api.delete(`/api/gallery/categories/${id}`);
      toast({ title: 'Kategorija obrisana', status: 'success', isClosable: true });
      if (selectedCatId === id) { setSelectedCatId(null); setCatImages([]); }
      loadCategories();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const handleUploadImage = async (file: File) => {
    if (!selectedCatId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity', 'gallery');
      const { data: upload } = await api.post('/api/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post('/api/gallery/images', {
        categoryId: selectedCatId,
        uploadId: upload.id,
        title: file.name.replace(/\.[^.]+$/, ''),
        sortOrder: catImages.length,
      });
      toast({ title: 'Slika uploadovana', status: 'success', isClosable: true });
      loadImages(selectedCatId);
      loadCategories();
    } catch {
      toast({ title: 'Greška pri uploadu', status: 'error', isClosable: true });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openImgEdit = (img: GalleryImage) => {
    setEditImgId(img.id);
    setImgForm({ title: img.title ?? '', description: img.description ?? '', sortOrder: img.sortOrder });
    onImgOpen();
  };

  const handleSaveImg = async () => {
    if (!editImgId) return;
    setSaving(true);
    try {
      await api.patch(`/api/gallery/images/${editImgId}`, imgForm);
      toast({ title: 'Sačuvano', status: 'success', isClosable: true });
      if (selectedCatId) loadImages(selectedCatId);
      onImgClose();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImg = async (id: string) => {
    if (!window.confirm('Obrisati sliku?')) return;
    try {
      await api.delete(`/api/gallery/images/${id}`);
      toast({ title: 'Slika obrisana', status: 'success', isClosable: true });
      if (selectedCatId) loadImages(selectedCatId);
      loadCategories();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">{t('nav.gallery')}</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={() => openCatForm()}>
          Nova Kategorija
        </Button>
      </Flex>

      <Flex gap={6} direction={{ base: 'column', lg: 'row' }}>
        {/* Categories List */}
        <Box w={{ base: 'full', lg: '300px' }} minW={{ base: 'auto', lg: '280px' }}>
          {loading ? (
            <Spinner size="lg" />
          ) : categories.length === 0 ? (
            <Text color="gray.500">{t('common.noData')}</Text>
          ) : (
            categories.map((c) => (
              <Card
                key={c.id}
                mb={2}
                cursor="pointer"
                bg={selectedCatId === c.id ? 'brand.50' : 'white'}
                borderWidth={selectedCatId === c.id ? '2px' : '1px'}
                borderColor={selectedCatId === c.id ? 'brand.400' : 'gray.200'}
                onClick={() => loadImages(c.id)}
                _hover={{ shadow: 'md' }}
              >
                <CardBody py={3} px={4}>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontWeight="bold">{c.name}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {c._count?.images ?? 0} slika | Redoslijed: {c.sortOrder}
                      </Text>
                    </Box>
                    <HStack spacing={1} onClick={(e) => e.stopPropagation()}>
                      <IconButton aria-label="Uredi" icon={<EditIcon />} size="xs" variant="ghost" onClick={() => openCatForm(c)} />
                      <IconButton aria-label="Obriši" icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleDeleteCat(c.id)} />
                    </HStack>
                  </Flex>
                </CardBody>
              </Card>
            ))
          )}
        </Box>

        {/* Images Panel */}
        <Box flex={1}>
          {!selectedCatId ? (
            <Flex bg="white" p={8} rounded="lg" shadow="sm" justify="center" align="center" minH="200px">
              <Text color="gray.400">Odaberite kategoriju za pregled slika</Text>
            </Flex>
          ) : (
            <Box bg="white" p={4} rounded="lg" shadow="sm">
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontWeight="bold" fontSize="lg">
                  {categories.find((c) => c.id === selectedCatId)?.name ?? 'Slike'}
                </Text>
                <HStack>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0])}
                  />
                  <Button
                    leftIcon={<AddIcon />}
                    colorScheme="brand"
                    size="sm"
                    isLoading={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Sliku
                  </Button>
                </HStack>
              </Flex>

              {imagesLoading ? (
                <Spinner />
              ) : catImages.length === 0 ? (
                <Text color="gray.500" textAlign="center" py={8}>Nema slika u ovoj kategoriji.</Text>
              ) : (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                  {catImages.map((img) => (
                    <Card key={img.id} overflow="hidden">
                      <Image
                        src={getUploadUrl(img.upload?.pathMedium || img.upload?.pathOriginal)}
                        alt={img.title ?? 'Gallery image'}
                        h="180px"
                        w="100%"
                        objectFit="cover"
                        fallback={<Box h="180px" bg="gray.100" display="flex" alignItems="center" justifyContent="center"><Text color="gray.400">Nema slike</Text></Box>}
                      />
                      <CardBody py={2} px={3}>
                        <Flex justify="space-between" align="center">
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{img.title ?? 'Bez naziva'}</Text>
                            {img.description && <Text fontSize="xs" color="gray.500" noOfLines={1}>{img.description}</Text>}
                          </Box>
                          <HStack spacing={0}>
                            <IconButton aria-label="Uredi" icon={<EditIcon />} size="xs" variant="ghost" onClick={() => openImgEdit(img)} />
                            <IconButton aria-label="Obriši" icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleDeleteImg(img.id)} />
                          </HStack>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </Box>
          )}
        </Box>
      </Flex>

      {/* Category Modal */}
      <Modal isOpen={isCatOpen} onClose={onCatClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editCatId ? 'Uredi Kategoriju' : 'Nova Kategorija'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Naziv</FormLabel>
              <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Opis</FormLabel>
              <Textarea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} rows={2} />
            </FormControl>
            <FormControl>
              <FormLabel>Redoslijed</FormLabel>
              <NumberInput value={catForm.sortOrder} onChange={(_, v) => setCatForm({ ...catForm, sortOrder: v || 0 })} min={0}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCatClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleSaveCat} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Image Edit Modal */}
      <Modal isOpen={isImgOpen} onClose={onImgClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Uredi Sliku</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Naslov</FormLabel>
              <Input value={imgForm.title} onChange={(e) => setImgForm({ ...imgForm, title: e.target.value })} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Opis</FormLabel>
              <Textarea value={imgForm.description} onChange={(e) => setImgForm({ ...imgForm, description: e.target.value })} rows={2} />
            </FormControl>
            <FormControl>
              <FormLabel>Redoslijed</FormLabel>
              <NumberInput value={imgForm.sortOrder} onChange={(_, v) => setImgForm({ ...imgForm, sortOrder: v || 0 })} min={0}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onImgClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleSaveImg} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
