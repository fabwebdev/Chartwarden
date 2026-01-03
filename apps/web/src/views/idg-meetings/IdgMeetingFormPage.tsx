'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
} from '@mui/material';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import {
  TickCircle,
  ArrowLeft,
  DocumentUpload,
  Clock,
  Warning2,
} from 'iconsax-react';
import MainCard from 'components/MainCard';
import http from 'hooks/useCookie';
import AuthService from 'types/AuthService';

// Sub-components
import AttendeeManagement from './components/AttendeeManagement';
import DiscussionTopics from './components/DiscussionTopics';
import DecisionTracking from './components/DecisionTracking';
import ActionItems from './components/ActionItems';
import MeetingExport from './components/MeetingExport';

// Types
interface MeetingFormData {
  meeting_type: string;
  meeting_status: string;
  meeting_date: string;
  meeting_time: string;
  meeting_duration_minutes: number | null;
  location: string;
  virtual_meeting: boolean;
  meeting_link: string;
  facilitator_name: string;
  facilitator_id: string;
  agenda: string;
  topics: Topic[];
  general_discussion: string;
  quality_issues: string;
  operational_issues: string;
  staff_concerns: string;
  action_items: ActionItem[];
  follow_up_items: string;
  meeting_outcomes: string;
  decisions_made: string;
  meeting_notes: string;
  next_meeting_date: string;
  next_meeting_agenda: string;
}

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

interface Attendee {
  id: string;
  staff_id: string;
  staff_name: string;
  discipline: string;
  role: string;
  attended: boolean;
  attendance_type: string;
  arrival_time: string;
  departure_time: string;
  absent_reason: string;
  is_guest: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const MEETING_TYPES = [
  { value: 'INITIAL', label: 'Initial Meeting' },
  { value: 'ROUTINE', label: 'Routine Meeting' },
  { value: 'RECERTIFICATION', label: 'Recertification' },
  { value: 'EMERGENCY', label: 'Emergency Meeting' },
  { value: 'SPECIAL', label: 'Special Meeting' },
];

const MEETING_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
];

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

interface IdgMeetingFormPageProps {
  meetingId?: string;
}

