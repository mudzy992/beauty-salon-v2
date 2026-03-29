import { ReactNode } from 'react'
import {
  Box,
  Card,
  CardBody,
  HStack,
  Text,
  VStack,
  Icon,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react'
import { IconType } from 'react-icons'
import {
  IoLockClosedOutline,
  IoKeyOutline,
  IoMaleFemaleOutline,
  IoPersonOutline,
  IoMailOutline,
  IoSendOutline,
  IoCallOutline,
  IoChatbubbleEllipsesOutline,
} from 'react-icons/io5'
import { FiInfo } from 'react-icons/fi'

export type HeroDecoration = 'lock' | 'gender' | 'mail' | 'phone' | 'none'

type Props = {
  step: number
  totalSteps: number
  title: string
  subtitle: string
  tip?: string
  /** Velike ikone u pozadini (isto kao mobile OnboardingShell) */
  heroDecoration?: HeroDecoration
  /** Mali ikon u zaglavlju; ako nije zadan, bira se prema heroDecoration */
  icon?: IconType
  children: ReactNode
}

const headerIconForDecoration = (d: HeroDecoration): IconType | undefined => {
  switch (d) {
    case 'lock':
      return IoLockClosedOutline
    case 'gender':
      return IoMaleFemaleOutline
    case 'mail':
      return IoMailOutline
    case 'phone':
      return IoCallOutline
    default:
      return undefined
  }
}

export default function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  tip,
  heroDecoration = 'none',
  icon: iconProp,
  children,
}: Props) {
  const bg = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200')
  const muted = useColorModeValue('gray.600', 'gray.400')
  const dotsInactive = useColorModeValue('gray.200', 'whiteAlpha.200')
  const brand = useColorModeValue('brand.500', 'brand.400')
  const tipBoxBg = useColorModeValue('gray.50', 'whiteAlpha.50')
  const mainOp = useColorModeValue(0.07, 0.12)
  const accentOp = useColorModeValue(0.11, 0.2)
  const decoSize = useBreakpointValue({ base: 160, md: 220 }) ?? 200

  const headerIcon = iconProp ?? headerIconForDecoration(heroDecoration)

  const deco =
    heroDecoration === 'lock'
      ? {
          main: IoLockClosedOutline,
          accent: IoKeyOutline,
          accentScale: 0.28,
        }
      : heroDecoration === 'gender'
        ? {
            main: IoMaleFemaleOutline,
            accent: IoPersonOutline,
            accentScale: 0.3,
          }
        : heroDecoration === 'mail'
          ? {
              main: IoMailOutline,
              accent: IoSendOutline,
              accentScale: 0.26,
            }
          : heroDecoration === 'phone'
            ? {
                main: IoCallOutline,
                accent: IoChatbubbleEllipsesOutline,
                accentScale: 0.28,
              }
            : null

  return (
    <Box minH="100vh" bg={bg} py={{ base: 10, md: 14 }} px={4} position="relative" overflow="hidden">
      {deco ? (
        <Box position="absolute" inset={0} pointerEvents="none" zIndex={0} overflow="hidden">
          <Icon
            as={deco.main}
            position="absolute"
            right="-28px"
            bottom="12%"
            w={`${decoSize}px`}
            h={`${decoSize}px`}
            color={brand}
            opacity={mainOp}
          />
          <Icon
            as={deco.accent}
            position="absolute"
            right="32px"
            top="18%"
            w={`${decoSize * deco.accentScale}px`}
            h={`${decoSize * deco.accentScale}px`}
            color={brand}
            opacity={accentOp}
          />
        </Box>
      ) : null}

      <Box position="relative" zIndex={1}>
        <Card
          maxW="lg"
          mx="auto"
          bg={cardBg}
          borderWidth="1px"
          borderColor={borderColor}
          shadow="sm"
          overflow="hidden"
        >
          <CardBody p={{ base: 6, md: 8 }}>
            <VStack align="stretch" spacing={6}>
              <HStack spacing={2} align="center">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <Box
                    key={i}
                    w="10px"
                    h="10px"
                    borderRadius="full"
                    bg={i < step ? 'brand.500' : dotsInactive}
                    opacity={i < step ? 1 : 0.6}
                  />
                ))}
                <Text ml="auto" fontSize="sm" color={muted} fontWeight="600">
                  {step}/{totalSteps}
                </Text>
              </HStack>

              <HStack spacing={3} align="flex-start">
                {headerIcon ? (
                  <Box
                    flexShrink={0}
                    w="44px"
                    h="44px"
                    borderRadius="16px"
                    bg="brand.50"
                    _dark={{ bg: 'whiteAlpha.100' }}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={headerIcon} color="brand.500" boxSize={5} />
                  </Box>
                ) : null}
                <Box>
                  <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" lineHeight="1.15">
                    {title}
                  </Text>
                  <Text mt={2} color={muted} fontSize="md" lineHeight="1.6">
                    {subtitle}
                  </Text>
                </Box>
              </HStack>

              {tip ? (
                <HStack
                  spacing={3}
                  p={4}
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderRadius="16px"
                  bg={tipBoxBg}
                  align="flex-start"
                >
                  <Icon as={FiInfo} color="brand.500" boxSize={5} mt="2px" />
                  <Text fontSize="sm" lineHeight="1.55">
                    {tip}
                  </Text>
                </HStack>
              ) : null}

              <Box>{children}</Box>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    </Box>
  )
}
