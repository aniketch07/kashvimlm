import { query } from '../../config/db.js';
import { logger } from '../../config/logger.js';

export interface PlacementValidationResult {
  isValid: boolean;
  message?: string;
  parentId?: string;
  position?: 'LEFT' | 'RIGHT';
  level?: number;
  treePath?: string;
}

export interface AvailablePositionsResult {
  leftAvailable: boolean;
  rightAvailable: boolean;
  availablePositions: ('LEFT' | 'RIGHT')[];
}

export class BinaryTreePlacementService {
  // In-memory mutex locks for atomic slot protection against race conditions: `${parentId}_${position}`
  private static slotLocks: Set<string> = new Set();

  /**
   * Acquire mutex lock for a specific slot to ensure concurrency safety.
   */
  public static acquireSlotLock(parentId: string, position: 'LEFT' | 'RIGHT'): boolean {
    const key = `${parentId.toUpperCase()}_${position.toUpperCase()}`;
    if (this.slotLocks.has(key)) {
      return false;
    }
    this.slotLocks.add(key);
    return true;
  }

  /**
   * Release mutex lock for a slot.
   */
  public static releaseSlotLock(parentId: string, position: 'LEFT' | 'RIGHT'): void {
    const key = `${parentId.toUpperCase()}_${position.toUpperCase()}`;
    this.slotLocks.delete(key);
  }

  /**
   * Get available positions under a parent distributor.
   */
  public static async getAvailablePositions(parentMemberId: string): Promise<AvailablePositionsResult> {
    const cleanParent = parentMemberId.trim();

    try {
      const res = await query(
        `SELECT t.leg_position
         FROM mlm_tree t
         JOIN distributors p ON p.id = t.parent_distributor_id
         WHERE p.member_id = $1`,
        [cleanParent]
      );

      const occupied = new Set(res.rows.map((r: any) => (r.leg_position || '').toUpperCase()));
      const leftAvailable = !occupied.has('LEFT');
      const rightAvailable = !occupied.has('RIGHT');
      const availablePositions: ('LEFT' | 'RIGHT')[] = [];
      if (leftAvailable) availablePositions.push('LEFT');
      if (rightAvailable) availablePositions.push('RIGHT');

      return { leftAvailable, rightAvailable, availablePositions };
    } catch {
      // Fallback
      return {
        leftAvailable: true,
        rightAvailable: true,
        availablePositions: ['LEFT', 'RIGHT'],
      };
    }
  }

