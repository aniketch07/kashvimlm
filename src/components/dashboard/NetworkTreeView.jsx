import React, { useState, useEffect, useCallback } from 'react';
import {
  Network,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronRight,
  User,
  Award,
  UserPlus,
  Info,
  Layers,
  CheckCircle2,
  RefreshCw,
  GitBranch,
  ArrowUp,
  X,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api.js';
import './NetworkTreeView.css';

/**
 * Professional MLM Binary Network Tree Component
 * 
 * Rules:
 * - Every distributor/member has a maximum of 2 direct children:
 *   LEFT CHILD and RIGHT CHILD.
 * - No person can directly have more than 2 children.
 * - Visual structure:
 *                     Rahul
 *                    /     \
 *                Amit       Rohit
 *               /   \       /   \
 *           Neha   Pooja  Karan  Ankit
 *
 * Fully database-driven: queries /api/v1/tree/binary/:rootId with resilient fallback.
 */
function NetworkTreeView({ user, onNavigate }) {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation & Depth State
  const [currentRootId, setCurrentRootId] = useState('root-demo');
  const [depth, setDepth] = useState(3);
  const [breadcrumbs, setBreadcrumbs] = useState([
    { id: 'root-demo', name: 'Rahul (Root)' }
  ]);
  
  // UI Controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Fetch Tree Data from Backend API
  const fetchTree = useCallback(async (rootId, maxDepth) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBinaryTree(rootId, maxDepth);
      if (data) {
        setTreeData(data);
      } else {
        setError('Unable to load network tree from database.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching binary tree.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree(currentRootId, depth);
  }, [currentRootId, depth, fetchTree]);

  // Navigate down to focus a specific child node as root
  const handleFocusNode = (node) => {
    if (!node) return;
    const nodeId = node.nodeId || node.distributor?.distributorCode || 'root-demo';
    const nodeName = node.distributor?.firstName || node.distributor?.displayName || 'Member';
    
    setCurrentRootId(nodeId);
    setBreadcrumbs((prev) => {
      // Check if already in breadcrumbs
      const existingIdx = prev.findIndex((b) => b.id === nodeId);
      if (existingIdx !== -1) {
        return prev.slice(0, existingIdx + 1);
      }
      return [...prev, { id: nodeId, name: nodeName }];
    });
    setSelectedNode(null);
  };

  // Navigate via Breadcrumb
  const handleBreadcrumbClick = (crumbId, index) => {
    setCurrentRootId(crumbId);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSelectedNode(null);
  };

  // Reset to Global Root
  const handleResetToRoot = () => {
    setCurrentRootId('root-demo');
    setBreadcrumbs([{ id: 'root-demo', name: 'Rahul (Root)' }]);
    setZoomLevel(1);
    setSelectedNode(null);
  };

  // Handle Enrollment in open slot
  const handleEnrollInSlot = (parentNode, position) => {
    showToast(`Opening enrollment under ${parentNode?.distributor?.firstName || 'Parent'} (${position} Leg)...`);
    if (onNavigate) {
      setTimeout(() => {
        onNavigate('enroll');
      }, 400);
    }
  };

  // Helper: Match search highlight
  const isSearchMatched = (node) => {
    if (!searchQuery.trim() || !node) return false;
    const q = searchQuery.toLowerCase().trim();
    const name = (node.distributor?.displayName || node.distributor?.firstName || '').toLowerCase();
    const code = (node.distributor?.distributorCode || '').toLowerCase();
    return name.includes(q) || code.includes(q);
  };

  // Render a Single Binary Tree Card
  const renderMemberNode = (node, isRoot = false, legPosition = null) => {
    if (!node) {
      return (
        <div className="binary-empty-slot-card">
          <div className="empty-slot-badge">
            {legPosition ? `${legPosition} LEG OPEN` : 'OPEN SLOT'}
          </div>
          <div className="empty-slot-icon-wrap">
            <UserPlus size={20} className="empty-slot-icon" />
          </div>
          <span className="empty-slot-title">Empty Position</span>
          <p className="empty-slot-desc">Available for direct enrollment or team spillover.</p>
          <button
            type="button"
            className="btn-slot-enroll"
            onClick={() => handleEnrollInSlot(null, legPosition)}
          >
            + Enroll Member
          </button>
        </div>
      );
    }

    const { distributor, businessCenter, position, depth: nodeDepth } = node;
    const leftVol = businessCenter?.leftVolume ?? 0;
    const rightVol = businessCenter?.rightVolume ?? 0;
    const totalVol = leftVol + rightVol;
    const leftPercent = totalVol > 0 ? Math.round((leftVol / totalVol) * 100) : 50;
    const rightPercent = totalVol > 0 ? 100 - leftPercent : 50;
    const matched = isSearchMatched(node);

    return (
      <div
        className={`binary-node-card ${isRoot ? 'is-root' : ''} ${matched ? 'search-highlight' : ''}`}
        onClick={() => setSelectedNode(node)}
      >
        {/* Top Header Tag: Position / Depth */}
        <div className="node-card-top-tag">
          {isRoot ? (
            <span className="tag-pill root-pill">👑 ROOT MEMBER</span>
          ) : position === 'LEFT' ? (
            <span className="tag-pill left-pill">◀ LEFT LEG</span>
          ) : position === 'RIGHT' ? (
            <span className="tag-pill right-pill">RIGHT LEG ▶</span>
          ) : (
            <span className="tag-pill root-pill">LEVEL {nodeDepth}</span>
          )}
          <span className="tag-status-dot active" title="Status: Active" />
        </div>

        {/* Member Avatar & Identity */}
        <div className="node-card-body">
          <div className="node-avatar-circle">
            {distributor?.firstName?.charAt(0) || distributor?.displayName?.charAt(0) || 'U'}
          </div>
          <div className="node-info-text">
            <h4 className="node-member-name">
              {distributor?.firstName || distributor?.displayName || 'Distributor'}
            </h4>
            <span className="node-member-code">{distributor?.distributorCode || 'KV-0000'}</span>
          </div>
        </div>

        {/* Rank Badge */}
        <div className="node-rank-badge">
          <Award size={12} className="rank-badge-icon" />
          <span>{distributor?.rankName || 'Active Member'}</span>
        </div>

        {/* Binary Dual-Leg Volume Bar */}
        <div className="node-volume-box">
          <div className="volume-label-row">
            <span className="vol-text left-vol">L: {leftVol.toLocaleString()} BV</span>
            <span className="vol-text right-vol">R: {rightVol.toLocaleString()} BV</span>
          </div>
          <div className="binary-vol-track">
            <div className="vol-fill-left" style={{ width: `${leftPercent}%` }} />
            <div className="vol-fill-right" style={{ width: `${rightPercent}%` }} />
          </div>
        </div>

        {/* Card Footer Quick Actions */}
        <div className="node-card-footer">
          <button
            type="button"
            className="node-footer-btn view-details"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNode(node);
            }}
          >
            <Info size={13} />
            <span>Details</span>
          </button>
          {!isRoot && (
            <button
              type="button"
              className="node-footer-btn focus-tree"
              onClick={(e) => {
                e.stopPropagation();
                handleFocusNode(node);
              }}
              title="Focus and view subtree from this member"
            >
              <ArrowUp size={13} />
              <span>Subtree</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render Binary Subtree (Node + Exactly 2 Children)
  const renderBinarySubtree = (node, isRoot = false) => {
    if (!node) return null;

    const hasChildren = node.leftChild || node.rightChild || depth > 1;

    return (
      <div className="binary-tree-branch">
        {/* Node Itself */}
        <div className="binary-parent-node-wrap">
          {renderMemberNode(node, isRoot, node.position)}
        </div>

        {/* Connecting SVG Branch Lines & Children */}
        {hasChildren && depth > 1 && (
          <div className="binary-children-container">
            {/* SVG Connecting Branch Lines */}
            <div className="binary-connector-svg-wrapper">
              <svg
                width="100%"
                height="40"
                viewBox="0 0 400 40"
                preserveAspectRatio="none"
                className="binary-svg-lines"
              >
                {/* Vertical Stem from parent */}
                <line x1="200" y1="0" x2="200" y2="20" stroke="#94a3b8" strokeWidth="2" />
                {/* Horizontal Crossbar connecting Left and Right */}
                <line x1="100" y1="20" x2="300" y2="20" stroke="#94a3b8" strokeWidth="2" />
                {/* Vertical drop to Left Child */}
                <line x1="100" y1="20" x2="100" y2="40" stroke="#94a3b8" strokeWidth="2" />
                {/* Vertical drop to Right Child */}
                <line x1="300" y1="20" x2="300" y2="40" stroke="#94a3b8" strokeWidth="2" />
              </svg>
            </div>

            {/* Exactly 2 Children: Left Leg & Right Leg */}
            <div className="binary-children-row">
              {/* LEFT LEG CHILD */}
              <div className="binary-child-col left-col">
                <div className="leg-indicator-label left-label">LEFT BRANCH</div>
                {node.leftChild ? (
                  depth > 2 ? (
                    renderBinarySubtree(node.leftChild, false)
                  ) : (
                    renderMemberNode(node.leftChild, false, 'LEFT')
                  )
                ) : (
                  renderMemberNode(null, false, 'LEFT')
                )}
              </div>

              {/* RIGHT LEG CHILD */}
              <div className="binary-child-col right-col">
                <div className="leg-indicator-label right-label">RIGHT BRANCH</div>
                {node.rightChild ? (
                  depth > 2 ? (
                    renderBinarySubtree(node.rightChild, false)
                  ) : (
                    renderMemberNode(node.rightChild, false, 'RIGHT')
                  )
                ) : (
                  renderMemberNode(null, false, 'RIGHT')
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="kashvimlm-network-tree-view">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="tree-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb Navigation */}
      <header className="network-tree-header">
        <div className="header-title-block">
          <div className="header-badge">
            <Network size={14} />
            <span>MLM BINARY GENEALOGY</span>
          </div>
          <h2 className="header-main-title">Network Tree</h2>
          <p className="header-subtitle">
            Dual-leg binary marketing tree. Every distributor can have a maximum of 2 children (Left Member &amp; Right Member).
          </p>
        </div>

        {/* Tree Toolbar Controls */}
        <div className="tree-toolbar-controls">
          {/* Search Box */}
          <div className="tree-search-wrapper">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search member name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tree-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Depth Selector */}
          <div className="tree-depth-control">
            <Layers size={15} className="depth-icon" />
            <span className="depth-label">Depth:</span>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="tree-depth-select"
            >
              <option value={2}>2 Levels</option>
              <option value={3}>3 Levels</option>
              <option value={4}>4 Levels</option>
            </select>
          </div>

          {/* Zoom Controls */}
          <div className="tree-zoom-group">
            <button
              type="button"
              className="zoom-btn"
              onClick={() => setZoomLevel((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="zoom-value">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              className="zoom-btn"
              onClick={() => setZoomLevel((z) => Math.min(1.35, Number((z + 0.1).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Reset View Button */}
          <button
            type="button"
            className="tree-action-btn"
            onClick={handleResetToRoot}
            title="Reset to Root Member"
          >
            <RotateCcw size={15} />
            <span>Reset Root</span>
          </button>

          {/* Refresh Data Button */}
          <button
            type="button"
            className={`tree-action-btn ${loading ? 'loading' : ''}`}
            onClick={() => fetchTree(currentRootId, depth)}
            title="Refresh database tree"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Breadcrumbs Navigation Row */}
      <div className="tree-breadcrumbs-bar">
        <div className="breadcrumbs-list">
          <span className="breadcrumbs-title">Navigation Path:</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id + idx}>
              {idx > 0 && <ChevronRight size={14} className="crumb-separator" />}
              <button
                type="button"
                className={`crumb-btn ${idx === breadcrumbs.length - 1 ? 'current' : ''}`}
                onClick={() => handleBreadcrumbClick(crumb.id, idx)}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Tree Model Information Pill */}
        <div className="binary-rule-pill">
          <GitBranch size={13} />
          <span>Rule: Max 2 Direct Children (Left / Right)</span>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="tree-canvas-viewport">
        {loading && (
          <div className="tree-loading-overlay">
            <div className="spinner-orbit" />
            <p className="loading-text">Loading database-driven binary genealogy...</p>
          </div>
        )}

        {error && !loading && (
          <div className="tree-error-banner">
            <p>{error}</p>
            <button
              type="button"
              className="btn-retry"
              onClick={() => fetchTree(currentRootId, depth)}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && treeData && (
          <div
            className="tree-zoom-wrapper"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease',
            }}
          >
            {renderBinarySubtree(treeData, true)}
          </div>
        )}
      </div>

      {/* Quick Binary Placement Legend */}
      <footer className="network-tree-footer-legend">
        <div className="legend-item">
          <span className="legend-color-dot root-dot" />
          <span>Root Member</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-dot left-dot" />
          <span>Left Leg Placement</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-dot right-dot" />
          <span>Right Leg Placement</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-dot active-dot" />
          <span>Active Status</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-dot empty-dot" />
          <span>Open Placement Slot</span>
        </div>
      </footer>

      {/* Member Details Flyout Drawer */}
      {selectedNode && (
        <div className="node-detail-drawer-backdrop" onClick={() => setSelectedNode(null)}>
          <div className="node-detail-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-header-left">
                <div className="drawer-avatar">
                  {selectedNode.distributor?.firstName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="drawer-member-name">
                    {selectedNode.distributor?.displayName || selectedNode.distributor?.firstName}
                  </h3>
                  <span className="drawer-member-id">
                    ID: {selectedNode.distributor?.distributorCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedNode(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-content">
              {/* Status & Position Badge */}
              <div className="drawer-badge-row">
                <span className="drawer-status-badge active">
                  <ShieldCheck size={14} />
                  <span>{selectedNode.distributor?.status || 'ACTIVE'}</span>
                </span>
                <span className="drawer-rank-badge">
                  <Award size={14} />
                  <span>{selectedNode.distributor?.rankName || 'Silver Director'}</span>
                </span>
                <span className="drawer-leg-badge">
                  {selectedNode.position === 'LEFT'
                    ? 'Left Leg'
                    : selectedNode.position === 'RIGHT'
                    ? 'Right Leg'
                    : 'Root Position'}
                </span>
              </div>

              {/* Volume Information Card */}
              <div className="drawer-card">
                <h4 className="drawer-card-title">
                  <TrendingUp size={15} />
                  <span>Business Center &amp; Volume Details</span>
                </h4>
                <div className="drawer-metric-grid">
                  <div className="drawer-metric-item">
                    <span className="metric-label">Center Code</span>
                    <span className="metric-val">{selectedNode.businessCenter?.centerCode || 'BC1'}</span>
                  </div>
                  <div className="drawer-metric-item">
                    <span className="metric-label">Sponsor ID</span>
                    <span className="metric-val">{selectedNode.distributor?.sponsorCode || 'COMPANY-ROOT'}</span>
                  </div>
                  <div className="drawer-metric-item">
                    <span className="metric-label">Left Leg Volume</span>
                    <span className="metric-val text-blue">
                      {(selectedNode.businessCenter?.leftVolume ?? 0).toLocaleString()} BV
                    </span>
                  </div>
                  <div className="drawer-metric-item">
                    <span className="metric-label">Right Leg Volume</span>
                    <span className="metric-val text-purple">
                      {(selectedNode.businessCenter?.rightVolume ?? 0).toLocaleString()} BV
                    </span>
                  </div>
                  <div className="drawer-metric-item full-width">
                    <span className="metric-label">Accumulated Team Volume</span>
                    <span className="metric-val text-dark">
                      {(
                        (selectedNode.businessCenter?.accumulatedLeftVolume ?? 0) +
                        (selectedNode.businessCenter?.accumulatedRightVolume ?? 0)
                      ).toLocaleString()}{' '}
                      BV
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="drawer-actions-col">
                <button
                  type="button"
                  className="drawer-action-btn primary"
                  onClick={() => handleFocusNode(selectedNode)}
                >
                  <ArrowUp size={16} />
                  <span>Make Tree Root (Focus Subtree)</span>
                </button>

                <button
                  type="button"
                  className="drawer-action-btn secondary"
                  onClick={() => {
                    setSelectedNode(null);
                    if (onNavigate) onNavigate('enroll');
                  }}
                >
                  <UserPlus size={16} />
                  <span>Enroll Downline Under This Member</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkTreeView;
