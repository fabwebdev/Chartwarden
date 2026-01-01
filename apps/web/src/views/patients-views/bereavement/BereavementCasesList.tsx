import React, { useEffect, useState, useCallback } from 'react';
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
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  PersonAdd as ContactIcon,
  EventNote as FollowUpIcon
} from '@mui/icons-material';
import MainCard from 'components/MainCard';
import {
  BereavementCase,
  listBereavementCases,
  formatCaseStatus,
  formatServiceLevel,
  getStatusColor,
  getDaysRemaining
} from 'api/bereavement';

interface BereavementCasesListProps {
  patientId?: string | number;
  onViewCase: (bereavementCase: BereavementCase) => void;
  onEditCase: (bereavementCase: BereavementCase) => void;
  onCreateCase: () => void;
  onManageContacts?: (bereavementCase: BereavementCase) => void;
  onManageFollowUps?: (bereavementCase: BereavementCase) => void;
  canCreate: boolean;
  canEdit: boolean;
}

type Order = 'asc' | 'desc';
type SortField = 'date_of_death' | 'case_status' | 'service_level';

const BereavementCasesList: React.FC<BereavementCasesListProps> = ({
  patientId,
  onViewCase,
  onEditCase,
  onCreateCase,
  onManageContacts,
  onManageFollowUps,
  canCreate,
  canEdit
}) => {
  const [cases, setCases] = useState<BereavementCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<SortField>('date_of_death');
  const [order, setOrder] = useState<Order>('desc');
  const [total, setTotal] = useState(0);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        sort_by: orderBy,
        sort_order: order
      };
      if (patientId) {
        params.patient_id = patientId;
      }
      const response = await listBereavementCases(params);
      setCases(response.data?.map((item: any) => ({ ...item.case, patient: item.patient })) || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error('Error fetching bereavement cases:', err);
      setError(err.response?.data?.message || 'Failed to load bereavement cases');
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, page, rowsPerPage, orderBy, order]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

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

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  const getProgressChip = (bereavementCase: BereavementCase) => {
    if (bereavementCase.case_status !== 'ACTIVE') {
      return null;
    }

    const daysRemaining = getDaysRemaining(bereavementCase.bereavement_end_date);
    const startDate = new Date(bereavementCase.bereavement_start_date);
    const endDate = new Date(bereavementCase.bereavement_end_date);
    const today = new Date();
    const elapsed = Math.max(0, (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPeriod = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const progress = Math.min(100, (elapsed / totalPeriod) * 100);

    return (
      <Box sx={{ minWidth: 120 }}>
        <Typography variant="caption" color="text.secondary">
          {daysRemaining} days remaining
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={daysRemaining < 30 ? 'warning' : 'primary'}
          sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
        />
      </Box>
    );
  };

  if (loading && cases.length === 0) {
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
      title="Bereavement Cases"
      secondary={
        canCreate && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onCreateCase}
          >
            New Case
          </Button>
        )
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {cases.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Bereavement Cases Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a new bereavement case to begin tracking grief support services.
          </Typography>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateCase}
            >
              Create First Case
            </Button>
          )}
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'date_of_death'}
                      direction={orderBy === 'date_of_death' ? order : 'asc'}
                      onClick={() => handleRequestSort('date_of_death')}
                    >
                      Date of Death
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Bereavement Period</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'case_status'}
                      direction={orderBy === 'case_status' ? order : 'asc'}
                      onClick={() => handleRequestSort('case_status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'service_level'}
                      direction={orderBy === 'service_level' ? order : 'asc'}
                      onClick={() => handleRequestSort('service_level')}
                    >
                      Service Level
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((bereavementCase) => (
                  <TableRow key={bereavementCase.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {bereavementCase.patient
                          ? `${bereavementCase.patient.first_name} ${bereavementCase.patient.last_name}`
                          : `Patient #${bereavementCase.patient_id}`}
                      </Typography>
                      {bereavementCase.patient?.medical_record_number && (
                        <Typography variant="caption" color="text.secondary">
                          MRN: {bereavementCase.patient.medical_record_number}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(bereavementCase.date_of_death)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(bereavementCase.bereavement_start_date)} - {formatDate(bereavementCase.bereavement_end_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={formatCaseStatus(bereavementCase.case_status)}
                        color={getStatusColor(bereavementCase.case_status)}
                      />
                    </TableCell>
                    <TableCell>
                      {bereavementCase.service_level && (
                        <Chip
                          size="small"
                          label={formatServiceLevel(bereavementCase.service_level)}
                          color={getStatusColor(bereavementCase.service_level)}
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>{getProgressChip(bereavementCase)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => onViewCase(bereavementCase)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canEdit && bereavementCase.case_status === 'ACTIVE' && (
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => onEditCase(bereavementCase)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onManageContacts && (
                          <Tooltip title="Manage Contacts">
                            <IconButton
                              size="small"
                              onClick={() => onManageContacts(bereavementCase)}
                            >
                              <ContactIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onManageFollowUps && (
                          <Tooltip title="Follow-ups">
                            <IconButton
                              size="small"
                              onClick={() => onManageFollowUps(bereavementCase)}
                            >
                              <FollowUpIcon fontSize="small" />
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
            count={total}
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

export default BereavementCasesList;
