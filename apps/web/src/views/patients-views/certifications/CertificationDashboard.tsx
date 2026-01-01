import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  LinearProgress,
  Skeleton
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import {
  getPatientCertifications,
  getPatientF2F,
  getDaysUntilDeadline,
  Certification,
  F2FEncounter
} from 'api/certification';

interface CertificationDashboardProps {
  patientId: string;
}

interface DashboardStats {
  totalCertifications: number;
  activeCertifications: number;
  pendingCertifications: number;
  expiredCertifications: number;
  expiringSoon: number;
  overdueF2F: number;
  f2fCompliance: number;
  unsignedCertifications: number;
}

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: `${color}.lighter`,
            color: `${color}.main`
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const CertificationDashboard: React.FC<CertificationDashboardProps> = ({ patientId }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCertifications: 0,
    activeCertifications: 0,
    pendingCertifications: 0,
    expiredCertifications: 0,
    expiringSoon: 0,
    overdueF2F: 0,
    f2fCompliance: 0,
    unsignedCertifications: 0
  });

  const calculateStats = useCallback(
    (certifications: Certification[], f2fEncounters: F2FEncounter[]) => {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const active = certifications.filter((c) => c.certification_status === 'ACTIVE');
      const pending = certifications.filter((c) => c.certification_status === 'PENDING');
      const expired = certifications.filter((c) => c.certification_status === 'EXPIRED');
      const expiringSoon = certifications.filter((c) => {
        if (c.certification_status !== 'ACTIVE' && c.certification_status !== 'PENDING') return false;
        const days = getDaysUntilDeadline(c.end_date);
        return days >= 0 && days <= 30;
      });
      const unsigned = certifications.filter((c) => !c.physician_signature);

      // Calculate F2F compliance for certifications requiring F2F (3rd period+)
      const certsRequiringF2F = certifications.filter(
        (c) => c.certification_period === 'SUBSEQUENT_60'
      );
      const certsWithF2F = certsRequiringF2F.filter((c) =>
        f2fEncounters.some((f) => f.certification_id === c.id && f.attestation)
      );
      const f2fCompliance =
        certsRequiringF2F.length > 0
          ? Math.round((certsWithF2F.length / certsRequiringF2F.length) * 100)
          : 100;

      // Overdue F2F
      const overdueF2F = certsRequiringF2F.filter((c) => {
        const hasValidF2F = f2fEncounters.some((f) => f.certification_id === c.id && f.attestation);
        if (hasValidF2F) return false;

        const startDate = new Date(c.start_date);
        const f2fDeadline = new Date(startDate);
        f2fDeadline.setDate(f2fDeadline.getDate() + 30);
        return now > f2fDeadline;
      });

      setStats({
        totalCertifications: certifications.length,
        activeCertifications: active.length,
        pendingCertifications: pending.length,
        expiredCertifications: expired.length,
        expiringSoon: expiringSoon.length,
        overdueF2F: overdueF2F.length,
        f2fCompliance,
        unsignedCertifications: unsigned.length
      });
    },
    []
  );

  const fetchData = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      const [certResponse, f2fResponse] = await Promise.all([
        getPatientCertifications(patientId),
        getPatientF2F(patientId)
      ]);

      calculateStats(certResponse.data || [], f2fResponse.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, calculateStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Certifications"
            value={stats.activeCertifications}
            icon={<CheckIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Signature"
            value={stats.unsignedCertifications}
            icon={<ScheduleIcon />}
            color="warning"
            subtitle={stats.unsignedCertifications > 0 ? 'Requires physician signature' : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Expiring Soon"
            value={stats.expiringSoon}
            icon={<WarningIcon />}
            color="warning"
            subtitle={stats.expiringSoon > 0 ? 'Within 30 days' : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="F2F Compliance"
            value={`${stats.f2fCompliance}%`}
            icon={<AssignmentIcon />}
            color={stats.f2fCompliance >= 90 ? 'success' : stats.f2fCompliance >= 70 ? 'warning' : 'error'}
          />
        </Grid>
      </Grid>

      {/* Alerts */}
      {(stats.expiringSoon > 0 || stats.overdueF2F > 0 || stats.unsignedCertifications > 0) && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {stats.unsignedCertifications > 0 && (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.main' }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <ScheduleIcon color="warning" />
                      <Box>
                        <Typography variant="subtitle2" color="warning.dark">
                          {stats.unsignedCertifications} certification(s) awaiting physician signature
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          CMS requires signature within 2 days of start of care
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {stats.overdueF2F > 0 && (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.main' }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <ErrorIcon color="error" />
                      <Box>
                        <Typography variant="subtitle2" color="error.dark">
                          {stats.overdueF2F} certification(s) with overdue Face-to-Face encounter
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          F2F required within 30 days after start of care for 3rd+ benefit periods
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Compliance Progress */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Overall Certification Compliance
          </Typography>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress
                variant="determinate"
                value={stats.f2fCompliance}
                color={stats.f2fCompliance >= 90 ? 'success' : stats.f2fCompliance >= 70 ? 'warning' : 'error'}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography variant="body2" fontWeight="bold">
              {stats.f2fCompliance}%
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Based on Face-to-Face encounter compliance for certifications requiring F2F
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CertificationDashboard;
