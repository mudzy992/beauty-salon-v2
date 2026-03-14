import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    50: '#FBF6EB',
    100: '#F5E6CC',
    200: '#E8C98B',
    300: '#D4A843',
    400: '#B8922F',
    500: '#9A7B28',
    600: '#7A6220',
    700: '#5C4A18',
    800: '#3D3110',
    900: '#1A1A1A',
  },
  gray: {
    850: '#2D2D2D',
  },
  rose: {
    100: '#E8D4DC',
    300: '#C98BA0',
    500: '#B07085',
  },
};

const theme = extendTheme({
  colors,
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Link: {
      baseStyle: {
        _hover: { textDecoration: 'none' },
      },
    },
  },
});

export default theme;
