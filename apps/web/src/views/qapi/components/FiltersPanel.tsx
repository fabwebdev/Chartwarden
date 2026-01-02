'use client';

import React, { useState } from 'react';

// MUI Components
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import OutlinedInput from '@mui/material/OutlinedInput';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

// Icons
import { Filter, Refresh2 } from 'iconsax-react';

interface FiltersPanelProps {
  onFiltersChange: (filters: {
    dateRange?: { start?: string; end?: string };
    categories?: string[];
    statuses?: string[];
  }) => void;
  dateRange: { start?: string; end?: string };
  selectedCategories: string[];
  selectedStatuses: string[];
}

const CATEGORIES = [
  'CLINICAL',
  'OPERATIONAL',
  'SAFETY',
  'COMPLIANCE',
  'TEST_COVERAGE',
  'DEFECT_RATE',
  'MTTR',
  'CUSTOMER_ISSUES'
];

const STATUSES = [
  'PROPOSED',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'ON_HOLD'
];

const FiltersPanel: React.FC<FiltersPanelProps> = ({
  onFiltersChange,
  dateRange,
  selectedCategories,
  selectedStatuses
}) => {
  const [localStartDate, setLocalStartDate] = useState(dateRange.start || '');
  const [localEndDate, setLocalEndDate] = useState(dateRange.end || '');
  const [localCategories, setLocalCategories] = useState<string[]>(selectedCategories);
  const [localStatuses, setLocalStatuses] = useState<string[]>(selectedStatuses);

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalStartDate(event.target.value);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalEndDate(event.target.value);
  };

  const handleCategoriesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setLocalCategories(typeof value === 'string' ? value.split(',') : value);
  };

  const handleStatusesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setLocalStatuses(typeof value === 'string' ? value.split(',') : value);
  };

  const handleApplyFilters = () => {
    onFiltersChange({
      dateRange: {
        start: localStartDate || undefined,
        end: localEndDate || undefined
      },
      categories: localCategories,
      statuses: localStatuses
    });
  };

  const handleResetFilters = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    setLocalCategories([]);
    setLocalStatuses([]);
    onFiltersChange({
      dateRange: {},
      categories: [],
      statuses: []
    });
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Filter size={20} />
            <Box sx={{ fontSize: '1rem', fontWeight: 500 }}>Filters</Box>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                value={localStartDate}
                onChange={handleStartDateChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                value={localEndDate}
                onChange={handleEndDateChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Categories</InputLabel>
                <Select
                  multiple
                  value={localCategories}
                  onChange={handleCategoriesChange}
                  input={<OutlinedInput label="Categories" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value.replace(/_/g, ' ')} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Statuses</InputLabel>
                <Select
                  multiple
                  value={localStatuses}
                  onChange={handleStatusesChange}
                  input={<OutlinedInput label="Statuses" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value.replace(/_/g, ' ')} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh2 size={16} />}
              onClick={handleResetFilters}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Filter size={16} />}
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FiltersPanel;
