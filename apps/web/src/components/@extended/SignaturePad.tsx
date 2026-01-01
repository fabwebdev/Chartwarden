'use client';

import { forwardRef, useRef, useImperativeHandle, useCallback, useState, useEffect, Ref } from 'react';
import SignatureCanvas from 'react-signature-canvas';

// MATERIAL - UI
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

// ICONS
import { Refresh } from 'iconsax-react';

// TYPES
import { SignaturePadProps, SignatureData } from 'types/signature';

// ==============================|| SIGNATURE PAD - EXTENDED ||============================== //

export interface SignaturePadRef {
  /** Get the current signature data */
  getSignatureData: () => SignatureData | null;
  /** Check if the signature pad is empty */
  isEmpty: () => boolean;
  /** Clear the signature pad */
  clear: () => void;
  /** Get the signature as a data URL */
  toDataURL: (type?: string) => string;
}

const SignaturePad = forwardRef(
  (
    {
      width = '100%',
      height = 200,
      penColor = '#000000',
      backgroundColor = '#ffffff',
      disabled = false,
      onSignatureChange,
      onClear,
      placeholder = 'Sign here',
      border = 'dashed',
      ariaLabel = 'Signature pad'
    }: SignaturePadProps,
    ref: Ref<SignaturePadRef>
  ) => {
    const theme = useTheme();
    const canvasRef = useRef<SignatureCanvas>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [canvasWidth, setCanvasWidth] = useState<number>(0);

    // Calculate canvas width based on container
    useEffect(() => {
      const updateWidth = () => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.offsetWidth;
          setCanvasWidth(containerWidth);
        }
      };

      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }, [width]);

    const handleEnd = useCallback(() => {
      if (canvasRef.current) {
        const empty = canvasRef.current.isEmpty();
        setIsEmpty(empty);
        onSignatureChange?.(empty);
      }
    }, [onSignatureChange]);

    const handleClear = useCallback(() => {
      if (canvasRef.current) {
        canvasRef.current.clear();
        setIsEmpty(true);
        onSignatureChange?.(true);
        onClear?.();
      }
    }, [onSignatureChange, onClear]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getSignatureData: (): SignatureData | null => {
          if (!canvasRef.current || canvasRef.current.isEmpty()) {
            return null;
          }
          return {
            dataUrl: canvasRef.current.toDataURL('image/png'),
            timestamp: new Date(),
            width: canvasWidth,
            height: height
          };
        },
        isEmpty: () => canvasRef.current?.isEmpty() ?? true,
        clear: handleClear,
        toDataURL: (type = 'image/png') => canvasRef.current?.toDataURL(type) ?? ''
      }),
      [canvasWidth, height, handleClear]
    );

    const getBorderStyle = () => {
      const borderColor = theme.palette.divider;
      switch (border) {
        case 'solid':
          return `2px solid ${borderColor}`;
        case 'dashed':
          return `2px dashed ${borderColor}`;
        case 'none':
        default:
          return 'none';
      }
    };

    return (
      <Box
        ref={containerRef}
        sx={{
          width: width,
          position: 'relative'
        }}
      >
        {/* Signature Canvas Container */}
        <Box
          sx={{
            width: '100%',
            height: height,
            border: getBorderStyle(),
            borderRadius: 1,
            backgroundColor: disabled ? theme.palette.action.disabledBackground : backgroundColor,
            position: 'relative',
            overflow: 'hidden',
            cursor: disabled ? 'not-allowed' : 'crosshair',
            '&:focus-within': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2
            }
          }}
          role="application"
          aria-label={ariaLabel}
          tabIndex={disabled ? -1 : 0}
        >
          {/* Placeholder Text */}
          {isEmpty && (
            <Typography
              variant="body2"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: theme.palette.text.disabled,
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            >
              {placeholder}
            </Typography>
          )}

          {/* Signature Line */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 40,
              left: 20,
              right: 20,
              borderBottom: `1px solid ${theme.palette.divider}`,
              pointerEvents: 'none'
            }}
          />

          {/* X mark for signature line */}
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              bottom: 44,
              left: 20,
              color: theme.palette.text.disabled,
              pointerEvents: 'none'
            }}
          >
            X
          </Typography>

          {/* Canvas */}
          {canvasWidth > 0 && (
            <SignatureCanvas
              ref={canvasRef}
              penColor={penColor}
              backgroundColor={backgroundColor}
              canvasProps={{
                width: canvasWidth,
                height: height,
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: disabled ? 0.5 : 1,
                  pointerEvents: disabled ? 'none' : 'auto'
                }
              }}
              onEnd={handleEnd}
            />
          )}
        </Box>

        {/* Controls */}
        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1} sx={{ mt: 1 }}>
          <Button
            size="small"
            color="secondary"
            startIcon={<Refresh size={16} />}
            onClick={handleClear}
            disabled={disabled || isEmpty}
            sx={{ textTransform: 'none' }}
          >
            Clear
          </Button>
        </Stack>
      </Box>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
