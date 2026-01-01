'use client';

import { useParams } from 'next/navigation';
import EncounterDetailPage from 'views/patients-views/encounters/EncounterDetailPage';

// ==============================|| ENCOUNTER DETAIL PAGE ||============================== //

const EncounterPage = () => {
  const params = useParams();
  const id = params?.id as string;

  return <EncounterDetailPage encounterId={id} />;
};

export default EncounterPage;
