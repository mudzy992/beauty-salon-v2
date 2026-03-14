import { useEffect, useState, useMemo, useRef, useCallback, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Spinner,
  useToast,
  FormControl,
  FormLabel,
  Textarea,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
  Flex,
  IconButton,
  Badge,
  HStack,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import {
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TimeIcon,
  CheckCircleIcon,
} from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import api from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { useSocketEvent } from '../../context/SocketContext';

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  price?: string;
  shortDescription?: string;
  subcategory?: { name: string; category?: { name: string } };
}

interface DateAvailability {
  date: string;
  available: boolean;
}

interface SlotOption {
  startTime: string;
  endTime: string;
  availableStylistCount: number;
}

const MotionContainer = motion(Container as any);
const MotionBox = motion(Box as any);

const MONTHS_BS = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
];

function ServiceAutocomplete({
  services,
  loading,
  selected,
  onSelect,
}: {
  services: ServiceOption[];
  loading: boolean;
  selected: ServiceOption | null;
  onSelect: (s: ServiceOption | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return services;
    const q = query.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.subcategory?.name?.toLowerCase().includes(q) ||
        s.subcategory?.category?.name?.toLowerCase().includes(q),
    );
  }, [query, services]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selected) {
    return (
      <Flex
        p={3}
        bg="brand.50"
        rounded="lg"
        borderWidth="2px"
        borderColor="brand.400"
        align="center"
        justify="space-between"
      >
        <Box>
          <Text fontWeight="bold" color="brand.800">{selected.name}</Text>
          <HStack spacing={3} mt={1}>
            <Badge colorScheme="brand" fontSize="xs">
              <Icon as={TimeIcon} mr={1} />{selected.durationMinutes} min
            </Badge>
            {selected.price && (
              <Badge colorScheme="green" fontSize="xs">{selected.price} KM</Badge>
            )}
            {selected.subcategory?.category && (
              <Text fontSize="xs" color="gray.500">
                {selected.subcategory.category.name} → {selected.subcategory.name}
              </Text>
            )}
          </HStack>
        </Box>
        <Button size="sm" variant="ghost" onClick={() => { onSelect(null); setQuery(''); }}>
          Promijeni
        </Button>
      </Flex>
    );
  }

  return (
    <Box ref={wrapperRef} position="relative">
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          {loading ? <Spinner size="sm" /> : <SearchIcon color="gray.400" />}
        </InputLeftElement>
        <Input
          placeholder="Pretražite usluge po imenu..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          bg="white"
          borderColor="gray.200"
          _focus={{ borderColor: 'brand.400', boxShadow: '0 0 0 1px var(--chakra-colors-brand-400)' }}
        />
      </InputGroup>
      {isOpen && !loading && (
        <List
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          rounded="lg"
          shadow="xl"
          maxH="280px"
          overflowY="auto"
          zIndex={20}
        >
          {filtered.length === 0 ? (
            <ListItem p={3}>
              <Text color="gray.500" fontSize="sm">Nema rezultata.</Text>
            </ListItem>
          ) : (
            filtered.map((s) => (
              <ListItem
                key={s.id}
                p={3}
                cursor="pointer"
                _hover={{ bg: 'brand.50' }}
                borderBottomWidth="1px"
                borderColor="gray.100"
                onClick={() => { onSelect(s); setIsOpen(false); setQuery(''); }}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="600" fontSize="sm">{s.name}</Text>
                    {s.subcategory?.category && (
                      <Text fontSize="xs" color="gray.500">
                        {s.subcategory.category.name} → {s.subcategory.name}
                      </Text>
                    )}
                  </Box>
                  <HStack spacing={2}>
                    <Badge colorScheme="brand" fontSize="xs">{s.durationMinutes} min</Badge>
                    {s.price && <Badge colorScheme="green" fontSize="xs">{s.price} KM</Badge>}
                  </HStack>
                </Flex>
              </ListItem>
            ))
          )}
        </List>
      )}
    </Box>
  );
}

