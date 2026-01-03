'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import MainCard from 'components/MainCard';
import Swal from 'sweetalert2';
import { Refresh, Eye, EyeSlash, Wifi, Setting2, ShieldTick, Cloud, ArrowRotateLeft, InfoCircle } from 'iconsax-react';
import AuthService from 'types/AuthService';
import http from 'hooks/useCookie';

interface Setting {
  id: number;
  setting_key: string;
  name: string;
  description: string;
  setting_value: string;
  default_value: string;
  setting_type: string;
  category: string;
  options?: { value: string; label: string }[];
  validation_rules?: {
    min?: number;
    max?: number;
    required?: boolean;
    pattern?: string;
  };
  is_sensitive: boolean;
  is_masked?: boolean;
  requires_restart: boolean;
  is_readonly: boolean;
  display_order: number;
  updated_at: string;
  updated_by_id?: string;
}

interface SettingsData {
  categories: {
    [key: string]: Setting[];
  };
  total_count: number;
}

interface FormValues {
  [key: string]: string;
}

interface ConnectionResult {
  success: boolean;
  message: string;
  connection_details?: {
    status?: number;
    status_text?: string;
    response_time_ms?: number;
    reachable?: boolean;
    auth_required?: boolean;
    error?: string;
  };
}

const AdminSettingsPage = () => {
  const router = useRouter();
  const { user, permissions, logout } = AuthService();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [originalValues, setOriginalValues] = useState<FormValues>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; key?: string; value?: string } | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' ||
                  user?.role?.name === 'admin' ||
                  user?.role?.toLowerCase() === 'admin';

  const hasPermission = (permissionName: string) => {
    if (isAdmin) return true;
    return permissions.includes(permissionName);
  };

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin && !hasPermission('manage:settings')) {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to access admin settings.',
      });
      router.push('/');
    }
  }, [isAdmin]);

  // Fetch settings on load
  useEffect(() => {
    fetchSettings();
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    const changed = Object.keys(formValues).some(
      key => formValues[key] !== originalValues[key]
    );
    setHasChanges(changed);
  }, [formValues, originalValues]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await http.get('/admin/settings');
      if (response.data?.success && response.data?.data) {
        setSettingsData(response.data.data);

        // Initialize form values
        const values: FormValues = {};
        Object.values(response.data.data.categories).forEach((settings: Setting[]) => {
          settings.forEach((setting: Setting) => {
            values[setting.setting_key] = setting.setting_value || '';
          });
        });
        setFormValues(values);
        setOriginalValues(values);
      } else if (response.data?.data?.total_count === 0 || !response.data?.data?.categories) {
        // No settings exist, initialize them
        await initializeSettings();
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      if (error.response?.status === 401) {
        logout();
      } else if (error.response?.status === 404) {
        // Settings not initialized yet
        await initializeSettings();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.error || 'Failed to load settings',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeSettings = async () => {
    try {
      const response = await http.post('/admin/settings/initialize');
      if (response.data?.success) {
        await fetchSettings();
        Swal.fire({
          icon: 'success',
          title: 'Settings Initialized',
          text: `${response.data.created_count || 0} default settings have been created.`,
        });
      }
    } catch (error: any) {
      console.error('Error initializing settings:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to initialize settings. Please try again.',
      });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build list of changed settings
      const changedSettings = Object.keys(formValues)
        .filter(key => formValues[key] !== originalValues[key])
        .map(key => ({ key, value: formValues[key] }));

      if (changedSettings.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Changes',
          text: 'No settings have been modified.',
        });
        setSaving(false);
        return;
      }

      // Check for maintenance mode toggle - show confirmation
      const maintenanceSetting = changedSettings.find(s => s.key === 'system.maintenance_mode');
      if (maintenanceSetting && maintenanceSetting.value === 'true') {
        setConfirmAction({ type: 'maintenance', key: maintenanceSetting.key, value: maintenanceSetting.value });
        setConfirmDialogOpen(true);
        setSaving(false);
        return;
      }

      await saveSettings(changedSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaving(false);
    }
  };

  const saveSettings = async (changedSettings: { key: string; value: string }[]) => {
    try {
      const response = await http.post('/admin/settings/bulk', {
        settings: changedSettings,
        reason: 'Updated via Admin Settings page'
      });

      if (response.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Settings Saved',
          text: `${response.data.updated_count} settings updated successfully.`,
        });

        // Refresh to get updated timestamps
        await fetchSettings();

        // Check if any settings require restart
        if (settingsData) {
          const requiresRestart = changedSettings.some(cs => {
            const setting = Object.values(settingsData.categories)
              .flat()
              .find((s: Setting) => s.setting_key === cs.key);
            return setting?.requires_restart;
          });

          if (requiresRestart) {
            Swal.fire({
              icon: 'warning',
              title: 'Restart Required',
              text: 'Some changes require an application restart to take effect.',
            });
          }
        }
      } else if (response.data?.errors?.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Partial Update',
          html: `<p>Some settings were not updated:</p><ul>${response.data.errors.map((e: any) => `<li>${e.key}: ${e.error}</li>`).join('')}</ul>`,
        });
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.error || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (settingKey: string) => {
    setConfirmAction({ type: 'reset', key: settingKey });
    setConfirmDialogOpen(true);
  };

  const performReset = async (settingKey: string) => {
    try {
      const response = await http.post(`/admin/settings/reset/${settingKey}`, {
        reason: 'Reset to default via Admin Settings page'
      });

      if (response.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Setting Reset',
          text: 'Setting has been reset to its default value.',
        });
        await fetchSettings();
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.error || 'Failed to reset setting',
      });
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const response = await http.post('/admin/settings/clearinghouse/test', {
        api_endpoint: formValues['clearinghouse.api_endpoint'],
        username: formValues['clearinghouse.username'],
        password: formValues['clearinghouse.password'],
        connection_timeout: parseInt(formValues['clearinghouse.connection_timeout'] || '30') * 1000
      });

      setConnectionResult(response.data);
    } catch (error: any) {
      setConnectionResult({
        success: false,
        message: error.response?.data?.error || 'Connection test failed',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmAction) {
      if (confirmAction.type === 'maintenance') {
        saveSettings([{ key: confirmAction.key!, value: confirmAction.value! }]);
      } else if (confirmAction.type === 'reset' && confirmAction.key) {
        performReset(confirmAction.key);
      }
    }
    setConfirmDialogOpen(false);
    setConfirmAction(null);
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSettingInput = (setting: Setting) => {
    const value = formValues[setting.setting_key] || '';
    const isDisabled = setting.is_readonly;

    switch (setting.setting_type) {
      case 'BOOLEAN':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value === 'true'}
                onChange={(e) => handleInputChange(setting.setting_key, e.target.checked ? 'true' : 'false')}
                disabled={isDisabled}
              />
            }
            label={value === 'true' ? 'Enabled' : 'Disabled'}
          />
        );

      case 'SELECT':
        return (
          <Select
            fullWidth
            value={value}
            onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
            disabled={isDisabled}
            size="small"
          >
            {setting.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        );

      case 'INTEGER':
        return (
          <TextField
            fullWidth
            type="number"
            value={value}
            onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
            disabled={isDisabled}
            size="small"
            inputProps={{
              min: setting.validation_rules?.min,
              max: setting.validation_rules?.max,
            }}
          />
        );

      case 'ENCRYPTED':
      case 'PASSWORD':
        return (
          <TextField
            fullWidth
            type={showPasswords[setting.setting_key] ? 'text' : 'password'}
            value={value}
            onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
            disabled={isDisabled}
            size="small"
            placeholder={setting.is_masked ? '(encrypted value - enter new to change)' : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility(setting.setting_key)}
                    edge="end"
                    size="small"
                  >
                    {showPasswords[setting.setting_key] ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        );

      case 'URL':
        return (
          <TextField
            fullWidth
            type="url"
            value={value}
            onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
            disabled={isDisabled}
            size="small"
            placeholder="https://..."
          />
        );

      default:
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
            disabled={isDisabled}
            size="small"
          />
        );
    }
  };

  const renderSettingRow = (setting: Setting) => {
    const isChanged = formValues[setting.setting_key] !== originalValues[setting.setting_key];

    return (
      <Grid container spacing={2} alignItems="flex-start" key={setting.setting_key} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <InputLabel sx={{ fontWeight: 500 }}>{setting.name}</InputLabel>
              {setting.requires_restart && (
                <Tooltip title="Requires application restart">
                  <Chip label="Restart" size="small" color="warning" />
                </Tooltip>
              )}
              {isChanged && (
                <Chip label="Modified" size="small" color="primary" />
              )}
            </Stack>
            <Typography variant="body2" color="textSecondary">
              {setting.description}
            </Typography>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          {renderSettingInput(setting)}
        </Grid>
        <Grid item xs={12} md={2}>
          <Stack direction="row" spacing={1}>
            {!setting.is_readonly && setting.default_value && (
              <Tooltip title="Reset to default">
                <IconButton
                  size="small"
                  onClick={() => handleReset(setting.setting_key)}
                  disabled={formValues[setting.setting_key] === setting.default_value}
                >
                  <ArrowRotateLeft size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Grid>
      </Grid>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SYSTEM':
        return <Setting2 size={20} />;
      case 'SECURITY':
        return <ShieldTick size={20} />;
      case 'CLEARINGHOUSE':
        return <Cloud size={20} />;
      default:
        return <InfoCircle size={20} />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'SYSTEM':
        return 'System Configuration';
      case 'SECURITY':
        return 'Security Settings';
      case 'CLEARINGHOUSE':
        return 'Clearinghouse Settings';
      default:
        return category;
    }
  };

  if (!isAdmin && !hasPermission('manage:settings')) {
    return (
      <MainCard title="Access Denied">
        <Alert severity="error">
          You do not have permission to access admin settings.
        </Alert>
      </MainCard>
    );
  }

  if (loading) {
    return (
      <MainCard title="Admin Settings">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  const categories = settingsData?.categories ? Object.keys(settingsData.categories) : [];

  return (
    <>
      <MainCard
        title="Admin Settings"
        secondary={
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh size={18} />}
              onClick={fetchSettings}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
            </Button>
          </Stack>
        }
      >
        {hasChanges && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You have unsaved changes. Click "Save Changes" to apply them.
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {categories.map((category, index) => (
              <Tab
                key={category}
                icon={getCategoryIcon(category)}
                iconPosition="start"
                label={getCategoryLabel(category)}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ mt: 3 }}>
          {categories.map((category, index) => (
            <Box
              key={category}
              role="tabpanel"
              hidden={activeTab !== index}
            >
              {activeTab === index && (
                <>
                  {settingsData?.categories[category]?.map((setting: Setting) =>
                    renderSettingRow(setting)
                  )}

                  {/* Special section for clearinghouse: Test Connection */}
                  {category === 'CLEARINGHOUSE' && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle1" fontWeight={500}>
                            Connection Test
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Test the clearinghouse API connection without saving
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Button
                            variant="outlined"
                            startIcon={testingConnection ? <CircularProgress size={18} /> : <Wifi size={18} />}
                            onClick={handleTestConnection}
                            disabled={testingConnection || !formValues['clearinghouse.api_endpoint']}
                          >
                            {testingConnection ? 'Testing...' : 'Test Connection'}
                          </Button>

                          {connectionResult && (
                            <Alert
                              severity={connectionResult.success ? 'success' : 'error'}
                              sx={{ mt: 2 }}
                            >
                              <Typography variant="subtitle2">
                                {connectionResult.message}
                              </Typography>
                              {connectionResult.connection_details && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                  {connectionResult.connection_details.reachable
                                    ? `Response time: ${connectionResult.connection_details.response_time_ms}ms`
                                    : connectionResult.connection_details.error
                                  }
                                  {connectionResult.connection_details.auth_required &&
                                    ' (Authentication required)'
                                  }
                                </Typography>
                              )}
                            </Alert>
                          )}
                        </Grid>
                      </Grid>
                    </>
                  )}
                </>
              )}
            </Box>
          ))}
        </Box>
      </MainCard>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>
          {confirmAction?.type === 'maintenance'
            ? 'Enable Maintenance Mode?'
            : 'Reset to Default?'
          }
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction?.type === 'maintenance'
              ? 'Enabling maintenance mode will prevent all non-admin users from accessing the system. Are you sure you want to proceed?'
              : 'This will reset the setting to its default value. Any custom configuration will be lost.'
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={confirmAction?.type === 'maintenance' ? 'warning' : 'primary'}
          >
            {confirmAction?.type === 'maintenance' ? 'Enable Maintenance Mode' : 'Reset'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdminSettingsPage;
