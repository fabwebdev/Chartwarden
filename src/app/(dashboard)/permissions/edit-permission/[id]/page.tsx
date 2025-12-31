import EditPermission from '../../../../../views/permissions-view/EditPermission';
// import http from '../../../../../hooks/useCookie';

// ==============================|| PERMISSIONS - EDIT ||============================== //

type Props = {
  params: {
    id: any;
  };
};

// Composant de page pour la page d'édition des permissions
export default function Page({ params }: Props) {
  const { id } = params;

  return <EditPermission permissionId={id} />;
}
