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
  CardActions,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Add,
  Edit,
  Trash,
  ArrowUp,
  ArrowDown,
  Timer,
  MessageText,
  Pause,
  TickCircle,
  Clock,
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

interface DiscussionTopicsProps {
  topics: Topic[];
  setTopics: (topics: Topic[]) => void;
  canEdit: boolean;
}

const STATUS_CONFIG = {
  pending: { color: 'info' as const, label: 'Pending', icon: Clock },
  discussed: { color: 'success' as const, label: 'Discussed', icon: TickCircle },
  tabled: { color: 'warning' as const, label: 'Tabled', icon: Pause },
};

const emptyTopic: Omit<Topic, 'id'> = {
  title: '',
  description: '',
  presenter: '',
  time_allocated: 10,
  time_actual: 0,
  status: 'pending',
  sub_topics: [],
  related_documents: [],
};

const DiscussionTopics = ({ topics, setTopics, canEdit }: DiscussionTopicsProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formData, setFormData] = useState<Omit<Topic, 'id'>>(emptyTopic);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subTopicInput, setSubTopicInput] = useState('');

  const handleOpenDialog = (topic?: Topic) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({
        title: topic.title,
        description: topic.description,
        presenter: topic.presenter,
        time_allocated: topic.time_allocated,
        time_actual: topic.time_actual,
        status: topic.status,
        sub_topics: [...topic.sub_topics],
        related_documents: [...topic.related_documents],
      });
    } else {
      setEditingTopic(null);
      setFormData(emptyTopic);
    }
    setDialogOpen(true);
    setError(null);
    setSubTopicInput('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTopic(null);
    setFormData(emptyTopic);
    setError(null);
    setSubTopicInput('');
  };

  const handleFieldChange = (field: keyof Omit<Topic, 'id'>, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSubTopic = () => {
    if (subTopicInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        sub_topics: [...prev.sub_topics, subTopicInput.trim()],
      }));
      setSubTopicInput('');
    }
  };

  const handleRemoveSubTopic = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sub_topics: prev.sub_topics.filter((_, i) => i !== index),
    }));
  };

  const handleSaveTopic = () => {
    if (!formData.title) {
      setError('Topic title is required');
      return;
    }

    if (editingTopic) {
      setTopics(
        topics.map((t) => (t.id === editingTopic.id ? { ...formData, id: editingTopic.id } : t))
      );
    } else {
      const newTopic: Topic = {
        ...formData,
        id: `topic-${Date.now()}`,
      };
      setTopics([...topics, newTopic]);
    }

    handleCloseDialog();
  };

  const handleRemoveTopic = (id: string) => {
    setTopics(topics.filter((t) => t.id !== id));
  };

  const handleMoveTopic = (id: string, direction: 'up' | 'down') => {
    const index = topics.findIndex((t) => t.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === topics.length - 1)
    ) {
      return;
    }

    const newTopics = [...topics];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newTopics[index], newTopics[swapIndex]] = [newTopics[swapIndex], newTopics[index]];
    setTopics(newTopics);
  };

  const handleStatusChange = (id: string, status: Topic['status']) => {
    setTopics(topics.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const totalAllocatedTime = topics.reduce((sum, t) => sum + t.time_allocated, 0);
  const totalActualTime = topics.reduce((sum, t) => sum + t.time_actual, 0);

  return (
    <Grid container spacing={3}>
      {/* Header */}
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <MessageText size={24} />
            <Typography variant="h6">Discussion Topics</Typography>
            <Chip
              size="small"
              label={`${topics.length} topics`}
              variant="outlined"
            />
            <Chip
              size="small"
              icon={<Timer size={14} />}
              label={`${totalAllocatedTime} min allocated`}
              variant="outlined"
              color="info"
            />
            {totalActualTime > 0 && (
              <Chip
                size="small"
                icon={<Clock size={14} />}
                label={`${totalActualTime} min actual`}
                variant="outlined"
                color={totalActualTime > totalAllocatedTime ? 'warning' : 'success'}
              />
            )}
          </Stack>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<Add size={20} />}
              onClick={() => handleOpenDialog()}
            >
              Add Topic
            </Button>
          )}
        </Stack>
      </Grid>

      {/* Topics List */}
      <Grid item xs={12}>
        {topics.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No discussion topics added yet. Click "Add Topic" to add agenda items.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {topics.map((topic, index) => {
              const StatusIcon = STATUS_CONFIG[topic.status].icon;
              return (
                <Card key={topic.id} variant="outlined">
                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {index + 1}. {topic.title}
                          </Typography>
                          <Chip
                            size="small"
                            icon={<StatusIcon size={14} />}
                            label={STATUS_CONFIG[topic.status].label}
                            color={STATUS_CONFIG[topic.status].color}
                            variant="outlined"
                          />
                        </Stack>
                        {topic.description && (
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            {topic.description}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                          {topic.presenter && (
                            <Typography variant="caption" color="textSecondary">
                              Presenter: <strong>{topic.presenter}</strong>
                            </Typography>
                          )}
                          <Typography variant="caption" color="textSecondary">
                            Time Allocated: <strong>{topic.time_allocated} min</strong>
                          </Typography>
                          {topic.time_actual > 0 && (
                            <Typography
                              variant="caption"
                              color={topic.time_actual > topic.time_allocated ? 'error' : 'success.main'}
                            >
                              Time Actual: <strong>{topic.time_actual} min</strong>
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                      {canEdit && (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Move Up">
                            <IconButton
                              size="small"
                              onClick={() => handleMoveTopic(topic.id, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Move Down">
                            <IconButton
                              size="small"
                              onClick={() => handleMoveTopic(topic.id, 'down')}
                              disabled={index === topics.length - 1}
                            >
                              <ArrowDown size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenDialog(topic)}>
                              <Edit size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveTopic(topic.id)}
                            >
                              <Trash size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Stack>

                    {/* Sub-topics */}
                    {topic.sub_topics.length > 0 && (
                      <Box sx={{ mt: 2, ml: 2 }}>
                        <Typography variant="caption" fontWeight={600} color="textSecondary">
                          Sub-topics:
                        </Typography>
                        <List dense disablePadding>
                          {topic.sub_topics.map((subTopic, i) => (
                            <ListItem key={i} disablePadding sx={{ pl: 1 }}>
                              <ListItemIcon sx={{ minWidth: 24 }}>
                                <Typography variant="caption">•</Typography>
                              </ListItemIcon>
                              <ListItemText
                                primary={subTopic}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </CardContent>
                  {canEdit && (
                    <CardActions sx={{ pt: 0, px: 2, pb: 1 }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={topic.status}
                          onChange={(e) =>
                            handleStatusChange(topic.id, e.target.value as Topic['status'])
                          }
                          size="small"
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="discussed">Discussed</MenuItem>
                          <MenuItem value="tabled">Tabled</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        type="number"
                        label="Actual Time (min)"
                        value={topic.time_actual || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setTopics(
                            topics.map((t) => (t.id === topic.id ? { ...t, time_actual: value } : t))
                          );
                        }}
                        inputProps={{ min: 0, max: 240 }}
                        sx={{ width: 140 }}
                      />
                    </CardActions>
                  )}
                </Card>
              );
            })}
          </Stack>
        )}
      </Grid>

      {/* Add/Edit Topic Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTopic ? 'Edit Topic' : 'Add Topic'}</DialogTitle>
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
                label="Topic Title"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                required
                placeholder="Enter the main discussion topic"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                multiline
                rows={3}
                placeholder="Provide context or background for this topic"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Presenter"
                value={formData.presenter}
                onChange={(e) => handleFieldChange('presenter', e.target.value)}
                placeholder="Who will present this topic?"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time Allocated (minutes)"
                type="number"
                value={formData.time_allocated}
                onChange={(e) => handleFieldChange('time_allocated', parseInt(e.target.value) || 0)}
                inputProps={{ min: 1, max: 120 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="discussed">Discussed</MenuItem>
                  <MenuItem value="tabled">Tabled/Deferred</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sub-topics */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Sub-topics
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add a sub-topic"
                  value={subTopicInput}
                  onChange={(e) => setSubTopicInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubTopic();
                    }
                  }}
                />
                <Button variant="outlined" onClick={handleAddSubTopic} disabled={!subTopicInput.trim()}>
                  Add
                </Button>
              </Stack>
              {formData.sub_topics.length > 0 && (
                <Stack spacing={0.5}>
                  {formData.sub_topics.map((subTopic, index) => (
                    <Chip
                      key={index}
                      label={subTopic}
                      onDelete={() => handleRemoveSubTopic(index)}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTopic}>
            {editingTopic ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default DiscussionTopics;
