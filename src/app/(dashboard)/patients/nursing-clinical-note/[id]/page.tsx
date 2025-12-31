import NursingClinicalNotePage from 'views/patients-views/NursingClinicalNotePage';
import EdithPatientPagePage from '../../../../../views/patients-views/patient-forms/EditPatientPage';

// ==============================|| USERS - EDIT ||============================== //
// import http from '../../../../../hooks/useCookie';

type Props = {
  params: {
    id: any;
  };
};

export default function Page({ params }: Props) {
  const { id } = params;

  return <NursingClinicalNotePage patientId={id} />;
}
