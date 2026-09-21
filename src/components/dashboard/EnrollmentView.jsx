import React, { useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  User,
  MapPin,
  GitBranch,
  Package,
  Building,
  Lock,
  Sparkles,
  Printer,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import './EnrollmentView.css';

/**
 * Professional Distributor & Customer Enrollment Portal
 * Allows the sponsor (Rahul kaushal / ID: 88767139) to register new downline members
 * into their binary business tree with auto-placement or specific leg selection.
 */
function EnrollmentView({ user, onNavigate }) {
  const sponsorName = user?.name || 'Rahul kaushal';
  const sponsorId = user?.memberId || '88767139';

  // Mode: 'distributor' (Brand Partner) | 'customer' (Preferred Customer)
  const [enrollType, setEnrollType] = useState('distributor');

  // Step wizard: 1 (Personal), 2 (Address), 3 (Placement), 4 (Starter Kit), 5 (Bank & Password)
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: 'Male',
    email: '',
    phone: '',
    panNumber: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    placementLeg: 'auto', // 'auto' | 'left' | 'right'
    parentBusinessCenter: 'BC 001',
    starterKitId: 'kit_pro',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    password: '',
    agreeTerms: true,
  });

  const [copiedKey, setCopiedKey] = useState(null);
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Pre-fill demo data for quick review
  const handlePrefillDemo = () => {
    setFormData({
      fullName: 'Vikas Sharma',
      dob: '1992-06-15',
      gender: 'Male',
      email: 'vikas.sharma@example.com',
      phone: '+91 98201 54321',
      panNumber: 'ABCPS1234F',
      address: 'Flat 402, Greenfield Heights, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400053',
      placementLeg: 'left',
      parentBusinessCenter: 'BC 001',
      starterKitId: 'kit_pro',
      bankName: 'HDFC Bank',
      accountNumber: '50100234981122',
      ifscCode: 'HDFC0000123',
      password: 'SecurePass2026!',
      agreeTerms: true,
    });
  };

  const handleSubmitEnrollment = (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      alert('Please fill in applicant full name, email, and phone number.');
      return;
    }

    const newMemberId = `186${Math.floor(10000 + Math.random() * 90000)}`;
    const legLabel =
      formData.placementLeg === 'left'
        ? 'Left Leg (BC 002)'
        : formData.placementLeg === 'right'
        ? 'Right Leg (BC 003)'
        : 'Auto-Balanced (BC 001)';

    const kitBV =
      formData.starterKitId === 'kit_pro'
        ? 100
        : formData.starterKitId === 'kit_elite'
        ? 200
        : 50;

    const result = {
      memberId: newMemberId,
      name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      type: enrollType === 'distributor' ? 'Brand Partner / Associate' : 'Preferred Customer',
      sponsorId: sponsorId,
      sponsorName: sponsorName,
      placement: legLabel,
      assignedBV: kitBV,
      enrolledAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: 'Active & Commission Qualified',
    };

    // Save into downline history in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('kashvi_downline_team') || '[]');
      existing.unshift(result);
      localStorage.setItem('kashvi_downline_team', JSON.stringify(existing));
    } catch {
      // ignore
    }

    setEnrollmentResult(result);
  };

  const handleResetForm = () => {
    setEnrollmentResult(null);
    setCurrentStep(1);
    setFormData({
      fullName: '',
      dob: '',
      gender: 'Male',
      email: '',
      phone: '',
      panNumber: '',
      address: '',
      city: '',
      state: 'Maharashtra',
      pincode: '',
      placementLeg: 'auto',
      parentBusinessCenter: 'BC 001',
      starterKitId: 'kit_pro',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      password: '',
      agreeTerms: true,
    });
  };

  // SUCCESS CONFIRMATION SCREEN
  if (enrollmentResult) {
    return (
      <div className="enroll-page-container">
        <div className="enroll-success-card">
          <div className="enroll-success-header">
            <div className="success-icon-badge">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="success-title">Enrollment Successful!</h2>
            <p className="success-subtitle">
              New {enrollmentResult.type} has been officially registered and placed into your
              KASHVIMLM binary tree.
            </p>
          </div>

          <div className="enroll-credentials-box">
            <div className="credential-row">
              <span className="cred-label">New Member ID:</span>
              <div className="cred-val-wrap">
                <strong className="cred-val highlight">{enrollmentResult.memberId}</strong>
                <button
                  type="button"
                  className="cred-copy-btn"
                  onClick={() => handleCopy(enrollmentResult.memberId, 'id')}
                >
                  {copiedKey === 'id' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === 'id' ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>
            </div>

            <div className="credential-row">
              <span className="cred-label">Member Full Name:</span>
              <span className="cred-val">{enrollmentResult.name}</span>
            </div>

            <div className="credential-row">
              <span className="cred-label">Sponsoring Partner:</span>
              <span className="cred-val">
                {enrollmentResult.sponsorName} (ID: {enrollmentResult.sponsorId})
              </span>
            </div>

            <div className="credential-row">
              <span className="cred-label">Tree Placement Leg:</span>
              <span className="cred-val">{enrollmentResult.placement}</span>
            </div>

            <div className="credential-row">
              <span className="cred-label">Credited Volume:</span>
              <span className="cred-val font-semibold text-teal">
                +{enrollmentResult.assignedBV} CVP / BV Points
              </span>
            </div>

            <div className="credential-row">
              <span className="cred-label">Official Status:</span>
              <span className="status-badge-active">{enrollmentResult.status}</span>
            </div>
          </div>

          <div className="enroll-success-actions">
            <button
              type="button"
              className="btn-enroll-action primary"
              onClick={() => {
                window.print();
              }}
            >
              <Printer size={16} />
              <span>Print Welcome Certificate</span>
            </button>

            <button
              type="button"
              className="btn-enroll-action secondary"
              onClick={handleResetForm}
            >
              <RefreshCw size={16} />
              <span>Enroll Another Partner</span>
            </button>

            <button
              type="button"
              className="btn-enroll-action outline"
              onClick={() => onNavigate('dashboard')}
            >
              <ArrowRight size={16} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enroll-page-container">
      {/* Top Header Banner */}
      <div className="enroll-top-banner">
        <div className="enroll-banner-left">
          <div className="enroll-badge">
            <UserPlus size={16} />
            <span>KASHVIMLM ENROLLMENT PORTAL</span>
          </div>
          <h1 className="enroll-main-title">Enroll New Distributor or Customer</h1>
          <p className="enroll-main-desc">
            Sponsor a new Brand Partner or Preferred Customer directly under your Business Center
            network. Commission volume points (BV) are instantly added to your weekly payout leg.
          </p>
        </div>

        {/* Sponsor Identity Verification Badge */}
        <div className="sponsor-verification-card">
          <div className="sponsor-verified-header">
            <ShieldCheck size={18} className="shield-icon" />
            <span className="sponsor-label">Verified Sponsor</span>
          </div>
          <div className="sponsor-name">{sponsorName}</div>
          <div className="sponsor-meta">
            <span>Sponsor ID: <strong>{sponsorId}</strong></span>
            <span className="meta-dot">•</span>
            <span>Market: 🇮🇳 India</span>
          </div>
          <button
            type="button"
            className="btn-prefill-demo"
            onClick={handlePrefillDemo}
            title="Autofill sample registration data for quick testing"
          >
            <Sparkles size={13} />
            <span>Autofill Sample Applicant</span>
          </button>
        </div>
      </div>

      {/* Role / Account Type Selector Tabs */}
      <div className="enroll-type-switcher">
        <button
          type="button"
          className={`type-tab-btn ${enrollType === 'distributor' ? 'active' : ''}`}
          onClick={() => setEnrollType('distributor')}
        >
          <Building size={18} />
          <div className="type-tab-text">
            <strong>Brand Partner / Associate</strong>
            <span>Eligible for weekly binary commission, bonuses & 3 Business Centers</span>
          </div>
        </button>

        <button
          type="button"
          className={`type-tab-btn ${enrollType === 'customer' ? 'active' : ''}`}
          onClick={() => setEnrollType('customer')}
        >
          <User size={18} />
          <div className="type-tab-text">
            <strong>Preferred Customer (PC)</strong>
            <span>Enjoys 10% wholesale discount on all products without selling obligations</span>
          </div>
        </button>
      </div>

      {/* Multi-Step Wizard Card */}
      <div className="enroll-form-card">
        {/* Step Indicator Header */}
        <div className="wizard-step-indicators">
          <button
            type="button"
            className={`step-bubble ${currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <span className="step-num">1</span>
            <span className="step-title">Personal Info</span>
          </button>

          <button
            type="button"
            className={`step-bubble ${currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(2)}
          >
            <span className="step-num">2</span>
            <span className="step-title">Address & PIN</span>
          </button>

          <button
            type="button"
            className={`step-bubble ${currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(3)}
          >
            <span className="step-num">3</span>
            <span className="step-title">Tree Placement</span>
          </button>

          {enrollType === 'distributor' && (
            <button
              type="button"
              className={`step-bubble ${currentStep === 4 ? 'current' : currentStep > 4 ? 'completed' : ''}`}
              onClick={() => setCurrentStep(4)}
            >
              <span className="step-num">4</span>
              <span className="step-title">Starter Kit</span>
            </button>
          )}

          <button
            type="button"
            className={`step-bubble ${currentStep === 5 ? 'current' : ''}`}
            onClick={() => setCurrentStep(5)}
          >
            <span className="step-num">{enrollType === 'distributor' ? '5' : '4'}</span>
            <span className="step-title">Bank & Security</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitEnrollment} className="wizard-form-body">
          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div className="step-content-section">
              <div className="step-header">
                <User size={20} className="step-icon" />
                <div>
                  <h3 className="step-main-title">Applicant Identity & Contact Information</h3>
                  <p className="step-sub-desc">
                    Enter the legal name as per PAN or Aadhaar card for KYC compliance and direct payout.
                  </p>
                </div>
              </div>

              <div className="form-fields-grid two-cols">
                {/* 1. Name */}
                <div className="form-group">
                  <label className="field-label">
                    Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Name"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="field-input"
                  />
                </div>

                {/* 2. Email */}
                <div className="form-group">
                  <label className="field-label">Email <span className="req">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="field-input"
                  />
                </div>

                {/* 3. Mobile Number */}
                <div className="form-group">
                  <label className="field-label">Mobile Number <span className="req">*</span></label>
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="field-input"
                  />
                </div>

                {/* Date of Birth */}
                <div className="form-group">
                  <label className="field-label">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    className="field-input"
                  />
                </div>
              </div>

              <div className="step-nav-footer">
                <span />
                <button
                  type="button"
                  className="btn-wizard-next"
                  onClick={() => setCurrentStep(2)}
                >
                  <span>Continue to Address</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SHIPPING & ADDRESS */}
          {currentStep === 2 && (
            <div className="step-content-section">
              <div className="step-header">
                <MapPin size={20} className="step-icon" />
                <div>
                  <h3 className="step-main-title">Shipping & Communication Address</h3>
                  <p className="step-sub-desc">
                    Physical address where the welcome package and distributor product orders will be delivered.
                  </p>
                </div>
              </div>

              <div className="form-fields-grid">
                <div className="form-group full-width">
                  <label className="field-label">Address <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="Address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="field-input"
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">City / Town <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, New Delhi, Bengaluru"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="field-input"
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">State <span className="req">*</span></label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="field-select"
                  >
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi">Delhi NCR</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">Postal PIN Code <span className="req">*</span></label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="400053"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    className="field-input"
                  />
                </div>
              </div>

              <div className="step-nav-footer">
                <button
                  type="button"
                  className="btn-wizard-back"
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn-wizard-next"
                  onClick={() => setCurrentStep(3)}
                >
                  <span>Continue to Tree Placement</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BINARY TREE PLACEMENT */}
          {currentStep === 3 && (
            <div className="step-content-section">
              <div className="step-header">
                <GitBranch size={20} className="step-icon" />
                <div>
                  <h3 className="step-main-title">Binary Organization Placement</h3>
                  <p className="step-sub-desc">
                    Select which leg of your Business Center this new partner will be enrolled under.
                  </p>
                </div>
              </div>

              <div className="placement-options-grid">
                <label className={`placement-radio-card ${formData.placementLeg === 'auto' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="placementLeg"
                    value="auto"
                    checked={formData.placementLeg === 'auto'}
                    onChange={() => handleInputChange('placementLeg', 'auto')}
                  />
                  <div className="placement-card-body">
                    <div className="placement-pill recommended">Recommended</div>
                    <strong className="placement-title">Auto-Balance Placement</strong>
                    <p className="placement-desc">
                      KASHVIMLM algorithm automatically places applicant in your weaker leg to maximize
                      your binary commission payout.
                    </p>
                  </div>
                </label>

                <label className={`placement-radio-card ${formData.placementLeg === 'left' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="placementLeg"
                    value="left"
                    checked={formData.placementLeg === 'left'}
                    onChange={() => handleInputChange('placementLeg', 'left')}
                  />
                  <div className="placement-card-body">
                    <div className="placement-pill">Leg 1</div>
                    <strong className="placement-title">Left Leg (BC 002)</strong>
                    <p className="placement-desc">
                      Directly enrolls under your left team tree. Increases total Left Leg Group Volume (LGV).
                    </p>
                  </div>
                </label>

                <label className={`placement-radio-card ${formData.placementLeg === 'right' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="placementLeg"
                    value="right"
                    checked={formData.placementLeg === 'right'}
                    onChange={() => handleInputChange('placementLeg', 'right')}
                  />
                  <div className="placement-card-body">
                    <div className="placement-pill">Leg 2</div>
                    <strong className="placement-title">Right Leg (BC 003)</strong>
                    <p className="placement-desc">
                      Directly enrolls under your right team tree. Increases total Right Leg Group Volume (RGV).
                    </p>
                  </div>
                </label>
              </div>

              <div className="step-nav-footer">
                <button
                  type="button"
                  className="btn-wizard-back"
                  onClick={() => setCurrentStep(2)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn-wizard-next"
                  onClick={() => setCurrentStep(enrollType === 'distributor' ? 4 : 5)}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: STARTER KIT SELECTION (DISTRIBUTORS ONLY) */}
          {enrollType === 'distributor' && currentStep === 4 && (
            <div className="step-content-section">
              <div className="step-header">
                <Package size={20} className="step-icon" />
                <div>
                  <h3 className="step-main-title">Select Initial Business Activation Kit</h3>
                  <p className="step-sub-desc">
                    Starter packs immediately credit Commission Volume Points (BV) to both you and the new enrollee.
                  </p>
                </div>
              </div>

              <div className="kits-selection-grid">
                <label className={`kit-select-card ${formData.starterKitId === 'kit_basic' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="starterKitId"
                    value="kit_basic"
                    checked={formData.starterKitId === 'kit_basic'}
                    onChange={() => handleInputChange('starterKitId', 'kit_basic')}
                  />
                  <div className="kit-card-inner">
                    <div className="kit-badge-tag">Basic Launch</div>
                    <h4 className="kit-title">Associate Welcome Pack</h4>
                    <div className="kit-price">₹1,200</div>
                    <div className="kit-bv-pill">+50 BV Points</div>
                    <p className="kit-desc">
                      Official product guides, distributor agreement, and digital KASHVIMLM Connect license.
                    </p>
                  </div>
                </label>

                <label className={`kit-select-card popular ${formData.starterKitId === 'kit_pro' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="starterKitId"
                    value="kit_pro"
                    checked={formData.starterKitId === 'kit_pro'}
                    onChange={() => handleInputChange('starterKitId', 'kit_pro')}
                  />
                  <div className="kit-card-inner">
                    <div className="kit-badge-tag popular-tag">Most Popular</div>
                    <h4 className="kit-title">Fast-Track Pro Pack</h4>
                    <div className="kit-price">₹4,999</div>
                    <div className="kit-bv-pill text-teal">+100 BV Points</div>
                    <p className="kit-desc">
                      Includes 3 best-selling nutritional products, 3 Business Centers, and marketing collateral.
                    </p>
                  </div>
                </label>

                <label className={`kit-select-card ${formData.starterKitId === 'kit_elite' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="starterKitId"
                    value="kit_elite"
                    checked={formData.starterKitId === 'kit_elite'}
                    onChange={() => handleInputChange('starterKitId', 'kit_elite')}
                  />
                  <div className="kit-card-inner">
                    <div className="kit-badge-tag">Executive</div>
                    <h4 className="kit-title">Elite Leadership Pack</h4>
                    <div className="kit-price">₹12,999</div>
                    <div className="kit-bv-pill">+200 BV Points</div>
                    <p className="kit-desc">
                      Full cellular nutrition line, skincare samples, active shaker bottles, and personal mentoring pass.
                    </p>
                  </div>
                </label>
              </div>

              <div className="step-nav-footer">
                <button
                  type="button"
                  className="btn-wizard-back"
                  onClick={() => setCurrentStep(3)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn-wizard-next"
                  onClick={() => setCurrentStep(5)}
                >
                  <span>Continue to Bank & Password</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: BANK DEPOSIT & SECURITY */}
          {currentStep === 5 && (
            <div className="step-content-section">
              <div className="step-header">
                <Lock size={20} className="step-icon" />
                <div>
                  <h3 className="step-main-title">Direct Payout Bank Account & Login Security</h3>
                  <p className="step-sub-desc">
                    Weekly commissions are transferred directly into this account every Monday.
                  </p>
                </div>
              </div>

              <div className="form-fields-grid two-cols">
                <div className="form-group">
                  <label className="field-label">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, ICICI, SBI"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    className="field-input"
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 50100234981122"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    className="field-input"
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Bank IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0000123"
                    value={formData.ifscCode}
                    onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                    className="field-input uppercase"
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Create Initial Account Password <span className="req">*</span></label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="field-input"
                      style={{ paddingRight: '2.5rem', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.35rem'
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="field-hint">Enrollee can change this password after first login</span>
                </div>

                <div className="form-group full-width terms-row">
                  <label className="terms-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.agreeTerms}
                      onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
                      required
                    />
                    <span>
                      I certify that the applicant has agreed to the{' '}
                      <strong>KASHVIMLM Distributor Agreement</strong>, Code of Ethics, and policies
                      governing direct selling under the Consumer Protection (Direct Selling) Rules.
                    </span>
                  </label>
                </div>
              </div>

              <div className="step-nav-footer">
                <button
                  type="button"
                  className="btn-wizard-back"
                  onClick={() => setCurrentStep(enrollType === 'distributor' ? 4 : 3)}
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="btn-wizard-submit"
                >
                  <UserPlus size={18} />
                  <span>Submit & Complete Enrollment</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default EnrollmentView;
