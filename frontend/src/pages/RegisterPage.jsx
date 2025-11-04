import RegisterForm from '../components/Auth/RegisterForm';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const RegisterPage = () => {
  return (
    <>
      <RegisterForm />
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default RegisterPage;