'use client';

import { useState } from 'react';

// MATERIAL - UI
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

// COMPONENTS
import DataExportDialog from './DataExportDialog';

// ICONS
import { DocumentDownload } from 'iconsax-react';

// TYPES
export interface DataExportButtonProps {
  resourceType?: string;
  title?: string;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  iconOnly?: boolean;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  disabled?: boolean;
}

// ==============================|| DATA EXPORT BUTTON ||============================== //

export default function DataExportButton({
  resourceType,
  title = 'Export Data',
  variant = 'outlined',
  size = 'medium',
  iconOnly = false,
  color = 'primary',
  disabled = false
}: DataExportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpen = () => setDialogOpen(true);
  const handleClose = () => setDialogOpen(false);

  return (
    <>
      {iconOnly ? (
        <Tooltip title={title}>
          <IconButton
            onClick={handleOpen}
            color={color}
            size={size}
            disabled={disabled}
          >
            <DocumentDownload size={size === 'small' ? 18 : size === 'large' ? 28 : 22} />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          variant={variant}
          color={color}
          size={size}
          startIcon={<DocumentDownload size={18} />}
          onClick={handleOpen}
          disabled={disabled}
        >
          {title}
        </Button>
      )}

      <DataExportDialog
        open={dialogOpen}
        onClose={handleClose}
        resourceType={resourceType}
        title={title}
      />
    </>
  );
}
