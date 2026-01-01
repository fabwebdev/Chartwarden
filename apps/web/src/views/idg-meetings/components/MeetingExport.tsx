'use client';

import { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import { DocumentDownload, Sms, Printer, DocumentText } from 'iconsax-react';

interface Topic {
  id: string;
  title: string;
  description: string;
  presenter: string;
  time_allocated: number;
  time_actual: number;
  status: 'pending' | 'discussed' | 'tabled';
  sub_topics: string[];
}

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  due_date: string;
  priority: string;
  status: string;
}

interface Decision {
  id: string;
  decision_text: string;
  rationale: string;
  status: string;
  responsible_parties: string[];
}

interface Attendee {
  id: string;
  staff_name: string;
  discipline: string;
  role: string;
  attended: boolean;
  attendance_type: string;
}

interface MeetingData {
  meeting_type: string;
  meeting_date: string;
  meeting_time: string;
  meeting_duration_minutes: number | null;
  location: string;
  virtual_meeting: boolean;
  facilitator_name: string;
  agenda: string;
  meeting_notes: string;
  meeting_outcomes: string;
  decisions_made: string;
}

interface MeetingExportProps {
  meetingData: MeetingData;
  attendees: Attendee[];
  topics: Topic[];
  decisions: Decision[];
  actionItems: ActionItem[];
}

