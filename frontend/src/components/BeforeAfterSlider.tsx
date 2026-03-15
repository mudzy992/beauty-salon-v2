import { useRef, useState, useCallback } from 'react';
import { Box, Image } from '@chakra-ui/react';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  alt?: string;
  aspectRatio?: number;
}

export function BeforeAfterSlider({ beforeSrc, afterSrc, alt = '', aspectRatio = 4 / 3 }: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      setPosition(x);
    },
    [],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX);
      const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [handleMove],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    },
    [handleMove],
  );

  const afterImageWidth = position > 0 ? 10000 / position + '%' : '100%';

  return (
    <Box
      ref={containerRef}
      position="relative"
      w="full"
      overflow="hidden"
      rounded="xl"
      bg="gray.200"
      cursor="col-resize"
      userSelect="none"
      onMouseDown={onMouseDown}
      onTouchMove={onTouchMove}
      onTouchStart={(e) => e.touches[0] && handleMove(e.touches[0].clientX)}
      sx={{ touchAction: 'none' }}
      aspectRatio={aspectRatio}
    >
      {/* Before (background) */}
      <Box position="absolute" inset={0}>
        <Image src={beforeSrc} alt={alt} w="full" h="full" objectFit="cover" />
      </Box>
      {/* After (clipped) */}
      <Box position="absolute" top={0} left={0} w={`${position}%`} h="full" overflow="hidden">
        <Image
          src={afterSrc}
          alt={alt}
          h="full"
          objectFit="cover"
          style={{ width: afterImageWidth, minWidth: '100%' }}
        />
      </Box>
      {/* Slider handle */}
      <Box
        position="absolute"
        top={0}
        left={`${position}%`}
        w="4px"
        h="full"
        bg="white"
        boxShadow="0 0 12px rgba(0,0,0,0.4)"
        transform="translateX(-2px)"
        pointerEvents="none"
        zIndex={2}
      >
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          w="40px"
          h="40px"
          rounded="full"
          bg="white"
          boxShadow="md"
          borderWidth="2px"
          borderColor="gray.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="lg"
          pointerEvents="none"
        >
          ⟷
        </Box>
      </Box>
    </Box>
  );
}
