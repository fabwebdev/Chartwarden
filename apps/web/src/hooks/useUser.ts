import AuthService from 'types/AuthService';

// ==============================|| HOOKS - USER ||============================== //

const useUser = () => {
  const { user } = AuthService();
  return user;
};

export default useUser;

