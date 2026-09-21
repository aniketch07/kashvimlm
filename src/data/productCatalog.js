// Import dedicated Hozri (Hosiery) & Electronics assets
import hozriTshirtImg from '../assets/home/hozri_tshirt.png';
import hozriInnerwearImg from '../assets/home/hozri_innerwear.png';
import hozriSocksImg from '../assets/home/hozri_socks.png';
import hozriHoodieImg from '../assets/home/hozri_hoodie.png';
import elecHeadphonesImg from '../assets/home/elec_headphones.png';
import elecApplianceImg from '../assets/home/elec_appliance.png';
import elecLaptopImg from '../assets/home/elec_laptop.png';
import elecPhoneImg from '../assets/home/elec_phone.png';

/**
 * Hozri (Hosiery) and Electronic Placeholder Catalog
 * All numerical data (mrp, distributorPrice, volumeBV, stock, rating, reviews) are initialized to 0
 * allowing the ID Owner to easily configure custom wholesale and retail pricing.
 */
export const HOZRI_ELECTRONIC_PLACEHOLDERS = [
  {
    id: 'KASH-HOZ-001',
    name: "Men's Combed Cotton Hosiery T-Shirt",
    category: 'Clothes & Hosiery (Hozri)',
    mrp: 0,
    distributorPrice: 0,
    volumeBV: 0,
    stock: 0,
    status: 'Pending Pricing',
    image: hozriTshirtImg,
    rating: 0,
    reviewsCount: 0,
    servingSize: 'Size: M / L / XL / XXL',
    shortDesc: 'Placeholder: 100% Super-combed breathable cotton hosiery fabric with soft ribbed collar.',
    benefits: [
      'Breathable all-day moisture wicking comfort',
      'Bio-washed anti-shrink fabric finish',
      'Zero-friction reinforced comfort seams'
    ],
    usage: 'Machine wash cold with like colors.'
  },
  {
    id: 'KASH-HOZ-002',
    name: 'Hosiery Comfort Innerwear / Vest (Pack of 2)',
    category: 'Clothes & Hosiery (Hozri)',
    mrp: 0,
    distributorPrice: 0,
    volumeBV: 0,
    stock: 0,
    status: 'Pending Pricing',
    image: hozriInnerwearImg,
    rating: 0,
    reviewsCount: 0,
    servingSize: 'Pack of 2 / Stretch Fit',
    shortDesc: 'Placeholder: Ultra-soft stretchable micro-modal hosiery innerwear with contoured contour.',
    benefits: [
      'Moisture wicking sweat barrier protection',
      'Contoured body-hugging flexible fit',
      'Tagless comfort label to prevent irritation'
    ],
    usage: 'Daily base innerwear for all seasons.'
  },
  {
    id: 'KASH-HOZ-003',
    name: 'Anti-Bacterial Bamboo Hosiery Socks (Pack of 3)',
    category: 'Clothes & Hosiery (Hozri)',
    mrp: 0,
    distributorPrice: 0,
    volumeBV: 0,
    stock: 0,
    status: 'Pending Pricing',
    image: hozriSocksImg,
    rating: 0,
    reviewsCount: 0,
    servingSize: 'Pack of 3 Pairs',
    shortDesc: 'Placeholder: Naturally anti-microbial bamboo-cotton blended hosiery socks with reinforced heel and toe.',
    benefits: [
      'Natural anti-odor shield prevents sweat bacteria',
      'Dynamic arch support compression band',
      'Soft terry sole cushioning for walking comfort'
    ],
    usage: 'Suitable for business, formal, and athletic footwear.'
  },
  {
    id: 'KASH-HOZ-004',
    name: 'Winter Fleeced Hosiery Hoodie & Sweatshirt',
    category: 'Clothes & Hosiery (Hozri)',
    mrp: 0,
    distributorPrice: 0,
    volumeBV: 0,
    stock: 0,
    status: 'Pending Pricing',
    image: hozriHoodieImg,
    rating: 0,
    reviewsCount: 0,
    servingSize: 'Unisex Fit / Full Sleeves',
    shortDesc: 'Placeholder: Heavy-weight brushed cotton fleece hosiery hoodie with front kangaroo pocket.',
    benefits: [
      'Thermal heat retention brushed inner lining',
      'Double-layered hood with adjustable drawstrings',
      'Ribbed elastane cuffs and waist hem'
    ],
    usage: 'Winter casual, morning walks, and outdoor travel.'
  },
  {
    id: 'KASH-ELE-001',
    name: 'Smart Active Wireless Noise-Cancelling Headphones',
    category: 'Electronics & Smart Devices',
    mrp: 0,
    distributorPrice: 0,
    volumeBV: 0,
    stock: 0,
    status: 'Pending Pricing',
    image: elecHeadphonesImg,
    rating: 0,
    reviewsCount: 0,
    servingSize: 'Headphones + Type-C Cable + Travel Pouch',
    shortDesc: 'Placeholder: High-fidelity active noise-cancelling Bluetooth 5.3 headphones with deep bass drivers.',
    benefits: [
      'Up to 40 hours total wireless playback battery',
      'Hybrid active noise cancellation (ANC)',
      'Dual MEMS microphones for crystal-clear calls'
    ],
    usage: 'Power on and pair via Bluetooth with phone, tablet, or PC.'
  },
  {
    id: 'KASH-ELE-002',
    name: 'Smart Multi-Cook Digital Home Appliance',
    category: 'Electronics & Smart Devices',
    mrp: 0,
    distributorPrice: 0,
    volumeBV: 0,
    stock: 0,
    status: 'Pending Pricing',
    image: elecApplianceImg,
    rating: 0,
    reviewsCount: 0,
    servingSize: '3.5L Cooking Capacity / 1200W',
    shortDesc: 'Placeholder: Energy-efficient digital kitchen appliance with one-touch presets for healthy cooking.',
    benefits: [
      'Intelligent rapid 360-degree heating technology',
      'Non-stick dishwasher-safe food grade inner pot',
      'Overheat safety automatic shutoff mechanism'
    ],
    usage: 'Connect to standard 220V AC wall socket.'
  },
  {
    id: 'KASH-ELE-003',
    name: 'Ultra-Slim Pro Productivity Laptop',
    category: 'Electronics & Smart Devices',
    mrp: 0,
    distributorPrice: 0,
    volumeBV: 0,
    stock: 0,
    status: 'Pending Pricing',
    image: elecLaptopImg,
    rating: 0,
    reviewsCount: 0,
    servingSize: '15.6 Inch Full HD IPS Screen',
    shortDesc: 'Placeholder: High-performance ultra-slim notebook engineered for MLM business tracking and daily tasks.',
    benefits: [
      'High-speed SSD storage with 16GB high-bandwidth RAM',
      'Long-life 10-hour battery for working on the move',
      'Fingerprint biometric sensor for secure instant login'
    ],
    usage: 'Charge with provided 65W fast charger.'
  },
  {
    id: 'KASH-ELE-004',
    name: 'Pro 5G Dual-SIM Smartphone & Mobile Device',
    category: 'Electronics & Smart Devices',
    mrp: 0,
    distributorPrice: 0,
    volumeBV: 0,
    stock: 0,
    status: 'Pending Pricing',
    image: elecPhoneImg,
    rating: 0,
    reviewsCount: 0,
    servingSize: '6.7 Inch AMOLED / 128GB Storage',
    shortDesc: 'Placeholder: High-speed 5G smartphone equipped with AI triple camera and 5000mAh battery.',
    benefits: [
      'Super AMOLED 120Hz smooth refresh rate display',
      '5000mAh heavy-duty battery with 33W turbo charge',
      '50MP AI triple camera for clear video and photos'
    ],
    usage: 'Insert nano SIM card and follow initial Android setup.'
  }
];

