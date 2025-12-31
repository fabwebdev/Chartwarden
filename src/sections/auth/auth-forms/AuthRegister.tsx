'use client';

import { useEffect, useState, SyntheticEvent } from 'react';

// NEXT
import Link from 'next/link';
// Remove next-auth since we're using direct API calls
// import { signIn } from 'next-auth/react';

// MATERIAL - UI
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import Stack from '@mui/material/Stack';
import Links from '@mui/material/Link';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import FormHelperText from '@mui/material/FormHelperText';

// THIRD - PARTY
import * as Yup from 'yup';
import { Formik } from 'formik';

// PROJECT IMPORTS
import IconButton from 'components/@extended/IconButton';
import AnimateButton from 'components/@extended/AnimateButton';
import { strengthColor, strengthIndicator } from 'utils/password-strength';

// TYPES
import { StringColorProps } from 'types/password';

// ASSETS
import { Eye, EyeSlash } from 'iconsax-react';
import axiosInstance from '../../../hooks/useCookie';
import Swal from 'sweetalert2';
import { Alert } from '@mui/material';
import AuthService from 'types/AuthService';
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
})

// ============================|| JWT - REGISTER ||============================ //

const AuthRegister = () => {
  const [level, setLevel] = useState<StringColorProps>();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { setToken } = AuthService(); // Call hook at top level, not inside callbacks
  
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  const changePassword = (value: string) => {
    const temp = strengthIndicator(value);
    setLevel(strengthColor(temp));
  };

  useEffect(() => {
    changePassword('');
  }, []);

  return (
    <Formik
      initialValues={{
        firstname: '',
        lastname: '',
        email: '',
        company: '',
        password: '',
        submit: null
      }}
      validationSchema={Yup.object().shape({
        firstname: Yup.string().max(255).required('First Name is required'),
        lastname: Yup.string().max(255).required('Last Name is required'),
        email: Yup.string().email('Must be a valid email').max(255).required('Email is required'),
        password: Yup.string().max(255).required('Password is required')
      })}
      onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
        try {
          // Call the sign-up endpoint
          // Backend expects firstName and lastName (not name)
          const payload = {
            email: values.email,
            password: values.password,
            firstName: values.firstname.trim(),
            lastName: values.lastname.trim()
          };
          
          console.log('📤 Sign-up request payload:', payload);
          
          const response = await axiosInstance.post("/auth/sign-up", payload);
          
          console.log('✅ Sign-up response:', response.data);
          
          if (response.status === 200 && response.data?.data?.user) {
            const user = response.data.data.user;
            
            // Store user data (user is automatically assigned "patient" role)
            // Note: Permissions might be empty initially, but we'll fetch them on login
            setToken(user, []);
            
            Toast.fire({
              icon: 'success',
              title: response.data?.message || 'User registered successfully'
            });
            
            // Redirect to login page after successful registration
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
          setSubmitting(false);
        } catch (error: any) {
          console.error('Register error:', error);
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
          
          if (error.code === "ERR_NETWORK") {
            setErrorMessage("The server is not available. Please check your internet connection.");
          } else if (error.response?.status === 500) {
            // Server error - show detailed message if available
            const errorData = error.response?.data;
            if (errorData?.errors && Array.isArray(errorData.errors)) {
              // If there are validation errors, show them
              const errorMessages = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
              setErrorMessage(`Server error: ${errorMessages}`);
            } else {
              setErrorMessage(errorData?.message || 'Server error during registration. Please try again later or contact support.');
            }
          } else if (error.response?.status === 400) {
            // Validation errors
            const errorData = error.response?.data;
            if (errorData?.errors && Array.isArray(errorData.errors)) {
              const errorMessages = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
              setErrorMessage(`Validation error: ${errorMessages}`);
            } else {
              setErrorMessage(errorData?.message || 'Invalid input. Please check your information.');
            }
          } else {
            setErrorMessage(error.response?.data?.message || 'Registration failed. Please try again.');
          }
          setSubmitting(false);
        }
      }}
    >
      {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
        <form noValidate onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {errorMessage && (
                <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ justifyContent: 'center' }}>
                  {errorMessage}
                </Alert>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={1}>
                <InputLabel htmlFor="firstname-signup">First Name*</InputLabel>
                <OutlinedInput
                  id="firstname-login"
                  type="firstname"
                  value={values.firstname}
                  name="firstname"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="John"
                  fullWidth
                  error={Boolean(touched.firstname && errors.firstname)}
                />
                {touched.firstname && errors.firstname && (
                  <FormHelperText error id="helper-text-firstname-signup">
                    {errors.firstname}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={1}>
                <InputLabel htmlFor="lastname-signup">Last Name*</InputLabel>
                <OutlinedInput
                  fullWidth
                  error={Boolean(touched.lastname && errors.lastname)}
                  id="lastname-signup"
                  type="lastname"
                  value={values.lastname}
                  name="lastname"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Doe"
                  inputProps={{}}
                />
                {touched.lastname && errors.lastname && (
                  <FormHelperText error id="helper-text-lastname-signup">
                    {errors.lastname}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1}>
                <InputLabel htmlFor="company-signup">Company</InputLabel>
                <OutlinedInput
                  fullWidth
                  error={Boolean(touched.company && errors.company)}
                  id="company-signup"
                  value={values.company}
                  name="company"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Demo Inc."
                  inputProps={{}}
                />
                {touched.company && errors.company && (
                  <FormHelperText error id="helper-text-company-signup">
                    {errors.company}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1}>
                <InputLabel htmlFor="email-signup">Email Address*</InputLabel>
                <OutlinedInput
                  fullWidth
                  error={Boolean(touched.email && errors.email)}
                  id="email-login"
                  type="email"
                  value={values.email}
                  name="email"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="demo@company.com"
                  inputProps={{}}
                />
                {touched.email && errors.email && (
                  <FormHelperText error id="helper-text-email-signup">
                    {errors.email}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1}>
                <InputLabel htmlFor="password-signup">Password</InputLabel>
                <OutlinedInput
                  fullWidth
                  error={Boolean(touched.password && errors.password)}
                  id="password-signup"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  name="password"
                  onBlur={handleBlur}
                  onChange={(e) => {
                    handleChange(e);
                    changePassword(e.target.value);
                  }}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                        color="secondary"
                      >
                        {showPassword ? <Eye /> : <EyeSlash />}
                      </IconButton>
                    </InputAdornment>
                  }
                  placeholder="******"
                  inputProps={{}}
                />
                {touched.password && errors.password && (
                  <FormHelperText error id="helper-text-password-signup">
                    {errors.password}
                  </FormHelperText>
                )}
              </Stack>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <Box sx={{ bgcolor: level?.color, width: 85, height: 8, borderRadius: '7px' }} />
                  </Grid>
                  <Grid item>
                    <Typography variant="subtitle1" fontSize="0.75rem">
                      {level?.label}
                    </Typography>
                  </Grid>
                </Grid>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                By Signing up, you agree to our &nbsp;
                <Links variant="subtitle2" component={Link} href="#">
                  Terms of Service
                </Links>
                &nbsp; and &nbsp;
                <Links variant="subtitle2" component={Link} href="#">
                  Privacy Policy
                </Links>
              </Typography>
            </Grid>
            {errors.submit && (
              <Grid item xs={12}>
                <FormHelperText error>{errors.submit}</FormHelperText>
              </Grid>
            )}
            <Grid item xs={12}>
              <AnimateButton>
                <Button 
                  disableElevation 
                  disabled={isSubmitting} 
                  fullWidth 
                  size="large" 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                >
                  Create Account
                </Button>
              </AnimateButton>
            </Grid>
          </Grid>
        </form>
      )}
    </Formik>
  );
};

export default AuthRegister;