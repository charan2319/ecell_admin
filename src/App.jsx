import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import './index.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  });

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isAdminLoggedIn', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isAdminLoggedIn');
  };

  return (
    <Router>
      <div className="admin-wrapper">
        <Routes>
          <Route 
            path="/login" 
            element={isLoggedIn ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/" 
            element={isLoggedIn ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
