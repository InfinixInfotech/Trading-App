import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, TrendingUp, Users, User } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (location.pathname === '/login' || location.pathname === '/') {
    return null;
  }

  return (
    <nav className="bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold text-white">Upstox Copy Trading</span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user.role === 'parent' ? (
                  <Users className="h-5 w-5 text-green-400" />
                ) : (
                  <User className="h-5 w-5 text-blue-400" />
                )}
                <span className="text-sm text-gray-300">
                  {user.role === 'parent' ? 'Parent Account' : 'Child Account'}
                </span>
              </div>
              
              <div className="text-sm text-gray-300">
                {user.user_name}
              </div>
              
              <button
                onClick={logout}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;