const IdgMeetingFormPage = ({ meetingId }: IdgMeetingFormPageProps) => {
  const router = useRouter();
  const { permissions, user } = AuthService();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // State
  const [loading, setLoading] = useState(!!meetingId);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  // Form data
  const [formData, setFormData] = useState<MeetingFormData>({
    meeting_type: 'ROUTINE',
    meeting_status: 'SCHEDULED',
    meeting_date: dayjs().format('YYYY-MM-DD'),
    meeting_time: '09:00',
    meeting_duration_minutes: 60,
    location: '',
    virtual_meeting: false,
    meeting_link: '',
    facilitator_name: '',
    facilitator_id: '',
    agenda: '',
    topics: [],
    general_discussion: '',
    quality_issues: '',
    operational_issues: '',
    staff_concerns: '',
    action_items: [],
    follow_up_items: '',
    meeting_outcomes: '',
    decisions_made: '',
    meeting_notes: '',
    next_meeting_date: '',
    next_meeting_agenda: '',
  });

  // Related data
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);

  // Permission checks
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
  const hasPermission = useCallback((permission: string) => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  }, [isAdmin, permissions]);

  const canEdit = hasPermission('UPDATE_CLINICAL_NOTES') || hasPermission('CREATE_CLINICAL_NOTES');
  const isEditMode = !!meetingId;

  // Fetch meeting data
  const fetchMeetingData = useCallback(async () => {
    if (!meetingId) return;

    setLoading(true);
    try {
      const [meetingRes, attendeesRes] = await Promise.all([
        http.get(`/idg-meetings/${meetingId}`),
        http.get(`/idg-meetings/${meetingId}/attendees`),
      ]);

      if (meetingRes.data?.data) {
        const meeting = meetingRes.data.data;
        setFormData({
          meeting_type: meeting.meeting_type || 'ROUTINE',
          meeting_status: meeting.meeting_status || 'SCHEDULED',
          meeting_date: meeting.meeting_date || dayjs().format('YYYY-MM-DD'),
          meeting_time: meeting.meeting_time || '09:00',
          meeting_duration_minutes: meeting.meeting_duration_minutes || 60,
          location: meeting.location || '',
          virtual_meeting: meeting.virtual_meeting || false,
          meeting_link: meeting.meeting_link || '',
          facilitator_name: meeting.facilitator_name || '',
          facilitator_id: meeting.facilitator_id || '',
          agenda: meeting.agenda || '',
          topics: meeting.topics || [],
          general_discussion: meeting.general_discussion || '',
          quality_issues: meeting.quality_issues || '',
          operational_issues: meeting.operational_issues || '',
          staff_concerns: meeting.staff_concerns || '',
          action_items: meeting.action_items || [],
          follow_up_items: meeting.follow_up_items || '',
          meeting_outcomes: meeting.meeting_outcomes || '',
          decisions_made: meeting.decisions_made || '',
          meeting_notes: meeting.meeting_notes || '',
          next_meeting_date: meeting.next_meeting_date || '',
          next_meeting_agenda: meeting.next_meeting_agenda || '',
        });
        lastSavedRef.current = JSON.stringify(meeting);
      }

      if (attendeesRes.data?.data) {
        setAttendees(attendeesRes.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching meeting:', err);
      setError(err.response?.data?.message || 'Failed to load meeting');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchMeetingData();
  }, [fetchMeetingData]);

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!meetingId || !hasUnsavedChanges || saving) return;

    const currentData = JSON.stringify(formData);
    if (currentData === lastSavedRef.current) return;

    setAutoSaving(true);
    try {
      await http.patch(`/idg-meetings/${meetingId}`, formData);
      lastSavedRef.current = currentData;
      setLastAutoSave(new Date());
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setAutoSaving(false);
    }
  }, [meetingId, formData, hasUnsavedChanges, saving]);

  useEffect(() => {
    if (meetingId && hasUnsavedChanges) {
      autoSaveTimerRef.current = setInterval(performAutoSave, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [meetingId, hasUnsavedChanges, performAutoSave]);

  // Handle field changes
  const handleFieldChange = (field: keyof MeetingFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Save meeting
  const handleSave = async (submit = false) => {
    setSaving(true);
    setError(null);

    try {
      const dataToSave = {
        ...formData,
        topics: formData.topics,
        action_items: formData.action_items,
      };

      let response;
      if (isEditMode) {
        response = await http.patch(`/idg-meetings/${meetingId}`, dataToSave);
      } else {
        response = await http.post('/idg-meetings', dataToSave);
      }

      lastSavedRef.current = JSON.stringify(formData);
      setHasUnsavedChanges(false);
      setSuccessMessage(isEditMode ? 'Meeting updated successfully' : 'Meeting created successfully');

      if (!isEditMode && response.data?.data?.id) {
        router.push(`/idg-meetings/${response.data.data.id}`);
      }
    } catch (err: any) {
      console.error('Error saving meeting:', err);
      setError(err.response?.data?.message || 'Failed to save meeting');
    } finally {
      setSaving(false);
    }
  };

  // Handle meeting status changes
  const handleStartMeeting = async () => {
    if (!meetingId) return;

    setSaving(true);
    try {
      await http.post(`/idg-meetings/${meetingId}/start`);
      setFormData((prev) => ({ ...prev, meeting_status: 'IN_PROGRESS' }));
      setSuccessMessage('Meeting started');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start meeting');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteMeeting = async () => {
    if (!meetingId) return;

    setSaving(true);
    try {
      await http.post(`/idg-meetings/${meetingId}/complete`, {
        meeting_outcomes: formData.meeting_outcomes,
        decisions_made: formData.decisions_made,
      });
      setFormData((prev) => ({ ...prev, meeting_status: 'COMPLETED' }));
      setSuccessMessage('Meeting completed');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete meeting');
    } finally {
      setSaving(false);
    }
  };

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (loading) {
    return (
      <MainCard>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainCard
        title={
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              startIcon={<ArrowLeft size={20} />}
              onClick={() => router.push('/idg-meetings')}
              variant="text"
            >
              Back
            </Button>
            <Typography variant="h5">
              {isEditMode ? 'Edit IDG Meeting' : 'New IDG Meeting'}
            </Typography>
            {formData.meeting_status && (
              <Chip
                size="small"
                label={MEETING_STATUSES.find((s) => s.value === formData.meeting_status)?.label}
                color={
                  formData.meeting_status === 'COMPLETED'
                    ? 'success'
                    : formData.meeting_status === 'IN_PROGRESS'
                    ? 'warning'
                    : 'info'
                }
              />
            )}
          </Stack>
        }
        secondary={
          <Stack direction="row" spacing={2} alignItems="center">
            {autoSaving && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="textSecondary">
                  Auto-saving...
                </Typography>
              </Stack>
            )}
            {lastAutoSave && !autoSaving && (
              <Typography variant="caption" color="textSecondary">
                Last saved: {lastAutoSave.toLocaleTimeString()}
              </Typography>
            )}
            {hasUnsavedChanges && (
              <Chip
                size="small"
                icon={<Warning2 size={14} />}
                label="Unsaved changes"
                color="warning"
                variant="outlined"
              />
            )}
            {isEditMode && formData.meeting_status === 'SCHEDULED' && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleStartMeeting}
                disabled={saving}
              >
                Start Meeting
              </Button>
            )}
            {isEditMode && formData.meeting_status === 'IN_PROGRESS' && (
              <Button
                variant="outlined"
                color="success"
                onClick={handleCompleteMeeting}
                disabled={saving}
              >
                Complete Meeting
              </Button>
            )}
            {isEditMode && (
              <MeetingExport
                meetingData={formData}
                attendees={attendees}
                topics={formData.topics}
                decisions={decisions}
                actionItems={formData.action_items}
              />
            )}
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <TickCircle size={20} />}
              onClick={() => handleSave()}
              disabled={saving || formData.meeting_status === 'COMPLETED'}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        }
      >
        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Snackbar
          open={!!successMessage}
          autoHideDuration={4000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </Snackbar>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Meeting Details" />
            <Tab label="Attendees" />
            <Tab label="Discussion Topics" />
            <Tab label="Decisions" />
            <Tab label="Action Items" />
            <Tab label="Notes & Outcomes" />
          </Tabs>
        </Box>

        {/* Tab 0: Meeting Details */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {/* Meeting Metadata */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Meeting Information
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Meeting Type</InputLabel>
                <Select
                  value={formData.meeting_type}
                  label="Meeting Type"
                  onChange={(e) => handleFieldChange('meeting_type', e.target.value)}
                  disabled={!canEdit}
                >
                  {MEETING_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Meeting Date"
                value={formData.meeting_date ? dayjs(formData.meeting_date) : null}
                onChange={(date: Dayjs | null) =>
                  handleFieldChange('meeting_date', date?.format('YYYY-MM-DD') || '')
                }
                disabled={!canEdit}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TimePicker
                label="Meeting Time"
                value={formData.meeting_time ? dayjs(`2000-01-01 ${formData.meeting_time}`) : null}
                onChange={(time: Dayjs | null) =>
                  handleFieldChange('meeting_time', time?.format('HH:mm') || '')
                }
                disabled={!canEdit}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={formData.meeting_duration_minutes || ''}
                onChange={(e) =>
                  handleFieldChange('meeting_duration_minutes', parseInt(e.target.value) || null)
                }
                disabled={!canEdit}
                inputProps={{ min: 15, max: 480, step: 15 }}
              />
            </Grid>

            {/* Location */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                Location
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                disabled={!canEdit}
                placeholder="Conference Room A, Building 1"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.virtual_meeting}
                      onChange={(e) => handleFieldChange('virtual_meeting', e.target.checked)}
                      disabled={!canEdit}
                    />
                  }
                  label="Virtual Meeting"
                />
                {formData.virtual_meeting && (
                  <TextField
                    fullWidth
                    label="Meeting Link"
                    value={formData.meeting_link}
                    onChange={(e) => handleFieldChange('meeting_link', e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://zoom.us/j/..."
                  />
                )}
              </Stack>
            </Grid>

            {/* Facilitator */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                Facilitator & Note-Taker
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Meeting Facilitator"
                value={formData.facilitator_name}
                onChange={(e) => handleFieldChange('facilitator_name', e.target.value)}
                disabled={!canEdit}
              />
            </Grid>

            {/* Agenda */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                Agenda
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Meeting Agenda"
                value={formData.agenda}
                onChange={(e) => handleFieldChange('agenda', e.target.value)}
                disabled={!canEdit}
                placeholder="Enter meeting agenda items..."
              />
            </Grid>

            {/* Next Meeting */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                Next Meeting
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Next Meeting Date"
                value={formData.next_meeting_date ? dayjs(formData.next_meeting_date) : null}
                onChange={(date: Dayjs | null) =>
                  handleFieldChange('next_meeting_date', date?.format('YYYY-MM-DD') || '')
                }
                disabled={!canEdit}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Next Meeting Agenda"
                value={formData.next_meeting_agenda}
                onChange={(e) => handleFieldChange('next_meeting_agenda', e.target.value)}
                disabled={!canEdit}
                placeholder="Preliminary agenda for next meeting..."
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 1: Attendees */}
        <TabPanel value={activeTab} index={1}>
          <AttendeeManagement
            meetingId={meetingId}
            attendees={attendees}
            setAttendees={setAttendees}
            canEdit={canEdit}
            onUpdate={() => setHasUnsavedChanges(true)}
          />
        </TabPanel>

        {/* Tab 2: Discussion Topics */}
        <TabPanel value={activeTab} index={2}>
          <DiscussionTopics
            topics={formData.topics}
            setTopics={(topics) => handleFieldChange('topics', topics)}
            canEdit={canEdit}
          />
        </TabPanel>

        {/* Tab 3: Decisions */}
        <TabPanel value={activeTab} index={3}>
          <DecisionTracking
            decisions={decisions}
            setDecisions={setDecisions}
            topics={formData.topics}
            canEdit={canEdit}
          />
        </TabPanel>

        {/* Tab 4: Action Items */}
        <TabPanel value={activeTab} index={4}>
          <ActionItems
            actionItems={formData.action_items}
            setActionItems={(items) => handleFieldChange('action_items', items)}
            decisions={decisions}
            topics={formData.topics}
            canEdit={canEdit}
          />
        </TabPanel>

        {/* Tab 5: Notes & Outcomes */}
        <TabPanel value={activeTab} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                General Discussion
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.general_discussion}
                onChange={(e) => handleFieldChange('general_discussion', e.target.value)}
                disabled={!canEdit}
                placeholder="General discussion points..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Quality Issues
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.quality_issues}
                onChange={(e) => handleFieldChange('quality_issues', e.target.value)}
                disabled={!canEdit}
                placeholder="Quality improvement items..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Operational Issues
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.operational_issues}
                onChange={(e) => handleFieldChange('operational_issues', e.target.value)}
                disabled={!canEdit}
                placeholder="Operational concerns..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Staff Concerns
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.staff_concerns}
                onChange={(e) => handleFieldChange('staff_concerns', e.target.value)}
                disabled={!canEdit}
                placeholder="Staff-related concerns..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Follow-up Items
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.follow_up_items}
                onChange={(e) => handleFieldChange('follow_up_items', e.target.value)}
                disabled={!canEdit}
                placeholder="Items to follow up on..."
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Meeting Outcomes
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.meeting_outcomes}
                onChange={(e) => handleFieldChange('meeting_outcomes', e.target.value)}
                disabled={!canEdit}
                placeholder="Key outcomes from this meeting..."
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Decisions Made
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.decisions_made}
                onChange={(e) => handleFieldChange('decisions_made', e.target.value)}
                disabled={!canEdit}
                placeholder="Summary of decisions made..."
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Meeting Notes
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={formData.meeting_notes}
                onChange={(e) => handleFieldChange('meeting_notes', e.target.value)}
                disabled={!canEdit}
                placeholder="Detailed meeting notes..."
              />
            </Grid>
          </Grid>
        </TabPanel>
      </MainCard>
    </LocalizationProvider>
  );
};

export default IdgMeetingFormPage;
