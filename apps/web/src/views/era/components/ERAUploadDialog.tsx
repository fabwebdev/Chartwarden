'use client';

import { useState, useCallback, useRef } from 'react';

// Material-UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';

// Icons
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

// Project Imports
import { uploadERAFile, validateERAFile, formatFileSize, formatCurrency } from 'api/era';

// ==============================|| TYPES ||============================== //

interface ERAUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadState {
  file: File | null;
  validating: boolean;
  uploading: boolean;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    preview?: {
      payerName?: string;
      totalPayments?: number;
      totalAmount?: number;
      controlNumber?: string;
    };
  } | null;
  uploadResult: {
    success: boolean;
    fileId?: string;
    message: string;
  } | null;
  error: string | null;
}

// ==============================|| DROP ZONE ||============================== //

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const DropZone = ({ onFileSelect, disabled }: DropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [disabled, onFileSelect]
  );

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      sx={{
        border: '2px dashed',
        borderColor: isDragOver ? 'primary.main' : 'divider',
        borderRadius: 2,
        p: 4,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        bgcolor: isDragOver ? 'action.hover' : 'background.paper',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease-in-out',
        '&:hover': disabled
          ? {}
          : {
              borderColor: 'primary.main',
              bgcolor: 'action.hover'
            }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".835,.edi,.txt,.csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Drag & Drop ERA File
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        or click to browse
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Supported formats: 835 EDI (.835, .edi, .txt) or CSV
      </Typography>
    </Box>
  );
};

// ==============================|| FILE INFO ||============================== //

interface FileInfoProps {
  file: File;
  validation: UploadState['validation'];
  onRemove: () => void;
  disabled: boolean;
}

const FileInfo = ({ file, validation, onRemove, disabled }: FileInfoProps) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      p: 2
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <InsertDriveFileIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="subtitle1" fontWeight={500}>
            {file.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatFileSize(file.size)}
          </Typography>
          {file.name.toLowerCase().endsWith('.csv') && (
            <Chip label="CSV Format" size="small" sx={{ mt: 0.5 }} />
          )}
          {(file.name.toLowerCase().endsWith('.835') || file.name.toLowerCase().endsWith('.edi')) && (
            <Chip label="835 EDI Format" size="small" color="primary" sx={{ mt: 0.5 }} />
          )}
        </Box>
      </Box>
      <IconButton onClick={onRemove} disabled={disabled} size="small">
        <DeleteIcon />
      </IconButton>
    </Box>

    {/* Validation Results */}
    {validation && (
      <Box sx={{ mt: 2 }}>
        {validation.isValid ? (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            File validated successfully
          </Alert>
        ) : (
          <Alert severity="error" icon={<ErrorIcon />}>
            Validation failed
          </Alert>
        )}

        {/* Errors */}
        {validation.errors.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {validation.errors.map((error, i) => (
              <Alert key={i} severity="error" sx={{ mt: 0.5 }} icon={<ErrorIcon fontSize="small" />}>
                {error}
              </Alert>
            ))}
          </Box>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {validation.warnings.map((warning, i) => (
              <Alert key={i} severity="warning" sx={{ mt: 0.5 }} icon={<WarningIcon fontSize="small" />}>
                {warning}
              </Alert>
            ))}
          </Box>
        )}

        {/* Preview */}
        {validation.preview && validation.isValid && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              File Preview
            </Typography>
            <Stack direction="row" spacing={3}>
              {validation.preview.payerName && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Payer
                  </Typography>
                  <Typography variant="body2">{validation.preview.payerName}</Typography>
                </Box>
              )}
              {validation.preview.totalPayments !== undefined && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Payments
                  </Typography>
                  <Typography variant="body2">{validation.preview.totalPayments}</Typography>
                </Box>
              )}
              {validation.preview.totalAmount !== undefined && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatCurrency(validation.preview.totalAmount)}
                  </Typography>
                </Box>
              )}
              {validation.preview.controlNumber && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Control #
                  </Typography>
                  <Typography variant="body2">{validation.preview.controlNumber}</Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </Box>
    )}
  </Box>
);

// ==============================|| MAIN COMPONENT ||============================== //

const ERAUploadDialog = ({ open, onClose, onUploadComplete }: ERAUploadDialogProps) => {
  const [state, setState] = useState<UploadState>({
    file: null,
    validating: false,
    uploading: false,
    validation: null,
    uploadResult: null,
    error: null
  });
  const [autoProcess, setAutoProcess] = useState(true);

  const resetState = () => {
    setState({
      file: null,
      validating: false,
      uploading: false,
      validation: null,
      uploadResult: null,
      error: null
    });
    setAutoProcess(true);
  };

  const handleClose = () => {
    if (state.uploading) return;
    resetState();
    onClose();
  };

  const handleFileSelect = async (file: File) => {
    setState((prev) => ({
      ...prev,
      file,
      validating: true,
      validation: null,
      uploadResult: null,
      error: null
    }));

    try {
      // Read file content for validation
      const content = await file.text();
      const format = file.name.toLowerCase().endsWith('.csv') ? 'csv' : '835';

      const validationResult = await validateERAFile(content, format);

      setState((prev) => ({
        ...prev,
        validating: false,
        validation: validationResult
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate file';
      setState((prev) => ({
        ...prev,
        validating: false,
        error: errorMessage
      }));
    }
  };

  const handleRemoveFile = () => {
    setState((prev) => ({
      ...prev,
      file: null,
      validation: null,
      uploadResult: null,
      error: null
    }));
  };

  const handleUpload = async () => {
    if (!state.file) return;

    setState((prev) => ({
      ...prev,
      uploading: true,
      error: null
    }));

    try {
      const result = await uploadERAFile(state.file, {
        autoProcess
      });

      setState((prev) => ({
        ...prev,
        uploading: false,
        uploadResult: {
          success: true,
          fileId: result.fileId,
          message: result.message
        }
      }));

      // Auto-close after success
      setTimeout(() => {
        onUploadComplete();
        resetState();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setState((prev) => ({
        ...prev,
        uploading: false,
        error: errorMessage
      }));
    }
  };

  const canUpload = state.file && state.validation?.isValid && !state.uploading && !state.validating;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload ERA File</DialogTitle>
      <DialogContent dividers>
        {/* Error Display */}
        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setState((prev) => ({ ...prev, error: null }))}>
            {state.error}
          </Alert>
        )}

        {/* Success Display */}
        {state.uploadResult?.success && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
            {state.uploadResult.message}
          </Alert>
        )}

        {/* Drop Zone or File Info */}
        {!state.file ? (
          <DropZone onFileSelect={handleFileSelect} disabled={state.uploading} />
        ) : (
          <FileInfo
            file={state.file}
            validation={state.validation}
            onRemove={handleRemoveFile}
            disabled={state.uploading}
          />
        )}

        {/* Validating Indicator */}
        {state.validating && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Validating file...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* Uploading Indicator */}
        {state.uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Uploading file...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* Options */}
        {state.file && state.validation?.isValid && !state.uploadResult && (
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={autoProcess}
                  onChange={(e) => setAutoProcess(e.target.checked)}
                  disabled={state.uploading}
                />
              }
              label="Automatically process after upload"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              If unchecked, the file will be uploaded but not processed until you manually trigger processing.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={state.uploading}>
          {state.uploadResult?.success ? 'Close' : 'Cancel'}
        </Button>
        {!state.uploadResult?.success && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!canUpload}
            startIcon={state.uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          >
            {state.uploading ? 'Uploading...' : 'Upload'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ERAUploadDialog;
