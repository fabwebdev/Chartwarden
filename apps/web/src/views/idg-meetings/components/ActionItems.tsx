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
  FormControlLabel,
  Checkbox,
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
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import {
  Add,
  Edit,
  Trash,
  Task,
  TickCircle,
  Clock,
  Warning2,
  Refresh,
  Flag,
} from 'iconsax-react';

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

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  assignee_id: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  estimated_effort: string;
  dependencies: string;
  parent_decision_id: string;
  parent_topic_id: string;
  is_recurring: boolean;
  recurring_frequency: string;
}

interface ActionItemsProps {
  actionItems: ActionItem[];
  setActionItems: (items: ActionItem[]) => void;
  decisions: Decision[];
  topics: Topic[];
  canEdit: boolean;
}

const PRIORITY_CONFIG = {
  low: { color: 'default' as const, label: 'Low', icon: Flag },
  medium: { color: 'info' as const, label: 'Medium', icon: Flag },
  high: { color: 'warning' as const, label: 'High', icon: Flag },
  urgent: { color: 'error' as const, label: 'Urgent', icon: Warning2 },
};

const STATUS_CONFIG = {
  pending: { color: 'info' as const, label: 'Pending', icon: Clock },
  in_progress: { color: 'warning' as const, label: 'In Progress', icon: Refresh },
  completed: { color: 'success' as const, label: 'Completed', icon: TickCircle },
  cancelled: { color: 'default' as const, label: 'Cancelled', icon: Trash },
};

const RECURRING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const emptyActionItem: Omit<ActionItem, 'id'> = {
  description: '',
  assignee: '',
  assignee_id: '',
  due_date: '',
  priority: 'medium',
  status: 'pending',
  estimated_effort: '',
  dependencies: '',
  parent_decision_id: '',
  parent_topic_id: '',
  is_recurring: false,
  recurring_frequency: '',
};

