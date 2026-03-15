import { useCallback, useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Spinner,
  Text,
  Button,
  Flex,
  Icon,
  Image,
  Textarea,
  VStack,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { ArrowBackIcon, CalendarIcon, ChatIcon } from '@chakra-ui/icons';
import api from '../../api/client';
import { getUploadUrl } from '../../utils/uploadUrl';
import { useAuth } from '../../context/AuthContext';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string | null;
  heroImage?: string | null;
}

interface BlogComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string };
}

export default function PublicBlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPost = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    api
      .get<BlogPost>(`/api/blog/slug/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const loadComments = useCallback(() => {
    if (!post?.id) return;
    setCommentsLoading(true);
    api
      .get<BlogComment[]>(`/api/blog/${post.id}/comments`, { params: { approved: 'true' } })
      .then((r) => setComments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [post?.id]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useEffect(() => {
    if (post?.id) loadComments();
  }, [post?.id, loadComments]);

  const handleSubmitComment = async () => {
    if (!post?.id || !newComment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/blog/${post.id}/comments`, { content: newComment.trim() });
      setNewComment('');
      loadComments();
      toast({ title: 'Komentar je poslan na odobrenje.', status: 'success', duration: 3000 });
    } catch {
      toast({ title: 'Greška pri slanju komentara.', status: 'error', duration: 3000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box py={20} textAlign="center"><Spinner size="xl" color="brand.500" /></Box>;
  if (!post) return <Container maxW="container.lg" py={20}><Text textAlign="center" fontSize="lg">Članak nije pronađen.</Text></Container>;

  return (
    <Box bg="white" minH="100vh" pt={10} pb={20}>
      <Container maxW="container.lg" px={0}>
        <Button as={RouterLink} to="/blog" variant="ghost" colorScheme="gray" leftIcon={<ArrowBackIcon />} mb={4} ml={4} _hover={{ bg: 'gray.100' }}>
          Nazad na blog
        </Button>

        {/* Hero backdrop – slika u pozadini, naslov i datum u donjem lijevom uglu */}
        <Box
          position="relative"
          minH={{ base: '280px', md: '360px' }}
          mb={10}
          overflow="hidden"
          rounded="xl"
        >
          {post.heroImage ? (
            <Image
              src={getUploadUrl(post.heroImage)}
              alt=""
              position="absolute"
              inset={0}
              w="full"
              h="full"
              objectFit="cover"
            />
          ) : (
            <Box position="absolute" inset={0} bgGradient="linear(to-br, brand.400, brand.700)" />
          )}
          <Box
            position="absolute"
            inset={0}
            bgGradient="linear(to-t, blackAlpha.900 0%, blackAlpha.500 40%, transparent)"
          />
          <Flex
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            p={6}
            pt={12}
            flexDirection="column"
            alignItems="flex-start"
          >
            <Flex align="center" gap={2} color="whiteAlpha.900" fontSize="sm" mb={2}>
              <Icon as={CalendarIcon} />
              <Text>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('bs-BA') : ''}</Text>
            </Flex>
            <Heading size="2xl" color="white" textShadow="0 2px 8px rgba(0,0,0,0.5)" lineHeight="shorter">
              {post.title}
            </Heading>
          </Flex>
        </Box>

        {/* Sadržaj članka */}
        <Box px={4}>
          <Box
            className="blog-content"
            fontSize="lg"
            lineHeight="relaxed"
            color="gray.700"
            mb={14}
            sx={{
              '& p': { mb: 6 },
              '& h2': { fontSize: '2xl', fontWeight: 'bold', mt: 10, mb: 4, color: 'brand.800' },
              '& h3': { fontSize: 'xl', fontWeight: 'bold', mt: 8, mb: 3, color: 'brand.800' },
              '& ul, & ol': { pl: 6, mb: 6 },
              '& li': { mb: 2 },
              '& blockquote': { borderLeftWidth: '4px', borderColor: 'brand.400', pl: 4, fontStyle: 'italic', color: 'gray.600', my: 6 },
            }}
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
          />

          {/* Komentari */}
          <Divider my={10} />
          <Heading size="lg" mb={6} color="brand.800" display="flex" alignItems="center" gap={2}>
            <Icon as={ChatIcon} />
            Komentari {comments.length > 0 && `(${comments.length})`}
          </Heading>

          {user ? (
            <VStack align="stretch" spacing={4} mb={8}>
              <Textarea
                placeholder="Napišite komentar..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                maxLength={2000}
                resize="vertical"
              />
              <Button
                colorScheme="brand"
                onClick={handleSubmitComment}
                isLoading={submitting}
                isDisabled={!newComment.trim()}
                alignSelf="flex-start"
              >
                Pošalji komentar
              </Button>
            </VStack>
          ) : (
            <Box py={4} color="gray.600">
              <Button as={RouterLink} to="/login" state={{ from: `/blog/${post.slug}` }} colorScheme="brand" variant="outline" size="sm">
                Prijavite se da biste komentarisali
              </Button>
            </Box>
          )}

          {commentsLoading ? (
            <Flex justify="center" py={8}><Spinner color="brand.500" /></Flex>
          ) : comments.length === 0 ? (
            <Text color="gray.500" fontStyle="italic">Nema odobrenih komentara.</Text>
          ) : (
            <VStack align="stretch" spacing={6}>
              {comments.map((c) => (
                <Box key={c.id} py={4} borderBottomWidth="1px" borderColor="gray.100" _last={{ borderBottomWidth: 0 }}>
                  <Flex align="center" gap={2} mb={2}>
                    <Text fontWeight="semibold" color="gray.800">
                      {c.user.firstName} {c.user.lastName}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {new Date(c.createdAt).toLocaleString('bs-BA')}
                    </Text>
                  </Flex>
                  <Text color="gray.700" whiteSpace="pre-wrap">{c.content}</Text>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </Container>
    </Box>
  );
}
