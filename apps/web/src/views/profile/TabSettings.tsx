'use client';

import { useState, useEffect } from 'react';

// MATERIAL - UI
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

// PROJECT IMPORTS
import { openSnackbar } from 'api/snackbar';
import { getUserPreferences, saveUserPreferences, UserPreferences } from 'api/userProfile';

// ASSETS
import { Notification, Sms, DocumentLike, Translate } from 'iconsax-react';

// TYPES
import { SnackbarProps } from 'types/snackbar';

// ==============================|| PROFILE - SETTINGS ||============================== //

interface TabSettingsProps {
  userId: string;
}

const TabSettings = ({ userId }: TabSettingsProps) => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    systemNotifications: true,
    orderConfirmations: true,
    languageUpdates: false,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    if (userId) {
      const stored = getUserPreferences(userId);
      setPreferences(stored);
    }
  }, [userId]);

  const handleToggle = (key: keyof UserPreferences) => () => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!userId) return;

    setSaving(true);
    try {
      saveUserPreferences(userId, preferences);
      setHasChanges(false);

      openSnackbar({
        open: true,
        message: 'Settings saved successfully.',
        variant: 'alert',
        alert: {
          color: 'success',
        },
      } as SnackbarProps);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: 'Failed to save settings.',
        variant: 'alert',
        alert: {
          color: 'error',
        },
      } as SnackbarProps);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (userId) {
      const stored = getUserPreferences(userId);
      setPreferences(stored);
      setHasChanges(false);
    }
  };

  return (
    <>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Notification Preferences
      </Typography>

      <List sx={{ '& .MuiListItem-root': { p: 2, borderRadius: 1, mb: 1, bgcolor: 'background.default' } }}>
        <ListItem>
          <ListItemIcon sx={{ color: 'primary.main', mr: 2, display: { xs: 'none', sm: 'block' } }}>
            <Sms style={{ fontSize: '1.5rem' }} />
          </ListItemIcon>
          <ListItemText
            id="switch-email-notifications"
            primary={<Typography variant="subtitle1">Email Notifications</Typography>}
            secondary="Receive email updates about your account activity and important alerts"
          />
          <Switch
            edge="end"
            onChange={handleToggle('emailNotifications')}
            checked={preferences.emailNotifications}
            inputProps={{
              'aria-labelledby': 'switch-email-notifications',
            }}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon sx={{ color: 'primary.main', mr: 2, display: { xs: 'none', sm: 'block' } }}>
            <Notification style={{ fontSize: '1.5rem' }} />
          </ListItemIcon>
          <ListItemText
            id="switch-system-notifications"
            primary={<Typography variant="subtitle1">System Notifications</Typography>}
            secondary="Receive in-app notifications for system updates and maintenance"
          />
          <Switch
            edge="end"
            onChange={handleToggle('systemNotifications')}
            checked={preferences.systemNotifications}
            inputProps={{
              'aria-labelledby': 'switch-system-notifications',
            }}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon sx={{ color: 'primary.main', mr: 2, display: { xs: 'none', sm: 'block' } }}>
            <DocumentLike style={{ fontSize: '1.5rem' }} />
          </ListItemIcon>
          <ListItemText
            id="switch-order-confirmations"
            primary={<Typography variant="subtitle1">Activity Confirmations</Typography>}
            secondary="Receive confirmation emails when important actions are completed"
          />
          <Switch
            edge="end"
            onChange={handleToggle('orderConfirmations')}
            checked={preferences.orderConfirmations}
            inputProps={{
              'aria-labelledby': 'switch-order-confirmations',
            }}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon sx={{ color: 'primary.main', mr: 2, display: { xs: 'none', sm: 'block' } }}>
            <Translate style={{ fontSize: '1.5rem' }} />
          </ListItemIcon>
          <ListItemText
            id="switch-language-updates"
            primary={<Typography variant="subtitle1">Language/Locale Updates</Typography>}
            secondary="Receive notifications when new language options become available"
          />
          <Switch
            edge="end"
            onChange={handleToggle('languageUpdates')}
            checked={preferences.languageUpdates}
            inputProps={{
              'aria-labelledby': 'switch-language-updates',
            }}
          />
        </ListItem>
      </List>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" color="secondary" onClick={handleCancel} disabled={!hasChanges || saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Stack>
    </>
  );
};

export default TabSettings;
