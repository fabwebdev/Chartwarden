'use client';

import { useParams } from 'next/navigation';
import EncounterDetailPage from 'views/patients-views/encounters/EncounterDetailPage';

// ==============================|| PATIENT ENCOUNTER DETAIL PAGE ||============================== //

const PatientEncounterPage = () => {
  const params = useParams();
  const patientId = params?.patientId as string;
  const encounterId = params?.encounterId as string;

  return <EncounterDetailPage encounterId={encounterId} patientId={patientId} />;
};

export default PatientEncounterPage;
