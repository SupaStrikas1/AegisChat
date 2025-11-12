"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/solid";
import { ArrowRightEndOnRectangleIcon } from "@heroicons/react/24/outline";

const navItems = [
  { name: "Home", path: "/", icon: HomeIcon },
  { name: "Chats", path: "/chats", icon: ChatBubbleLeftRightIcon },
  { name: "Friends", path: "/friends", icon: UserGroupIcon },
  { name: "Profile", path: "/profile", icon: UserCircleIcon },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Desktop: Top Bar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border-b border-slate-700/50 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-0">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-8">
              <h1
                className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate("/")}
              >
                AegisChat
              </h1>

              {/* Nav Items */}
              <div className="hidden md:flex gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30"
                          : "text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 border border-transparent"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/30 transition-all duration-200 hover:border-red-500/60"
            >
              <ArrowRightEndOnRectangleIcon className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Tablet: Side Navigation
      <nav className="hidden sm:flex md:hidden fixed left-0 top-0 bottom-0 w-20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 border-r border-slate-700/50 z-50 flex-col items-center py-4 gap-4">
        <h1
          className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity mb-4"
          onClick={() => navigate("/")}
        >
          AC
        </h1>

        <div className="flex flex-col gap-4 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center justify-center p-3 rounded-lg transition-all duration-200 tooltip ${
                  active
                    ? "bg-gradient-to-br from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent"
                }`}
                title={item.name}
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          })}
        </div>

        {/* Logout on Tablet 
        <button
          onClick={handleLogout}
          className="p-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/30 transition-all duration-200"
          title="Logout"
        >
          <ArrowRightOnRectangleIcon className="h-6 w-6" />
        </button>
      </nav> */}

      {/* Mobile: Bottom Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-900 to-slate-800 border-t border-slate-700/50 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="flex justify-around items-center py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                  active
                    ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent"
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/30 transition-all duration-200"
          >
            <ArrowRightEndOnRectangleIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;