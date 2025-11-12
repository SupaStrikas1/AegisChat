import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../Navbar";

const ProtectedLayout = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Fixed Navbar (Top/Side/Bottom) */}
      <Navbar />

      {/* Add padding so content doesn't go under the fixed navbar */}
      <main className="md:pt-16 pb-36 md:pb-0 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedLayout;
