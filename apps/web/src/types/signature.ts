// ==============================|| TYPES - SIGNATURE  ||============================== //

export interface SignatureData {
  /** Base64 encoded image data (PNG format) */
  dataUrl: string;
  /** Timestamp when signature was captured */
  timestamp: Date;
  /** Width of the signature canvas */
  width: number;
  /** Height of the signature canvas */
  height: number;
}

export interface SignaturePadProps {
  /** Width of the signature pad (default: 100%) */
  width?: number | string;
  /** Height of the signature pad (default: 200px) */
  height?: number;
  /** Pen color (default: #000000) */
  penColor?: string;
  /** Background color (default: #ffffff) */
  backgroundColor?: string;
  /** Whether the pad is disabled */
  disabled?: boolean;
  /** Callback when signature changes */
  onSignatureChange?: (isEmpty: boolean) => void;
  /** Callback when signature is cleared */
  onClear?: () => void;
  /** Placeholder text when no signature */
  placeholder?: string;
  /** Border style */
  border?: 'solid' | 'dashed' | 'none';
  /** Accessibility label */
  ariaLabel?: string;
}

export interface SignatureConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when signature is confirmed */
  onConfirm: (signatureData: SignatureData, consentChecked: boolean) => void;
  /** Callback when user wants to redraw */
  onRedraw: () => void;
  /** The captured signature data to display */
  signatureData: SignatureData | null;
  /** Title for the dialog */
  title?: string;
  /** Legal/compliance message text */
  legalText?: string;
  /** Whether to require consent checkbox */
  requireConsent?: boolean;
  /** Label for the consent checkbox */
  consentLabel?: string;
  /** Loading state during submission */
  loading?: boolean;
}

export interface SignatureCaptureProps extends Omit<SignaturePadProps, 'onSignatureChange'> {
  /** Callback when signature is submitted */
  onSubmit: (signatureData: SignatureData, consentChecked: boolean) => void;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Title for the signature capture */
  title?: string;
  /** Legal/compliance message text for confirmation */
  legalText?: string;
  /** Whether to require consent checkbox */
  requireConsent?: boolean;
  /** Label for the consent checkbox */
  consentLabel?: string;
  /** Loading state during submission */
  loading?: boolean;
  /** Text for submit button */
  submitButtonText?: string;
  /** Text for cancel button */
  cancelButtonText?: string;
}
