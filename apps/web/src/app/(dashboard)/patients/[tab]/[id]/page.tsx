import PatientTab from 'views/patients-views/PatientTabPage';

// ==============================|| PROFILE - ACCOUNT ||============================== //

type Props = {
  params: {
    tab: string;
  };
};

// Composant de page pour la page des patients
export default function Page({ params }: Props) {
  const { tab } = params;

  return <PatientTab tab={tab} />;
}

// Return a list of `params` to populate the [slug] dynamic segment
export async function generateStaticParams() {
  const response = ['teamComm', 'care-plan', 'patient-info', 'documents'];

  return response.map((tab: string) => ({
    tab: tab
  }));
}
