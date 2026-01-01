'use client';

import { useState, useEffect } from 'react';

// MATERIAL - UI
import { useTheme } from '@mui/material/styles';
import Modal from '@mui/material/Modal';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

// PROJECT IMPORTS
import MainCard from 'components/MainCard';

// TYPES
import { SignatureConfirmationDialogProps } from 'types/signature';

// UTILS
import { format } from 'date-fns';

// ==============================|| SIGNATURE CONFIRMATION DIALOG ||============================== //

const DEFAULT_LEGAL_TEXT =
  'By confirming this signature, I acknowledge that I am signing this document electronically ' +
  'and that this electronic signature is the legal equivalent of my manual/handwritten signature. ' +
  'I understand that my electronic signature on this document is binding.';

const DEFAULT_CONSENT_LABEL =
  'I confirm that I have read and understood the above statement and agree to sign electronically.';

export default function SignatureConfirmationDialog({
  open,
  onClose,
  onConfirm,
  onRedraw,
  signatureData,
  title = 'Confirm Your Signature',
  legalText = DEFAULT_LEGAL_TEXT,
  requireConsent = true,
  consentLabel = DEFAULT_CONSENT_LABEL,
  loading = false
}: SignatureConfirmationDialogProps) {
  const theme = useTheme();
  const [consentChecked, setConsentChecked] = useState(false);

  // Reset consent checkbox when dialog opens
  useEffect(() => {
    if (open) {
      setConsentChecked(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (signatureData) {
      onConfirm(signatureData, consentChecked);
    }
  };

  const canConfirm = !requireConsent || consentChecked;

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      aria-labelledby="signature-confirmation-title"
      aria-describedby="signature-confirmation-description"
    >
      <MainCard
        title={title}
        modal
        darkTitle
        content={false}
        sx={{
          width: { xs: '90%', sm: 500, md: 600 },
          maxWidth: '100%'
        }}
      >
        <CardContent>
          {/* Signature Preview */}
          <Box
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              p: 2,
              mb: 2,
              backgroundColor: theme.palette.grey[50],
              textAlign: 'center'
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Your Signature
            </Typography>
            {signatureData ? (
              <Box
                component="img"
                src={signatureData.dataUrl}
                alt="Your signature"
                sx={{
                  maxWidth: '100%',
                  maxHeight: 150,
                  objectFit: 'contain'
                }}
              />
            ) : (
              <Typography color="text.disabled">No signature captured</Typography>
            )}
          </Box>

          {/* Timestamp */}
          {signatureData && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Captured on: {format(signatureData.timestamp, 'MMMM d, yyyy \'at\' h:mm:ss a')}
            </Typography>
          )}

          {/* Legal Text */}
          <Box
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: theme.palette.warning.lighter,
              borderRadius: 1,
              border: `1px solid ${theme.palette.warning.light}`
            }}
          >
            <Typography
              variant="body2"
              id="signature-confirmation-description"
              sx={{ color: theme.palette.warning.darker }}
            >
              {legalText}
            </Typography>
          </Box>

          {/* Consent Checkbox */}
          {requireConsent && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  disabled={loading}
                  color="primary"
                  inputProps={{
                    'aria-label': consentLabel
                  }}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  {consentLabel}
                </Typography>
              }
              sx={{ mb: 1, alignItems: 'flex-start' }}
            />
          )}
        </CardContent>

        <Divider />

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 2.5, py: 2 }}>
          <Button
            color="secondary"
            size="small"
            onClick={onRedraw}
            disabled={loading}
          >
            Redraw
          </Button>
          <Button
            color="error"
            size="small"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirm}
            disabled={loading || !canConfirm || !signatureData}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Confirming...' : 'Confirm Signature'}
          </Button>
        </Stack>
      </MainCard>
    </Modal>
  );
}