  /**
   * Breadth-First Search (BFS) / Level-order traversal down the binary tree starting from sponsor.
   * Finds the first available slot according to the configured placement strategy:
   * - 'LEFT': prioritizes searching down the left leg first
   * - 'RIGHT': prioritizes searching down the right leg first
   * - 'AUTO': standard balanced level-order search (breadth-first)
   */
  public static async findAvailableParent(
    sponsorMemberId: string,
    preferredLeg: 'LEFT' | 'RIGHT' | 'AUTO' = 'AUTO'
  ): Promise<{ parentId: string; position: 'LEFT' | 'RIGHT'; level: number; treePath: string }> {
    const cleanSponsor = sponsorMemberId.trim();

    try {
      // Fetch sponsor node
      const sponsorRes = await query(
        `SELECT d.id, d.member_id, t.depth, t.tree_path
         FROM distributors d
         LEFT JOIN mlm_tree t ON t.distributor_id = d.id
         WHERE d.member_id = $1`,
        [cleanSponsor]
      );

      if (sponsorRes.rows.length === 0) {
        throw new Error(`Sponsor distributor ${cleanSponsor} not found.`);
      }

      const sponsorRow = sponsorRes.rows[0];
      const sponsorDepth = sponsorRow.depth || 0;
      const sponsorPath = sponsorRow.tree_path || `/${cleanSponsor}`;

      // Check sponsor's own direct children
      const directSlots = await this.getAvailablePositions(cleanSponsor);
      if (preferredLeg === 'LEFT' && directSlots.leftAvailable) {
        return {
          parentId: cleanSponsor,
          position: 'LEFT',
          level: sponsorDepth + 1,
          treePath: `${sponsorPath}/${cleanSponsor}`,
        };
      }
      if (preferredLeg === 'RIGHT' && directSlots.rightAvailable) {
        return {
          parentId: cleanSponsor,
          position: 'RIGHT',
          level: sponsorDepth + 1,
          treePath: `${sponsorPath}/${cleanSponsor}`,
        };
      }
      if (directSlots.leftAvailable) {
        return {
          parentId: cleanSponsor,
          position: 'LEFT',
          level: sponsorDepth + 1,
          treePath: `${sponsorPath}/${cleanSponsor}`,
        };
      }
      if (directSlots.rightAvailable) {
        return {
          parentId: cleanSponsor,
          position: 'RIGHT',
          level: sponsorDepth + 1,
          treePath: `${sponsorPath}/${cleanSponsor}`,
        };
      }

      // Both direct positions are occupied -> Breadth-First Search down downline
      const queue: { memberId: string; depth: number; treePath: string }[] = [
        { memberId: cleanSponsor, depth: sponsorDepth, treePath: sponsorPath },
      ];
      const visited = new Set<string>([cleanSponsor]);

      while (queue.length > 0) {
        const current = queue.shift()!;

        // Fetch children of current node
        const childrenRes = await query(
          `SELECT d.member_id, t.leg_position, t.depth, t.tree_path
           FROM mlm_tree t
           JOIN distributors p ON p.id = t.parent_distributor_id
           JOIN distributors d ON d.id = t.distributor_id
           WHERE p.member_id = $1
           ORDER BY CASE WHEN UPPER(t.leg_position) = 'LEFT' THEN 1 ELSE 2 END`,
          [current.memberId]
        );

        let leftChild: any = null;
        let rightChild: any = null;
        for (const child of childrenRes.rows) {
          const leg = (child.leg_position || '').toUpperCase();
          if (leg === 'LEFT') leftChild = child;
          if (leg === 'RIGHT') rightChild = child;
        }

        // Check if current has open slot
        if (!leftChild) {
          return {
            parentId: current.memberId,
            position: 'LEFT',
            level: current.depth + 1,
            treePath: `${current.treePath}/${current.memberId}`,
          };
        }
        if (!rightChild) {
          return {
            parentId: current.memberId,
            position: 'RIGHT',
            level: current.depth + 1,
            treePath: `${current.treePath}/${current.memberId}`,
          };
        }

        // Add children to queue for deeper search
        if (preferredLeg === 'RIGHT') {
          if (rightChild && !visited.has(rightChild.member_id)) {
            visited.add(rightChild.member_id);
            queue.push({
              memberId: rightChild.member_id,
              depth: rightChild.depth || current.depth + 1,
              treePath: rightChild.tree_path || `${current.treePath}/${rightChild.member_id}`,
            });
          }
          if (leftChild && !visited.has(leftChild.member_id)) {
            visited.add(leftChild.member_id);
            queue.push({
              memberId: leftChild.member_id,
              depth: leftChild.depth || current.depth + 1,
              treePath: leftChild.tree_path || `${current.treePath}/${leftChild.member_id}`,
            });
          }
        } else {
          // Default or LEFT: left first then right
          if (leftChild && !visited.has(leftChild.member_id)) {
            visited.add(leftChild.member_id);
            queue.push({
              memberId: leftChild.member_id,
              depth: leftChild.depth || current.depth + 1,
              treePath: leftChild.tree_path || `${current.treePath}/${leftChild.member_id}`,
            });
          }
          if (rightChild && !visited.has(rightChild.member_id)) {
            visited.add(rightChild.member_id);
            queue.push({
              memberId: rightChild.member_id,
              depth: rightChild.depth || current.depth + 1,
              treePath: rightChild.tree_path || `${current.treePath}/${rightChild.member_id}`,
            });
          }
        }
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, '[BinaryTreePlacementService] Database BFS failed, using fallback.');
    }

    // High availability fallback placement
    return {
      parentId: cleanSponsor,
      position: preferredLeg === 'RIGHT' ? 'RIGHT' : 'LEFT',
      level: 1,
      treePath: `/${cleanSponsor}`,
    };
  }

