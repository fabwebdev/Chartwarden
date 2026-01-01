'use client';

// MATERIAL - UI
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';

// THIRD - PARTY
import * as Yup from 'yup';
import { Formik } from 'formik';

// PROJECT IMPORTS
import { openSnackbar } from 'api/snackbar';
import { updateUserProfile, UserProfileData, uploadUserAvatar } from 'api/userProfile';
import { useAuthStore } from 'store/authStore';

// TYPES
import { SnackbarProps } from 'types/snackbar';

// ==============================|| PROFILE - PERSONAL INFORMATION ||============================== //

interface TabPersonalProps {
  profileData: UserProfileData | null;
  onUpdate: (data: Partial<UserProfileData>) => void;
  focusInput: () => void;
  selectedImage?: File;
}

const TabPersonal = ({ profileData, onUpdate, focusInput, selectedImage }: TabPersonalProps) => {
  const { user, setUser } = useAuthStore();

  return (
    <Formik
      enableReinitialize
      initialValues={{
        firstName: profileData?.firstName || '',
        lastName: profileData?.lastName || '',
        email: profileData?.email || '',
        contact: profileData?.contact || '',
        submit: null,
      }}
      validationSchema={Yup.object().shape({
        firstName: Yup.string().max(255).required('First name is required'),
        lastName: Yup.string().max(255).required('Last name is required'),
        email: Yup.string().email('Invalid email address').max(255).required('Email is required'),
        contact: Yup.string()
          .matches(/^[0-9+\-() ]*$/, 'Invalid phone number format')
          .nullable(),
      })}
      onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
        try {
          if (!profileData?.id) {
            throw new Error('User ID not found');
          }

          // First upload avatar if changed
          let imageUrl = profileData?.image;
          if (selectedImage) {
            try {
              const avatarResponse = await uploadUserAvatar(profileData.id, selectedImage);
              // avatarResponse could be a string URL or an object with nested data
              if (typeof avatarResponse === 'string') {
                imageUrl = avatarResponse;
              } else if (avatarResponse && typeof avatarResponse === 'object') {
                const response = avatarResponse as { data?: { url?: string }; url?: string };
                imageUrl = response?.data?.url || response?.url || imageUrl;
              }
            } catch (avatarError) {
              console.warn('Avatar upload failed, continuing with profile update:', avatarError);
            }
          }

          // Prepare update data
          const updateData = {
            name: `${values.firstName} ${values.lastName}`.trim(),
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            contact: values.contact || undefined,
            ...(imageUrl && { image: imageUrl }),
          };

          // Update profile
          const response = await updateUserProfile(profileData.id, updateData);
          const updatedUser = response?.data?.user || response?.user || response;

          // Update local state
          onUpdate(updatedUser);

          // Update auth store if user data changed
          if (user) {
            setUser({
              ...user,
              name: updateData.name,
              email: values.email,
              ...(imageUrl && { image: imageUrl }),
            });
          }

          openSnackbar({
            open: true,
            message: 'Profile updated successfully.',
            variant: 'alert',
            alert: {
              color: 'success',
            },
          } as SnackbarProps);

          setStatus({ success: true });
          setSubmitting(false);
        } catch (err: any) {
          console.error('Error updating profile:', err);
          setStatus({ success: false });
          setErrors({ submit: err.message || 'Failed to update profile' });
          setSubmitting(false);

          openSnackbar({
            open: true,
            message: err.message || 'Failed to update profile',
            variant: 'alert',
            alert: {
              color: 'error',
            },
          } as SnackbarProps);
        }
      }}
    >
      {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, dirty }) => (
        <form noValidate onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Stack spacing={1}>
                <InputLabel htmlFor="personal-firstName">First Name</InputLabel>
                <TextField
                  fullWidth
                  id="personal-firstName"
                  value={values.firstName}
                  name="firstName"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  error={Boolean(touched.firstName && errors.firstName)}
                />
                {touched.firstName && errors.firstName && (
                  <FormHelperText error id="personal-firstName-helper">
                    {errors.firstName}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Stack spacing={1}>
                <InputLabel htmlFor="personal-lastName">Last Name</InputLabel>
                <TextField
                  fullWidth
                  id="personal-lastName"
                  value={values.lastName}
                  name="lastName"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  error={Boolean(touched.lastName && errors.lastName)}
                />
                {touched.lastName && errors.lastName && (
                  <FormHelperText error id="personal-lastName-helper">
                    {errors.lastName}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Stack spacing={1}>
                <InputLabel htmlFor="personal-email">Email Address</InputLabel>
                <TextField
                  type="email"
                  fullWidth
                  id="personal-email"
                  value={values.email}
                  name="email"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  error={Boolean(touched.email && errors.email)}
                />
                {touched.email && errors.email && (
                  <FormHelperText error id="personal-email-helper">
                    {errors.email}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Stack spacing={1}>
                <InputLabel htmlFor="personal-contact">Phone Number</InputLabel>
                <TextField
                  fullWidth
                  id="personal-contact"
                  value={values.contact}
                  name="contact"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  error={Boolean(touched.contact && errors.contact)}
                />
                {touched.contact && errors.contact && (
                  <FormHelperText error id="personal-contact-helper">
                    {errors.contact}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>

            {errors.submit && (
              <Grid item xs={12}>
                <FormHelperText error>{errors.submit}</FormHelperText>
              </Grid>
            )}

            <Grid item xs={12}>
              <Stack direction="row" justifyContent="flex-end" spacing={2}>
                <Button variant="outlined" color="secondary" type="button" disabled={!dirty || isSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={isSubmitting || !dirty || Object.keys(errors).length > 0}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      )}
    </Formik>
  );
};

export default TabPersonal;
