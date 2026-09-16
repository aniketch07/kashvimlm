import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowRight,
  Leaf,
  Share2,
  Gem,
  Users,
  UserCheck,
  Globe,
  Package,
  Quote,
  TrendingUp,
  ShoppingCart,
  Check,
  Heart,
  Sparkles,
  Home as HomeIcon,
  Award,
  Play,
  Star,
  X,
} from 'lucide-react';

import './Home.css';

// Cropped high-resolution assets from ChatGPT Image Sep 16
import heroProductsImg from '../assets/home/hero_products.png';
import prodAloeImg from '../assets/home/prod_aloe.png';
import prodShakeImg from '../assets/home/prod_shake.png';
import prodImmunityImg from '../assets/home/prod_immunity.png';
import prodTeaImg from '../assets/home/prod_tea.png';
import prodSkincareImg from '../assets/home/prod_skincare.png';
import testimonialPriyaImg from '../assets/home/testimonial_priya.png';
import togetherWeRiseImg from '../assets/home/together_we_rise.png';

/**
 * Modern, high-converting Home page for KASHVIMLM
 * matching every single section, badge, and color from ChatGPT Image Sep 16.
 */
function Home() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [addedItems, setAddedItems] = useState({});
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [activeTreeNode, setActiveTreeNode] = useState('YOU');

  // Handle Add to Cart feedback
  const handleAddToCart = (id) => {
    setAddedItems((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Products from image
  const products = [
    {
      id: 'aloe-vera-gel',
      name: 'Aloe Vera Gel',
      tagline: 'Pure. Natural. Refreshing.',
      price: 699,
      originalPrice: 899,
      discount: '22% OFF',
      image: prodAloeImg,
    },
    {
      id: 'nutrition-shake',
      name: 'Nutrition Shake',
      tagline: 'Complete Daily Nutrition',
      price: 1299,
      originalPrice: 1699,
      discount: '24% OFF',
      image: prodShakeImg,
    },
    {
      id: 'immunity-plus',
      name: 'Immunity Plus',
      tagline: 'Stronger You Every Day',
      price: 799,
      originalPrice: 999,
      discount: '20% OFF',
      image: prodImmunityImg,
    },
    {
      id: 'herbal-tea',
      name: 'Herbal Tea',
      tagline: 'Wellness in Every Sip',
      price: 499,
      originalPrice: 699,
      discount: '29% OFF',
      image: prodTeaImg,
    },
    {
      id: 'skin-care-kit',
      name: 'Skin Care Kit',
      tagline: 'Natural Care, Radiant You',
      price: 1499,
      originalPrice: 1899,
      discount: '21% OFF',
      image: prodSkincareImg,
    },
  ];

  // Category strip items
  const categories = [
    {
      title: 'Health & Wellness',
      desc: 'Live Better',
      icon: <Heart size={20} className="cat-icon-svg text-cyan" />,
    },
    {
      title: 'Personal Care',
      desc: 'Look Good',
      icon: <Sparkles size={20} className="cat-icon-svg text-green" />,
    },
    {
      title: 'Home Care',
      desc: 'Cleaner Homes',
      icon: <HomeIcon size={20} className="cat-icon-svg text-purple" />,
    },
    {
      title: 'Nutrition',
      desc: 'Stronger Lives',
      icon: <Package size={20} className="cat-icon-svg text-blue" />,
    },
    {
      title: 'Opportunity',
      desc: 'Brighter Futures',
      icon: <Award size={20} className="cat-icon-svg text-magenta" />,
    },
  ];

  return (
    <div className="home-container">
      {/* =========================================================================
          1. HERO SECTION
          ========================================================================= */}
      <section className="home-hero-section" aria-label="Hero Introduction">
        <div className="home-hero-grid">
          {/* Left Column: Typography & CTAs */}
          <div className="home-hero-content">
            <div className="home-hero-tagline">
              <span>A HEALTHIER YOU</span>
              <span className="dot-sep">&bull;</span>
              <span>A BRIGHTER TOMORROW</span>
            </div>

            <h1 className="home-hero-title">
              Build Your Network.
              <br />
              <span className="hero-gradient-text">Grow Your Future.</span>
            </h1>

            <div className="home-hero-subtitle-block">
              <p className="home-hero-sub-bold">
                Premium Products. Real Opportunities. A Better Life.
              </p>
              <p className="home-hero-sub-desc">
                Join a community that believes in health, wealth and happiness for everyone.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="home-hero-actions">
              <button
                type="button"
                className="hero-btn-join"
                onClick={() => setIsJoinModalOpen(true)}
              >
                <span>Join Now</span>
                <ChevronRight size={18} />
              </button>

              <Link to="/shop" className="hero-btn-explore">
                <span>Explore Products</span>
              </Link>
            </div>

            {/* Value Props */}
            <div className="home-hero-badges">
              <div className="hero-badge-item">
                <div className="hero-badge-icon-wrap bg-green-glow">
                  <Leaf size={18} className="text-green" />
                </div>
                <span className="hero-badge-text">High Quality Products</span>
              </div>

              <div className="hero-badge-item">
                <div className="hero-badge-icon-wrap bg-cyan-glow">
                  <Share2 size={18} className="text-cyan" />
                </div>
                <span className="hero-badge-text">Global Opportunity</span>
              </div>

              <div className="hero-badge-item">
                <div className="hero-badge-icon-wrap bg-blue-glow">
                  <Gem size={18} className="text-blue" />
                </div>
                <span className="hero-badge-text">Financial Freedom</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Product Showcase */}
          <div className="home-hero-visual">
            <div className="hero-visual-card">
              <img
                src={heroProductsImg}
                alt="Nature's Goodness immunity support, Aloe Vera Gel, and mountainous sunrise"
                className="hero-visual-img"
              />
              <div className="hero-floating-badge">
                <div className="hero-floating-badge-top">
                  <span>PEOPLE</span>
                  <span>PRODUCTS</span>
                  <span>PROSPERITY</span>
                </div>
                <div className="hero-floating-divider" />
                <div className="hero-floating-badge-bottom">
                  <span>Healthier Living</span>
                  <span>Greater Earnings</span>
                  <span>Stronger Together</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. METRICS & STATS BAR
          ========================================================================= */}
      <section className="home-stats-section" aria-label="Company Statistics">
        <div className="home-stats-grid">
          {/* Stat 1 */}
          <div className="stat-card">
            <div className="stat-card-icon-wrap bg-blue-soft">
              <Users size={22} className="text-blue" />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-number">25,000+</span>
              <span className="stat-card-label">Happy Customers</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="stat-card">
            <div className="stat-card-icon-wrap bg-purple-soft">
              <UserCheck size={22} className="text-purple" />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-number">5,000+</span>
              <span className="stat-card-label">Active Members</span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="stat-card">
            <div className="stat-card-icon-wrap bg-teal-soft">
              <Globe size={22} className="text-cyan" />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-number">15+</span>
              <span className="stat-card-label">Countries</span>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="stat-card">
            <div className="stat-card-icon-wrap bg-cyan-soft">
              <Package size={22} className="text-cyan" />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-number">100+</span>
              <span className="stat-card-label">Premium Products</span>
            </div>
          </div>

          {/* Quote Card */}
          <div className="stat-card quote-stat-card">
            <Quote size={26} className="quote-stat-icon" />
            <p className="quote-stat-text">Success is Sweeter When Shared!</p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. NETWORK TREE SECTION ("Your Network Your Strength")
          ========================================================================= */}
      <section className="home-network-section" aria-label="Network Growth Structure">
        <div className="home-network-grid">
          {/* Left: Heading & Intro */}
          <div className="home-network-intro">
            <h2 className="home-network-title">
              Your <span className="text-cyan">Network</span>
              <br />
              Your <span className="hero-gradient-text">Strength</span>
            </h2>
            <p className="home-network-desc">
              A simple opportunity, a powerful network. Grow together. Earn together.
            </p>
            <button
              type="button"
              className="network-btn-works"
              onClick={() => setIsHowItWorksOpen(true)}
            >
              <span>Learn How It Works</span>
            </button>
          </div>

          {/* Center: Visual MLM Network Tree Diagram */}
          <div className="home-network-tree-wrap">
            <div className="network-tree-container">
              {/* Level 1: YOU */}
              <div
                className={`tree-node tree-root ${activeTreeNode === 'YOU' ? 'node-active' : ''}`}
                onClick={() => setActiveTreeNode('YOU')}
                title="Root Distributor (YOU)"
              >
                <div className="tree-node-icon bg-cyan-ring">
                  <Users size={16} />
                </div>
                <span className="tree-node-label">YOU</span>
              </div>

              {/* Connecting Branch Line */}
              <div className="tree-branch-lines">
                <div className="branch-line-vertical-top" />
                <div className="branch-line-horizontal" />
                <div className="branch-line-vertical-left" />
                <div className="branch-line-vertical-right" />
              </div>

              {/* Level 2: Member A and Member B */}
              <div className="tree-level-row">
                {/* Left Branch: Member A */}
                <div className="tree-branch-group">
                  <div
                    className={`tree-node ${activeTreeNode === 'Member A' ? 'node-active' : ''}`}
                    onClick={() => setActiveTreeNode('Member A')}
                  >
                    <div className="tree-node-icon bg-green-ring">
                      <UserCheck size={14} />
                    </div>
                    <span className="tree-node-label">Member A</span>
                  </div>

                  <div className="sub-branch-connector" />

                  {/* Level 3: A1 & A2 */}
                  <div className="tree-sub-nodes">
                    <div
                      className={`tree-sub-node ${activeTreeNode === 'A1' ? 'node-active' : ''}`}
                      onClick={() => setActiveTreeNode('A1')}
                    >
                      <div className="tree-mini-icon">A1</div>
                    </div>
                    <div
                      className={`tree-sub-node ${activeTreeNode === 'A2' ? 'node-active' : ''}`}
                      onClick={() => setActiveTreeNode('A2')}
                    >
                      <div className="tree-mini-icon">A2</div>
                    </div>
                  </div>
                </div>

                {/* Right Branch: Member B */}
                <div className="tree-branch-group">
                  <div
                    className={`tree-node ${activeTreeNode === 'Member B' ? 'node-active' : ''}`}
                    onClick={() => setActiveTreeNode('Member B')}
                  >
                    <div className="tree-node-icon bg-purple-ring">
                      <UserCheck size={14} />
                    </div>
                    <span className="tree-node-label">Member B</span>
                  </div>

                  <div className="sub-branch-connector" />

                  {/* Level 3: B1 & B2 */}
                  <div className="tree-sub-nodes">
                    <div
                      className={`tree-sub-node ${activeTreeNode === 'B1' ? 'node-active' : ''}`}
                      onClick={() => setActiveTreeNode('B1')}
                    >
                      <div className="tree-mini-icon">B1</div>
                    </div>
                    <div
                      className={`tree-sub-node ${activeTreeNode === 'B2' ? 'node-active' : ''}`}
                      onClick={() => setActiveTreeNode('B2')}
                    >
                      <div className="tree-mini-icon">B2</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Small Steps Big Dreams Card */}
          <div className="home-network-card">
            <div className="dreams-card-icon-wrap">
              <TrendingUp size={28} className="text-cyan" />
            </div>
            <h3 className="dreams-card-title">
              Small Steps <span className="text-cyan">Big Dreams</span>
            </h3>
            <p className="dreams-card-desc">
              Help Others. Create Leaders. Build Generational Wealth.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. OUR BEST SELLING PRODUCTS
          ========================================================================= */}
      <section className="home-products-section" aria-label="Best Selling Formulations">
        <div className="products-section-header">
          <div>
            <h2 className="products-section-title">
              Our <span className="hero-gradient-text">Best Selling</span> Products
            </h2>
            <p className="products-section-desc">
              Trusted by thousands. Loved for a better tomorrow.
            </p>
          </div>
          <Link to="/shop" className="products-view-all-btn">
            <span>View All Products</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="products-grid">
          {products.map((item) => (
            <div key={item.id} className="product-card">
              <div className="product-img-wrapper">
                <img
                  src={item.image}
                  alt={item.name}
                  className="product-card-img"
                  loading="lazy"
                />
              </div>

              <div className="product-card-body">
                <h3 className="product-card-name">{item.name}</h3>
                <p className="product-card-tagline">{item.tagline}</p>

                <div className="product-card-footer">
                  <div className="product-price-block">
                    <span className="product-price-current">₹{item.price.toLocaleString('en-IN')}</span>
                    <span className="product-price-original">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                    <span className="product-discount-pill">{item.discount}</span>
                  </div>

                  <button
                    type="button"
                    className={`product-cart-btn ${addedItems[item.id] ? 'btn-added' : ''}`}
                    onClick={() => handleAddToCart(item.id, item.name)}
                    aria-label={`Add ${item.name} to cart`}
                    title={`Add ${item.name} to cart`}
                  >
                    {addedItems[item.id] ? (
                      <Check size={16} className="check-anim" />
                    ) : (
                      <ShoppingCart size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. CATEGORY STRIP / FLOATING PILL BAR
          ========================================================================= */}
      <section className="home-category-strip-section" aria-label="Product Categories">
        <div className="category-strip-container">
          {categories.map((cat, idx) => (
            <div
              key={cat.title}
              className={`category-strip-item ${activeCategory === idx ? 'cat-active' : ''}`}
              onClick={() => setActiveCategory(idx)}
              role="button"
              tabIndex={0}
            >
              <div className="category-item-icon-circle">{cat.icon}</div>
              <div className="category-item-text">
                <span className="category-item-title">{cat.title}</span>
                <span className="category-item-desc">{cat.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. REAL PEOPLE REAL SUCCESS & TESTIMONIAL ("Together We Rise")
          ========================================================================= */}
      <section className="home-community-section" aria-label="Testimonials and Success Stories">
        <div className="community-grid">
          {/* Left: Testimonial Card */}
          <div className="testimonial-card">
            <div className="testimonial-header">
              <img
                src={testimonialPriyaImg}
                alt="Priya Sharma"
                className="testimonial-avatar"
              />
              <div className="testimonial-content">
                <p className="testimonial-quote">
                  &ldquo;This opportunity changed my life. Amazing products and a supportive community!&rdquo;
                </p>
                <div className="testimonial-stars" aria-label="5 out of 5 stars rating">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} className="star-filled" />
                  ))}
                </div>
                <div className="testimonial-author">
                  <span className="author-name">Priya Sharma</span>
                  <span className="author-rank">Gold Leader</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Together We Rise Banner Card */}
          <div className="together-rise-card">
            <div className="together-rise-bg-wrap">
              <img
                src={togetherWeRiseImg}
                alt="Team climbing together to mountain summit with Together We Rise script"
                className="together-rise-img"
              />
            </div>

            <div className="together-rise-content">
              <h3 className="together-rise-title">Real People Real Success</h3>
              <p className="together-rise-desc">
                Every success story begins with a single step.
              </p>
              <button
                type="button"
                className="watch-stories-btn"
                onClick={() => setIsStoryModalOpen(true)}
              >
                <Play size={14} className="play-icon-fill" />
                <span>Watch Success Stories</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. READY TO CREATE A BETTER TOMORROW? (CTA Banner)
          ========================================================================= */}
      <section className="home-cta-banner-section" aria-label="Call to Action">
        <div className="home-cta-banner">
          <div className="cta-banner-content">
            <h2 className="cta-banner-title">Ready to Create a Better Tomorrow?</h2>
            <p className="cta-banner-sub">
              Join now and be part of a growing family that believes in people, products and prosperity.
            </p>
          </div>
          <button
            type="button"
            className="cta-banner-btn"
            onClick={() => setIsJoinModalOpen(true)}
          >
            <span>Join Now</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          MODALS: Join Now, Watch Success Stories, Learn How It Works
          ========================================================================= */}
      {isJoinModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsJoinModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsJoinModalOpen(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <h3 className="modal-title">Join KASHVIMLM Community</h3>
            <p className="modal-desc">
              Unlock pharmaceutical-grade wellness formulas, 30% wholesale discounts, and direct distributor earnings.
            </p>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert('Thank you! Your distributor onboarding kit link has been sent to your email.');
                setIsJoinModalOpen(false);
              }}
            >
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="e.g. Kashvi Sharma" required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" placeholder="+91 98765 43210" required />
              </div>
              <div className="form-group">
                <label>Sponsor / Referral ID (Optional)</label>
                <input type="text" placeholder="e.g. KV-2026-GOLD" defaultValue="KV-2026-GOLD" />
              </div>
              <button type="submit" className="modal-submit-btn">
                <span>Complete Free Registration</span>
                <ChevronRight size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {isStoryModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsStoryModalOpen(false)}>
          <div className="modal-card modal-story-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsStoryModalOpen(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <div className="story-video-preview">
              <img src={togetherWeRiseImg} alt="Story video preview" className="story-preview-bg" />
              <div className="story-play-pill">
                <Play size={24} className="play-icon-fill" />
              </div>
            </div>
            <h3 className="modal-title">Priya Sharma &bull; Journey to Gold Leader</h3>
            <p className="modal-desc">
              &ldquo;Starting with just two customer orders for Aloe Vera Gel, within six months our team empowered over 40 families across India with health, nutrition, and financial independence.&rdquo;
            </p>
            <button
              type="button"
              className="modal-submit-btn"
              onClick={() => {
                setIsStoryModalOpen(false);
                setIsJoinModalOpen(true);
              }}
            >
              <span>Join Priya's Winning Team</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {isHowItWorksOpen && (
        <div className="modal-backdrop" onClick={() => setIsHowItWorksOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsHowItWorksOpen(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <h3 className="modal-title">How The Network Tree Works</h3>
            <p className="modal-desc">
              KASHVIMLM combines ethical direct distribution with cellular wellness formulations.
            </p>
            <div className="tree-steps-list">
              <div className="tree-step-row">
                <span className="step-num">1</span>
                <div>
                  <strong>Activate Your Account</strong>
                  <p>Register for free and test our clinically certified botanicals at distributor prices.</p>
                </div>
              </div>
              <div className="tree-step-row">
                <span className="step-num">2</span>
                <div>
                  <strong>Share &amp; Enroll Member A and Member B</strong>
                  <p>Build your dual front-line channels to unlock 20% to 30% direct retail margins.</p>
                </div>
              </div>
              <div className="tree-step-row">
                <span className="step-num">3</span>
                <div>
                  <strong>Empower Downline Replication (A1, A2, B1, B2)</strong>
                  <p>Earn cascading leadership royalties and annual global rally incentives.</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="modal-submit-btn"
              onClick={() => {
                setIsHowItWorksOpen(false);
                setIsJoinModalOpen(true);
              }}
            >
              <span>Get Started Now</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
