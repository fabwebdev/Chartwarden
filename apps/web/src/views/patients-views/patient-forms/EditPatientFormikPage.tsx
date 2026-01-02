'use client';

/**
 * EditPatientFormikPage
 *
 * A wrapper component that uses the PatientDemographicsForm with Formik validation.
 * This provides an alternative to the legacy EditPatientPage with proper form validation.
 */

import PatientDemographicsForm from './PatientDemographicsForm';

interface EditPatientFormikPageProps {
  patientsId: number | string;
}

const EditPatientFormikPage = ({ patientsId }: EditPatientFormikPageProps) => {
  return <PatientDemographicsForm patientId={patientsId} />;
};

export default EditPatientFormikPage;