export const INITIAL_PRODUCTS = HOZRI_ELECTRONIC_PLACEHOLDERS;

export const PRODUCT_CATEGORIES = [
  'All Categories',
  'Clothes & Hosiery (Hozri)',
  'Electronics & Smart Devices'
];

/**
 * Retrieve saved catalog from localStorage.
 * Automatically sanitizes and removes legacy medical/supplement items if present,
 * ensuring only Clothes/Hosiery and Electronics are shown.
 */
export function getStoredCatalog() {
  try {
    const saved = localStorage.getItem('kashvi_catalog_products');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Purge legacy medical / nutrition items if found
        const medicalKeywords = [
          'magnecal',
          'cellsentials',
          'biomega',
          'proflavanol',
          'procosa',
          'nutrimeal',
          'celavive',
          'cellular nutrition',
          'active nutrition',
          'skincare & personal care',
          'nutritional essentials',
          'business starter kits'
        ];
        const hasLegacyMedical = parsed.some((p) =>
          medicalKeywords.some(
            (kw) =>
              (p.name && p.name.toLowerCase().includes(kw)) ||
              (p.category && p.category.toLowerCase().includes(kw))
          )
        );

        if (hasLegacyMedical) {
          saveStoredCatalog(HOZRI_ELECTRONIC_PLACEHOLDERS);
          return HOZRI_ELECTRONIC_PLACEHOLDERS;
        }

        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed reading catalog from localStorage:', err);
  }
  return INITIAL_PRODUCTS;
}

/**
 * Save catalog to localStorage and notify all listening components.
 */
export function saveStoredCatalog(catalog) {
  try {
    localStorage.setItem('kashvi_catalog_products', JSON.stringify(catalog));
    window.dispatchEvent(new Event('kashvi_catalog_update'));
  } catch (err) {
    console.error('Failed saving catalog to localStorage:', err);
  }
}

/**
 * Reset catalog to the Hozri & Electronics placeholders with all data set to 0.
 */
export function resetToHozriElectronicsZero() {
  saveStoredCatalog(HOZRI_ELECTRONIC_PLACEHOLDERS);
  return HOZRI_ELECTRONIC_PLACEHOLDERS;
}

/**
 * Wipe all products, making catalog count, BV, and inventory 0.
 */
export function clearAllProductsToZero() {
  saveStoredCatalog([]);
  return [];
}
