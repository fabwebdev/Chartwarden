'use client';

import { useState, useEffect, useRef, ChangeEvent, SyntheticEvent } from 'react';

// MATERIAL - UI
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// PROJECT IMPORTS
import MainCard from 'components/MainCard';
import Avatar from 'components/@extended/Avatar';
import { useAuthStore } from 'store/authStore';
import { getCurrentUserProfile, UserProfileData } from 'api/userProfile';

// COMPONENTS
import TabPersonal from './TabPersonal';
import TabPassword from './TabPassword';
import TabSettings from './TabSettings';

// ASSETS
import { Profile, Lock, Setting3, Camera } from 'iconsax-react';

// TYPES
import { ThemeMode } from 'types/config';

// ==============================|| USER PROFILE PAGE ||============================== //

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `profile-tab-${index}`,
    'aria-controls': `profile-tabpanel-${index}`,
  };
}

const UserProfilePage = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | undefined>(undefined);
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getCurrentUserProfile(user.id);
        const data = response?.data?.user || response?.user || response;
        setProfileData(data);
        if (data?.image) {
          setAvatar(data.image);
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    if (selectedImage) {
      setAvatar(URL.createObjectURL(selectedImage));
    }
  }, [selectedImage]);

  const handleTabChange = (event: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleProfileUpdate = (updatedData: Partial<UserProfileData>) => {
    if (profileData) {
      setProfileData({ ...profileData, ...updatedData });
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  if (loading) {
    return (
      <MainCard>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (error) {
    return (
      <MainCard>
        <Alert severity="error">{error}</Alert>
      </MainCard>
    );
  }

  const displayName = profileData?.name || `${profileData?.firstName || ''} ${profileData?.lastName || ''}`.trim() || 'User';
  const displayRole = profileData?.roles?.[0]?.name || profileData?.role || 'User';

  return (
    <Grid container spacing={3}>
      {/* Profile Header Card */}
      <Grid item xs={12} md={4}>
        <MainCard>
          <Stack spacing={2.5} alignItems="center" sx={{ py: 2 }}>
            {/* Avatar with upload */}
            <Box
              sx={{
                position: 'relative',
                borderRadius: '50%',
                overflow: 'hidden',
                '&:hover .avatar-overlay': { opacity: 1 },
                cursor: 'pointer',
              }}
              onClick={() => inputRef.current?.click()}
            >
              <Avatar
                alt={displayName}
                src={avatar || '/assets/images/users/default.png'}
                sx={{ width: 120, height: 120, border: '2px dashed', borderColor: 'divider' }}
              />
              <Box
                className="avatar-overlay"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  backgroundColor: theme.palette.mode === ThemeMode.DARK ? 'rgba(255, 255, 255, .75)' : 'rgba(0,0,0,.65)',
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s',
                }}
              >
                <Stack spacing={0.5} alignItems="center">
                  <Camera style={{ color: theme.palette.secondary.lighter, fontSize: '2rem' }} />
                  <Typography sx={{ color: 'secondary.lighter', fontSize: '0.75rem' }}>Upload</Typography>
                </Stack>
              </Box>
            </Box>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              style={{ display: 'none' }}
              ref={inputRef}
              onChange={handleImageChange}
            />

            {/* User Info */}
            <Stack spacing={0.5} alignItems="center">
              <Typography variant="h5">{displayName}</Typography>
              <Typography color="secondary" variant="body2">
                {displayRole}
              </Typography>
            </Stack>

            <Divider sx={{ width: '100%' }} />

            {/* Quick Info */}
            <Stack spacing={1} sx={{ width: '100%', px: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="secondary" variant="body2">
                  Email
                </Typography>
                <Typography variant="body2">{profileData?.email || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="secondary" variant="body2">
                  Contact
                </Typography>
                <Typography variant="body2">{profileData?.contact || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="secondary" variant="body2">
                  Last Login
                </Typography>
                <Typography variant="body2">
                  {profileData?.last_login_at ? new Date(profileData.last_login_at).toLocaleDateString() : '-'}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </MainCard>
      </Grid>

      {/* Profile Tabs Card */}
      <Grid item xs={12} md={8}>
        <MainCard sx={{ '& .MuiCardContent-root': { p: 0 } }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2.5, pt: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="profile tabs"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 48,
                  minWidth: 100,
                  textTransform: 'none',
                },
              }}
            >
              <Tab icon={<Profile size={18} />} iconPosition="start" label="Personal" {...a11yProps(0)} />
              <Tab icon={<Lock size={18} />} iconPosition="start" label="Password" {...a11yProps(1)} />
              <Tab icon={<Setting3 size={18} />} iconPosition="start" label="Settings" {...a11yProps(2)} />
            </Tabs>
          </Box>

          <Box sx={{ p: 2.5 }}>
            <TabPanel value={tabValue} index={0}>
              <TabPersonal
                profileData={profileData}
                onUpdate={handleProfileUpdate}
                focusInput={focusInput}
                selectedImage={selectedImage}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <TabPassword userId={user?.id || ''} />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <TabSettings userId={user?.id || ''} />
            </TabPanel>
          </Box>
        </MainCard>
      </Grid>
    </Grid>
  );
};

export default UserProfilePage;
