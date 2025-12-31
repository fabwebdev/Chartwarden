import EditUser from '../../../../../views/users-view/EditUser';
// import http from '../../../../../hooks/useCookie';

// ==============================|| USERS - EDIT ||============================== //

type Props = {
  params: {
    id: any;
  };
};

export default function Page({ params }: Props) {
  const { id } = params;

  return <EditUser userId={id} />;
}
