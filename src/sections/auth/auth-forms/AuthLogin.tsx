'use client';

import { useState, SyntheticEvent } from 'react';


// MATERIAL - UI
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import FormHelperText from '@mui/material/FormHelperText';
import FormControlLabel from '@mui/material/FormControlLabel';

// THIRD - PARTY
import * as Yup from 'yup';
import { Formik } from 'formik';

// PROJECT IMPORTS
import IconButton from 'components/@extended/IconButton';
import AnimateButton from 'components/@extended/AnimateButton';

// ASSETS
import { Eye, EyeSlash } from 'iconsax-react';
import Swal from 'sweetalert2';
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 1000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
})
import AuthService from 'types/AuthService';
import { Alert } from '@mui/material';
import axiosInstance from '../../../hooks/useCookie';
// ============================|| JWT - LOGIN ||============================ //

const AuthLogin = () => {
  const [checked, setChecked] = useState(false);
  const { setToken } = AuthService();
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  return (
    <Formik
      initialValues={{
        email: '',
        password: '',
        submit: null
      }}
      validationSchema={Yup.object().shape({
        email: Yup.string().email('Must be a valid email').max(255).required('Email is required'),
        password: Yup.string().max(255).required('Password is required')
      })}
      onSubmit={async (values) => {
        try {
          // Step 1: Login - cookies are automatically set by the backend
          // Using Better Auth's built-in endpoint: /api/auth/sign-in/email
          console.log('Attempting login...');
          const loginResponse = await axiosInstance.post("/auth/sign-in/email", {
            email: values.email,
            password: values.password
          });
          
          console.log('Login response:', loginResponse.status, loginResponse.headers);
          
          // Check if set-cookie header was received
          const setCookieHeader = loginResponse.headers['set-cookie'] || 
                                  loginResponse.headers['Set-Cookie'] ||
                                  loginResponse.headers['set-cookie']?.[0];
          
          if (setCookieHeader) {
            console.log('✅ Set-Cookie header received:', setCookieHeader);
          } else {
            console.warn('⚠️ No Set-Cookie header in sign-in response!');
            console.log('Available headers:', Object.keys(loginResponse.headers));
          }
          
          if (loginResponse.status === 200) {
            // Step 2: Get user profile with permissions (REQUIRED after login)
            // Add a small delay to ensure cookie is set
            await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
            
            try {
              console.log('Fetching user profile...');
              
              // Check if cookie exists in browser before making request
              if (typeof document !== 'undefined') {
                const cookies = document.cookie;
                console.log('📋 Current browser cookies:', cookies || 'NO COOKIES FOUND');
                
                // Check for session cookie
                const sessionCookie = cookies.split(';').find(c => c.includes('better-auth.session_token'));
                if (sessionCookie) {
                  console.log('✅ Session cookie found in browser:', sessionCookie.trim());
                } else {
                  console.error('❌ Session cookie NOT found in browser cookies!');
                  console.error('🔍 This means the cookie was NOT set by the browser.');
                  console.error('💡 Possible causes:');
                  console.error('   1. Cookie SameSite=Lax (won\'t work for cross-origin)');
                  console.error('   2. Cookie domain mismatch');
                  console.error('   3. Cookie path mismatch');
                  console.error('   4. Browser blocking third-party cookies');
                  
                  // Check Application tab cookies
                  console.error('📝 Check DevTools → Application → Cookies to see if cookie exists there');
                }
                
                // Check if it's a cross-origin request
                const frontendOrigin = window.location.origin;
                const backendOrigin = loginResponse.config.baseURL?.replace('/api', '') || '';
                if (frontendOrigin !== backendOrigin) {
                  console.warn('⚠️ CROSS-ORIGIN REQUEST DETECTED!');
                  console.warn('Frontend:', frontendOrigin);
                  console.warn('Backend:', backendOrigin);
                  console.warn('⚠️ Cookies with SameSite=Lax will NOT be sent in cross-origin requests!');
                  console.warn('✅ Backend MUST set SameSite=None; Secure for this to work.');
                }
              }
              
              const profileResponse = await axiosInstance.get("/auth/me");
              
              console.log('Profile response:', profileResponse.status);
              
              if (profileResponse.status === 200 && profileResponse.data?.data?.user) {
                const user = profileResponse.data.data.user;
                const permissions = user.permissions || [];
                
                // Store user and permissions in localStorage (no token needed for cookie-based auth)
                setToken(user, permissions);
                
                Toast.fire({
                  icon: 'success',
                  title: 'Login successful'
                });
                
                // Redirect after successful login
                setTimeout(() => {
                  window.location.href = '/sample-page';
                }, 300);
              } else {
                setErrorMessage('Failed to fetch user profile');
              }
            } catch (profileError: any) {
              console.error('Error fetching user profile:', profileError);
              console.error('Profile error response:', profileError.response?.data);
              
              // Check if it's a 401 from /auth/me (session not found)
              if (profileError.response?.status === 401) {
                setErrorMessage(
                  profileError.response?.data?.message || 
                  'Login succeeded but session cookie was not set. Please check backend cookie configuration.'
                );
              } else {
                setErrorMessage('Login successful but failed to load user profile');
              }
            }
          }
        } catch (error: any) {
          console.error('Login error:', error);
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
          
          if (error.code === "ERR_NETWORK") {
            setErrorMessage("The server is not available");
          } else if (error.response?.status === 401) {
            // This is likely from /auth/sign-in/email (invalid credentials)
            setErrorMessage(error.response?.data?.message || 'Invalid email or password');
          } else {
            setErrorMessage(error.response?.data?.message || 'Login failed');
          }
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
        </Alert> )}
              <Stack spacing={1}>
                <InputLabel htmlFor="email-login">Email Address</InputLabel>
                <OutlinedInput
                  id="email-login"
                  type="email"
                  value={values.email}
                  name="email"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  fullWidth
                  error={Boolean(touched.email && errors.email)}
                />
                {touched.email && errors.email && (
                  <FormHelperText error id="standard-weight-helper-text-email-login">
                    {errors.email}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1}>
                <InputLabel htmlFor="password-login">Password</InputLabel>
                <OutlinedInput
                  fullWidth
                  error={Boolean(touched.password && errors.password)}
                  id="-password-login"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  name="password"
                  onBlur={handleBlur}
                  onChange={handleChange}
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
                  placeholder="Enter password"
                />
                {touched.password && errors.password && (
                  <FormHelperText error id="standard-weight-helper-text-password-login">
                    {errors.password}
                  </FormHelperText>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} sx={{ mt: -1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={(event) => setChecked(event.target.checked)}
                      name="checked"
                      color="primary"
                      size="small"
                    />
                  }
                  label={<Typography variant="h6">Keep me sign in</Typography>}
                />
                {/* <Links variant="h6" component={Link} href={session ? '/auth/forgot-password' : '/forgot-password'} color="text.primary">
                  Forgot Password?
                </Links> */}
              </Stack>
            </Grid>
            {errors.submit && (
              <Grid item xs={12}>
                <FormHelperText error>{errors.submit}</FormHelperText>
              </Grid>
            )}
            <Grid item xs={12}>
              <AnimateButton>
                <Button disableElevation disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained" color="primary">
                  Login
                </Button>
              </AnimateButton>
            </Grid>
          </Grid>
        </form>
      )}
    </Formik>
  );
};

export default AuthLogin;