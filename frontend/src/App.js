import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './contexts/AuthContext'; // Import AuthProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './components/Home';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Profile from './components/Profile/Profile';
import FriendsList from './components/Friends/FriendsList';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <p>Loading...</p>
              </div>
            ) : user ? (
              <Home />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/friends" element={<FriendsList />} />
        <Route path="/chats" element={<ChatList />} />
        <Route path="/chat/:id" element={<ChatWindow />} />
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