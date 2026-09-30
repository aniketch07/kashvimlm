import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GitBranch,
} from 'lucide-react';
import './Login.css';

export function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    sponsorId: 'KV-1001',
    placementPosition: 'AUTO',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // If already authenticated or just registered, navigate straight to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');

    // Validations
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    const cleanSponsorId = (formData.sponsorId || '').trim() || 'KV-1001';

    setLoading(true);
    try {
      const payload = {
        fullName: formData.name.trim(),
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        username: formData.username.trim() || undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        sponsorId: cleanSponsorId,
        sponsorCode: cleanSponsorId,
        placementPosition:
          formData.placementPosition === 'AUTO' ? undefined : formData.placementPosition,
      };

      await register(payload);
      setSuccessMsg(
        'Distributor registration successful! Redirecting to your dashboard...'
      );

      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('[Register] Error:', err);
      if (err.status === 400 || err.status === 422) {
        setError(err.message || 'Validation error. Please check all fields.');
      } else if (err.status === 409) {
        setError('An account with this email or username already exists.');
      } else if (err.isNetworkError) {
        setError('Cannot reach server. Please check your backend connection.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-header">
          <div className="auth-logo-badge">
            <span className="logo-initials">KV</span>
          </div>
          <h1 className="auth-title">Distributor Registration</h1>
          <p className="auth-subtitle">Join the binary network and launch your business</p>
        </div>

        {error && (
          <div className="auth-alert error-alert" role="alert">
            <AlertCircle size={18} className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success-alert" role="status">
            <CheckCircle2 size={18} className="alert-icon" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Rahul Kaushal"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Email & Phone Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <div className="input-wrapper">
                <Phone size={18} className="input-icon" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Sponsor ID & Placement Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="sponsorId">Sponsor ID * (Default: KV-1001 - Owner)</label>
              <div className="input-wrapper">
                <UserCheck size={18} className="input-icon" />
                <input
                  id="sponsorId"
                  name="sponsorId"
                  type="text"
                  required
                  placeholder="KV-1001 (Owner / Root Sponsor)"
                  value={formData.sponsorId}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="placementPosition">Binary Placement</label>
              <div className="input-wrapper">
                <GitBranch size={18} className="input-icon" />
                <select
                  id="placementPosition"
                  name="placementPosition"
                  value={formData.placementPosition}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="AUTO">Auto-Balance (Recommended)</option>
                  <option value="LEFT">LEFT Team</option>
                  <option value="RIGHT">RIGHT Team</option>
                </select>
              </div>
            </div>
          </div>

          {/* Password & Confirm Password Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 6 chars"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="submit-auth-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already an enrolled distributor?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
