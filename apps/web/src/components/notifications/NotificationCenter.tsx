/**
 * NotificationCenter Component
 *
 * Full notification center with history, filters, and bulk actions.
 * Displays all notifications received via Socket.IO in a scrollable list.
 */

'use client';

import { useState, useMemo } from 'react';

// MATERIAL - UI
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

// PROJECT IMPORTS
import MainCard from 'components/MainCard';
import NotificationItem from './NotificationItem';
import { useSocketStore } from 'store/socketStore';
import { useSocket } from 'hooks/useSocket';

// ASSETS
import { Trash } from 'iconsax-react';

// TYPES
import { NotificationPayload } from 'lib/socket/types';

// ==============================|| NOTIFICATION CENTER - TYPES ||============================== //

type NotificationFilter = 'all' | 'unread' | 'read';

interface NotificationCenterProps {
  maxHeight?: number | string;
  showFilters?: boolean;
}

// ==============================|| NOTIFICATION CENTER - HELPER ||============================== //

/**
 * Filter notifications based on selected filter
 */
const filterNotifications = (
  notifications: NotificationPayload[],
  filter: NotificationFilter
): NotificationPayload[] => {
  switch (filter) {
    case 'unread':
      return notifications.filter((n) => !n.read);
    case 'read':
      return notifications.filter((n) => n.read);
    case 'all':
    default:
      return notifications;
  }
};

// ==============================|| NOTIFICATION CENTER ||============================== //

/**
 * NotificationCenter Component
 *
 * Displays a comprehensive notification center with:
 * - All notifications from Socket.IO
 * - Filter tabs (All, Unread, Read)
 * - Bulk actions (Mark all as read, Clear all)
 * - Individual notification actions (Mark as read, Delete)
 * - Scrollable list with maximum height
 * - Persistent storage integration
 *
 * Features:
 * - Real-time updates via Socket.IO
 * - Unread count badge
 * - Empty state handling
 * - Responsive design
 *
 * @example
 * ```tsx
 * <NotificationCenter
 *   maxHeight={400}
 *   showFilters={true}
 * />
 * ```
 */
const NotificationCenter = ({ maxHeight = 500, showFilters = true }: NotificationCenterProps) => {
  const theme = useTheme();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  // Socket connection for notifications
  const { markNotificationAsRead, markAllNotificationsAsRead } = useSocket('notifications');

  // Get notifications from store
  const notifications = useSocketStore((state) => state.notifications);
  const unreadCount = useSocketStore((state) => state.unreadCount);
  const clearNotifications = useSocketStore((state) => state.clearNotifications);
  const markNotificationRead = useSocketStore((state) => state.markNotificationRead);

  // Filter notifications
  const filteredNotifications = useMemo(
    () => filterNotifications(notifications, filter),
    [notifications, filter]
  );

  // Handle filter change
  const handleFilterChange = (_event: React.SyntheticEvent, newValue: NotificationFilter) => {
    setFilter(newValue);
  };

  // Handle mark as read (single)
  const handleMarkAsRead = (notificationId: string) => {
    // Update local state
    markNotificationRead(notificationId);

    // Notify backend via Socket.IO
    markNotificationAsRead?.([notificationId]);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

    if (unreadIds.length > 0) {
      // Update local state
      useSocketStore.getState().markAllNotificationsRead();

      // Notify backend via Socket.IO
      markAllNotificationsAsRead?.();
    }
  };

  // Handle delete notification
  const handleDelete = (notificationId: string) => {
    // For now, just mark as read and remove from UI
    // In a full implementation, you'd also persist this to backend
    const updatedNotifications = notifications.filter((n) => n.id !== notificationId);
    useSocketStore.setState({ notifications: updatedNotifications });
  };

  // Handle clear all
  const handleClearAll = () => {
    clearNotifications();
  };

  return (
    <MainCard elevation={0} border={false} sx={{ height: '100%' }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">
          Notifications
          {unreadCount > 0 && (
            <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>
              ({unreadCount} new)
            </Typography>
          )}
        </Typography>

        {notifications.length > 0 && (
          <Link
            component="button"
            variant="h6"
            color="primary"
            onClick={handleMarkAllAsRead}
            sx={{
              cursor: 'pointer',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            Mark all read
          </Link>
        )}
      </Stack>

      {/* Filter Tabs */}
      {showFilters && notifications.length > 0 && (
        <>
          <Tabs
            value={filter}
            onChange={handleFilterChange}
            sx={{
              mb: 2,
              '& .MuiTabs-flexContainer': {
                borderBottom: 1,
                borderColor: 'divider'
              }
            }}
          >
            <Tab label="All" value="all" />
            <Tab
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: theme.palette.error.main,
                        color: theme.palette.error.contrastText,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        px: 0.5
                      }}
                    >
                      {unreadCount}
                    </Box>
                  )}
                </Stack>
              }
              value="unread"
            />
            <Tab label="Read" value="read" />
          </Tabs>
          <Divider sx={{ mb: 2 }} />
        </>
      )}

      {/* Notification List */}
      <Box
        sx={{
          maxHeight,
          overflowY: 'auto',
          overflowX: 'hidden',
          pr: 1,
          // Custom scrollbar
          '&::-webkit-scrollbar': {
            width: 8
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.background.default,
            borderRadius: 4
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: 4,
            '&:hover': {
              backgroundColor: theme.palette.action.hover
            }
          }
        }}
      >
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))
        ) : (
          // Empty state
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              py: 4
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {filter === 'unread'
                ? 'No unread notifications'
                : filter === 'read'
                  ? 'No read notifications'
                  : 'No notifications yet'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {filter === 'all'
                ? 'New notifications will appear here'
                : filter === 'unread'
                  ? 'All caught up!'
                  : 'Read notifications will appear here'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer Actions */}
      {notifications.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Trash size={16} />}
              onClick={handleClearAll}
              sx={{ textTransform: 'none' }}
            >
              Clear All
            </Button>
          </Stack>
        </>
      )}
    </MainCard>
  );
};

export default NotificationCenter;
