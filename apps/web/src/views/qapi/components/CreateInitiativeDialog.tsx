'use client';

import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

// MUI Components
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';

// API
import { createInitiative } from '../../../api/qapi';

// Types
import type {
  MetricDefinition,
  CreateImprovementInitiativeRequest,
  InitiativeType,
  InitiativeCategory,
  InitiativePriority,
  InitiativeStatus
} from '../../../types/qapi';

interface CreateInitiativeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  metricDefinitions: MetricDefinition[];
}

// Validation schema
const validationSchema = Yup.object({
  title: Yup.string()
    .required('Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: Yup.string()
    .max(1000, 'Description must not exceed 1000 characters'),
  initiative_type: Yup.string()
    .oneOf(['QUALITY_IMPROVEMENT', 'DEFECT_REDUCTION', 'PROCESS_OPTIMIZATION'])
    .required('Initiative type is required'),
  category: Yup.string()
    .oneOf(['CLINICAL', 'OPERATIONAL', 'TECHNICAL', 'COMPLIANCE'])
    .required('Category is required'),
  priority: Yup.string()
    .oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .required('Priority is required'),
  objectives: Yup.string()
    .max(2000, 'Objectives must not exceed 2000 characters'),
  success_criteria: Yup.string()
    .max(2000, 'Success criteria must not exceed 2000 characters'),
  expected_impact: Yup.string()
    .max(1000, 'Expected impact must not exceed 1000 characters'),
  planned_start_date: Yup.date(),
  planned_end_date: Yup.date()
    .min(Yup.ref('planned_start_date'), 'End date must be after start date')
});

const CreateInitiativeDialog: React.FC<CreateInitiativeDialogProps> = ({
  open,
  onClose,
  onSuccess,
  metricDefinitions
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues: Partial<CreateImprovementInitiativeRequest> = {
    title: '',
    description: '',
    initiative_type: 'QUALITY_IMPROVEMENT',
    category: 'CLINICAL',
    priority: 'MEDIUM',
    objectives: '',
    success_criteria: '',
    expected_impact: '',
    status: 'PROPOSED',
    progress_percentage: 0,
    planned_start_date: '',
    planned_end_date: ''
  };

  const handleSubmit = async (values: Partial<CreateImprovementInitiativeRequest>) => {
    try {
      setSubmitting(true);
      setError(null);

      await createInitiative(values as CreateImprovementInitiativeRequest);

      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Error creating initiative:', error);
      setError(error.response?.data?.message || error.message || 'Failed to create initiative');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Create New Initiative</DialogTitle>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
          <Form>
            <DialogContent dividers>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="title"
                    label="Initiative Title *"
                    value={values.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.title && Boolean(errors.title)}
                    helperText={touched.title && errors.title}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="description"
                    label="Description"
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={touched.initiative_type && Boolean(errors.initiative_type)}>
                    <InputLabel>Initiative Type *</InputLabel>
                    <Select
                      name="initiative_type"
                      value={values.initiative_type}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Initiative Type *"
                    >
                      <MenuItem value="QUALITY_IMPROVEMENT">Quality Improvement</MenuItem>
                      <MenuItem value="DEFECT_REDUCTION">Defect Reduction</MenuItem>
                      <MenuItem value="PROCESS_OPTIMIZATION">Process Optimization</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={touched.category && Boolean(errors.category)}>
                    <InputLabel>Category *</InputLabel>
                    <Select
                      name="category"
                      value={values.category}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Category *"
                    >
                      <MenuItem value="CLINICAL">Clinical</MenuItem>
                      <MenuItem value="OPERATIONAL">Operational</MenuItem>
                      <MenuItem value="TECHNICAL">Technical</MenuItem>
                      <MenuItem value="COMPLIANCE">Compliance</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={touched.priority && Boolean(errors.priority)}>
                    <InputLabel>Priority *</InputLabel>
                    <Select
                      name="priority"
                      value={values.priority}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Priority *"
                    >
                      <MenuItem value="LOW">Low</MenuItem>
                      <MenuItem value="MEDIUM">Medium</MenuItem>
                      <MenuItem value="HIGH">High</MenuItem>
                      <MenuItem value="CRITICAL">Critical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    name="planned_start_date"
                    label="Planned Start Date"
                    InputLabelProps={{ shrink: true }}
                    value={values.planned_start_date}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.planned_start_date && Boolean(errors.planned_start_date)}
                    helperText={touched.planned_start_date && errors.planned_start_date}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    name="planned_end_date"
                    label="Planned End Date"
                    InputLabelProps={{ shrink: true }}
                    value={values.planned_end_date}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.planned_end_date && Boolean(errors.planned_end_date)}
                    helperText={touched.planned_end_date && errors.planned_end_date}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="objectives"
                    label="Objectives"
                    value={values.objectives}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.objectives && Boolean(errors.objectives)}
                    helperText={touched.objectives && errors.objectives}
                    placeholder="What are the key objectives of this initiative?"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="success_criteria"
                    label="Success Criteria"
                    value={values.success_criteria}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.success_criteria && Boolean(errors.success_criteria)}
                    helperText={touched.success_criteria && errors.success_criteria}
                    placeholder="How will success be measured?"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    name="expected_impact"
                    label="Expected Impact"
                    value={values.expected_impact}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.expected_impact && Boolean(errors.expected_impact)}
                    helperText={touched.expected_impact && errors.expected_impact}
                    placeholder="What impact do you expect this initiative to have?"
                  />
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} /> : null}
              >
                Create Initiative
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CreateInitiativeDialog;
