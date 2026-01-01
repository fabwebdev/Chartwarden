import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  CheckCircle as SignIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import {
  Certification,
  getPatientCertifications,
  formatCertificationPeriod,
  getStatusColor,
  getDaysUntilDeadline
} from 'api/certification';

interface CertificationsListProps {
  patientId: string;
  onViewCertification: (certification: Certification) => void;
  onEditCertification: (certification: Certification) => void;
  onCreateCertification: () => void;
  onSignCertification: (certification: Certification) => void;
  canCreate: boolean;
  canEdit: boolean;
  canSign: boolean;
}

type Order = 'asc' | 'desc';
type SortField = 'start_date' | 'end_date' | 'certification_status' | 'certification_period';

const CertificationsList: React.FC<CertificationsListProps> = ({
  patientId,
  onViewCertification,
  onEditCertification,
  onCreateCertification,
  onSignCertification,
  canCreate,
  canEdit,
  canSign
}) => {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<SortField>('start_date');
  const [order, setOrder] = useState<Order>('desc');
  const [expirationStatus, setExpirationStatus] = useState<{
    hasExpired: boolean;
    hasExpiringSoon: boolean;
    expiredCount: number;
    expiringSoonCount: number;
  } | null>(null);

  const fetchCertifications = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getPatientCertifications(patientId);
      setCertifications(response.data || []);
      setExpirationStatus(response.expirationStatus || null);
    } catch (err: any) {
      console.error('Error fetching certifications:', err);
      setError(err.response?.data?.message || 'Failed to load certifications');
      setCertifications([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchCertifications();
  }, [fetchCertifications]);

  const handleRequestSort = (property: SortField) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sortedCertifications = useMemo(() => {
    const comparator = (a: Certification, b: Certification) => {
      let aValue: any = a[orderBy];
      let bValue: any = b[orderBy];

      if (orderBy === 'start_date' || orderBy === 'end_date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    };

    return [...certifications].sort(comparator);
  }, [certifications, orderBy, order]);

  const paginatedCertifications = useMemo(() => {
    return sortedCertifications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedCertifications, page, rowsPerPage]);

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  const getDeadlineChip = (certification: Certification) => {
    if (certification.certification_status === 'COMPLETED' || certification.certification_status === 'REVOKED') {
      return null;
    }

    const daysUntil = getDaysUntilDeadline(certification.end_date);

    if (daysUntil < 0) {
      return (
        <Chip
          size="small"
          label={`${Math.abs(daysUntil)} days overdue`}
          color="error"
          sx={{ ml: 1 }}
        />
      );
    }

    if (daysUntil <= 14) {
      return (
        <Chip
          size="small"
          label={`${daysUntil} days left`}
          color="warning"
          sx={{ ml: 1 }}
        />
      );
    }

    return null;
  };

  if (loading) {
    return (
      <MainCard>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard
      title="Certifications"
      secondary={
        canCreate && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onCreateCertification}
          >
            New Certification
          </Button>
        )
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {expirationStatus && (expirationStatus.hasExpired || expirationStatus.hasExpiringSoon) && (
        <Alert
          severity={expirationStatus.hasExpired ? 'error' : 'warning'}
          sx={{ mb: 2 }}
        >
          {expirationStatus.hasExpired && (
            <Typography variant="body2">
              {expirationStatus.expiredCount} certification(s) have expired and need renewal.
            </Typography>
          )}
          {expirationStatus.hasExpiringSoon && (
            <Typography variant="body2">
              {expirationStatus.expiringSoonCount} certification(s) expiring within 14 days.
            </Typography>
          )}
        </Alert>
      )}

      {certifications.length === 0 ? (
        <Box textAlign="center" py={4}>
          <DocumentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No Certifications Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a new certification to get started with benefit period tracking.
          </Typography>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateCertification}
            >
              Create First Certification
            </Button>
          )}
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'certification_period'}
                      direction={orderBy === 'certification_period' ? order : 'asc'}
                      onClick={() => handleRequestSort('certification_period')}
                    >
                      Period
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'start_date'}
                      direction={orderBy === 'start_date' ? order : 'asc'}
                      onClick={() => handleRequestSort('start_date')}
                    >
                      Start Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'end_date'}
                      direction={orderBy === 'end_date' ? order : 'asc'}
                      onClick={() => handleRequestSort('end_date')}
                    >
                      End Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'certification_status'}
                      direction={orderBy === 'certification_status' ? order : 'asc'}
                      onClick={() => handleRequestSort('certification_status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Signed</TableCell>
                  <TableCell>F2F Required</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCertifications.map((certification) => (
                  <TableRow key={certification.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatCertificationPeriod(certification.certification_period)}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(certification.start_date)}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center">
                        {formatDate(certification.end_date)}
                        {getDeadlineChip(certification)}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={certification.certification_status}
                        color={getStatusColor(certification.certification_status)}
                      />
                    </TableCell>
                    <TableCell>
                      {certification.physician_signature ? (
                        <Chip size="small" label="Signed" color="success" variant="outlined" />
                      ) : (
                        <Chip size="small" label="Unsigned" color="warning" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {certification.certification_period !== 'INITIAL_90' &&
                      certification.certification_period !== 'SUBSEQUENT_90' ? (
                        <Chip size="small" label="Required" color="info" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => onViewCertification(certification)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canEdit && !certification.physician_signature && (
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => onEditCertification(certification)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canSign && !certification.physician_signature && (
                          <Tooltip title="Sign Certification">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => onSignCertification(certification)}
                            >
                              <SignIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={certifications.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </>
      )}
    </MainCard>
  );
};

export default CertificationsList;
