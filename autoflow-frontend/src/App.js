import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Studio from './components/Studio';
import Login from './components/Login';
import Register from './components/Register';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* public pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* protected area */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/studio/:id" element={<Studio />} />
      </Routes>
    </Router>
  );
};

export default App;