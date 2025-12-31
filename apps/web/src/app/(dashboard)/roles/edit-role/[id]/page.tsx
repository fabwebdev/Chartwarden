import EditRole from '../../../../../views/roles-view/EditRole';
// ==============================|| USERS - EDIT ||============================== //

type Props = {
  params: {
    id: any;
  };
};

export default function Page({ params }: Props) {
  const { id } = params;

  return <EditRole roleId={id} />;
}