const ActionItems = ({
  actionItems,
  setActionItems,
  decisions,
  topics,
  canEdit,
}: ActionItemsProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [formData, setFormData] = useState<Omit<ActionItem, 'id'>>(emptyActionItem);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const handleOpenDialog = (item?: ActionItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        description: item.description,
        assignee: item.assignee,
        assignee_id: item.assignee_id,
        due_date: item.due_date,
        priority: item.priority,
        status: item.status,
        estimated_effort: item.estimated_effort,
        dependencies: item.dependencies,
        parent_decision_id: item.parent_decision_id,
        parent_topic_id: item.parent_topic_id,
        is_recurring: item.is_recurring,
        recurring_frequency: item.recurring_frequency,
      });
    } else {
      setEditingItem(null);
      setFormData(emptyActionItem);
    }
    setDialogOpen(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData(emptyActionItem);
    setError(null);
  };

  const handleFieldChange = (field: keyof Omit<ActionItem, 'id'>, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveItem = () => {
    if (!formData.description) {
      setError('Description is required');
      return;
    }
    if (!formData.assignee) {
      setError('Assignee is required');
      return;
    }
    if (!formData.due_date) {
      setError('Due date is required');
      return;
    }

    if (editingItem) {
      setActionItems(
        actionItems.map((item) =>
          item.id === editingItem.id ? { ...formData, id: editingItem.id } : item
        )
      );
    } else {
      const newItem: ActionItem = {
        ...formData,
        id: `action-${Date.now()}`,
      };
      setActionItems([...actionItems, newItem]);
    }

    handleCloseDialog();
  };

  const handleRemoveItem = (id: string) => {
    setActionItems(actionItems.filter((item) => item.id !== id));
  };

  const handleStatusChange = (id: string, status: ActionItem['status']) => {
    setActionItems(actionItems.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const getTopicTitle = (topicId: string) => {
    const topic = topics.find((t) => t.id === topicId);
    return topic?.title || '';
  };

  const getDecisionText = (decisionId: string) => {
    const decision = decisions.find((d) => d.id === decisionId);
    return decision?.decision_text?.substring(0, 50) + '...' || '';
  };

  const isOverdue = (dueDate: string) => {
    return dayjs(dueDate).isBefore(dayjs(), 'day');
  };

  const isDueSoon = (dueDate: string) => {
    const due = dayjs(dueDate);
    const today = dayjs();
    return due.isAfter(today) && due.diff(today, 'day') <= 3;
  };

  // Statistics
  const completedCount = actionItems.filter((i) => i.status === 'completed').length;
  const pendingCount = actionItems.filter((i) => i.status === 'pending').length;
  const inProgressCount = actionItems.filter((i) => i.status === 'in_progress').length;
  const overdueCount = actionItems.filter(
    (i) => i.status !== 'completed' && i.status !== 'cancelled' && isOverdue(i.due_date)
  ).length;
  const completionRate =
    actionItems.length > 0 ? Math.round((completedCount / actionItems.length) * 100) : 0;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <Task size={24} />
              <Typography variant="h6">Action Items</Typography>
              <Chip size="small" label={`${actionItems.length} total`} variant="outlined" />
              <Chip
                size="small"
                label={`${completedCount} completed`}
                color="success"
                variant="outlined"
              />
              {overdueCount > 0 && (
                <Chip
                  size="small"
                  icon={<Warning2 size={14} />}
                  label={`${overdueCount} overdue`}
                  color="error"
                />
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
              {canEdit && (
                <Button
                  variant="contained"
                  startIcon={<Add size={20} />}
                  onClick={() => handleOpenDialog()}
                >
                  Add Action Item
                </Button>
              )}
            </Stack>
          </Stack>
        </Grid>

        {/* Progress Bar */}
        {actionItems.length > 0 && (
          <Grid item xs={12}>
            <Box sx={{ mb: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">
                  Completion Progress
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {completionRate}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={completionRate}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Grid>
        )}

        {/* Action Items Display */}
        <Grid item xs={12}>
          {actionItems.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">
                No action items yet. Click "Add Action Item" to create tasks.
              </Typography>
            </Paper>
          ) : viewMode === 'cards' ? (
            <Stack spacing={2}>
              {actionItems.map((item) => {
                const PriorityIcon = PRIORITY_CONFIG[item.priority].icon;
                const StatusIcon = STATUS_CONFIG[item.status].icon;
                const overdue =
                  item.status !== 'completed' &&
                  item.status !== 'cancelled' &&
                  isOverdue(item.due_date);
                const dueSoon =
                  item.status !== 'completed' &&
                  item.status !== 'cancelled' &&
                  isDueSoon(item.due_date);

                return (
                  <Card
                    key={item.id}
                    variant="outlined"
                    sx={{
                      borderColor: overdue
                        ? 'error.main'
                        : dueSoon
                        ? 'warning.main'
                        : 'divider',
                      borderWidth: overdue || dueSoon ? 2 : 1,
                    }}
                  >
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
                              label={STATUS_CONFIG[item.status].label}
                              color={STATUS_CONFIG[item.status].color}
                            />
                            <Chip
                              size="small"
                              icon={<PriorityIcon size={14} />}
                              label={PRIORITY_CONFIG[item.priority].label}
                              color={PRIORITY_CONFIG[item.priority].color}
                              variant="outlined"
                            />
                            {item.is_recurring && (
                              <Chip
                                size="small"
                                icon={<Refresh size={14} />}
                                label={
                                  RECURRING_FREQUENCIES.find(
                                    (f) => f.value === item.recurring_frequency
                                  )?.label || 'Recurring'
                                }
                                variant="outlined"
                              />
                            )}
                            {overdue && (
                              <Chip size="small" icon={<Warning2 size={14} />} label="Overdue" color="error" />
                            )}
                          </Stack>

                          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                            {item.description}
                          </Typography>

                          <Stack direction="row" spacing={3} flexWrap="wrap">
                            <Typography variant="body2" color="textSecondary">
                              Assignee: <strong>{item.assignee}</strong>
                            </Typography>
                            <Typography
                              variant="body2"
                              color={overdue ? 'error' : dueSoon ? 'warning.main' : 'textSecondary'}
                            >
                              Due: <strong>{dayjs(item.due_date).format('MMM D, YYYY')}</strong>
                            </Typography>
                            {item.estimated_effort && (
                              <Typography variant="body2" color="textSecondary">
                                Effort: <strong>{item.estimated_effort}</strong>
                              </Typography>
                            )}
                          </Stack>

                          {(item.parent_topic_id || item.parent_decision_id) && (
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              {item.parent_topic_id && (
                                <Chip
                                  size="small"
                                  label={`Topic: ${getTopicTitle(item.parent_topic_id)}`}
                                  variant="outlined"
                                />
                              )}
                              {item.parent_decision_id && (
                                <Chip
                                  size="small"
                                  label={`Decision: ${getDecisionText(item.parent_decision_id)}`}
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          )}

                          {item.dependencies && (
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                              Dependencies: {item.dependencies}
                            </Typography>
                          )}
                        </Box>

                        {canEdit && (
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveItem(item.id)}
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
                            <Select
                              value={item.status}
                              onChange={(e) =>
                                handleStatusChange(item.id, e.target.value as ActionItem['status'])
                              }
                              size="small"
                            >
                              <MenuItem value="pending">Pending</MenuItem>
                              <MenuItem value="in_progress">In Progress</MenuItem>
                              <MenuItem value="completed">Completed</MenuItem>
                              <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Assignee</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    {canEdit && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {actionItems.map((item) => {
                    const overdue =
                      item.status !== 'completed' &&
                      item.status !== 'cancelled' &&
                      isOverdue(item.due_date);

                    return (
                      <TableRow
                        key={item.id}
                        sx={{ bgcolor: overdue ? 'error.lighter' : undefined }}
                      >
                        <TableCell>
                          <Typography variant="body2">{item.description}</Typography>
                        </TableCell>
                        <TableCell>{item.assignee}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color={overdue ? 'error' : 'textPrimary'}
                            fontWeight={overdue ? 600 : 400}
                          >
                            {dayjs(item.due_date).format('MMM D, YYYY')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={PRIORITY_CONFIG[item.priority].label}
                            color={PRIORITY_CONFIG[item.priority].color}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Select
                              value={item.status}
                              onChange={(e) =>
                                handleStatusChange(item.id, e.target.value as ActionItem['status'])
                              }
                              size="small"
                              sx={{ minWidth: 120 }}
                            >
                              <MenuItem value="pending">Pending</MenuItem>
                              <MenuItem value="in_progress">In Progress</MenuItem>
                              <MenuItem value="completed">Completed</MenuItem>
                              <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                          ) : (
                            <Chip
                              size="small"
                              label={STATUS_CONFIG[item.status].label}
                              color={STATUS_CONFIG[item.status].color}
                            />
                          )}
                        </TableCell>
                        {canEdit && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                                  <Edit size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash size={16} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Action Item' : 'Add Action Item'}</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                required
                multiline
                rows={2}
                placeholder="What needs to be done?"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Assignee"
                value={formData.assignee}
                onChange={(e) => handleFieldChange('assignee', e.target.value)}
                required
                placeholder="Who is responsible?"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Due Date"
                value={formData.due_date ? dayjs(formData.due_date) : null}
                onChange={(date: Dayjs | null) =>
                  handleFieldChange('due_date', date?.format('YYYY-MM-DD') || '')
                }
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Estimated Effort"
                value={formData.estimated_effort}
                onChange={(e) => handleFieldChange('estimated_effort', e.target.value)}
                placeholder="e.g., 2 hours, 1 day"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Dependencies"
                value={formData.dependencies}
                onChange={(e) => handleFieldChange('dependencies', e.target.value)}
                placeholder="What must be completed first?"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Linked Topic</InputLabel>
                <Select
                  value={formData.parent_topic_id}
                  label="Linked Topic"
                  onChange={(e) => handleFieldChange('parent_topic_id', e.target.value)}
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

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Linked Decision</InputLabel>
                <Select
                  value={formData.parent_decision_id}
                  label="Linked Decision"
                  onChange={(e) => handleFieldChange('parent_decision_id', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {decisions.map((decision) => (
                    <MenuItem key={decision.id} value={decision.id}>
                      {decision.decision_text.substring(0, 50)}...
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_recurring}
                      onChange={(e) => handleFieldChange('is_recurring', e.target.checked)}
                    />
                  }
                  label="Recurring Action Item"
                />
                {formData.is_recurring && (
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={formData.recurring_frequency}
                      label="Frequency"
                      onChange={(e) => handleFieldChange('recurring_frequency', e.target.value)}
                      size="small"
                    >
                      {RECURRING_FREQUENCIES.map((freq) => (
                        <MenuItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveItem}>
            {editingItem ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ActionItems;
