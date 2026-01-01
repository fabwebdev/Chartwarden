'use client';

import { useState, SyntheticEvent } from 'react';

// MATERIAL - UI
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';

// THIRD - PARTY
import * as Yup from 'yup';
import { Formik } from 'formik';

// PROJECT IMPORTS
import IconButton from 'components/@extended/IconButton';
import { openSnackbar } from 'api/snackbar';
import { changeUserPassword } from 'api/userProfile';

// ASSETS
import { Eye, EyeSlash, Minus, TickCircle } from 'iconsax-react';

// TYPES
import { SnackbarProps } from 'types/snackbar';

// ==============================|| PASSWORD VALIDATION HELPERS ||============================== //

// HIPAA requires minimum 12 characters
const minLength = (value: string) => value.length >= 12;
const isLowercaseChar = (value: string) => /[a-z]/.test(value);
const isUppercaseChar = (value: string) => /[A-Z]/.test(value);
const isNumber = (value: string) => /[0-9]/.test(value);
const isSpecialChar = (value: string) => /[!@#$%^&*()\-_=+{};:,<.>]/.test(value);

// ==============================|| PROFILE - PASSWORD CHANGE ||============================== //

interface TabPasswordProps {
  userId: string;
}

const TabPassword = ({ userId }: TabPasswordProps) => {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleClickShowOldPassword = () => {
    setShowOldPassword(!showOldPassword);
  };

  const handleClickShowNewPassword = () => {
    setShowNewPassword(!showNewPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  return (
    <Formik
      initialValues={{
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        submit: null,
      }}
      validationSchema={Yup.object().shape({
        currentPassword: Yup.string().required('Current password is required'),
        newPassword: Yup.string()
          .required('New password is required')
          .min(12, 'Password must be at least 12 characters (HIPAA requirement)')
          .matches(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+{};:,<.>])[A-Za-z\d!@#$%^&*()\-_=+{};:,<.>]{12,}$/,
            'Password must contain at least 12 characters, one uppercase, one lowercase, one number, and one special character'
          ),
        confirmPassword: Yup.string()
          .required('Confirm password is required')
          .oneOf([Yup.ref('newPassword')], 'Passwords must match'),
      })}
      onSubmit={async (values, { resetForm, setErrors, setStatus, setSubmitting }) => {
        try {
          if (!userId) {
            throw new Error('User ID not found');
          }

          await changeUserPassword(userId, {
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          });

          openSnackbar({
            open: true,
            message: 'Password changed successfully.',
            variant: 'alert',
            alert: {
              color: 'success',
            },
          } as SnackbarProps);

          resetForm();
          setStatus({ success: true });
          setSubmitting(false);
        } catch (err: any) {
          console.error('Error changing password:', err);

          let errorMessage = 'Failed to change password';
          if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
          } else if (err.message) {
            errorMessage = err.message;
          }

          // Handle specific error messages
          if (errorMessage.toLowerCase().includes('current password')) {
            setErrors({ currentPassword: 'Current password is incorrect' });
          } else if (errorMessage.toLowerCase().includes('validation')) {
            setErrors({ newPassword: errorMessage });
          } else {
            setErrors({ submit: errorMessage });
          }

          setStatus({ success: false });
          setSubmitting(false);

          openSnackbar({
            open: true,
            message: errorMessage,
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
            {/* Password Fields */}
            <Grid item xs={12} md={6}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Stack spacing={1}>
                    <InputLabel htmlFor="password-current">Current Password</InputLabel>
                    <OutlinedInput
                      placeholder="Enter current password"
                      id="password-current"
                      type={showOldPassword ? 'text' : 'password'}
                      value={values.currentPassword}
                      name="currentPassword"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      error={Boolean(touched.currentPassword && errors.currentPassword)}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowOldPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                            size="large"
                            color="secondary"
                          >
                            {showOldPassword ? <Eye /> : <EyeSlash />}
                          </IconButton>
                        </InputAdornment>
                      }
                      autoComplete="current-password"
                    />
                    {touched.currentPassword && errors.currentPassword && (
                      <FormHelperText error id="password-current-helper">
                        {errors.currentPassword}
                      </FormHelperText>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12}>
                  <Stack spacing={1}>
                    <InputLabel htmlFor="password-new">New Password</InputLabel>
                    <OutlinedInput
                      placeholder="Enter new password"
                      id="password-new"
                      type={showNewPassword ? 'text' : 'password'}
                      value={values.newPassword}
                      name="newPassword"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      error={Boolean(touched.newPassword && errors.newPassword)}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowNewPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                            size="large"
                            color="secondary"
                          >
                            {showNewPassword ? <Eye /> : <EyeSlash />}
                          </IconButton>
                        </InputAdornment>
                      }
                      autoComplete="new-password"
                    />
                    {touched.newPassword && errors.newPassword && (
                      <FormHelperText error id="password-new-helper">
                        {errors.newPassword}
                      </FormHelperText>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12}>
                  <Stack spacing={1}>
                    <InputLabel htmlFor="password-confirm">Confirm Password</InputLabel>
                    <OutlinedInput
                      placeholder="Confirm new password"
                      id="password-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={values.confirmPassword}
                      name="confirmPassword"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      error={Boolean(touched.confirmPassword && errors.confirmPassword)}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowConfirmPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                            size="large"
                            color="secondary"
                          >
                            {showConfirmPassword ? <Eye /> : <EyeSlash />}
                          </IconButton>
                        </InputAdornment>
                      }
                      autoComplete="new-password"
                    />
                    {touched.confirmPassword && errors.confirmPassword && (
                      <FormHelperText error id="password-confirm-helper">
                        {errors.confirmPassword}
                      </FormHelperText>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Grid>

            {/* Password Requirements */}
            <Grid item xs={12} md={6}>
              <Box sx={{ p: { xs: 0, sm: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Password Requirements (HIPAA Compliant)
                </Typography>
                <List sx={{ p: 0 }}>
                  <ListItem divider sx={{ py: 1, px: 0 }}>
                    <ListItemIcon sx={{ color: minLength(values.newPassword) ? 'success.main' : 'text.secondary', minWidth: 32 }}>
                      {minLength(values.newPassword) ? <TickCircle size={20} /> : <Minus size={20} />}
                    </ListItemIcon>
                    <ListItemText primary="At least 12 characters" />
                  </ListItem>
                  <ListItem divider sx={{ py: 1, px: 0 }}>
                    <ListItemIcon
                      sx={{ color: isLowercaseChar(values.newPassword) ? 'success.main' : 'text.secondary', minWidth: 32 }}
                    >
                      {isLowercaseChar(values.newPassword) ? <TickCircle size={20} /> : <Minus size={20} />}
                    </ListItemIcon>
                    <ListItemText primary="At least 1 lowercase letter (a-z)" />
                  </ListItem>
                  <ListItem divider sx={{ py: 1, px: 0 }}>
                    <ListItemIcon
                      sx={{ color: isUppercaseChar(values.newPassword) ? 'success.main' : 'text.secondary', minWidth: 32 }}
                    >
                      {isUppercaseChar(values.newPassword) ? <TickCircle size={20} /> : <Minus size={20} />}
                    </ListItemIcon>
                    <ListItemText primary="At least 1 uppercase letter (A-Z)" />
                  </ListItem>
                  <ListItem divider sx={{ py: 1, px: 0 }}>
                    <ListItemIcon sx={{ color: isNumber(values.newPassword) ? 'success.main' : 'text.secondary', minWidth: 32 }}>
                      {isNumber(values.newPassword) ? <TickCircle size={20} /> : <Minus size={20} />}
                    </ListItemIcon>
                    <ListItemText primary="At least 1 number (0-9)" />
                  </ListItem>
                  <ListItem sx={{ py: 1, px: 0 }}>
                    <ListItemIcon
                      sx={{ color: isSpecialChar(values.newPassword) ? 'success.main' : 'text.secondary', minWidth: 32 }}
                    >
                      {isSpecialChar(values.newPassword) ? <TickCircle size={20} /> : <Minus size={20} />}
                    </ListItemIcon>
                    <ListItemText primary="At least 1 special character" />
                  </ListItem>
                </List>
              </Box>
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
                  {isSubmitting ? 'Changing...' : 'Change Password'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      )}
    </Formik>
  );
};

export default TabPassword;
