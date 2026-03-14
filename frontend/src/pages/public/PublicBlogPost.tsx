import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Container, Heading, Spinner, Text, Button, Flex, Icon } from '@chakra-ui/react';
import { ArrowBackIcon, CalendarIcon } from '@chakra-ui/icons';
import api from '../../api/client';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string | null;
}

export default function PublicBlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api
      .get<BlogPost>(`/api/blog/slug/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Box py={20} textAlign="center"><Spinner size="xl" color="brand.500" /></Box>;
  if (!post) return <Container maxW="container.md" py={20}><Text textAlign="center" fontSize="lg">Članak nije pronađen.</Text></Container>;

  return (
    <Box bg="white" minH="100vh" pt={10} pb={20}>
      <Container maxW="container.md">
        <Button as={RouterLink} to="/blog" variant="ghost" colorScheme="gray" leftIcon={<ArrowBackIcon />} mb={8} _hover={{ bg: 'gray.100' }}>
          Nazad na blog
        </Button>
        
        <Box mb={10}>
          <Flex align="center" gap={2} color="brand.500" fontWeight="medium" mb={4}>
            <Icon as={CalendarIcon} />
            <Text>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('bs-BA') : ''}</Text>
          </Flex>
          <Heading size="2xl" color="brand.900" lineHeight="shorter">
            {post.title}
          </Heading>
        </Box>

        <Box
          className="blog-content"
          fontSize="lg"
          lineHeight="relaxed"
          color="gray.700"
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
      </Container>
    </Box>
  );
}
