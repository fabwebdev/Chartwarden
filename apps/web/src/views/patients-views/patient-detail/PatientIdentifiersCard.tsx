import React from 'react';
import { Box, Card, CardContent, CardHeader, Divider, Stack, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { DocumentText, SecurityCard, Hospital, Health } from 'iconsax-react';

interface PatientIdentifiersCardProps {
  patient: any;
  loading?: boolean;
}

// Extended patient interface with identifier fields
interface PatientWithIdentifiers {
  id?: number | string;
  medical_record_number?: string;
  medicare_beneficiary_id?: string;
  medicaid_id?: string;
  ssn?: string;
  // Additional patient identifiers that may come from the patient_identifiers table
  identifiers?: Array<{
    id: number | string;
    identifier_type: string;
    identifier_value: string;
  }>;
}

const PatientIdentifiersCard: React.FC<PatientIdentifiersCardProps> = ({ patient, loading }) => {
  // Format SSN to show only last 4 digits
  const formatSSN = (ssn?: string) => {
    if (!ssn) return null;
    const digits = ssn.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `XXX-XX-${digits.slice(-4)}`;
    }
    return 'XXX-XX-XXXX';
  };

  // Format Medicare Beneficiary ID (MBI)
  const formatMBI = (mbi?: string) => {
    if (!mbi) return null;
    // MBI format: 1EG4-TE5-MK72 (11 characters with specific format)
    return mbi;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Patient Identifiers" />
        <CardContent>
          <Typography>Loading identifiers...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!patient) {
    return (
      <Card>
        <CardHeader title="Patient Identifiers" />
        <CardContent>
          <Typography color="text.secondary">No patient data available</Typography>
        </CardContent>
      </Card>
    );
  }

  const patientData = patient as PatientWithIdentifiers;

  // Build list of identifiers from patient data
  const identifiers: Array<{ type: string; value: string; icon: React.ReactNode }> = [];

  if (patientData.medical_record_number) {
    identifiers.push({
      type: 'Medical Record Number (MRN)',
      value: patientData.medical_record_number,
      icon: <Hospital size={18} />
    });
  }

  if (patientData.medicare_beneficiary_id) {
    identifiers.push({
      type: 'Medicare Beneficiary ID (MBI)',
      value: formatMBI(patientData.medicare_beneficiary_id) || '',
      icon: <SecurityCard size={18} />
    });
  }

  if (patientData.medicaid_id) {
    identifiers.push({
      type: 'Medicaid ID',
      value: patientData.medicaid_id,
      icon: <Health size={18} />
    });
  }

  if (patientData.ssn) {
    identifiers.push({
      type: 'Social Security Number',
      value: formatSSN(patientData.ssn) || '',
      icon: <SecurityCard size={18} />
    });
  }

  // Add any additional identifiers from the identifiers array
  if (patientData.identifiers && patientData.identifiers.length > 0) {
    patientData.identifiers.forEach((identifier) => {
      identifiers.push({
        type: identifier.identifier_type,
        value: identifier.identifier_value,
        icon: <DocumentText size={18} />
      });
    });
  }

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <DocumentText size={22} />
            <Typography variant="h5">Patient Identifiers</Typography>
          </Stack>
        }
        subheader="Medical record numbers, Medicare/Medicaid IDs, and other identifiers"
      />
      <Divider />
      <CardContent>
        {identifiers.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No identifiers on file
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Identifier Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {identifiers.map((identifier, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {identifier.icon}
                        <Typography variant="body2">{identifier.type}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {identifier.value}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* System ID */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Internal Patient ID: {patientData.id || 'N/A'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PatientIdentifiersCard;
