'use client';

import { useState, useMemo } from 'react';

// MATERIAL - UI
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

// ICONS
import { DocumentText, ArrowDown2 } from 'iconsax-react';

// TYPES
import { ClinicalTemplate, TemplateCategory } from 'types/richTextEditor';

// ==============================|| TEMPLATE SELECTOR - STYLED ||============================== //

const TemplateSelectorWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default
}));

// ==============================|| TEMPLATE SELECTOR - CATEGORY LABELS ||============================== //

const categoryLabels: Record<TemplateCategory, string> = {
  nursing_assessment: 'Nursing Assessment',
  pain_assessment: 'Pain Assessment',
  symptom_management: 'Symptom Management',
  care_plan: 'Care Plan',
  discharge_summary: 'Discharge Summary',
  progress_note: 'Progress Note',
  initial_evaluation: 'Initial Evaluation',
  medication_review: 'Medication Review',
  family_communication: 'Family Communication',
  interdisciplinary_note: 'Interdisciplinary Note'
};

const categoryColors: Record<TemplateCategory, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
  nursing_assessment: 'primary',
  pain_assessment: 'error',
  symptom_management: 'warning',
  care_plan: 'success',
  discharge_summary: 'info',
  progress_note: 'secondary',
  initial_evaluation: 'primary',
  medication_review: 'warning',
  family_communication: 'info',
  interdisciplinary_note: 'secondary'
};

// ==============================|| TEMPLATE SELECTOR - COMPONENT ||============================== //

interface TemplateSelectorProps {
  templates: ClinicalTemplate[];
  onSelect: (template: ClinicalTemplate) => void;
}

const TemplateSelector = ({ templates, onSelect }: TemplateSelectorProps) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ClinicalTemplate[]> = {};

    templates.forEach((template) => {
      const category = template.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(template);
    });

    return groups;
  }, [templates]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectTemplate = (template: ClinicalTemplate) => {
    onSelect(template);
    handleClose();
  };

  if (templates.length === 0) {
    return null;
  }

  return (
    <TemplateSelectorWrapper>
      <DocumentText size={18} color={theme.palette.text.secondary} />
      <Typography variant="body2" color="text.secondary">
        Templates:
      </Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={handleClick}
        endIcon={<ArrowDown2 size={14} />}
        sx={{
          textTransform: 'none',
          fontSize: '0.8125rem',
          py: 0.5
        }}
      >
        Insert Template
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            minWidth: 280
          }
        }}
      >
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => [
          <ListSubheader
            key={`header-${category}`}
            sx={{
              backgroundColor: 'background.default',
              lineHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Chip
              label={categoryLabels[category as TemplateCategory] || category}
              size="small"
              color={categoryColors[category as TemplateCategory] || 'default'}
              sx={{ height: 20, fontSize: '0.6875rem' }}
            />
          </ListSubheader>,
          ...categoryTemplates.map((template) => (
            <Tooltip
              key={template.id}
              title={template.description || ''}
              placement="right"
              arrow
            >
              <MenuItem
                onClick={() => handleSelectTemplate(template)}
                sx={{
                  pl: 3,
                  py: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {template.name}
                  </Typography>
                  {template.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {template.description}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            </Tooltip>
          ))
        ])}
      </Menu>
    </TemplateSelectorWrapper>
  );
};

export default TemplateSelector;
