import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FriendsList from '../components/Friends/FriendsList';

const FriendsPage = () => {
  return (
    <>
      <FriendsList />
      <ToastContainer position="top-center" autoClose={3000} />
    </>
  );
};

export default FriendsPage;