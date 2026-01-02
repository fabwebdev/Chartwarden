/**
 * NotificationItem Component
 *
 * Individual notification list item for the Notification Center.
 * Displays notification details with read/unread state and action buttons.
 */

'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

// MATERIAL - UI
import { alpha, styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// PROJECT IMPORTS
import IconButton from 'components/@extended/IconButton';
import getColors from 'utils/getColors';

// ASSETS
import { CloseCircle, Eye, InfoCircle, TickCircle, Trash, Warning2 } from 'iconsax-react';

// TYPES
import { NotificationPayload } from 'lib/socket/types';

// ==============================|| NOTIFICATION ITEM - TYPES ||============================== //

export interface NotificationItemProps {
  notification: NotificationPayload;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
}

type NotificationVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

// ==============================|| NOTIFICATION ITEM - STYLED ||============================== //

interface StyledCardProps {
  variant: NotificationVariant;
  isRead: boolean;
}

const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'variant' && prop !== 'isRead'
})<StyledCardProps>(({ theme, variant, isRead }) => {
  const colors = getColors(theme, variant === 'default' ? 'primary' : variant);
  const { main, lighter } = colors;

  return {
    borderLeft: `4px solid ${main}`,
    backgroundColor: isRead
      ? theme.palette.background.paper
      : alpha(lighter, 0.3),
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',

    '&:hover': {
      backgroundColor: isRead
        ? alpha(lighter, 0.1)
        : alpha(lighter, 0.4),
      boxShadow: theme.shadows[2]
    }
  };
});

// ==============================|| NOTIFICATION ITEM - HELPER ||============================== //

/**
 * Maps notification type or priority to a variant
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
const getNotificationIcon = (variant: NotificationVariant, size: number = 20) => {
  switch (variant) {
    case 'success':
      return <TickCircle size={size} />;
    case 'error':
      return <CloseCircle size={size} />;
    case 'warning':
      return <Warning2 size={size} />;
    case 'info':
      return <InfoCircle size={size} />;
    default:
      return <InfoCircle size={size} />;
  }
};

/**
 * Get priority badge color
 */
const getPriorityColor = (priority?: 'low' | 'normal' | 'high' | 'urgent'): 'default' | 'warning' | 'error' => {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    default:
      return 'default';
  }
};

// ==============================|| NOTIFICATION ITEM ||============================== //

/**
 * NotificationItem Component
 *
 * Displays a single notification in the notification center list.
 * Shows notification details, timestamp, read state, and action buttons.
 *
 * Features:
 * - Visual distinction between read/unread states
 * - Priority badges
 * - Type-based icons and colors
 * - Mark as read action
 * - Delete action
 * - Relative timestamp
 *
 * @example
 * ```tsx
 * <NotificationItem
 *   notification={{
 *     id: '123',
 *     type: 'success',
 *     title: 'Task Completed',
 *     message: 'Your report has been generated',
 *     priority: 'normal',
 *     createdAt: new Date().toISOString(),
 *     read: false
 *   }}
 *   onMarkAsRead={(id) => console.log('Mark as read:', id)}
 *   onDelete={(id) => console.log('Delete:', id)}
 * />
 * ```
 */
const NotificationItem = ({ notification, onMarkAsRead, onDelete }: NotificationItemProps) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const variant = getNotificationVariant(notification.type, notification.priority);
  const colors = getColors(theme, variant === 'default' ? 'primary' : variant);

  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  // Handle mark as read
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.read) {
      onMarkAsRead?.(notification.id);
    }
  };

  // Handle delete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(notification.id);
  };

  return (
    <StyledCard
      variant={variant}
      isRead={notification.read}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleMarkAsRead}
      sx={{ mb: 1.5 }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          {/* Header: Icon, Title, and Actions */}
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            {/* Icon */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 1,
                backgroundColor: alpha(colors.main, 0.1),
                color: colors.main,
                flexShrink: 0
              }}
            >
              {getNotificationIcon(variant, 20)}
            </Box>

            {/* Title and Metadata */}
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Typography
                  variant="subtitle2"
                  fontWeight={notification.read ? 500 : 700}
                  sx={{
                    lineHeight: 1.3,
                    wordBreak: 'break-word'
                  }}
                >
                  {notification.title}
                </Typography>

                {/* Priority Badge */}
                {notification.priority && notification.priority !== 'normal' && (
                  <Chip
                    label={notification.priority.toUpperCase()}
                    color={getPriorityColor(notification.priority)}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 600
                    }}
                  />
                )}

                {/* Unread Indicator */}
                {!notification.read && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: colors.main,
                      flexShrink: 0
                    }}
                  />
                )}
              </Stack>

              {/* Message */}
              {notification.message && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.4,
                    wordBreak: 'break-word'
                  }}
                >
                  {notification.message}
                </Typography>
              )}

              {/* Timestamp */}
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                {timeAgo}
              </Typography>
            </Stack>

            {/* Action Buttons (visible on hover or mobile) */}
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.2s',
                '@media (hover: none)': {
                  opacity: 1 // Always visible on touch devices
                }
              }}
            >
              {/* Mark as read button (only for unread notifications) */}
              {!notification.read && (
                <IconButton
                  size="small"
                  color={variant === 'default' ? 'primary' : variant}
                  onClick={handleMarkAsRead}
                  aria-label="mark as read"
                  title="Mark as read"
                >
                  <Eye size={16} />
                </IconButton>
              )}

              {/* Delete button */}
              <IconButton
                size="small"
                color="error"
                onClick={handleDelete}
                aria-label="delete notification"
                title="Delete"
              >
                <Trash size={16} />
              </IconButton>
            </Stack>
          </Stack>

          {/* Additional data (if present) */}
          {notification.data && Object.keys(notification.data).length > 0 && (
            <Box
              sx={{
                pl: 7, // Align with message text
                pt: 0.5,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`
              }}
            >
              {Object.entries(notification.data).slice(0, 3).map(([key, value]) => (
                <Typography key={key} variant="caption" display="block" color="text.disabled">
                  <strong>{key}:</strong> {String(value)}
                </Typography>
              ))}
            </Box>
          )}
        </Stack>
      </CardContent>
    </StyledCard>
  );
};

export default NotificationItem;
