import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, Button, Flex, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton, FormControl,
  FormLabel, Input, Textarea, Switch, useToast, IconButton, HStack,
  VStack, Card, CardBody, Image,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { EditIcon, DeleteIcon, AddIcon, ChatIcon, CheckIcon } from '@chakra-ui/icons';
import api from '../api/client';
import { getUploadUrl } from '../utils/uploadUrl';

interface BlogComment {
  id: string;
  content: string;
  isApproved: boolean;
  createdAt: string;
  user?: { username: string; firstName: string | null; lastName: string | null };
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  content: string;
  heroImage: string | null;
}

export default function Blog() {
  const { t } = useTranslation();
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [heroImage, setHeroImage] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const { isOpen: isCommentsOpen, onOpen: onCommentsOpen, onClose: onCommentsClose } = useDisclosure();
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentsPostTitle, setCommentsPostTitle] = useState('');
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    api.get<BlogPost[]>('/api/blog')
      .then((r) => setPosts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUploadHero = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entity', 'blog');
      const { data } = await api.post('/api/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setHeroImage(data.pathMedium || data.pathOriginal || '');
      toast({ title: 'Slika uploadovana', status: 'success', isClosable: true, duration: 2000 });
    } catch {
      toast({ title: 'Greška pri uploadu', status: 'error', isClosable: true });
    } finally {
      setUploadingImg(false);
      if (heroFileRef.current) heroFileRef.current.value = '';
    }
  };

  const openForm = async (id?: string) => {
    if (id) {
      setEditId(id);
      try {
        const { data } = await api.get<BlogPost>(`/api/blog/${id}`);
        setTitle(data.title);
        setContent(data.content);
        setIsPublished(data.isPublished);
        setHeroImage(data.heroImage ?? '');
        onOpen();
      } catch {
        toast({ title: 'Greška pri učitavanju', status: 'error', isClosable: true });
      }
    } else {
      setEditId(null);
      setTitle('');
      setContent('');
      setIsPublished(false);
      setHeroImage('');
      onOpen();
    }
  };

  const handleSave = async () => {
    if (!title || !content) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { title, content, isPublished };
      if (heroImage) payload.heroImage = heroImage;
      if (editId) {
        await api.patch(`/api/blog/${editId}`, payload);
      } else {
        await api.post('/api/blog', payload);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati članak?')) return;
    try {
      await api.delete(`/api/blog/${id}`);
      toast({ title: 'Obrisano', status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const openComments = async (postId: string, postTitle: string) => {
    setCommentsPostId(postId);
    setCommentsPostTitle(postTitle);
    setCommentsLoading(true);
    onCommentsOpen();
    try {
      const { data } = await api.get<BlogComment[]>(`/api/blog/${postId}/comments`);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleApproveComment = async (commentId: string) => {
    try {
      await api.patch(`/api/blog/comments/${commentId}/approve`);
      toast({ title: 'Komentar odobren', status: 'success', isClosable: true });
      if (commentsPostId) openComments(commentsPostId, commentsPostTitle);
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Obrisati komentar?')) return;
    try {
      await api.delete(`/api/blog/comments/${commentId}`);
      toast({ title: 'Komentar obrisan', status: 'success', isClosable: true });
      if (commentsPostId) openComments(commentsPostId, commentsPostTitle);
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">{t('nav.blog')}</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={() => openForm()}>
          Novi Članak
        </Button>
      </Flex>

      <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
        {loading ? (
          <Box p={6} textAlign="center"><Spinner size="lg" /></Box>
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Naslov</Th>
                <Th>Slug</Th>
                <Th>Status</Th>
                <Th>Datum Objavljivanja</Th>
                <Th>Kreirano</Th>
                <Th textAlign="right">Akcije</Th>
              </Tr>
            </Thead>
            <Tbody>
              {posts.length === 0 ? (
                <Tr><Td colSpan={6}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
              ) : (
                posts.map((p) => (
                  <Tr key={p.id}>
                    <Td fontWeight="medium">{p.title}</Td>
                    <Td fontSize="sm" color="gray.500">{p.slug}</Td>
                    <Td>
                      <Badge colorScheme={p.isPublished ? 'green' : 'gray'}>
                        {p.isPublished ? 'Objavljeno' : 'Nacrt'}
                      </Badge>
                    </Td>
                    <Td>{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('bs-BA') : '-'}</Td>
                    <Td>{new Date(p.createdAt).toLocaleDateString('bs-BA')}</Td>
                    <Td textAlign="right">
                      <HStack spacing={1} justify="flex-end">
                        <IconButton aria-label="Komentari" icon={<ChatIcon />} size="sm" variant="ghost" colorScheme="teal" onClick={() => openComments(p.id, p.title)} />
                        <IconButton aria-label="Uredi" icon={<EditIcon />} size="sm" variant="ghost" colorScheme="blue" onClick={() => openForm(p.id)} />
                        <IconButton aria-label="Obriši" icon={<DeleteIcon />} size="sm" variant="ghost" colorScheme="red" onClick={() => handleDelete(p.id)} />
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        )}
      </Box>

      {/* Post Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editId ? 'Uredi Članak' : 'Novi Članak'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Naslov</FormLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Hero slika</FormLabel>
              {heroImage && (
                <Image src={getUploadUrl(heroImage)} alt="Hero" maxH="150px" rounded="md" mb={2} objectFit="cover" w="100%" />
              )}
              <input type="file" accept="image/*" ref={heroFileRef} style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleUploadHero(e.target.files[0])} />
              <Button size="sm" onClick={() => heroFileRef.current?.click()} isLoading={uploadingImg}>
                {heroImage ? 'Promijeni sliku' : 'Upload hero sliku'}
              </Button>
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Sadržaj (HTML/Tekst)</FormLabel>
              <Textarea rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
            </FormControl>
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Objavljeno</FormLabel>
              <Switch isChecked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} colorScheme="brand" />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleSave} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Comments Modal */}
      <Modal isOpen={isCommentsOpen} onClose={onCommentsClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Komentari: {commentsPostTitle}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {commentsLoading ? (
              <Spinner />
            ) : comments.length === 0 ? (
              <Text color="gray.500">Nema komentara za ovaj članak.</Text>
            ) : (
              <VStack align="stretch" spacing={3}>
                {comments.map((c) => (
                  <Card key={c.id} size="sm" bg={c.isApproved ? 'white' : 'yellow.50'} borderLeft="3px solid" borderColor={c.isApproved ? 'green.400' : 'yellow.400'}>
                    <CardBody py={2}>
                      <Flex justify="space-between" align="start">
                        <Box flex={1}>
                          <Flex gap={2} align="center" mb={1}>
                            <Text fontSize="sm" fontWeight="bold">
                              {c.user ? `${c.user.firstName ?? ''} ${c.user.lastName ?? ''}`.trim() || c.user.username : 'Nepoznat'}
                            </Text>
                            <Badge colorScheme={c.isApproved ? 'green' : 'yellow'} size="sm">
                              {c.isApproved ? 'Odobren' : 'Na čekanju'}
                            </Badge>
                          </Flex>
                          <Text fontSize="sm">{c.content}</Text>
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            {new Date(c.createdAt).toLocaleString('bs-BA')}
                          </Text>
                        </Box>
                        <HStack spacing={1}>
                          {!c.isApproved && (
                            <IconButton aria-label="Odobri" icon={<CheckIcon />} size="xs" colorScheme="green" variant="ghost" onClick={() => handleApproveComment(c.id)} />
                          )}
                          <IconButton aria-label="Obriši" icon={<DeleteIcon />} size="xs" colorScheme="red" variant="ghost" onClick={() => handleDeleteComment(c.id)} />
                        </HStack>
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onCommentsClose}>Zatvori</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
