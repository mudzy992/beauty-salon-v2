import { Box, Container, Heading, Text, SimpleGrid, Button, FormControl, FormLabel, Input, Textarea, VStack, useToast, Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import { useState, FormEvent } from 'react';

const MotionBox = motion(Box as any);

export default function PublicContact() {
  const { getSetting } = useSettings();
  const toast = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call for contact form
    setTimeout(() => {
      setLoading(false);
      toast({
        title: 'Poruka poslata',
        description: 'Uskoro ćemo Vam odgovoriti.',
        status: 'success',
        isClosable: true,
      });
      setName('');
      setEmail('');
      setMessage('');
    }, 1000);
  };

  return (
    <Box bg="gray.50" minH="100vh" pt={10} pb={20}>
      <Box bg="brand.900" color="white" py={16} mb={12} textAlign="center" position="relative" overflow="hidden">
        <Box
          position="absolute"
          inset={0}
          backgroundImage={`url('${getSetting('public_contact_bg', 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&q=80&w=2000')}')`}
          backgroundSize="cover"
          backgroundPosition="center"
          opacity={0.3}
        />
        <Container maxW="container.lg" position="relative" zIndex={1}>
          <Heading size="2xl" mb={4}>
            {getSetting('public_contact_title', 'Kontaktirajte Nas')}
          </Heading>
          <Text fontSize="lg" color="gray.200">
            {getSetting('public_contact_subtitle', 'Tu smo za sva vaša pitanja. Javite nam se ili nas posjetite u salonu.')}
          </Text>
        </Container>
      </Box>

      <Container maxW="container.xl">
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={12}>
          <MotionBox
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Box bg="white" p={8} rounded="2xl" shadow="sm">
              <Heading size="lg" mb={6} color="brand.800">Pošaljite nam poruku</Heading>
              <form onSubmit={handleSubmit}>
                <VStack spacing={5} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>Ime i Prezime</FormLabel>
                    <Input value={name} onChange={e => setName(e.target.value)} focusBorderColor="brand.400" />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} focusBorderColor="brand.400" />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Poruka</FormLabel>
                    <Textarea rows={5} value={message} onChange={e => setMessage(e.target.value)} focusBorderColor="brand.400" />
                  </FormControl>
                  <Button type="submit" colorScheme="brand" size="lg" isLoading={loading}>
                    Pošalji
                  </Button>
                </VStack>
              </form>
            </Box>
          </MotionBox>

          <MotionBox
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <VStack spacing={8} align="stretch">
              <Box bg="white" p={8} rounded="2xl" shadow="sm">
                <Heading size="md" mb={4} color="brand.800">Informacije</Heading>
                <VStack align="start" spacing={4} color="gray.700">
                  <Box>
                    <Text fontWeight="bold" color="brand.400">Adresa</Text>
                    <Text>{getSetting('public_contact_address', 'Titova 12, 71000 Sarajevo')}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="brand.400">Telefon</Text>
                    <Text>{getSetting('public_contact_phone', '+387 61 234 567')}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="brand.400">Email</Text>
                    <Text>{getSetting('public_contact_email', 'info@salon.ba')}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="brand.400">Radno Vrijeme</Text>
                    <Text whiteSpace="pre-line">{getSetting('public_contact_working_hours_text', 'Pon - Sub: 09:00 - 18:00\nNedjelja: Zatvoreno')}</Text>
                  </Box>
                </VStack>
              </Box>
              
              {getSetting('public_contact_map_embed', '') ? (
                <Box rounded="2xl" overflow="hidden" shadow="sm" h="300px">
                  <iframe
                    src={getSetting('public_contact_map_embed', '')}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Lokacija salona"
                  />
                </Box>
              ) : (
                <Box rounded="2xl" overflow="hidden" shadow="sm" h="300px" bg="gray.200">
                  <Flex h="full" w="full" align="center" justify="center" direction="column" color="gray.500">
                    <Text fontWeight="bold">Google Mapa</Text>
                    <Text fontSize="sm">Lokacija salona</Text>
                  </Flex>
                </Box>
              )}
            </VStack>
          </MotionBox>
        </SimpleGrid>
      </Container>
    </Box>
  );
}