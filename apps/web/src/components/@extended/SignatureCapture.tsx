'use client';

import { useRef, useState, useCallback } from 'react';

// MATERIAL - UI
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// PROJECT IMPORTS
import MainCard from 'components/MainCard';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import SignatureConfirmationDialog from './SignatureConfirmationDialog';

// TYPES
import { SignatureCaptureProps, SignatureData } from 'types/signature';

// ==============================|| SIGNATURE CAPTURE - COMPLETE COMPONENT ||============================== //

export default function SignatureCapture({
  width = '100%',
  height = 200,
  penColor,
  backgroundColor,
  disabled = false,
  onSubmit,
  onCancel,
  title = 'Electronic Signature',
  legalText,
  requireConsent = true,
  consentLabel,
  loading = false,
  submitButtonText = 'Submit Signature',
  cancelButtonText = 'Cancel',
  placeholder,
  border,
  ariaLabel
}: SignatureCaptureProps) {
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleSignatureChange = useCallback((empty: boolean) => {
    setIsEmpty(empty);
  }, []);

  const handleSubmitClick = useCallback(() => {
    if (signaturePadRef.current) {
      const data = signaturePadRef.current.getSignatureData();
      if (data) {
        setSignatureData(data);
        setDialogOpen(true);
      }
    }
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSignatureData(null);
  }, []);

  const handleConfirm = useCallback(
    (data: SignatureData, consentChecked: boolean) => {
      onSubmit(data, consentChecked);
      setDialogOpen(false);
      setSignatureData(null);
      // Clear the signature pad after successful submission
      signaturePadRef.current?.clear();
    },
    [onSubmit]
  );

  const handleRedraw = useCallback(() => {
    setDialogOpen(false);
    setSignatureData(null);
    signaturePadRef.current?.clear();
  }, []);

  return (
    <>
      <MainCard title={title} content={false}>
        <Box sx={{ p: 2.5 }}>
          {/* Signature Pad */}
          <SignaturePad
            ref={signaturePadRef}
            width={width}
            height={height}
            penColor={penColor}
            backgroundColor={backgroundColor}
            disabled={disabled || loading}
            onSignatureChange={handleSignatureChange}
            placeholder={placeholder}
            border={border}
            ariaLabel={ariaLabel}
          />

          {/* Instructions */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 2 }}>
            Use your mouse, finger, or stylus to sign above. Click &quot;Clear&quot; to start over.
          </Typography>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {onCancel && (
              <Button
                color="error"
                variant="outlined"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelButtonText}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleSubmitClick}
              disabled={disabled || loading || isEmpty}
            >
              {submitButtonText}
            </Button>
          </Stack>
        </Box>
      </MainCard>

      {/* Confirmation Dialog */}
      <SignatureConfirmationDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onConfirm={handleConfirm}
        onRedraw={handleRedraw}
        signatureData={signatureData}
        legalText={legalText}
        requireConsent={requireConsent}
        consentLabel={consentLabel}
        loading={loading}
      />
    </>
  );
}
