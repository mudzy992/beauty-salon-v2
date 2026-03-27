import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Button, Flex, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton, FormControl,
  FormLabel, Input, useToast, IconButton, Badge, Textarea, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Switch, HStack, Image,
  Select,
  useBreakpointValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { AddIcon, EditIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import { Link as RouterLink } from 'react-router-dom';
import api from '../api/client';
import { getUploadUrl } from '../utils/uploadUrl';

interface Service {
  id: string;
  name: string;
  shortDescription: string | null;
  heroImage: string | null;
  durationMinutes: number;
  price: number | string;
  isActive: boolean;
  sortOrder: number;
  gender: 'MALE' | 'FEMALE';
  loyaltyEnabled?: boolean;
  loyaltyMaxDiscountPercent?: number;
}

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  services?: Service[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  subcategories?: Subcategory[];
}

type ModalMode = 'category' | 'subcategory' | 'service';

export default function Services() {
  const { t } = useTranslation();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalMode, setModalMode] = useState<ModalMode>('category');
  const [editId, setEditId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const [catForm, setCatForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true });
  const [subForm, setSubForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true });
  const [svcForm, setSvcForm] = useState({
    name: '',
    shortDescription: '',
    durationMinutes: 30,
    price: 0,
    gender: 'FEMALE' as 'MALE' | 'FEMALE',
    sortOrder: 0,
    isActive: true,
    heroImage: '',
    loyaltyEnabled: false,
    loyaltyMaxDiscountPercent: 0,
  });
  const [uploadingImg, setUploadingImg] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const svcFileRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    api.get<Category[]>('/api/services/categories')
      .then(async (r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        const withDetails = await Promise.all(
          list.map((c) => api.get<Category>(`/api/services/categories/${c.id}`).then((res) => res.data))
        );
        setCategories(withDetails);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCategoryForm = (cat?: Category) => {
    setModalMode('category');
    setParentId(null);
    if (cat) {
      setEditId(cat.id);
      setCatForm({ name: cat.name, description: cat.description ?? '', sortOrder: cat.sortOrder, isActive: cat.isActive });
    } else {
      setEditId(null);
      setCatForm({ name: '', description: '', sortOrder: 0, isActive: true });
    }
    onOpen();
  };

  const openSubcategoryForm = (categoryId: string, sub?: Subcategory) => {
    setModalMode('subcategory');
    setParentId(categoryId);
    if (sub) {
      setEditId(sub.id);
      setSubForm({ name: sub.name, description: sub.description ?? '', sortOrder: sub.sortOrder, isActive: sub.isActive });
    } else {
      setEditId(null);
      setSubForm({ name: '', description: '', sortOrder: 0, isActive: true });
    }
    onOpen();
  };

  const openServiceForm = (subcategoryId: string, svc?: Service) => {
    setModalMode('service');
    setParentId(subcategoryId);
    if (svc) {
      setEditId(svc.id);
      setSvcForm({
        name: svc.name,
        shortDescription: svc.shortDescription ?? '',
        durationMinutes: svc.durationMinutes,
        price: Number(svc.price),
        gender: svc.gender ?? 'FEMALE',
        sortOrder: svc.sortOrder,
        isActive: svc.isActive,
        heroImage: svc.heroImage ?? '',
        loyaltyEnabled: svc.loyaltyEnabled ?? false,
        loyaltyMaxDiscountPercent: svc.loyaltyMaxDiscountPercent ?? 0,
      });
    } else {
      setEditId(null);
      setSvcForm({
        name: '',
        shortDescription: '',
        durationMinutes: 30,
        price: 0,
        gender: 'FEMALE',
        sortOrder: 0,
        isActive: true,
        heroImage: '',
        loyaltyEnabled: false,
        loyaltyMaxDiscountPercent: 0,
      });
    }
    onOpen();
  };

  const handleUploadHeroImage = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entity', 'services');
      const { data } = await api.post('/api/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const path = data.pathMedium || data.pathOriginal || '';
      setSvcForm((prev) => ({ ...prev, heroImage: path }));
      toast({ title: 'Slika uploadovana', status: 'success', isClosable: true, duration: 2000 });
    } catch {
      toast({ title: 'Greška pri uploadu slike', status: 'error', isClosable: true });
    } finally {
      setUploadingImg(false);
      if (svcFileRef.current) svcFileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modalMode === 'category') {
        if (editId) {
          await api.patch(`/api/services/categories/${editId}`, catForm);
        } else {
          await api.post('/api/services/categories', catForm);
        }
      } else if (modalMode === 'subcategory') {
        if (editId) {
          await api.patch(`/api/services/subcategories/${editId}`, subForm);
        } else {
          await api.post('/api/services/subcategories', { ...subForm, categoryId: parentId });
        }
      } else {
        if (editId) {
          await api.patch(`/api/services/${editId}`, svcForm);
        } else {
          await api.post('/api/services', { ...svcForm, subcategoryId: parentId });
        }
      }
      toast({ title: 'Sačuvano', status: 'success', isClosable: true });
      loadData();
      onClose();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Obrisati kategoriju i sve potkategorije/servise?')) return;
    try {
      await api.delete(`/api/services/categories/${id}`);
      toast({ title: 'Kategorija obrisana', status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!window.confirm('Obrisati potkategoriju i sve servise?')) return;
    try {
      await api.delete(`/api/services/subcategories/${id}`);
      toast({ title: 'Potkategorija obrisana', status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Obrisati servis?')) return;
    try {
      await api.delete(`/api/services/${id}`);
      toast({ title: 'Servis obrisan', status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const getModalTitle = () => {
    const action = editId ? 'Uredi' : 'Nova/i';
    if (modalMode === 'category') return `${action} Kategorija`;
    if (modalMode === 'subcategory') return `${action} Potkategorija`;
    return `${action} Servis`;
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">{t('nav.services')}</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={() => openCategoryForm()}>
          Nova Kategorija
        </Button>
      </Flex>

      {loading ? (
        <Box p={6} textAlign="center"><Spinner size="lg" /></Box>
      ) : categories.length === 0 ? (
        <Text color="gray.500">{t('common.noData')}</Text>
      ) : (
        <Accordion allowMultiple>
          {categories.map((cat) => (
            <AccordionItem key={cat.id} bg="white" rounded="lg" shadow="sm" mb={3} border="1px" borderColor="gray.200">
              <AccordionButton py={3}>
                <Flex flex="1" align="center" gap={2} minW={0}>
                  <Text fontWeight="bold" fontSize={{ base: 'md', md: 'lg' }} noOfLines={1}>
                    {cat.name}
                  </Text>
                  <Badge colorScheme={cat.isActive ? 'green' : 'gray'} ml={2} fontSize={{ base: '2xs', md: 'xs' }}>
                    {cat.isActive ? 'Aktivna' : 'Neaktivna'}
                  </Badge>
                  {cat.description && (
                    <Text fontSize="sm" color="gray.500" ml={2} display={{ base: 'none', md: 'block' }}>
                      — {cat.description}
                    </Text>
                  )}
                </Flex>
                <HStack spacing={1} mr={2} onClick={(e) => e.stopPropagation()} flexShrink={0}>
                  <IconButton aria-label="Dodaj potkategoriju" icon={<AddIcon />} size={{ base: 'sm', md: 'xs' }} colorScheme="green" variant="ghost" onClick={() => openSubcategoryForm(cat.id)} />
                  <IconButton aria-label="Uredi" icon={<EditIcon />} size={{ base: 'sm', md: 'xs' }} colorScheme="blue" variant="ghost" onClick={() => openCategoryForm(cat)} />
                  <IconButton aria-label="Obriši" icon={<DeleteIcon />} size={{ base: 'sm', md: 'xs' }} colorScheme="red" variant="ghost" onClick={() => handleDeleteCategory(cat.id)} />
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                {cat.subcategories?.length ? (
                  cat.subcategories.map((sub) => (
                    <Box key={sub.id} mb={6} ml={2} p={3} borderLeft="3px solid" borderColor="brand.300" bg="gray.50" rounded="md">
                      <Flex align="center" justify="space-between" mb={3} gap={2}>
                        <HStack>
                          <Text fontWeight="bold" color="gray.700" noOfLines={1}>{sub.name}</Text>
                          <Badge colorScheme={sub.isActive ? 'green' : 'gray'} size="sm" fontSize={{ base: '2xs', md: 'xs' }}>
                            {sub.isActive ? 'Aktivna' : 'Neaktivna'}
                          </Badge>
                        </HStack>
                        <HStack spacing={1} flexWrap="wrap" justify="flex-end" flexShrink={0}>
                          <Button size={{ base: 'sm', md: 'xs' }} leftIcon={<AddIcon />} colorScheme="brand" variant="outline" onClick={() => openServiceForm(sub.id)}>
                            Servis
                          </Button>
                          <IconButton aria-label="Uredi" icon={<EditIcon />} size={{ base: 'sm', md: 'xs' }} colorScheme="blue" variant="ghost" onClick={() => openSubcategoryForm(cat.id, sub)} />
                          <IconButton aria-label="Obriši" icon={<DeleteIcon />} size={{ base: 'sm', md: 'xs' }} colorScheme="red" variant="ghost" onClick={() => handleDeleteSubcategory(sub.id)} />
                        </HStack>
                      </Flex>
                      {sub.services?.length ? (
                        <Box overflowX="auto">
                          <Table size="sm" variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Usluga</Th>
                          {!isMobile && <Th>Opis</Th>}
                          <Th isNumeric>Trajanje (min)</Th>
                          <Th isNumeric>Cijena (KM)</Th>
                          <Th>Spol</Th>
                          <Th>Loyalty</Th>
                          <Th>Status</Th>
                          <Th textAlign="right">Akcije</Th>
                        </Tr>
                      </Thead>
                          <Tbody>
                            {sub.services.map((s) => (
                              <Tr key={s.id}>
                                <Td fontWeight="medium">{s.name}</Td>
                                {!isMobile && <Td maxW="200px" isTruncated>{s.shortDescription ?? '-'}</Td>}
                                <Td isNumeric>{s.durationMinutes}</Td>
                                <Td isNumeric>{Number(s.price).toFixed(2)}</Td>
                                <Td>
                                  <Badge colorScheme={s.gender === 'MALE' ? 'blue' : 'pink'}>
                                    {s.gender === 'MALE' ? 'Muško' : 'Žensko'}
                                  </Badge>
                                </Td>
                                <Td>
                                  {s.loyaltyEnabled ? (
                                    <Badge colorScheme="purple">
                                      Loyalty do {s.loyaltyMaxDiscountPercent ?? 0}%
                                    </Badge>
                                  ) : (
                                    <Badge colorScheme="gray">Bez loyalty</Badge>
                                  )}
                                </Td>
                                <Td><Badge colorScheme={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Aktivan' : 'Neaktivan'}</Badge></Td>
                                <Td textAlign="right">
                                  <HStack spacing={1} justify="flex-end">
                                    <IconButton
                                      as={RouterLink}
                                      to={`/admin/services/${s.id}/work-gallery`}
                                      aria-label="Urađeni radovi"
                                      icon={<ViewIcon />}
                                      size="xs"
                                      colorScheme="purple"
                                      variant="ghost"
                                    />
                                    <IconButton aria-label="Uredi" icon={<EditIcon />} size="xs" colorScheme="blue" variant="ghost" onClick={() => openServiceForm(sub.id, s)} />
                                    <IconButton aria-label="Obriši" icon={<DeleteIcon />} size="xs" colorScheme="red" variant="ghost" onClick={() => handleDeleteService(s.id)} />
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                          </Table>
                        </Box>
                      ) : (
                        <Text color="gray.500" fontSize="sm" fontStyle="italic">Nema definisanih usluga.</Text>
                      )}
                    </Box>
                  ))
                ) : (
                  <Text color="gray.500" fontSize="sm" fontStyle="italic">Nema potkategorija.</Text>
                )}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Universal Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size={modalMode === 'service' ? 'xl' : 'md'}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{getModalTitle()}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {modalMode === 'category' && (
              <>
                <FormControl mb={4} isRequired>
                  <FormLabel>Naziv</FormLabel>
                  <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                </FormControl>
                <FormControl mb={4}>
                  <FormLabel>Opis</FormLabel>
                  <Textarea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
                </FormControl>
                <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                  <FormControl flex={1}>
                    <FormLabel>Redoslijed</FormLabel>
                    <NumberInput value={catForm.sortOrder} onChange={(_, v) => setCatForm({ ...catForm, sortOrder: v || 0 })} min={0}>
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                  <FormControl flex={1} display="flex" alignItems="flex-end" pb={1}>
                    <FormLabel mb="0" mr={3}>Aktivna</FormLabel>
                    <Switch isChecked={catForm.isActive} onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })} colorScheme="brand" />
                  </FormControl>
                </Flex>
              </>
            )}

            {modalMode === 'subcategory' && (
              <>
                <FormControl mb={4} isRequired>
                  <FormLabel>Naziv</FormLabel>
                  <Input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} />
                </FormControl>
                <FormControl mb={4}>
                  <FormLabel>Opis</FormLabel>
                  <Textarea value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} />
                </FormControl>
                <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                  <FormControl flex={1}>
                    <FormLabel>Redoslijed</FormLabel>
                    <NumberInput value={subForm.sortOrder} onChange={(_, v) => setSubForm({ ...subForm, sortOrder: v || 0 })} min={0}>
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                  <FormControl flex={1} display="flex" alignItems="flex-end" pb={1}>
                    <FormLabel mb="0" mr={3}>Aktivna</FormLabel>
                    <Switch isChecked={subForm.isActive} onChange={(e) => setSubForm({ ...subForm, isActive: e.target.checked })} colorScheme="brand" />
                  </FormControl>
                </Flex>
              </>
            )}

            {modalMode === 'service' && (
              <>
                <FormControl mb={4} isRequired>
                  <FormLabel>Naziv usluge</FormLabel>
                  <Input value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} />
                </FormControl>
                <FormControl mb={4}>
                  <FormLabel>Kratki opis</FormLabel>
                  <Textarea value={svcForm.shortDescription} onChange={(e) => setSvcForm({ ...svcForm, shortDescription: e.target.value })} rows={2} />
                </FormControl>
                <FormControl mb={4}>
                  <FormLabel>Hero slika</FormLabel>
                  {svcForm.heroImage && (
                    <Image src={getUploadUrl(svcForm.heroImage)} alt="Hero" maxH="120px" rounded="md" mb={2} objectFit="cover" />
                  )}
                  <input type="file" accept="image/*" ref={svcFileRef} style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleUploadHeroImage(e.target.files[0])} />
                  <Button size="sm" onClick={() => svcFileRef.current?.click()} isLoading={uploadingImg}>
                    {svcForm.heroImage ? 'Promijeni sliku' : 'Upload sliku'}
                  </Button>
                </FormControl>
                <Flex gap={4} mb={4} direction={{ base: 'column', md: 'row' }}>
                  <FormControl flex={1} isRequired>
                    <FormLabel>Trajanje (min)</FormLabel>
                    <NumberInput value={svcForm.durationMinutes} onChange={(_, v) => setSvcForm({ ...svcForm, durationMinutes: v || 15 })} min={5} max={480} step={5}>
                      <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl flex={1} isRequired>
                    <FormLabel>Cijena (KM)</FormLabel>
                    <NumberInput value={svcForm.price} onChange={(_, v) => setSvcForm({ ...svcForm, price: v || 0 })} min={0} precision={2} step={0.5}>
                      <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </Flex>
                <FormControl mb={4} isRequired>
                  <FormLabel>Spol servisa</FormLabel>
                  <Select
                    value={svcForm.gender}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      setSvcForm({
                        ...svcForm,
                        gender: e.target.value as 'MALE' | 'FEMALE',
                      })
                    }
                  >
                    <option value="FEMALE">Žensko</option>
                    <option value="MALE">Muško</option>
                  </Select>
                </FormControl>
                <Flex gap={4} mb={4} direction={{ base: 'column', md: 'row' }}>
                  <FormControl flex={1}>
                    <FormLabel>Redoslijed</FormLabel>
                    <NumberInput value={svcForm.sortOrder} onChange={(_, v) => setSvcForm({ ...svcForm, sortOrder: v || 0 })} min={0}>
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                  <FormControl flex={1} display="flex" alignItems="flex-end" pb={1}>
                    <FormLabel mb="0" mr={3}>Aktivan</FormLabel>
                    <Switch isChecked={svcForm.isActive} onChange={(e) => setSvcForm({ ...svcForm, isActive: e.target.checked })} colorScheme="brand" />
                  </FormControl>
                </Flex>
                <Box mt={2} p={3} bg="purple.50" rounded="md" borderWidth="1px" borderColor="purple.200">
                  <FormControl display="flex" alignItems="center" mb={3}>
                    <FormLabel mb="0" mr={3}>Uključi loyalty za ovaj servis</FormLabel>
                    <Switch
                      isChecked={svcForm.loyaltyEnabled}
                      onChange={(e) => setSvcForm({ ...svcForm, loyaltyEnabled: e.target.checked })}
                      colorScheme="purple"
                    />
                  </FormControl>
                  {svcForm.loyaltyEnabled && (
                    <FormControl>
                      <FormLabel>Maksimalan loyalty popust za ovaj servis (%)</FormLabel>
                      <NumberInput
                        value={svcForm.loyaltyMaxDiscountPercent}
                        min={0}
                        max={100}
                        onChange={(_, v) => setSvcForm({ ...svcForm, loyaltyMaxDiscountPercent: v || 0 })}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                  )}
                </Box>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleSave} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
