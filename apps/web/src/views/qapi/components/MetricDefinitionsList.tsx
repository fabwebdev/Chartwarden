'use client';

import React from 'react';

// MUI Components
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// Icons
import {
  TickCircle,
  CloseCircle
} from 'iconsax-react';

// Types
import type {
  MetricDefinition,
  MetricCategory,
  MetricType
} from '../../../types/qapi';

interface MetricDefinitionsListProps {
  metricDefinitions: MetricDefinition[];
  onRefresh: () => void;
}

// Helper function to get category color
const getCategoryColor = (category: MetricCategory): 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' => {
  switch (category) {
    case 'CLINICAL':
      return 'primary';
    case 'OPERATIONAL':
      return 'info';
    case 'SAFETY':
      return 'error';
    case 'COMPLIANCE':
      return 'warning';
    case 'TEST_COVERAGE':
    case 'DEFECT_RATE':
    case 'MTTR':
    case 'CUSTOMER_ISSUES':
      return 'secondary';
    default:
      return 'secondary';
  }
};

// Helper function to get type color
const getTypeColor = (type: MetricType): 'default' | 'primary' | 'secondary' => {
  switch (type) {
    case 'PERCENTAGE':
      return 'primary';
    case 'COUNT':
      return 'secondary';
    default:
      return 'default';
  }
};

const MetricDefinitionsList: React.FC<MetricDefinitionsListProps> = ({
  metricDefinitions,
  onRefresh
}) => {
  return (
    <Box>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Metric Definitions ({metricDefinitions.length})
          </Typography>
        </Stack>

        {metricDefinitions.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Data Source</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell align="center">CMS Required</TableCell>
                  <TableCell align="center">Active</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metricDefinitions.map((metric) => (
                  <TableRow key={metric.id} hover>
                    <TableCell>
                      <Stack>
                        <Typography variant="body2" fontWeight="medium">
                          {metric.name}
                        </Typography>
                        {metric.description && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                            {metric.description}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={metric.code} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={metric.category.replace(/_/g, ' ')}
                        size="small"
                        color={getCategoryColor(metric.category)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={metric.type}
                        size="small"
                        color={getTypeColor(metric.type)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {metric.unit || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {metric.data_source?.replace(/_/g, ' ') || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {metric.collection_frequency?.replace(/_/g, ' ') || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {metric.is_cms_required ? (
                        <TickCircle size={20} color="#22c55e" />
                      ) : (
                        <CloseCircle size={20} color="#94a3b8" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {metric.is_active ? (
                        <Chip label="Active" size="small" color="success" />
                      ) : (
                        <Chip label="Inactive" size="small" color="default" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No metric definitions found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create metric definitions to start tracking quality metrics
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default MetricDefinitionsList;
