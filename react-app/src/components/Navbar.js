import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold tracking-tight">
          DoNotDel-EC
        </Link>

        {/* Links */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="hover:text-gray-300">Home</Link>
          
          <Link to="/cart" className="flex items-center hover:text-gray-300">
            <ShoppingCart className="w-5 h-5 mr-1" />
            <span>Cart</span>
          </Link>

          <Link to="/login" className="flex items-center hover:text-gray-300">
            <User className="w-5 h-5 mr-1" />
            <span>Login</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}