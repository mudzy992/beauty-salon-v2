import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  SimpleGrid,
  VStack,
  Flex,
  Image,
  Icon,
  Spinner,
  Link,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckCircleIcon, TimeIcon, StarIcon } from '@chakra-ui/icons';
import { useSettings } from '../../context/SettingsContext';
import api from '../../api/client';
import { getUploadUrl } from '../../utils/uploadUrl';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';

const MotionBox = motion(Box as any);
const MotionFlex = motion(Flex as any);

/** Defaultni parovi prije/poslije (s interneta) dok aplikacija nema dovoljno vlastitih. */
const DEFAULT_BEFORE_AFTER_PAIRS: BeforeAfterPair[] = [
  {
    id: 'default-1',
    before: { pathOriginal: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&q=80', pathMedium: null, pathThumb: null },
    after: { pathOriginal: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80', pathMedium: null, pathThumb: null },
  },
  {
    id: 'default-2',
    before: { pathOriginal: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&q=80', pathMedium: null, pathThumb: null },
    after: { pathOriginal: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80', pathMedium: null, pathThumb: null },
  },
  {
    id: 'default-3',
    before: { pathOriginal: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80', pathMedium: null, pathThumb: null },
    after: { pathOriginal: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', pathMedium: null, pathThumb: null },
  },
  {
    id: 'default-4',
    before: { pathOriginal: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80', pathMedium: null, pathThumb: null },
    after: { pathOriginal: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=80', pathMedium: null, pathThumb: null },
  },
  {
    id: 'default-5',
    before: { pathOriginal: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=80', pathMedium: null, pathThumb: null },
    after: { pathOriginal: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80', pathMedium: null, pathThumb: null },
  },
];

/** Vraća puni URL: ako je path već apsolutan (http), vraća ga; inače getUploadUrl. */
function getImageUrl(path: string): string {
  return path.startsWith('http') ? path : getUploadUrl(path);
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

interface BeforeAfterPair {
  id: string;
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null };
}

interface FeaturedReview {
  id: string;
  serviceRating: number;
  stylistRating: number | null;
  comment: string | null;
  user?: { firstName: string | null; lastName: string | null };
  service?: { name: string };
}

export default function PublicHome() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const [beforeAfterPairs, setBeforeAfterPairs] = useState<BeforeAfterPair[]>([]);
  const [beforeAfterLoading, setBeforeAfterLoading] = useState(true);
  const [featuredReview, setFeaturedReview] = useState<FeaturedReview | null>(null);
  const [featuredPairIndex, setFeaturedPairIndex] = useState(0);

  useEffect(() => {
    api
      .get<{ items: BeforeAfterPair[] }>('/api/daily-log/before-after', { params: { limit: 20, offset: 0 } })
      .then((r) => {
        const list = Array.isArray(r.data?.items) ? r.data.items : [];
        const shuffled = [...list].sort(() => Math.random() - 0.5);
        setBeforeAfterPairs(shuffled.slice(0, 6));
      })
      .catch(() => setBeforeAfterPairs([]))
      .finally(() => setBeforeAfterLoading(false));
  }, []);

  useEffect(() => {
    api.get<FeaturedReview | null>('/api/reviews/featured/random').then((r) => setFeaturedReview(r.data ?? null)).catch(() => setFeaturedReview(null));
  }, []);

  /** Parovi za prikaz: iz API-ja ako ima dovoljno (≥5), inače dopunjeno defaultima s interneta. */
  const displayPairs = useMemo(() => {
    if (beforeAfterPairs.length >= 5) return beforeAfterPairs.slice(0, 6);
    return [...beforeAfterPairs, ...DEFAULT_BEFORE_AFTER_PAIRS].slice(0, 6);
  }, [beforeAfterPairs]);

  const heroImage = getSetting('public_hero_image', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=2000');
  const heroTitle = getSetting('public_hero_title', 'Otkrijte Svoju\\nSavršenu Ljepotu');
  const heroSubtitle = getSetting('public_hero_subtitle', 'Vaš ekskluzivni muško-ženski frizerski salon. Prepustite se rukama profesionalaca za moderni rez i njegu kakvu zaslužujete.');

  const aboutImage = getSetting('public_about_image', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&q=80&w=800');
  const aboutTitle = getSetting('public_about_title', 'Vaša Kosa Je Naša Strast');
  const aboutText = getSetting('public_about_text', 'Beauty Salon Nejra je frizerski salon posvećen vrhunskoj njezi kose za muškarce i žene. Od prvog trenutka kada zakoračite u naš salon, naš cilj je da dobijete savršenu frizuru i osjećate se njegovano.');

  return (
    <Box bg="white">
      {/* HERO SECTION */}
      <Box
        position="relative"
        minH="90vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          w="full"
          h="full"
          backgroundImage={`url('${heroImage}')`}
          backgroundSize="cover"
          backgroundPosition="center"
          backgroundAttachment="fixed"
        />
        <Box
          position="absolute"
          top={0}
          left={0}
          w="full"
          h="full"
          bgGradient="linear(to-r, blackAlpha.800, blackAlpha.600)"
        />

        <Container maxW="container.lg" position="relative" zIndex={1} textAlign="center" color="white">
          <MotionBox initial="hidden" animate="visible" variants={staggerContainer}>
            <MotionBox variants={fadeUp}>
              <Text
                textTransform="uppercase"
                letterSpacing="widest"
                color="brand.300"
                fontWeight="bold"
                mb={4}
              >
                Elegancija & Stil
              </Text>
            </MotionBox>
            <MotionBox variants={fadeUp}>
              <Heading size="3xl" mb={6} lineHeight="shorter" fontWeight="light" whiteSpace="pre-line">
                {heroTitle.includes('\\n') ? (
                  <>
                    {heroTitle.split('\\n')[0]} <br />
                    <Text as="span" color="brand.300" fontWeight="bold">
                      {heroTitle.split('\\n').slice(1).join(' ')}
                    </Text>
                  </>
                ) : (
                  heroTitle
                )}
              </Heading>
            </MotionBox>
            <MotionBox variants={fadeUp}>
              <Text fontSize="xl" color="gray.300" mb={10} maxW="2xl" mx="auto">
                {heroSubtitle}
              </Text>
            </MotionBox>
            <MotionBox variants={fadeUp}>
              <Flex gap={4} justify="center" flexWrap="wrap">
                <Button
                  as={RouterLink}
                  to="/rezervacija"
                  size="lg"
                  colorScheme="brand"
                  px={8}
                  _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
                  transition="all 0.3s"
                >
                  {t('public.nav.reserve')}
                </Button>
                <Button
                  as={RouterLink}
                  to="/usluge"
                  size="lg"
                  variant="outline"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200', transform: 'translateY(-2px)' }}
                  transition="all 0.3s"
                >
                  Sve Usluge
                </Button>
              </Flex>
            </MotionBox>
          </MotionBox>
        </Container>
      </Box>

      {/* HIGHLIGHTS */}
      <Box py={20} bg="brand.50">
        <Container maxW="container.xl">
          <MotionFlex
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            direction={{ base: 'column', md: 'row' }}
            gap={8}
            justify="space-between"
          >
            {[
              { icon: StarIcon, title: getSetting('public_highlight_1_title', 'Najbolji Frizeri'), text: getSetting('public_highlight_1_text', 'Naš tim stalno prati svjetske trendove u šišanju i kolorizaciji.') },
              { icon: TimeIcon, title: getSetting('public_highlight_2_title', 'Ušteda Vremena'), text: getSetting('public_highlight_2_text', 'Brza i jednostavna online rezervacija vašeg termina.') },
              { icon: CheckCircleIcon, title: getSetting('public_highlight_3_title', 'Vrhunski Proizvodi'), text: getSetting('public_highlight_3_text', 'Koristimo isključivo profesionalne preparate za njegu vaše kose.') },
            ].map((item, idx) => (
              <MotionBox
                key={idx}
                variants={fadeUp}
                flex={1}
                bg="white"
                p={8}
                rounded="2xl"
                shadow="sm"
                textAlign="center"
                _hover={{ shadow: 'md', transform: 'translateY(-5px)' }}
                transition="all 0.3s"
              >
                <Icon as={item.icon} w={10} h={10} color="brand.400" mb={4} />
                <Heading size="md" mb={2} color="brand.800">
                  {item.title}
                </Heading>
                <Text color="gray.600">{item.text}</Text>
              </MotionBox>
            ))}
          </MotionFlex>
        </Container>
      </Box>

      {/* ABOUT SECTION */}
      <Box id="onama" py={24}>
        <Container maxW="container.xl">
          <Flex direction={{ base: 'column', lg: 'row' }} gap={16} align="center">
            <MotionBox
              flex={1}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Box position="relative">
                <Image
                  src={aboutImage}
                  alt="Salon"
                  rounded="2xl"
                  shadow="2xl"
                  w="full"
                  h="600px"
                  objectFit="cover"
                />
                <Box
                  position="absolute"
                  bottom="-8"
                  right="-8"
                  bg="brand.400"
                  p={8}
                  rounded="2xl"
                  color="white"
                  display={{ base: 'none', md: 'block' }}
                >
                  <Heading size="2xl">10+</Heading>
                  <Text fontWeight="bold">Godina Iskustva</Text>
                </Box>
              </Box>
            </MotionBox>
            <MotionBox
              flex={1}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Text color="brand.400" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" mb={2}>
                {t('public.about.title')}
              </Text>
              <Heading size="2xl" mb={6} color="brand.900" lineHeight="shorter">
                {aboutTitle}
              </Heading>
              <Text fontSize="lg" color="gray.600" mb={6}>
                {aboutText}
              </Text>
              <VStack align="start" spacing={4} mb={8}>
                {['Profesionalni pristup', 'Individualno savjetovanje', 'Opuštajuća atmosfera'].map((t, i) => (
                  <Flex key={i} align="center" gap={3}>
                    <Icon as={CheckCircleIcon} color="brand.400" w={5} h={5} />
                    <Text fontSize="md" fontWeight="medium" color="gray.700">
                      {t}
                    </Text>
                  </Flex>
                ))}
              </VStack>
              <Button as={RouterLink} to="/rezervacija" size="lg" colorScheme="brand">
                Zakažite Termin
              </Button>
            </MotionBox>
          </Flex>
        </Container>
      </Box>

      {/* POPULAR SERVICES PEEK */}
      <Box py={24} bg="brand.900" color="white">
        <Container maxW="container.xl">
          <MotionBox
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            textAlign="center"
            mb={16}
          >
            <Text color="brand.400" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" mb={2}>
              {getSetting('public_services_peek_subtitle', 'Naša Ekspertiza')}
            </Text>
            <Heading size="2xl">{getSetting('public_services_peek_title', 'Popularne Frizerske Usluge')}</Heading>
          </MotionBox>

          <MotionFlex
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            direction={{ base: 'column', md: 'row' }}
            gap={8}
            mb={12}
          >
            {[
              { title: getSetting('public_service_1_title', 'Žensko i Muško Šišanje'), img: getSetting('public_service_1_img', 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=600') },
              { title: getSetting('public_service_2_title', 'Kolorizacija i Pramenovi'), img: getSetting('public_service_2_img', 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&q=80&w=600') },
              { title: getSetting('public_service_3_title', 'Keratinska Njega Kose'), img: getSetting('public_service_3_img', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=600') },
            ].map((srv, idx) => (
              <MotionBox
                key={idx}
                variants={fadeUp}
                flex={1}
                position="relative"
                rounded="2xl"
                overflow="hidden"
                role="group"
                h="300px"
              >
                <Image
                  src={srv.img}
                  alt={srv.title}
                  w="full"
                  h="full"
                  objectFit="cover"
                  transition="transform 0.5s"
                  _groupHover={{ transform: 'scale(1.1)' }}
                />
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  w="full"
                  h="full"
                  bgGradient="linear(to-t, blackAlpha.800, transparent)"
                />
                <Box position="absolute" bottom={0} left={0} w="full" p={6}>
                  <Heading size="md" color="white">
                    {srv.title}
                  </Heading>
                </Box>
              </MotionBox>
            ))}
          </MotionFlex>

          <Box textAlign="center">
            <Button as={RouterLink} to="/usluge" size="lg" variant="outline" colorScheme="brand" color="brand.300" _hover={{ bg: 'brand.800' }}>
              Pregledajte Sve Usluge
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ZADOVOLJNI KLIJENTI – V3 cinematic traka; defaultne slike s interneta dok nema dovoljno iz aplikacije */}
      <Box
        py={{ base: 20, md: 28 }}
        position="relative"
        overflow="hidden"
        bg="brand.900"
        _before={{
          content: '""',
          position: 'absolute',
          inset: 0,
          bgGradient: 'radial(ellipse 80% 50% at 50% 20%, rgba(154,123,40,0.08), transparent 60%)',
          pointerEvents: 'none',
        }}
      >
        <Container maxW="container.xl" position="relative" zIndex={1}>
          {(beforeAfterLoading && !featuredReview && beforeAfterPairs.length === 0) ? (
            <Flex justify="center" py={16}>
              <Spinner size="xl" color="brand.400" thickness="4px" />
            </Flex>
          ) : (
            <MotionBox initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              {/* Traka: [mala] [mala] [VELIKA] [mala] [mala] — displayPairs = API + defaulti ako treba */}
              {displayPairs.length > 0 && (
                <Flex
                  align="center"
                  justify="center"
                  gap={{ base: 2, sm: 4 }}
                  mb={{ base: 12, md: 16 }}
                  flexWrap={{ base: 'wrap', lg: 'nowrap' }}
                >
                  {[0, 1, 2, 3, 4].map((i) => {
                    const pair = displayPairs[i];
                    if (!pair) return null;
                    const isCenter = i === 2;
                    if (isCenter) {
                      const idx = Math.min(featuredPairIndex, displayPairs.length - 1);
                      const mainPair = displayPairs[idx] ?? displayPairs[0];
                      return (
                        <Box
                          key={`center-${mainPair.id}`}
                          w={{ base: '100%', sm: '280px', md: '320px', lg: '380px' }}
                          flexShrink={0}
                          rounded="2xl"
                          overflow="hidden"
                          boxShadow="0 30px 60px -15px rgba(0,0,0,0.6)"
                          borderWidth="2px"
                          borderColor="brand.500"
                        >
                          <BeforeAfterSlider
                            beforeSrc={getImageUrl(mainPair.before.pathMedium ?? mainPair.before.pathThumb ?? mainPair.before.pathOriginal)}
                            afterSrc={getImageUrl(mainPair.after.pathMedium ?? mainPair.after.pathThumb ?? mainPair.after.pathOriginal)}
                            alt="Transformacija"
                            aspectRatio={1}
                          />
                        </Box>
                      );
                    }
                    const thumbIndex = i < 2 ? i : i === 3 ? 3 : 4;
                    const pairForThumb = displayPairs[thumbIndex];
                    if (!pairForThumb) return null;
                    const isSelected = featuredPairIndex === thumbIndex;
                    return (
                      <Box
                        key={pairForThumb.id}
                        w={{ base: '72px', sm: '88px', md: '100px' }}
                        h={{ base: '72px', sm: '88px', md: '100px' }}
                        rounded="xl"
                        overflow="hidden"
                        flexShrink={0}
                        cursor="pointer"
                        onClick={() => setFeaturedPairIndex(thumbIndex)}
                        borderWidth="2px"
                        borderColor={isSelected ? 'brand.400' : 'whiteAlpha.200'}
                        _hover={{ borderColor: 'brand.400', transform: 'scale(1.05)' }}
                        transition="all 0.2s"
                      >
                        <Image
                          src={getImageUrl(pairForThumb.after.pathThumb ?? pairForThumb.after.pathMedium ?? pairForThumb.after.pathOriginal)}
                          alt=""
                          w="full"
                          h="full"
                          objectFit="cover"
                        />
                      </Box>
                    );
                  })}
                </Flex>
              )}
              {/* Citat ispod trake */}
              <Box textAlign="center" maxW="3xl" mx="auto">
                {featuredReview && (
                  <Flex justify="center" gap={1} mb={4}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <Icon key={j} as={StarIcon} color={j <= featuredReview.serviceRating ? 'brand.300' : 'whiteAlpha.300'} w={5} h={5} />
                    ))}
                  </Flex>
                )}
                <Text
                  as="blockquote"
                  fontSize={{ base: '1.35rem', md: '1.75rem', lg: '2rem' }}
                  color="white"
                  fontStyle="italic"
                  fontFamily="Georgia, serif"
                  lineHeight="1.4"
                  mb={4}
                >
                  <Text as="span" color="brand.400">„</Text>
                  {featuredReview?.comment || 'Naši klijenti dijele iskustva i transformacije. Pogledajte galeriju — budite sljedeći koji će nas preporučiti.'}
                  <Text as="span" color="brand.400">"</Text>
                </Text>
                <Box w="32px" h="1px" bg="brand.500" mx="auto" mb={3} />
                <Text color="brand.200" fontSize="sm" fontWeight="500">
                  — {featuredReview?.user?.firstName
                    ? `${featuredReview.user.firstName}${featuredReview.user.lastName ? ` ${featuredReview.user.lastName[0]}.` : ''}`
                    : 'Zadovoljni klijent'}
                  {featuredReview?.service?.name && (
                    <Text as="span" color="brand.400" fontWeight="400"> · {featuredReview.service.name}</Text>
                  )}
                </Text>
                <Link
                  as={RouterLink}
                  to="/zadovoljni-klijenti"
                  display="inline-flex"
                  alignItems="center"
                  gap={2}
                  mt={6}
                  color="brand.300"
                  fontSize="md"
                  fontWeight="500"
                  _hover={{ color: 'white' }}
                >
                  Pogledaj sve transformacije →
                </Link>
              </Box>
            </MotionBox>
          )}
        </Container>
      </Box>

      {/* CONTACT CTA */}
      <Box id="kontakt" py={20} bg="brand.100">
        <Container maxW="container.lg" textAlign="center">
          <MotionBox initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Heading size="xl" mb={4} color="brand.800">
              Spremni za promjenu?
            </Heading>
            <Text fontSize="lg" color="gray.700" mb={8}>
              Kontaktirajte nas ili rezervišite svoj termin online u nekoliko klikova.
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8} textAlign="left">
              <Box bg="white" p={6} rounded="xl" shadow="sm">
                <Text fontWeight="bold" color="brand.400" mb={1}>Adresa</Text>
                <Text color="gray.700">{getSetting('public_contact_address', 'Titova 12, 71000 Sarajevo')}</Text>
              </Box>
              <Box bg="white" p={6} rounded="xl" shadow="sm">
                <Text fontWeight="bold" color="brand.400" mb={1}>Telefon</Text>
                <Text color="gray.700">{getSetting('public_contact_phone', '+387 61 234 567')}</Text>
              </Box>
              <Box bg="white" p={6} rounded="xl" shadow="sm">
                <Text fontWeight="bold" color="brand.400" mb={1}>Radno Vrijeme</Text>
                <Text color="gray.700" whiteSpace="pre-line">{getSetting('public_contact_working_hours_text', 'Pon - Sub: 09:00 - 18:00')}</Text>
              </Box>
            </SimpleGrid>
            <Button as={RouterLink} to="/rezervacija" size="lg" colorScheme="brand" px={10}>
              Rezerviši Sada
            </Button>
          </MotionBox>
        </Container>
      </Box>
    </Box>
  );
}
