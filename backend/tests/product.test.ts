/**
 * Test Suite: Product Catalog & Category Management
 * Tests product validation, filtering, sorting, slugification, and database-driven categories.
 */
import {
  createProductSchema,
  productQuerySchema,
  productSortEnum,
  productStatusEnum,
  updateProductSchema,
} from '../src/validators/product.validators';
import { ProductService, slugify } from '../src/services/product.service';

describe('Product Catalog & Category Suite', () => {
  describe('Slugify Utility', () => {
    it('should generate clean URL-friendly slugs', () => {
      expect(slugify('ActiveFit Compression Hosiery Pro!')).toBe('activefit-compression-hosiery-pro');
      expect(slugify('Kashvi Smart Vitality Band 4 (2026 Edition)')).toBe('kashvi-smart-vitality-band-4-2026-edition');
      expect(slugify('  Multiple   Spaces   -- And Symbols ## ')).toBe('multiple-spaces-and-symbols');
    });
  });

  describe('Product Status & Sorting Enums', () => {
    it('should support all required product statuses', () => {
      const validStatuses = ['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'INACTIVE'];
      for (const status of validStatuses) {
        expect(productStatusEnum.safeParse(status).success).toBe(true);
      }
      expect(productStatusEnum.safeParse('UNKNOWN_STATUS').success).toBe(false);
    });

    it('should support all required sort options', () => {
      const validSorts = ['featured', 'newest', 'price_low', 'price_high', 'BV'];
      for (const sort of validSorts) {
        expect(productSortEnum.safeParse(sort).success).toBe(true);
      }
      expect(productSortEnum.safeParse('random_sort').success).toBe(false);
    });
  });

  describe('Create Product Zod Validation', () => {
    it('should validate a complete product in CLOTHES_HOSIERY category', () => {
      const validProduct = {
        sku: 'CLO-COMP-001',
        name: 'ActiveFit Graduated Compression Hosiery Pro',
        slug: 'activefit-graduated-compression-hosiery-pro',
        description: 'Medical grade graduated compression hosiery.',
        categoryId: 'CLOTHES_HOSIERY',
        wholesalePrice: 29.99,
        mrp: 49.99,
        bv: 25.0,
        stock: 500,
        lowStockThreshold: 30,
        status: 'ACTIVE' as const,
        isFeatured: true,
        images: [
          'https://images.example.com/clothes1.jpg',
          {
            url: 'https://images.example.com/clothes2.jpg',
            altText: 'Side View',
            isPrimary: false,
            displayOrder: 1,
          },
        ],
      };

      const parsed = createProductSchema.safeParse(validProduct);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.sku).toBe('CLO-COMP-001');
        expect(parsed.data.wholesalePrice).toBe(29.99);
        expect(parsed.data.mrp).toBe(49.99);
        expect(parsed.data.bv).toBe(25.0);
        expect(parsed.data.stock).toBe(500);
        expect(parsed.data.isFeatured).toBe(true);
        expect(parsed.data.images.length).toBe(2);
      }
    });

    it('should validate a product in ELECTRONICS_SMART_DEVICES category', () => {
      const validDevice = {
        sku: 'ELE-BAND-001',
        name: 'Kashvi Smart Vitality Health Band 4',
        categoryId: 'ELECTRONICS_SMART_DEVICES',
        wholesalePrice: 89.99,
        mrp: 149.99,
        bv: 75.0,
        stock: 250,
        lowStockThreshold: 20,
        status: 'ACTIVE' as const,
        isFeatured: true,
      };

      const parsed = createProductSchema.safeParse(validDevice);
      expect(parsed.success).toBe(true);
    });

    it('should reject negative prices and BV', () => {
      const badPrice = createProductSchema.safeParse({
        sku: 'BAD-001',
        name: 'Negative Price Product',
        categoryId: 'CLOTHES_HOSIERY',
        wholesalePrice: -10,
        mrp: 50,
        bv: 20,
      });
      expect(badPrice.success).toBe(false);

      const badBV = createProductSchema.safeParse({
        sku: 'BAD-002',
        name: 'Negative BV Product',
        categoryId: 'CLOTHES_HOSIERY',
        wholesalePrice: 10,
        mrp: 50,
        bv: -5,
      });
      expect(badBV.success).toBe(false);
    });
  });

  describe('Product Query & Filter Validation', () => {
    it('should accept valid filter combinations', () => {
      const validQuery = {
        category: 'clothes-hosiery',
        search: 'compression',
        minPrice: 20,
        maxPrice: 100,
        minBV: 10,
        maxBV: 100,
        stock: 'in_stock' as const,
        status: 'ACTIVE' as const,
        sort: 'price_low' as const,
        page: 1,
        limit: 20,
      };

      const parsed = productQuerySchema.safeParse(validQuery);
      expect(parsed.success).toBe(true);
    });

    it('should apply defaults for page, limit, and sort', () => {
      const emptyQuery = {};
      const parsed = productQuerySchema.safeParse(emptyQuery);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.page).toBe(1);
        expect(parsed.data.limit).toBe(20);
        expect(parsed.data.sort).toBe('featured');
      }
    });
  });

  describe('ProductService API Definition', () => {
    it('should define all required service methods', () => {
      expect(ProductService.getProducts).toBeDefined();
      expect(ProductService.getProductBySlug).toBeDefined();
      expect(ProductService.createProduct).toBeDefined();
      expect(ProductService.updateProduct).toBeDefined();
      expect(ProductService.deleteProduct).toBeDefined();
      expect(ProductService.getCategories).toBeDefined();
      expect(ProductService.ensureDefaultCategories).toBeDefined();
    });
  });
});
