import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext'; // Import AuthProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import ChatsPage from './pages/ChatsPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import FriendsPage from './pages/FriendsPage';
import Home from './components/Home';

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useAuth();

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <p>Loading...</p>
              </div>
            ) : user ? (
              <HomePage />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/chats" element={<ChatsPage />} />
      </Routes>
    </Router>
  );
};

// Wrap App with AuthProvider and QueryClientProvider
const AppWrapper = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);

export default AppWrapper;