import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import RestaurantAnalysis from './components/RestaurantAnalysis';
import RefinedCreativeMode from './components/RefinedCreativeMode';
import CacheManager from './components/CacheManager';

function AppContent() {
  const [showCreativeMode, setShowCreativeMode] = useState(false);
  const [showCacheManager, setShowCacheManager] = useState(false);
  const [restaurantData, setRestaurantData] = useState({
    placeName: 'Demo Restaurant',
    monthlyRevenue: 75000,
    avgTicket: 25,
    monthlyTransactions: 3000
  });
  const location = useLocation();

  if (showCreativeMode) {
    return (
      <RefinedCreativeMode 
        restaurantData={restaurantData}
        onExit={() => setShowCreativeMode(false)}
      />
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={<RestaurantAnalysis />} />
        <Route path="/:placeId" element={<RestaurantAnalysis />} />
      </Routes>
      
      {/* Control Buttons */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 1000
      }}>
        {/* Cache Manager Toggle */}
        <button
          onClick={() => setShowCacheManager(true)}
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '50px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(14,165,233,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(14,165,233,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(14,165,233,0.4)';
          }}
        >
          🗄️ Cache Manager
        </button>

        {/* Creative Mode Toggle */}
        <button
          onClick={() => setShowCreativeMode(true)}
          style={{
            background: 'linear-gradient(135deg, #8b9cf4 0%, #a97fc4 100%)',
            color: 'white',
            border: 'none',
            padding: '15px 25px',
            borderRadius: '50px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(139,156,244,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 15px 40px rgba(139,156,244,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(139,156,244,0.4)';
          }}
        >
          🎨 Creative Mode
        </button>
      </div>

      {/* Cache Manager Modal */}
      {showCacheManager && (
        <CacheManager onClose={() => setShowCacheManager(false)} />
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;