  /**
   * Validate placement position and rules prior to insertion.
   */
  public static async validatePlacement(params: {
    sponsorId?: string;
    parentId?: string;
    position?: 'LEFT' | 'RIGHT' | 'AUTO';
    memberId?: string;
    isRoot?: boolean;
  }): Promise<PlacementValidationResult> {
    const { sponsorId, parentId, position = 'AUTO', memberId, isRoot = false } = params;

    if (isRoot) {
      // Check if root already exists
      try {
        const rootCheck = await query(
          `SELECT d.member_id FROM mlm_tree t
           JOIN distributors d ON d.id = t.distributor_id
           WHERE t.parent_distributor_id IS NULL OR UPPER(t.leg_position) = 'ROOT'`
        );
        if (rootCheck.rows.length > 0) {
          return {
            isValid: false,
            message: `Root distributor already exists (${rootCheck.rows[0].member_id}). Multiple roots are not permitted.`,
          };
        }
      } catch {
        // offline
      }
      return { isValid: true, level: 0, treePath: `/${memberId || 'ROOT'}` };
    }

    if (!sponsorId || !sponsorId.trim()) {
      return { isValid: false, message: 'Sponsor ID is required.' };
    }

    const cleanSponsor = sponsorId.trim();
    const cleanMember = (memberId || '').trim();

    // Check self-sponsorship
    if (cleanMember && cleanSponsor.toUpperCase() === cleanMember.toUpperCase()) {
      return { isValid: false, message: 'Self-sponsorship is not permitted.' };
    }

    // If specific parent and position requested
    if (parentId && parentId.trim()) {
      const cleanParent = parentId.trim();

      if (cleanMember && cleanParent.toUpperCase() === cleanMember.toUpperCase()) {
        return { isValid: false, message: 'A distributor cannot be placed under themselves.' };
      }

      // Check circular placement (ancestor under descendant)
      try {
        const parentCheck = await query(
          `SELECT t.tree_path, t.depth FROM distributors d
           LEFT JOIN mlm_tree t ON t.distributor_id = d.id
           WHERE d.member_id = $1`,
          [cleanParent]
        );

        if (parentCheck.rows.length === 0) {
          return { isValid: false, message: `Parent distributor ${cleanParent} not found.` };
        }

        const parentRow = parentCheck.rows[0];
        const treePath = parentRow.tree_path || `/${cleanParent}`;

        if (cleanMember && (treePath.includes(`/${cleanMember}/`) || treePath.endsWith(`/${cleanMember}`))) {
          return {
            isValid: false,
            message: 'Circular placement detected: Cannot place an ancestor under a descendant.',
          };
        }

        // Check availability on specified parent
        const slots = await this.getAvailablePositions(cleanParent);

        const posUpper = position.toUpperCase() as 'LEFT' | 'RIGHT' | 'AUTO';

        if (posUpper === 'LEFT' && !slots.leftAvailable) {
          if (!slots.rightAvailable) {
            return {
              isValid: false,
              message: 'Both LEFT and RIGHT positions are already occupied for this parent.',
            };
          }
          return {
            isValid: false,
            message: `Left position under parent ${cleanParent} is already occupied.`,
          };
        }

        if (posUpper === 'RIGHT' && !slots.rightAvailable) {
          if (!slots.leftAvailable) {
            return {
              isValid: false,
              message: 'Both LEFT and RIGHT positions are already occupied for this parent.',
            };
          }
          return {
            isValid: false,
            message: `Right position under parent ${cleanParent} is already occupied.`,
          };
        }

        if (posUpper === 'AUTO') {
          if (!slots.leftAvailable && !slots.rightAvailable) {
            return {
              isValid: false,
              message: 'Both LEFT and RIGHT positions are already occupied for this parent.',
            };
          }
          const chosenPos = slots.leftAvailable ? 'LEFT' : 'RIGHT';
          return {
            isValid: true,
            parentId: cleanParent,
            position: chosenPos,
            level: (parentRow.depth || 0) + 1,
            treePath: `${treePath}/${cleanMember || 'NEW'}`,
          };
        }

        return {
          isValid: true,
          parentId: cleanParent,
          position: posUpper as 'LEFT' | 'RIGHT',
          level: (parentRow.depth || 0) + 1,
          treePath: `${treePath}/${cleanMember || 'NEW'}`,
        };
      } catch (err: any) {
        if (err.message && (err.message.includes('occupied') || err.message.includes('Circular'))) {
          return { isValid: false, message: err.message };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Determine exact placement position for a new distributor according to rules:
   * 1. If root: Level 0, no parent.
   * 2. If parentId specified: Validate availability or reject if occupied.
   * 3. If parentId not specified: Automatically find next open spot in sponsor's downline via BFS.
   */
  public static async findPlacementPosition(params: {
    sponsorId: string;
    requestedPosition?: 'LEFT' | 'RIGHT' | 'AUTO';
    requestedParentId?: string;
    memberId?: string;
    isRoot?: boolean;
  }): Promise<{
    parentId: string | null;
    position: 'ROOT' | 'LEFT' | 'RIGHT';
    level: number;
    treePath: string;
  }> {
    const { sponsorId, requestedPosition = 'AUTO', requestedParentId, memberId, isRoot = false } = params;

    if (isRoot) {
      const rootVal = await this.validatePlacement({ isRoot: true, memberId });
      if (!rootVal.isValid) {
        throw new Error(rootVal.message || 'Cannot create root distributor.');
      }
      return {
        parentId: null,
        position: 'ROOT',
        level: 0,
        treePath: `/${memberId || 'ROOT'}`,
      };
    }

    // Specific parent requested
    if (requestedParentId && requestedParentId.trim()) {
      const validation = await this.validatePlacement({
        sponsorId,
        parentId: requestedParentId.trim(),
        position: requestedPosition,
        memberId,
      });

      if (!validation.isValid) {
        throw new Error(validation.message || 'Requested placement position is invalid or occupied.');
      }

      return {
        parentId: validation.parentId!,
        position: validation.position!,
        level: validation.level || 1,
        treePath: validation.treePath || `/${requestedParentId}/${memberId || 'NEW'}`,
      };
    }

    // Automatic placement under sponsor via Breadth-First Search
    const autoPlacement = await this.findAvailableParent(sponsorId, requestedPosition);
    return {
      parentId: autoPlacement.parentId,
      position: autoPlacement.position,
      level: autoPlacement.level,
      treePath: `${autoPlacement.treePath}/${memberId || 'NEW'}`,
    };
  }

  /**
   * Physically place a distributor node into the mlm_tree table and update parent counts.
   * Can run within a database transaction client.
   */
  public static async placeDistributor(params: {
    distributorUuid: string;
    memberId: string;
    parentMemberId: string | null;
    position: 'ROOT' | 'LEFT' | 'RIGHT';
    level: number;
    treePath: string;
    businessCenterCode?: string;
    client?: any;
  }): Promise<{ treeNodeId: string; position: string; level: number; treePath: string }> {
    const {
      distributorUuid,
      memberId,
      parentMemberId,
      position,
      level,
      treePath,
      businessCenterCode = 'BC 001',
      client,
    } = params;

    const queryRunner = client
      ? (sql: string, args: any[]) => client.query(sql, args)
      : (sql: string, args: any[]) => query(sql, args);

    let parentUuid: string | null = null;
    if (parentMemberId && position !== 'ROOT') {
      const parentRes = await queryRunner(
        `SELECT id FROM distributors WHERE member_id = $1`,
        [parentMemberId.trim()]
      );
      if (parentRes.rows.length > 0) {
        parentUuid = parentRes.rows[0].id;
      }
    }

    const insertRes = await queryRunner(
      `INSERT INTO mlm_tree (
        distributor_id, parent_distributor_id, leg_position, depth, tree_path, business_center_code
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, distributor_id, parent_distributor_id, leg_position, depth, tree_path`,
      [distributorUuid, parentUuid, position, level, treePath, businessCenterCode]
    );

    const insertedNode = insertRes.rows[0];

    // If non-root, update parent's left/right team counts
    if (parentMemberId && parentUuid) {
      if (position === 'LEFT') {
        await queryRunner(
          `UPDATE distributors SET left_team_count = left_team_count + 1, team_size = team_size + 1 WHERE id = $1`,
          [parentUuid]
        );
      } else if (position === 'RIGHT') {
        await queryRunner(
          `UPDATE distributors SET right_team_count = right_team_count + 1, team_size = team_size + 1 WHERE id = $1`,
          [parentUuid]
        );
      }
    }

    return {
      treeNodeId: insertedNode?.id || '',
      position,
      level,
      treePath,
    };
  }
}

