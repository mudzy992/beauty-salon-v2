import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';

export default function NotFound() {
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50" px={4}>
      <VStack spacing={6} textAlign="center">
        <Heading size="2xl" color="gray.700">
          404
        </Heading>
        <Text color="gray.600" fontSize="lg">
          Stranica nije pronađena.
        </Text>
        <Button as={RouterLink} to="/" colorScheme="brand" size="lg">
          Nazad na početnu
        </Button>
      </VStack>
    </Box>
  );
}
