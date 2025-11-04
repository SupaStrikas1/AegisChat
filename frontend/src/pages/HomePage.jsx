import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from '../components/Home';

const HomePage = () => {
  return (
    <>
      <Home />
      <ToastContainer position="top-center" autoClose={3000} />
    </>
  );
};

export default HomePage;