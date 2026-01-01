'use client';

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { Calendar } from 'iconsax-react';
import MainCard from 'components/MainCard';
import { VisitSchedulingCalendar } from 'components/calendar';
import { ScheduledVisit, getUnresolvedConflictsCount } from '../../api/scheduling';
import http from 'hooks/useCookie';
import AuthService from 'types/AuthService';

// ==============================|| SCHEDULING CALENDAR PAGE ||============================== //

interface StaffOption {
  id: number;
  name: string;
  discipline?: string;
}

const SchedulingCalendarPage = () => {
  const { permissions } = AuthService();

  // Filter state
  const [selectedStaffId, setSelectedStaffId] = useState<number | undefined>(undefined);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [conflictCount, setConflictCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch staff options
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await http.get('/staff');
        const staff = response.data?.data || response.data || [];
        setStaffOptions(
          staff.map((s: any) => ({
            id: s.id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || `Staff #${s.id}`,
            discipline: s.discipline
          }))
        );
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  // Fetch conflict count
  useEffect(() => {
    const fetchConflictCount = async () => {
      try {
        const response = await getUnresolvedConflictsCount();
        setConflictCount(response.count);
      } catch (error) {
        console.error('Error fetching conflict count:', error);
      }
    };
    fetchConflictCount();
  }, []);

  const handleVisitCreated = (visit: ScheduledVisit) => {
    // Optionally show notification or update state
    console.log('Visit created:', visit);
  };

  const handleVisitUpdated = (visit: ScheduledVisit) => {
    // Optionally show notification or update state
    console.log('Visit updated:', visit);
  };

  return (
    <Grid container spacing={3}>
      {/* Header */}
      <Grid item xs={12}>
        <MainCard>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Calendar size={32} variant="Bold" color="#1976d2" />
                <div>
                  <Typography variant="h4">Visit Scheduling</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage patient visits, view schedules, and handle conflicts
                  </Typography>
                </div>
              </Stack>
            </Grid>
            <Grid item>
              <Stack direction="row" alignItems="center" spacing={2}>
                {conflictCount > 0 && (
                  <Alert severity="warning" sx={{ py: 0.5 }}>
                    {conflictCount} unresolved conflict{conflictCount > 1 ? 's' : ''}
                  </Alert>
                )}
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Staff</InputLabel>
                  <Select
                    value={selectedStaffId || ''}
                    label="Filter by Staff"
                    onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : undefined)}
                  >
                    <MenuItem value="">All Staff</MenuItem>
                    {staffOptions.map((staff) => (
                      <MenuItem key={staff.id} value={staff.id}>
                        {staff.name}
                        {staff.discipline && (
                          <Chip label={staff.discipline} size="small" sx={{ ml: 1 }} />
                        )}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Grid>
          </Grid>
        </MainCard>
      </Grid>

      {/* Calendar */}
      <Grid item xs={12}>
        <VisitSchedulingCalendar
          staffId={selectedStaffId}
          onVisitCreated={handleVisitCreated}
          onVisitUpdated={handleVisitUpdated}
        />
      </Grid>
    </Grid>
  );
};

export default SchedulingCalendarPage;
