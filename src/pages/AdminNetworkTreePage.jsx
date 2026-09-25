import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Users,
  Network,
  ArrowRight,
  ArrowLeft,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import NetworkTreePage from './NetworkTreePage';
import TreeAuditModal from '../components/networkTree/TreeAuditModal';
import AdminPlacementChangeModal from '../components/networkTree/AdminPlacementChangeModal';
import { api } from '../services/api';
import '../components/networkTree/NetworkTree.css';

/**
 * AdminNetworkTreePage
 * Mounted at: /admin/network-tree (Prompt 17)
 *
 * Requirements:
 * - TEST 15: Admin opens /admin/network-tree -> Admin can search and inspect network.
 * - TEST 16: Normal user attempts admin tree -> 403 Forbidden.
 */
export default function AdminNetworkTreePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read current authentication session
  const [authData, setAuthData] = useState(() => {
    try {
      const saved = localStorage.getItem('kashvi_auth');
      return saved ? JSON.parse(saved) : { isLoggedIn: false, user: null };
    } catch {
      return { isLoggedIn: false, user: null };
    }
  });

  const currentUser = authData?.user;
  const isAdmin =
    Boolean(authData?.isLoggedIn) &&
    (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN');

  // Search input for admin to inspect any member in the company
  const [searchQuery, setSearchQuery] = useState(searchParams.get('member') || 'KV-1001');

  // Audit trail modal & Placement Change modal state (Prompt 16)
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedMemberForMove, setSelectedMemberForMove] = useState(null);

  // Listen for storage changes
  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const saved = localStorage.getItem('kashvi_auth');
        setAuthData(saved ? JSON.parse(saved) : { isLoggedIn: false, user: null });
      } catch {
        setAuthData({ isLoggedIn: false, user: null });
      }
    };
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('kashvi_auth_change', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('kashvi_auth_change', handleAuthChange);
    };
  }, []);

  // Quick helper to simulate Admin role (for testing Test 15)
  const handleSimulateAdmin = () => {
    const adminSession = {
      isLoggedIn: true,
      token: 'jwt-simulated-admin-token',
      user: {
        id: 'usr-admin-001',
        memberId: 'KV-ADMIN-01',
        name: 'Executive System Admin',
        email: 'admin@kashvimlm.com',
        role: 'ADMIN',
      },
    };
    localStorage.setItem('kashvi_auth', JSON.stringify(adminSession));
    setAuthData(adminSession);
    window.dispatchEvent(new Event('kashvi_auth_change'));
  };

  // Quick helper to simulate Normal Distributor role (for testing Test 16)
  const handleSimulateNormalUser = () => {
    const userSession = {
      isLoggedIn: true,
      token: 'jwt-simulated-user-token',
      user: {
        id: 'usr-dist-1002',
        memberId: 'KV-1002',
        name: 'Amit Patel',
        email: 'amit@kashvimlm.com',
        role: 'DISTRIBUTOR',
      },
    };
    localStorage.setItem('kashvi_auth', JSON.stringify(userSession));
    setAuthData(userSession);
    window.dispatchEvent(new Event('kashvi_auth_change'));
  };

  // =========================================================================
  // TEST 16: Normal user attempts admin tree -> 403 Forbidden
  // =========================================================================
  if (!isAdmin) {
    return (
      <div className="admin-tree-forbidden-canvas">
        <div className="admin-forbidden-card">
          <div className="forbidden-badge-icon">
            <ShieldAlert size={44} className="text-red-500" />
          </div>

          <div className="forbidden-status-chip">HTTP 403 FORBIDDEN</div>
          <h1 className="forbidden-heading">Access Denied</h1>
          <h2 className="forbidden-subheading">
            Administrative Network Tree Inspection Restricted
          </h2>

          <p className="forbidden-description">
            You do not have administrative privileges to access the global network tree inspection console.
            As a standard distributor (<strong>{currentUser?.name || 'Unauthenticated User'}</strong>
            {currentUser?.role ? ` - Role: ${currentUser.role}` : ''}), company security policy
            restricts your network visibility strictly to your own downline organization.
          </p>

          <div className="forbidden-policy-box">
            <div className="policy-box-title">
              <Lock size={15} />
              <span>Security Rule (Prompt 15 & Prompt 17 - Test 16):</span>
            </div>
            <p>
              Direct access to <code>/admin/network-tree</code> requires <strong>ADMIN</strong> or{' '}
              <strong>SUPER_ADMIN</strong> role enforcement. Unauthorized cross-line inspections are
              logged as compliance violations.
            </p>
          </div>

          <div className="forbidden-action-row">
            <button
              type="button"
              className="btn-forbidden-secondary"
              onClick={() => navigate('/network-tree')}
            >
              <ArrowLeft size={15} />
              <span>Go to My Network Tree</span>
            </button>

            <button
              type="button"
              className="btn-forbidden-secondary"
              onClick={() => navigate('/dashboard')}
            >
              <span>Distributor Dashboard</span>
            </button>

            <button
              type="button"
              className="btn-forbidden-admin-switch"
              onClick={handleSimulateAdmin}
              title="Switch role to ADMIN to verify Test 15"
            >
              <Unlock size={14} />
              <span>Switch to Admin Role (Verify Test 15)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TEST 15: Admin opens /admin/network-tree -> Admin can search & inspect network
  // =========================================================================
  return (
    <div className="admin-network-tree-wrapper">
      {/* Admin Executive Top Bar */}
      <div className="admin-tree-top-banner">
        <div className="admin-tree-banner-left">
          <div className="admin-pill-badge">
            <ShieldCheck size={14} />
            <span>ADMINISTRATOR MODE</span>
          </div>
          <span className="admin-banner-title">
            Global Organizational Tree Inspector (All Networks)
          </span>
          <span className="admin-banner-subtitle">
            Authenticated as: {currentUser?.name || 'System Admin'} (Role: {currentUser?.role || 'ADMIN'})
          </span>
        </div>

        <div className="admin-tree-banner-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Prompt 16: Audit Trail button */}
          <button
            type="button"
            className="btn-role-toggle-test"
            onClick={() => setShowAuditModal(true)}
            title="View MLM tree audit trail (Prompt 16)"
            style={{
              background: '#0f172a',
              color: '#34d399',
              border: '1px solid #10b981',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={14} />
            <span>Tree Audit Trail</span>
          </button>

          {/* Prompt 16: Admin placement change button */}
          <button
            type="button"
            className="btn-role-toggle-test"
            onClick={() => {
              setSelectedMemberForMove({ distributorId: 'KV-1006', name: 'Neha' });
              setShowMoveModal(true);
            }}
            title="Admin move distributor / change placement (Prompt 16)"
            style={{
              background: '#d97706',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
            }}
          >
            <ArrowRight size={14} />
            <span>Change Placement</span>
          </button>

          {/* Role test switcher */}
          <button
            type="button"
            className="btn-role-toggle-test"
            onClick={handleSimulateNormalUser}
            title="Switch to normal distributor to verify Test 16 (403 Forbidden)"
          >
            <Lock size={13} />
            <span>Test Normal User (Verify Test 16)</span>
          </button>
        </div>
      </div>

      {/* Render Full Network Tree with Admin Privileges */}
      <NetworkTreePage embedded={true} />

      {/* MLM Tree Audit Trail Modal (Prompt 16) */}
      <TreeAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />

      {/* Admin Placement Change Modal (Prompt 16) */}
      <AdminPlacementChangeModal
        isOpen={showMoveModal}
        onClose={() => {
          setShowMoveModal(false);
          setSelectedMemberForMove(null);
        }}
        member={selectedMemberForMove}
        onSuccess={() => {
          setShowMoveModal(false);
          setSelectedMemberForMove(null);
          // Auto open audit modal to show the new record
          setShowAuditModal(true);
        }}
      />
    </div>
  );
}
