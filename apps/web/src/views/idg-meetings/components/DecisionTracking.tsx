'use client';

import { useState } from 'react';
import {
  Grid,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Card,
  CardContent,
  Autocomplete,
  Divider,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Add, Edit, Trash, Judge, TickCircle, CloseCircle, Pause, Timer } from 'iconsax-react';

interface Topic {
  id: string;
  title: string;
  description: string;
  presenter: string;
  time_allocated: number;
  time_actual: number;
  status: 'pending' | 'discussed' | 'tabled';
  sub_topics: string[];
  related_documents: string[];
}

interface Decision {
  id: string;
  topic_id: string;
  decision_text: string;
  rationale: string;
  decision_date: string;
  voting_results: string;
  dissenting_opinions: string;
  implementation_timeline: string;
  responsible_parties: string[];
  status: 'proposed' | 'approved' | 'rejected' | 'on_hold';
  version: number;
}

interface DecisionTrackingProps {
  decisions: Decision[];
  setDecisions: (decisions: Decision[]) => void;
  topics: Topic[];
  canEdit: boolean;
}

const STATUS_CONFIG = {
  proposed: { color: 'info' as const, label: 'Proposed', icon: Timer },
  approved: { color: 'success' as const, label: 'Approved', icon: TickCircle },
  rejected: { color: 'error' as const, label: 'Rejected', icon: CloseCircle },
  on_hold: { color: 'warning' as const, label: 'On Hold', icon: Pause },
};

const emptyDecision: Omit<Decision, 'id'> = {
  topic_id: '',
  decision_text: '',
  rationale: '',
  decision_date: dayjs().format('YYYY-MM-DD'),
  voting_results: '',
  dissenting_opinions: '',
  implementation_timeline: '',
  responsible_parties: [],
  status: 'proposed',
  version: 1,
};

