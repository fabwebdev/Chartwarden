'use client';

import { forwardRef, SyntheticEvent, useCallback, useEffect, useState } from 'react';

// MATERIAL - UI
import { alpha, styled, useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// PROJECT IMPORTS
import IconButton from 'components/@extended/IconButton';
import getColors from 'utils/getColors';

// ASSETS
import { CloseCircle, InfoCircle, TickCircle, Warning2 } from 'iconsax-react';

// TYPES
import { NotificationPayload } from 'lib/socket/types';

// ==============================|| TOAST NOTIFICATION - TYPES ||============================== //

export interface ToastNotificationProps {
  notification: NotificationPayload;
  autoHideDuration?: number;
  onClose?: (notificationId: string) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

type NotificationVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

// ==============================|| TOAST NOTIFICATION - STYLED ||============================== //

interface StyledToastProps {
  variant: NotificationVariant;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

const StyledToast = styled(Alert, {
  shouldForwardProp: (prop) => prop !== 'variant' && prop !== 'priority'
})<StyledToastProps>(({ theme, variant, priority }) => {
  const colors = getColors(theme, variant === 'default' ? 'primary' : variant);
  const { main, lighter, light } = colors;

  const priorityBorderWidth = {
    low: 0,
    normal: 0,
    high: 2,
    urgent: 3
  };

  return {
    width: '100%',
    maxWidth: 400,
    minWidth: 300,
    borderRadius: 8,
    boxShadow: theme.shadows[8],
    backgroundColor: theme.palette.background.paper,
    border: `${priorityBorderWidth[priority || 'normal']}px solid ${main}`,
    borderLeft: `4px solid ${main}`,
    padding: theme.spacing(1.5, 2),
    position: 'relative',
    overflow: 'hidden',

    '& .MuiAlert-icon': {
      fontSize: '1.5rem',
      marginRight: theme.spacing(1.5),
      padding: 0,
      opacity: 1,
      color: main
    },

    '& .MuiAlert-message': {
      padding: 0,
      width: '100%'
    },

    '& .MuiAlert-action': {
      paddingLeft: theme.spacing(1),
      paddingTop: 0,
      alignItems: 'flex-start'
    },

    ...(priority === 'urgent' && {
      animation: 'pulse 2s ease-in-out infinite',
      '@keyframes pulse': {
        '0%, 100%': {
          boxShadow: `0 0 0 0 ${alpha(main, 0.7)}`
        },
        '50%': {
          boxShadow: `0 0 0 8px ${alpha(main, 0)}`
        }
      }
    })
  };
});

// Progress bar for auto-dismiss countdown
const ProgressBar = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'variant' && prop !== 'duration'
})<{ variant: NotificationVariant; duration: number }>(({ theme, variant, duration }) => {
  const colors = getColors(theme, variant === 'default' ? 'primary' : variant);
  const { main } = colors;

  return {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: main,
    animation: `shrink ${duration}ms linear`,
    transformOrigin: 'left',

    '@keyframes shrink': {
      '0%': {
        width: '100%'
      },
      '100%': {
        width: '0%'
      }
    }
  };
});

// ==============================|| TOAST NOTIFICATION - HELPER ||============================== //

/**
 * Maps notification type or priority to a Material-UI Alert severity variant
 */
const getNotificationVariant = (type?: string, priority?: string): NotificationVariant => {
  if (priority === 'urgent') return 'error';
  if (priority === 'high') return 'warning';

  switch (type?.toLowerCase()) {
    case 'success':
    case 'completed':
    case 'approved':
      return 'success';
    case 'error':
    case 'failed':
    case 'rejected':
      return 'error';
    case 'warning':
    case 'pending':
      return 'warning';
    case 'info':
    case 'update':
    case 'reminder':
      return 'info';
    default:
      return 'default';
  }
};

/**
 * Returns the appropriate icon for the notification variant
 */
const getNotificationIcon = (variant: NotificationVariant) => {
  const iconStyle = { fontSize: '1.5rem' };

  switch (variant) {
    case 'success':
      return <TickCircle style={iconStyle} />;
    case 'error':
      return <CloseCircle style={iconStyle} />;
    case 'warning':
      return <Warning2 style={iconStyle} />;
    case 'info':
      return <InfoCircle style={iconStyle} />;
    default:
      return <InfoCircle style={iconStyle} />;
  }
};

// ==============================|| TOAST NOTIFICATION ||============================== //

/**
 * ToastNotification Component
 *
 * Displays a real-time notification as a toast with auto-dismiss functionality.
 * Supports different notification types, priorities, and manual close.
 *
 * Features:
 * - Auto-dismiss with countdown progress bar
 * - Manual close button
 * - Priority-based styling (low, normal, high, urgent)
 * - Type-based icons and colors
 * - Smooth enter/exit animations
 *
 * @example
 * ```tsx
 * <ToastNotification
 *   notification={{
 *     id: '123',
 *     type: 'success',
 *     title: 'Action Completed',
 *     message: 'Your changes have been saved',
 *     priority: 'normal',
 *     createdAt: new Date().toISOString(),
 *     read: false
 *   }}
 *   autoHideDuration={5000}
 *   onClose={(id) => console.log('Closed:', id)}
 * />
 * ```
 */
const ToastNotification = forwardRef<HTMLDivElement, ToastNotificationProps>(
  ({ notification, autoHideDuration = 5000, onClose, position = 'top-right' }, ref) => {
    const theme = useTheme();
    const [open, setOpen] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const variant = getNotificationVariant(notification.type, notification.priority);

    // Handle manual close
    const handleClose = useCallback(
      (event?: SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
          return;
        }

        setOpen(false);

        // Wait for collapse animation to complete before calling onClose
        setTimeout(() => {
          onClose?.(notification.id);
        }, 300);
      },
      [notification.id, onClose]
    );

    // Auto-dismiss timer
    useEffect(() => {
      if (!autoHideDuration || isHovered) return;

      const timer = setTimeout(() => {
        handleClose();
      }, autoHideDuration);

      return () => {
        clearTimeout(timer);
      };
    }, [autoHideDuration, handleClose, isHovered]);

    return (
      <Collapse in={open} timeout={300}>
        <StyledToast
          ref={ref}
          variant="outlined"
          severity={variant === 'default' ? 'info' : variant}
          priority={notification.priority}
          icon={getNotificationIcon(variant)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          action={
            <IconButton
              size="small"
              aria-label="close notification"
              color={variant === 'default' ? 'primary' : variant}
              onClick={handleClose}
              sx={{ mt: 0.5 }}
            >
              <CloseCircle size={18} />
            </IconButton>
          }
          sx={{
            mb: 1.5
          }}
        >
          <Stack spacing={0.5}>
            {/* Title */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.2 }}>
              {notification.title}
            </Typography>

            {/* Message */}
            {notification.message && (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                {notification.message}
              </Typography>
            )}

            {/* Additional data rendering (optional) */}
            {notification.data && Object.keys(notification.data).length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                {Object.entries(notification.data).slice(0, 2).map(([key, value]) => (
                  <Typography key={key} variant="caption" display="block" color="text.disabled">
                    {key}: {String(value)}
                  </Typography>
                ))}
              </Box>
            )}
          </Stack>

          {/* Auto-dismiss progress bar */}
          {autoHideDuration > 0 && !isHovered && (
            <ProgressBar variant={variant} duration={autoHideDuration} />
          )}
        </StyledToast>
      </Collapse>
    );
  }
);

ToastNotification.displayName = 'ToastNotification';

export default ToastNotification;
