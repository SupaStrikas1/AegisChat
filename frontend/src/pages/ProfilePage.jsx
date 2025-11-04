import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProfileForm from '../components/Profile/ProfileForm';

const ProfilePage = () => {
  return (
    <>
      <ProfileForm />
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default ProfilePage;