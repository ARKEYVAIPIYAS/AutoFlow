import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Studio from './components/Studio';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Door 1: The Landing Dashboard (Home) */}
        <Route path="/" element={<Dashboard />} />

        {/* Door 2: The Specific Workflow Canvas */}
        {/* The ":id" lets us open different projects like /studio/1 or /studio/2 */}
        <Route path="/studio/:id" element={<Studio />} />
      </Routes>
    </Router>
  );
};

export default App;