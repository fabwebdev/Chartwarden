'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TextField, Box, Paper, Typography, Chip, CircularProgress, Button, Stack, InputLabel } from '@mui/material';
import { AddCircle } from 'iconsax-react';
import http from '../hooks/useCookie';

interface DiagnosisOption {
  code: string;
  description: string;
  source: 'icd10' | 'custom';
  id?: number;
  diagnosis_date?: string;
}

interface PrimaryDiagnosisSearchProps {
  value?: DiagnosisOption | null;
  onChange?: (diagnosis: DiagnosisOption | null) => void;
  onAddCustom?: (diagnosis: DiagnosisOption) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

const PrimaryDiagnosisSearch: React.FC<PrimaryDiagnosisSearchProps> = ({
  value,
  onChange,
  onAddCustom,
  disabled = false,
  error = false,
  helperText,
  placeholder = 'Search by code or description (e.g., E11, diabetes)...',
  label = 'Primary Diagnosis',
  required = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<DiagnosisOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ code: '', description: '', diagnosis_date: '' });
  const [openCustomModal, setOpenCustomModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize search term from value
  useEffect(() => {
    if (value) {
      setSearchTerm(`${value.code} - ${value.description}`);
    } else {
      setSearchTerm('');
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddCustom(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.length < 2) {
      setResults([]);
      setIsOpen(false);
      setShowAddCustom(false);
      return;
    }

    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await http.get('/primary-diagnosis/primaryDiagnosis/search', {
          params: { query: searchTerm.trim() }
        });
        // Backend returns: { count, data, query }
        // Map backend fields (diagnosis_code, diagnosis_description) to component format (code, description)
        const rawData = response.data?.data || [];
        const mappedData = rawData.map((item: any) => ({
          code: item.code || item.diagnosis_code || '',
          description: item.description || item.diagnosis_description || '',
          source: item.source || (item.id ? 'custom' : 'icd10'),
          id: item.id,
          diagnosis_date: item.diagnosis_date
        }));
        setResults(mappedData);
        setIsOpen(true);
        setShowAddCustom(mappedData.length === 0);
      } catch (error: any) {
        console.error('Search error:', error);
        setResults([]);
        setShowAddCustom(false);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const handleSelect = (diagnosis: DiagnosisOption) => {
    setSearchTerm(`${diagnosis.code} - ${diagnosis.description}`);
    setIsOpen(false);
    setShowAddCustom(false);
    if (onChange) {
      onChange(diagnosis);
    }
  };

  const handleAddCustom = async () => {
    if (!customForm.code || !customForm.description) {
      return;
    }

    try {
      const payload: any = {
        diagnosis_code: customForm.code,
        diagnosis_description: customForm.description
      };
      if (customForm.diagnosis_date) {
        payload.diagnosis_date = customForm.diagnosis_date;
      }

      const response = await http.post('/primary-diagnosis/primaryDiagnosis/store', payload);
      if (response.data?.data) {
        const newDiagnosis: DiagnosisOption = {
          id: response.data.data.id,
          code: response.data.data.diagnosis_code,
          description: response.data.data.diagnosis_description,
          source: 'custom',
          diagnosis_date: response.data.data.diagnosis_date
        };
        handleSelect(newDiagnosis);
        setCustomForm({ code: '', description: '', diagnosis_date: '' });
        setOpenCustomModal(false);
        setShowAddCustom(false);
        if (onAddCustom) {
          onAddCustom(newDiagnosis);
        }
      }
    } catch (error: any) {
      console.error('Add custom diagnosis error:', error);
      throw error;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // If input is cleared, clear the selection
    if (newValue === '' && onChange) {
      onChange(null);
    }
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 2 && results.length > 0) {
      setIsOpen(true);
    }
  };

  // Sort results: ICD10 first, then custom
  const sortedResults = [...results].sort((a, b) => {
    if (a.source === 'icd10' && b.source === 'custom') return -1;
    if (a.source === 'custom' && b.source === 'icd10') return 1;
    return 0;
  });

  return (
    <Box ref={dropdownRef} sx={{ position: 'relative', width: '100%' }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        helperText={helperText}
        InputProps={{
          endAdornment: isLoading ? (
            <CircularProgress size={20} sx={{ mr: 1 }} />
          ) : null
        }}
      />

      {/* Dropdown List */}
      {isOpen && !disabled && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0.5,
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1300,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {/* Results List */}
          {sortedResults.length > 0 ? (
            <>
              {sortedResults.map((item, index) => (
                <Box
                  key={item.code || item.id || index}
                  onClick={() => handleSelect(item)}
                  sx={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: index < sortedResults.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="bold" color="text.primary" sx={{ mb: 0.5 }}>
                      {item.code}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={item.source === 'icd10' ? 'ICD10' : 'Custom'}
                    size="small"
                    color={item.source === 'icd10' ? 'primary' : 'secondary'}
                    sx={{ ml: 1 }}
                  />
                </Box>
              ))}
            </>
          ) : searchTerm.length >= 2 && !isLoading ? (
            <Box sx={{ padding: '20px', textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No results found
              </Typography>
              {showAddCustom && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddCircle size={18} />}
                  onClick={() => setOpenCustomModal(true)}
                  sx={{ mt: 1 }}
                >
                  Add Custom Diagnosis
                </Button>
              )}
            </Box>
          ) : null}
        </Paper>
      )}

      {/* Custom Diagnosis Modal */}
      {openCustomModal && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400
          }}
          onClick={() => setOpenCustomModal(false)}
        >
          <Paper
            elevation={3}
            sx={{
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              backgroundColor: 'background.paper'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Add Custom Diagnosis
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Code"
                placeholder="e.g., CUSTOM001"
                value={customForm.code}
                onChange={(e) => setCustomForm({ ...customForm, code: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Description"
                placeholder="Enter diagnosis description"
                value={customForm.description}
                onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                required
                multiline
                rows={2}
              />
              <TextField
                fullWidth
                label="Diagnosis Date (Optional)"
                type="date"
                value={customForm.diagnosis_date}
                onChange={(e) => setCustomForm({ ...customForm, diagnosis_date: e.target.value })}
                InputLabelProps={{
                  shrink: true
                }}
              />
              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button variant="outlined" onClick={() => setOpenCustomModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleAddCustom}
                  disabled={!customForm.code || !customForm.description}
                >
                  Add Diagnosis
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default PrimaryDiagnosisSearch;