function ReservationCalendar({
  availableDates,
  selectedDate,
  onSelectDate,
  loading,
  disabled,
}: {
  availableDates: Map<string, boolean>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  loading: boolean;
  disabled: boolean;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const daysInMonth = useMemo(() => {
    const { year, month } = currentMonth;
    return new Date(year, month + 1, 0).getDate();
  }, [currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    const { year, month } = currentMonth;
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const canGoPrev = useMemo(() => {
    const now = new Date();
    return currentMonth.year > now.getFullYear() ||
      (currentMonth.year === now.getFullYear() && currentMonth.month > now.getMonth());
  }, [currentMonth]);

  const cells = useMemo(() => {
    const result: Array<{ day: number; dateStr: string; available: boolean; isPast: boolean; isToday: boolean }> = [];
    const { year, month } = currentMonth;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateStr < today;
      const available = !isPast && (availableDates.get(dateStr) ?? false);
      result.push({ day: d, dateStr, available, isPast, isToday: dateStr === today });
    }
    return result;
  }, [currentMonth, daysInMonth, today, availableDates]);

  if (loading) {
    return (
      <Flex justify="center" align="center" h="200px">
        <Spinner size="lg" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={4}>
      <Flex justify="space-between" align="center" mb={4}>
        <IconButton
          aria-label="Prethodni mjesec"
          icon={<ChevronLeftIcon />}
          onClick={prevMonth}
          size="sm"
          variant="ghost"
          isDisabled={!canGoPrev || disabled}
        />
        <Text fontWeight="bold" fontSize="md" color="brand.700">
          {MONTHS_BS[currentMonth.month]} {currentMonth.year}
        </Text>
        <IconButton
          aria-label="Sljedeći mjesec"
          icon={<ChevronRightIcon />}
          onClick={nextMonth}
          size="sm"
          variant="ghost"
          isDisabled={disabled}
        />
      </Flex>

      <SimpleGrid columns={7} spacing={1} mb={2}>
        {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map((d) => (
          <Box key={d} textAlign="center" py={1}>
            <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
              {d}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={7} spacing={1}>
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <Box key={`empty-${i}`} h="40px" />
        ))}
        {cells.map(({ day, dateStr, available, isPast, isToday }) => {
          const isSelected = dateStr === selectedDate;
          return (
            <Tooltip
              key={dateStr}
              label={available ? 'Dostupan' : isPast ? 'Prošao' : 'Nedostupan'}
              placement="top"
              hasArrow
              isDisabled={disabled}
            >
              <Button
                h="40px"
                w="full"
                size="sm"
                variant="ghost"
                isDisabled={!available || disabled}
                bg={isSelected ? 'brand.500' : isToday && !isPast ? 'brand.50' : 'transparent'}
                color={isSelected ? 'white' : !available ? 'gray.300' : 'gray.700'}
                fontWeight={isToday ? 'bold' : 'normal'}
                borderWidth={isToday ? '2px' : '0'}
                borderColor={isToday ? 'brand.300' : 'transparent'}
                _hover={available ? { bg: isSelected ? 'brand.600' : 'brand.100' } : {}}
                _disabled={{ opacity: 0.3, cursor: 'not-allowed', _hover: {} }}
                onClick={() => available && onSelectDate(dateStr)}
              >
                {day}
              </Button>
            </Tooltip>
          );
        })}
      </SimpleGrid>

      <HStack mt={3} spacing={4} justify="center">
        <HStack spacing={1}>
          <Box w="10px" h="10px" rounded="full" bg="brand.500" />
          <Text fontSize="xs" color="gray.600">Odabrano</Text>
        </HStack>
        <HStack spacing={1}>
          <Box w="10px" h="10px" rounded="full" bg="brand.100" borderWidth="1px" borderColor="brand.300" />
          <Text fontSize="xs" color="gray.600">Dostupno</Text>
        </HStack>
        <HStack spacing={1}>
          <Box w="10px" h="10px" rounded="full" bg="gray.200" />
          <Text fontSize="xs" color="gray.600">Nedostupno</Text>
        </HStack>
      </HStack>
    </Box>
  );
}

export default function PublicReserve() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [availableDatesMap, setAvailableDatesMap] = useState<Map<string, boolean>>(new Map());
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/rezervacija' } });
      return;
    }
    api
      .get<ServiceOption[]>('/api/services', { params: { activeOnly: 'true' } })
      .then((r) => setServices(Array.isArray(r.data) ? r.data : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, [user, navigate]);

  const loadAvailability = useCallback((serviceId: string) => {
    setLoadingDates(true);
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 60);
    api
      .get<DateAvailability[]>('/api/reservations/availability/dates', {
        params: {
          serviceId,
          fromDate: from.toISOString().slice(0, 10),
          toDate: to.toISOString().slice(0, 10),
        },
      })
      .then((r) => {
        const map = new Map<string, boolean>();
        if (Array.isArray(r.data)) {
          r.data.forEach((d) => map.set(d.date, d.available));
        }
        setAvailableDatesMap(map);
      })
      .catch(() => setAvailableDatesMap(new Map()))
      .finally(() => setLoadingDates(false));
  }, []);

  useEffect(() => {
    if (!selectedService) {
      setAvailableDatesMap(new Map());
      setSelectedDate('');
      setSlots([]);
      setSelectedSlot(null);
      setStep(1);
      return;
    }
    setStep(2);
    loadAvailability(selectedService.id);
    setSelectedDate('');
    setSlots([]);
    setSelectedSlot(null);
  }, [selectedService, loadAvailability]);

  useEffect(() => {
    if (!selectedService || !selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    setLoadingSlots(true);
    setStep(3);
    api
      .get<SlotOption[]>('/api/reservations/availability/slots', {
        params: { serviceId: selectedService.id, date: selectedDate },
      })
      .then((r) => setSlots(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSlots([]))
      .finally(() => {
        setLoadingSlots(false);
        setSelectedSlot(null);
      });
  }, [selectedService, selectedDate]);

  useSocketEvent('availability:changed', useCallback((data: unknown) => {
    const d = data as { serviceId: string; date: string };
    if (selectedService && d.serviceId === selectedService.id) {
      loadAvailability(selectedService.id);
      if (selectedDate === d.date) {
        api
          .get<SlotOption[]>('/api/reservations/availability/slots', {
            params: { serviceId: selectedService.id, date: selectedDate },
          })
          .then((r) => setSlots(Array.isArray(r.data) ? r.data : []))
          .catch(() => {});
      }
    }
  }, [selectedService, selectedDate, loadAvailability]));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    try {
      await api.post('/api/reservations', {
        serviceId: selectedService.id,
        reservationDate: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        ...(notes.trim() && { clientNotes: notes.trim() }),
      });
      toast({
        title: t('public.reserve.success'),
        description: `${selectedService.name} - ${new Date(selectedDate).toLocaleDateString('bs-BA')} u ${selectedSlot.start}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setSelectedService(null);
      setSelectedDate('');
      setSelectedSlot(null);
      setNotes('');
      setStep(1);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('common.error');
      toast({ title: message, status: 'error', isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Box minH="100vh" pt={10} pb={20} position="relative" bg="gray.50">
      <Box
        position="absolute"
        top={0}
        left={0}
        w="full"
        h="full"
        backgroundImage={`url('${getSetting('public_reserve_bg', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=2000')}')`}
        backgroundSize="cover"
        backgroundPosition="center"
        backgroundAttachment="fixed"
        opacity={0.12}
      />
      <MotionContainer
        maxW="container.md"
        py={12}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        position="relative"
        zIndex={1}
      >
        <Box
          bg="whiteAlpha.900"
          backdropFilter="blur(12px)"
          p={{ base: 6, md: 10 }}
          rounded="2xl"
          shadow="2xl"
          borderWidth="1px"
          borderColor="whiteAlpha.500"
        >
          <Heading size="xl" mb={2} color="brand.800" textAlign="center">
            {getSetting('public_reserve_title', 'Rezervišite Vaš Termin')}
          </Heading>
          <Text color="gray.600" textAlign="center" mb={4}>
            {getSetting('public_reserve_subtitle', 'Osigurajte svoje vrijeme za savršenu frizuru u nekoliko jednostavnih koraka.')}
          </Text>

          <HStack justify="center" mb={8} spacing={0}>
            {[1, 2, 3, 4].map((s) => (
              <Flex key={s} align="center">
                <Flex
                  w="32px"
                  h="32px"
                  rounded="full"
                  align="center"
                  justify="center"
                  bg={step >= s ? 'brand.500' : 'gray.200'}
                  color={step >= s ? 'white' : 'gray.500'}
                  fontWeight="bold"
                  fontSize="sm"
                  transition="all 0.3s"
                >
                  {step > s ? <CheckCircleIcon /> : s}
                </Flex>
                {s < 4 && (
                  <Box w="40px" h="2px" bg={step > s ? 'brand.500' : 'gray.200'} transition="all 0.3s" />
                )}
              </Flex>
            ))}
          </HStack>

          <form onSubmit={handleSubmit}>
            <VStack align="stretch" spacing={6}>
              <FormControl>
                <FormLabel fontWeight="600" color="brand.700">
                  {t('public.reserve.selectService')}
                </FormLabel>
                <ServiceAutocomplete
                  services={services}
                  loading={loadingServices}
                  selected={selectedService}
                  onSelect={setSelectedService}
                />
              </FormControl>

              {selectedService && (
                <MotionBox
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <FormControl>
                    <FormLabel fontWeight="600" color="brand.700">
                      {t('public.reserve.selectDate')}
                    </FormLabel>
                    <ReservationCalendar
                      availableDates={availableDatesMap}
                      selectedDate={selectedDate}
                      onSelectDate={(d) => setSelectedDate(d)}
                      loading={loadingDates}
                      disabled={!selectedService}
                    />
                  </FormControl>
                </MotionBox>
              )}

              {selectedDate && (
                <MotionBox
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <FormControl>
                    <FormLabel fontWeight="600" color="brand.700">
                      {t('public.reserve.selectTime')}
                      <Text as="span" fontWeight="normal" color="gray.500" ml={2} fontSize="sm">
                        ({new Date(selectedDate).toLocaleDateString('bs-BA', { weekday: 'long', day: 'numeric', month: 'long' })})
                      </Text>
                    </FormLabel>
                    {loadingSlots ? (
                      <Flex justify="center" py={4}>
                        <Spinner size="md" color="brand.500" />
                      </Flex>
                    ) : slots.length === 0 ? (
                      <Box p={4} bg="orange.50" rounded="lg" borderWidth="1px" borderColor="orange.200">
                        <Text color="orange.700" fontSize="sm" textAlign="center">
                          Nema dostupnih termina za odabrani datum. Pokušajte drugi datum.
                        </Text>
                      </Box>
                    ) : (
                      <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} spacing={2}>
                        {slots.map((slot) => {
                          const isSelected =
                            selectedSlot?.start === slot.startTime &&
                            selectedSlot?.end === slot.endTime;
                          return (
                            <Button
                              key={`${slot.startTime}-${slot.endTime}`}
                              type="button"
                              size="md"
                              variant={isSelected ? 'solid' : 'outline'}
                              colorScheme={isSelected ? 'brand' : 'gray'}
                              bg={isSelected ? 'brand.500' : 'white'}
                              color={isSelected ? 'white' : 'gray.700'}
                              borderColor={isSelected ? 'brand.500' : 'gray.200'}
                              _hover={
                                isSelected
                                  ? { bg: 'brand.600' }
                                  : { bg: 'brand.50', borderColor: 'brand.300' }
                              }
                              onClick={() => {
                                setSelectedSlot({ start: slot.startTime, end: slot.endTime });
                                setStep(4);
                              }}
                              position="relative"
                            >
                              <VStack spacing={0}>
                                <Text fontSize="sm" fontWeight="bold">{slot.startTime}</Text>
                                <Text fontSize="xs" opacity={0.7}>
                                  {slot.availableStylistCount} {slot.availableStylistCount === 1 ? 'stilist' : 'stilista'}
                                </Text>
                              </VStack>
                            </Button>
                          );
                        })}
                      </SimpleGrid>
                    )}
                  </FormControl>
                </MotionBox>
              )}

              {selectedSlot && (
                <MotionBox
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <FormControl>
                    <FormLabel fontWeight="600" color="brand.700">
                      {t('public.reserve.notes')}
                    </FormLabel>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Posebne želje, napomene za stilista..."
                      bg="white"
                      borderColor="gray.200"
                      _focus={{ borderColor: 'brand.400' }}
                    />
                  </FormControl>

                  <Box
                    mt={4}
                    p={4}
                    bg="brand.50"
                    rounded="lg"
                    borderWidth="1px"
                    borderColor="brand.200"
                  >
                    <Text fontWeight="bold" color="brand.800" mb={2}>Pregled rezervacije:</Text>
                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Usluga</Text>
                        <Text fontWeight="600">{selectedService?.name}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Trajanje</Text>
                        <Text fontWeight="600">{selectedService?.durationMinutes} minuta</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Datum</Text>
                        <Text fontWeight="600">
                          {new Date(selectedDate).toLocaleDateString('bs-BA', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Termin</Text>
                        <Text fontWeight="600">{selectedSlot.start} - {selectedSlot.end}</Text>
                      </Box>
                    </SimpleGrid>
                  </Box>

                  <Button
                    mt={4}
                    w="full"
                    type="submit"
                    colorScheme="brand"
                    size="lg"
                    isLoading={submitting}
                    loadingText="Slanje rezervacije..."
                    isDisabled={!selectedSlot}
                    _hover={{ transform: 'translateY(-1px)', shadow: 'lg' }}
                    transition="all 0.2s"
                  >
                    {t('public.reserve.submit')}
                  </Button>
                </MotionBox>
              )}
            </VStack>
          </form>
        </Box>
      </MotionContainer>
    </Box>
  );
}
