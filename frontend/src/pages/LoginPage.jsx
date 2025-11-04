import React from 'react';
import LoginForm from '../components/Auth/LoginForm';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LoginPage = () => {
  return (
    <>
      <LoginForm />
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default LoginPage;