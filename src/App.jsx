import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Profile from './pages/Profile';
import Join from './pages/Join';
import NetworkTreePage from './pages/NetworkTreePage';
import AdminNetworkTreePage from './pages/AdminNetworkTreePage';

/**
 * Inner layout component that inspects the current route and auth status.
 * When a user is logged in and viewing their distributor dashboard (/profile or /dashboard):
 * - Displays the full-width Kashvimlm distributor portal matching the reference snapshot
 * - Omits external headers and footers as requested ("dont copy the footer just make the page like this and finctionable")
 */
function AppContent() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const saved = localStorage.getItem('kashvi_auth');
      return saved ? Boolean(JSON.parse(saved).isLoggedIn) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const syncAuth = () => {
      try {
        const saved = localStorage.getItem('kashvi_auth');
        setIsLoggedIn(saved ? Boolean(JSON.parse(saved).isLoggedIn) : false);
      } catch {
        setIsLoggedIn(false);
      }
    };

    syncAuth();
    window.addEventListener('storage', syncAuth);
    window.addEventListener('kashvi_auth_change', syncAuth);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('kashvi_auth_change', syncAuth);
    };
  }, [location.pathname]);

  const isDashboardView =
    (location.pathname === '/profile' ||
      location.pathname === '/dashboard' ||
      location.pathname === '/network-tree' ||
      location.pathname === '/admin/network-tree') &&
    isLoggedIn;

  return (
    <div className={`app-wrapper ${isDashboardView ? 'dashboard-mode' : ''}`}>
      {!isDashboardView && <Navbar />}
      <main className={`main-content ${isDashboardView ? 'main-dashboard-canvas' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Profile />} />
          <Route
            path="/network-tree"
            element={isLoggedIn ? <Profile defaultNav="network_tree" /> : <NetworkTreePage />}
          />
          <Route path="/admin/network-tree" element={<AdminNetworkTreePage />} />
          <Route path="/join" element={<Join />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {!isDashboardView && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