const DecisionTracking = ({ decisions, setDecisions, topics, canEdit }: DecisionTrackingProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [formData, setFormData] = useState<Omit<Decision, 'id'>>(emptyDecision);
  const [error, setError] = useState<string | null>(null);
  const [responsiblePartyInput, setResponsiblePartyInput] = useState('');

  const handleOpenDialog = (decision?: Decision) => {
    if (decision) {
      setEditingDecision(decision);
      setFormData({
        topic_id: decision.topic_id,
        decision_text: decision.decision_text,
        rationale: decision.rationale,
        decision_date: decision.decision_date,
        voting_results: decision.voting_results,
        dissenting_opinions: decision.dissenting_opinions,
        implementation_timeline: decision.implementation_timeline,
        responsible_parties: [...decision.responsible_parties],
        status: decision.status,
        version: decision.version,
      });
    } else {
      setEditingDecision(null);
      setFormData({
        ...emptyDecision,
        decision_date: dayjs().format('YYYY-MM-DD'),
      });
    }
    setDialogOpen(true);
    setError(null);
    setResponsiblePartyInput('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDecision(null);
    setFormData(emptyDecision);
    setError(null);
    setResponsiblePartyInput('');
  };

  const handleFieldChange = (field: keyof Omit<Decision, 'id'>, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddResponsibleParty = () => {
    if (responsiblePartyInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        responsible_parties: [...prev.responsible_parties, responsiblePartyInput.trim()],
      }));
      setResponsiblePartyInput('');
    }
  };

  const handleRemoveResponsibleParty = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      responsible_parties: prev.responsible_parties.filter((_, i) => i !== index),
    }));
  };

  const handleSaveDecision = () => {
    if (!formData.decision_text) {
      setError('Decision text is required');
      return;
    }
    if (!formData.rationale) {
      setError('Rationale is required');
      return;
    }

    if (editingDecision) {
      setDecisions(
        decisions.map((d) =>
          d.id === editingDecision.id
            ? { ...formData, id: editingDecision.id, version: d.version + 1 }
            : d
        )
      );
    } else {
      const newDecision: Decision = {
        ...formData,
        id: `decision-${Date.now()}`,
      };
      setDecisions([...decisions, newDecision]);
    }

    handleCloseDialog();
  };

  const handleRemoveDecision = (id: string) => {
    setDecisions(decisions.filter((d) => d.id !== id));
  };

  const handleStatusChange = (id: string, status: Decision['status']) => {
    setDecisions(decisions.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const getTopicTitle = (topicId: string) => {
    const topic = topics.find((t) => t.id === topicId);
    return topic?.title || 'No linked topic';
  };

  const approvedCount = decisions.filter((d) => d.status === 'approved').length;
  const pendingCount = decisions.filter((d) => d.status === 'proposed').length;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <Judge size={24} />
              <Typography variant="h6">Decisions</Typography>
              <Chip size="small" label={`${decisions.length} total`} variant="outlined" />
              <Chip
                size="small"
                label={`${approvedCount} approved`}
                color="success"
                variant="outlined"
              />
              {pendingCount > 0 && (
                <Chip
                  size="small"
                  label={`${pendingCount} pending`}
                  color="info"
                  variant="outlined"
                />
              )}
            </Stack>
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<Add size={20} />}
                onClick={() => handleOpenDialog()}
              >
                Add Decision
              </Button>
            )}
          </Stack>
        </Grid>

        {/* Decisions List */}
        <Grid item xs={12}>
          {decisions.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">
                No decisions recorded yet. Click "Add Decision" to document meeting decisions.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {decisions.map((decision) => {
                const StatusIcon = STATUS_CONFIG[decision.status].icon;
                return (
                  <Card key={decision.id} variant="outlined">
                    <CardContent>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <Chip
                              size="small"
                              icon={<StatusIcon size={14} />}
                              label={STATUS_CONFIG[decision.status].label}
                              color={STATUS_CONFIG[decision.status].color}
                            />
                            {decision.topic_id && (
                              <Chip
                                size="small"
                                label={`Topic: ${getTopicTitle(decision.topic_id)}`}
                                variant="outlined"
                              />
                            )}
                            <Typography variant="caption" color="textSecondary">
                              v{decision.version}
                            </Typography>
                          </Stack>

                          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                            {decision.decision_text}
                          </Typography>

                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            <strong>Rationale:</strong> {decision.rationale}
                          </Typography>

                          <Stack direction="row" spacing={3} flexWrap="wrap">
                            <Typography variant="caption" color="textSecondary">
                              Date:{' '}
                              <strong>
                                {dayjs(decision.decision_date).format('MMM D, YYYY')}
                              </strong>
                            </Typography>
                            {decision.implementation_timeline && (
                              <Typography variant="caption" color="textSecondary">
                                Implementation: <strong>{decision.implementation_timeline}</strong>
                              </Typography>
                            )}
                            {decision.voting_results && (
                              <Typography variant="caption" color="textSecondary">
                                Voting: <strong>{decision.voting_results}</strong>
                              </Typography>
                            )}
                          </Stack>

                          {decision.responsible_parties.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="textSecondary">
                                Responsible:
                              </Typography>
                              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                {decision.responsible_parties.map((party, i) => (
                                  <Chip key={i} size="small" label={party} variant="outlined" />
                                ))}
                              </Stack>
                            </Box>
                          )}

                          {decision.dissenting_opinions && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                              <Typography variant="caption" fontWeight={600}>
                                Dissenting Opinions:
                              </Typography>
                              <Typography variant="body2">{decision.dissenting_opinions}</Typography>
                            </Box>
                          )}
                        </Box>

                        {canEdit && (
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenDialog(decision)}>
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveDecision(decision.id)}
                              >
                                <Trash size={16} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      </Stack>

                      {canEdit && (
                        <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                              value={decision.status}
                              label="Status"
                              onChange={(e) =>
                                handleStatusChange(decision.id, e.target.value as Decision['status'])
                              }
                              size="small"
                            >
                              <MenuItem value="proposed">Proposed</MenuItem>
                              <MenuItem value="approved">Approved</MenuItem>
                              <MenuItem value="rejected">Rejected</MenuItem>
                              <MenuItem value="on_hold">On Hold</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Grid>
      </Grid>

      {/* Add/Edit Decision Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingDecision ? 'Edit Decision' : 'Add Decision'}</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Linked Topic (Optional)</InputLabel>
                <Select
                  value={formData.topic_id}
                  label="Linked Topic (Optional)"
                  onChange={(e) => handleFieldChange('topic_id', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {topics.map((topic) => (
                    <MenuItem key={topic.id} value={topic.id}>
                      {topic.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Decision"
                value={formData.decision_text}
                onChange={(e) => handleFieldChange('decision_text', e.target.value)}
                required
                multiline
                rows={2}
                placeholder="What was decided?"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rationale"
                value={formData.rationale}
                onChange={(e) => handleFieldChange('rationale', e.target.value)}
                required
                multiline
                rows={2}
                placeholder="Why was this decision made?"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Decision Date"
                value={formData.decision_date ? dayjs(formData.decision_date) : null}
                onChange={(date: Dayjs | null) =>
                  handleFieldChange('decision_date', date?.format('YYYY-MM-DD') || '')
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                >
                  <MenuItem value="proposed">Proposed</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="on_hold">On Hold</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Voting Results"
                value={formData.voting_results}
                onChange={(e) => handleFieldChange('voting_results', e.target.value)}
                placeholder="e.g., 5-2 in favor, unanimous"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Implementation Timeline"
                value={formData.implementation_timeline}
                onChange={(e) => handleFieldChange('implementation_timeline', e.target.value)}
                placeholder="e.g., Within 2 weeks, Q1 2025"
              />
            </Grid>

            {/* Responsible Parties */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Responsible Parties
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add responsible person/team"
                  value={responsiblePartyInput}
                  onChange={(e) => setResponsiblePartyInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddResponsibleParty();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddResponsibleParty}
                  disabled={!responsiblePartyInput.trim()}
                >
                  Add
                </Button>
              </Stack>
              {formData.responsible_parties.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                  {formData.responsible_parties.map((party, index) => (
                    <Chip
                      key={index}
                      label={party}
                      onDelete={() => handleRemoveResponsibleParty(index)}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              )}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dissenting Opinions"
                value={formData.dissenting_opinions}
                onChange={(e) => handleFieldChange('dissenting_opinions', e.target.value)}
                multiline
                rows={2}
                placeholder="Record any disagreements or alternative viewpoints"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveDecision}>
            {editingDecision ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default DecisionTracking;
