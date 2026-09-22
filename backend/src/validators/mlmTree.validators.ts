import { z } from 'zod';

export const placementPositionEnum = z.enum(['LEFT', 'RIGHT']);

export const placeDistributorSchema = z.object({
  distributorId: z.string().uuid('distributorId must be a valid UUID'),
  businessCenterId: z.string().uuid('businessCenterId must be a valid UUID'),
  sponsorId: z.string().uuid('sponsorId must be a valid UUID'),
  placementParentId: z.string().uuid('placementParentId must be a valid UUID'),
  placementPosition: placementPositionEnum,
});

export const getTreeQuerySchema = z.object({
  depth: z.coerce.number().int().min(1).max(10).default(3),
});

export const nextSlotQuerySchema = z.object({
  preferredLeg: z.enum(['LEFT', 'RIGHT', 'BALANCED']).default('BALANCED'),
});

export type PlaceDistributorInput = z.infer<typeof placeDistributorSchema>;
export type GetTreeQueryInput = z.infer<typeof getTreeQuerySchema>;
export type NextSlotQueryInput = z.infer<typeof nextSlotQuerySchema>;
