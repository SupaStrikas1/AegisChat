import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/solid';

const navItems = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Chats', path: '/chats', icon: ChatBubbleLeftRightIcon },
  { name: 'Friends', path: '/friends', icon: UserGroupIcon },
  { name: 'Profile', path: '/profile', icon: UserCircleIcon },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Desktop: Top Bar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1
                className="text-xl font-bold text-blue-600 cursor-pointer"
                onClick={() => navigate('/chats')}
              >
                AegisChat
              </h1>
              <div className="flex space-x-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile: Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1">{item.name}</span>
              </button>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center p-2 rounded-lg text-red-600"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
            <span className="text-xs mt-1">Logout</span>
          </button>
        </div>
      </nav>

      {/* Spacer for fixed navbars */}
      <div className="h-16 md:h-16"></div>
    </>
  );
};

export default Navbar;