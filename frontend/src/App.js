import React, { useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth, AuthProvider } from "./contexts/AuthContext"; // Import AuthProvider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "./pages/LoginPage";
import ChatsPage from "./pages/ChatsPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import HomePage from "./pages/HomePage";
import FriendsPage from "./pages/FriendsPage";
import Navbar from "./components/Navbar";
import ProtectedLayout from "./components/Layout/ProtectedLayout";

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<RegisterPage />} />
        <Route element={<ProtectedLayout />}>
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
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/chats" element={<ChatsPage />} />
        </Route>
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