const MeetingExport = ({
  meetingData,
  attendees,
  topics,
  decisions,
  actionItems,
}: MeetingExportProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    recipients: '',
    subject: `IDG Meeting Minutes - ${meetingData.meeting_date}`,
    includeAttendees: true,
    includeTopics: true,
    includeDecisions: true,
    includeActionItems: true,
    customMessage: '',
  });
  const [exportError, setExportError] = useState<string | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const generateMeetingMinutesHTML = () => {
    const presentAttendees = attendees.filter((a) => a.attended);
    const absentAttendees = attendees.filter((a) => !a.attended);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>IDG Meeting Minutes - ${formatDate(meetingData.meeting_date)}</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0066cc;
      margin-bottom: 5px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #0066cc;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
      font-size: 18px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 10px;
      background: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
    }
    .info-label {
      font-weight: bold;
      color: #555;
    }
    .attendee-list {
      columns: 2;
      column-gap: 30px;
    }
    .attendee-item {
      break-inside: avoid;
      padding: 5px 0;
    }
    .attendee-name {
      font-weight: 500;
    }
    .attendee-role {
      color: #666;
      font-size: 12px;
    }
    .topic-item {
      background: #f5f5f5;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 5px;
      border-left: 4px solid #0066cc;
    }
    .topic-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 5px;
    }
    .topic-meta {
      color: #666;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .decision-item {
      background: #e8f5e9;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 5px;
      border-left: 4px solid #4caf50;
    }
    .decision-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-approved { background: #c8e6c9; color: #2e7d32; }
    .status-proposed { background: #bbdefb; color: #1565c0; }
    .status-rejected { background: #ffcdd2; color: #c62828; }
    .status-on_hold { background: #fff9c4; color: #f57f17; }
    .action-item {
      background: #fff3e0;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 5px;
      border-left: 4px solid #ff9800;
    }
    .action-meta {
      display: flex;
      gap: 20px;
      margin-top: 10px;
      font-size: 12px;
      color: #666;
    }
    .priority-urgent { color: #d32f2f; font-weight: bold; }
    .priority-high { color: #f57c00; font-weight: bold; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Interdisciplinary Group Meeting Minutes</h1>
    <div class="subtitle">Hospice Care Team Meeting Documentation</div>
  </div>

  <div class="section">
    <h2>Meeting Information</h2>
    <div class="info-grid">
      <div class="info-label">Date:</div>
      <div>${formatDate(meetingData.meeting_date)}</div>
      <div class="info-label">Time:</div>
      <div>${formatTime(meetingData.meeting_time)}${meetingData.meeting_duration_minutes ? ` (${meetingData.meeting_duration_minutes} minutes)` : ''}</div>
      <div class="info-label">Location:</div>
      <div>${meetingData.virtual_meeting ? 'Virtual Meeting' : meetingData.location || 'Not specified'}</div>
      <div class="info-label">Meeting Type:</div>
      <div>${meetingData.meeting_type.replace(/_/g, ' ')}</div>
      <div class="info-label">Facilitator:</div>
      <div>${meetingData.facilitator_name || 'Not specified'}</div>
    </div>
  </div>

  ${attendees.length > 0 ? `
  <div class="section">
    <h2>Attendance</h2>
    <h3 style="font-size: 14px; color: #4caf50;">Present (${presentAttendees.length})</h3>
    <div class="attendee-list">
      ${presentAttendees.map((a) => `
        <div class="attendee-item">
          <div class="attendee-name">${a.staff_name}</div>
          <div class="attendee-role">${a.discipline.replace(/_/g, ' ')} ${a.role ? `- ${a.role.replace(/_/g, ' ')}` : ''}</div>
        </div>
      `).join('')}
    </div>
    ${absentAttendees.length > 0 ? `
      <h3 style="font-size: 14px; color: #f44336; margin-top: 15px;">Absent (${absentAttendees.length})</h3>
      <div class="attendee-list">
        ${absentAttendees.map((a) => `
          <div class="attendee-item">
            <div class="attendee-name">${a.staff_name}</div>
            <div class="attendee-role">${a.discipline.replace(/_/g, ' ')}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>
  ` : ''}

  ${meetingData.agenda ? `
  <div class="section">
    <h2>Agenda</h2>
    <p>${meetingData.agenda.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  ${topics.length > 0 ? `
  <div class="section">
    <h2>Discussion Topics</h2>
    ${topics.map((topic, index) => `
      <div class="topic-item">
        <div class="topic-title">${index + 1}. ${topic.title}</div>
        <div class="topic-meta">
          Presenter: ${topic.presenter || 'Not specified'} |
          Time: ${topic.time_actual || topic.time_allocated} minutes |
          Status: ${topic.status.charAt(0).toUpperCase() + topic.status.slice(1)}
        </div>
        ${topic.description ? `<p>${topic.description}</p>` : ''}
        ${topic.sub_topics.length > 0 ? `
          <ul>
            ${topic.sub_topics.map((st) => `<li>${st}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${decisions.length > 0 ? `
  <div class="section">
    <h2>Decisions</h2>
    ${decisions.map((decision) => `
      <div class="decision-item">
        <span class="decision-status status-${decision.status}">${decision.status.replace(/_/g, ' ')}</span>
        <p style="margin-top: 10px;"><strong>${decision.decision_text}</strong></p>
        ${decision.rationale ? `<p><em>Rationale:</em> ${decision.rationale}</p>` : ''}
        ${decision.responsible_parties.length > 0 ? `
          <p><em>Responsible:</em> ${decision.responsible_parties.join(', ')}</p>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${actionItems.length > 0 ? `
  <div class="section">
    <h2>Action Items</h2>
    ${actionItems.map((item) => `
      <div class="action-item">
        <div><strong>${item.description}</strong></div>
        <div class="action-meta">
          <span>Assignee: ${item.assignee}</span>
          <span>Due: ${new Date(item.due_date).toLocaleDateString()}</span>
          <span class="priority-${item.priority}">Priority: ${item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}</span>
          <span>Status: ${item.status.replace(/_/g, ' ')}</span>
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${meetingData.meeting_outcomes ? `
  <div class="section">
    <h2>Meeting Outcomes</h2>
    <p>${meetingData.meeting_outcomes.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  ${meetingData.meeting_notes ? `
  <div class="section">
    <h2>Meeting Notes</h2>
    <p>${meetingData.meeting_notes.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()} | Chartwarden Hospice EHR System</p>
    <p>This document is part of the official medical record and subject to HIPAA regulations.</p>
  </div>
</body>
</html>
    `;
  };

  const handleExportPDF = async () => {
    setExporting(true);
    handleMenuClose();
    setExportError(null);

    try {
      const htmlContent = generateMeetingMinutesHTML();

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    handleMenuClose();
    const htmlContent = generateMeetingMinutesHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleExportWord = () => {
    handleMenuClose();
    const htmlContent = generateMeetingMinutesHTML();

    // Create a blob with Word-compatible HTML
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IDG_Meeting_Minutes_${meetingData.meeting_date}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenEmailDialog = () => {
    handleMenuClose();
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    // This would integrate with an email service
    // For now, we'll open the user's email client
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(`
${emailData.customMessage}

---

IDG Meeting Minutes
Date: ${formatDate(meetingData.meeting_date)}
Time: ${formatTime(meetingData.meeting_time)}
Facilitator: ${meetingData.facilitator_name || 'Not specified'}

${emailData.includeAttendees && attendees.length > 0 ? `
Attendees (${attendees.filter((a) => a.attended).length} present):
${attendees.filter((a) => a.attended).map((a) => `- ${a.staff_name} (${a.discipline})`).join('\n')}
` : ''}

${emailData.includeTopics && topics.length > 0 ? `
Discussion Topics:
${topics.map((t, i) => `${i + 1}. ${t.title}`).join('\n')}
` : ''}

${emailData.includeDecisions && decisions.length > 0 ? `
Decisions:
${decisions.map((d) => `- [${d.status.toUpperCase()}] ${d.decision_text}`).join('\n')}
` : ''}

${emailData.includeActionItems && actionItems.length > 0 ? `
Action Items:
${actionItems.map((a) => `- ${a.description} (Assigned to: ${a.assignee}, Due: ${new Date(a.due_date).toLocaleDateString()})`).join('\n')}
` : ''}

---
Generated by Chartwarden Hospice EHR System
    `);

    window.location.href = `mailto:${emailData.recipients}?subject=${subject}&body=${body}`;
    setEmailDialogOpen(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={exporting ? <CircularProgress size={16} /> : <DocumentDownload size={20} />}
        onClick={handleMenuOpen}
        disabled={exporting}
      >
        {exporting ? 'Exporting...' : 'Export'}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleExportPDF}>
          <ListItemIcon>
            <DocumentText size={18} />
          </ListItemIcon>
          <ListItemText>Export as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportWord}>
          <ListItemIcon>
            <DocumentDownload size={18} />
          </ListItemIcon>
          <ListItemText>Export as Word</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handlePrint}>
          <ListItemIcon>
            <Printer size={18} />
          </ListItemIcon>
          <ListItemText>Print</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenEmailDialog}>
          <ListItemIcon>
            <Sms size={18} />
          </ListItemIcon>
          <ListItemText>Email to Attendees</ListItemText>
        </MenuItem>
      </Menu>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Email Meeting Minutes</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Recipients"
              value={emailData.recipients}
              onChange={(e) => setEmailData({ ...emailData, recipients: e.target.value })}
              placeholder="email1@example.com, email2@example.com"
              helperText="Separate multiple emails with commas"
            />
            <TextField
              fullWidth
              label="Subject"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
            />
            <TextField
              fullWidth
              label="Custom Message"
              value={emailData.customMessage}
              onChange={(e) => setEmailData({ ...emailData, customMessage: e.target.value })}
              multiline
              rows={3}
              placeholder="Add a personal message to the email..."
            />
            <Typography variant="subtitle2">Include in email:</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailData.includeAttendees}
                    onChange={(e) => setEmailData({ ...emailData, includeAttendees: e.target.checked })}
                    size="small"
                  />
                }
                label="Attendees"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailData.includeTopics}
                    onChange={(e) => setEmailData({ ...emailData, includeTopics: e.target.checked })}
                    size="small"
                  />
                }
                label="Topics"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailData.includeDecisions}
                    onChange={(e) => setEmailData({ ...emailData, includeDecisions: e.target.checked })}
                    size="small"
                  />
                }
                label="Decisions"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailData.includeActionItems}
                    onChange={(e) => setEmailData({ ...emailData, includeActionItems: e.target.checked })}
                    size="small"
                  />
                }
                label="Action Items"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSendEmail} disabled={!emailData.recipients}>
            Open Email Client
          </Button>
        </DialogActions>
      </Dialog>

      {exportError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}
    </>
  );
};

export default MeetingExport;
