import { Timestamp } from 'firebase/firestore';

// Unit status values (6-status workflow)
// Flow: To Buy → Owned → Assembled → Primed → Painted → Based
export type UnitStatus = 'to_buy' | 'owned' | 'assembled' | 'primed' | 'painted' | 'based';

// Firestore document types (internal)
export interface ProjectDocument {
  name: string;
  faction: string;
  gameSystem: string;
  targetPoints: number;
  userId: string;
  createdAt: Timestamp;
}

export interface ProjectUnitDocument {
  name: string;
  quantity: number;
  status: UnitStatus;
  pointsCost: number;
  recipeId: string | null;
}

// Client-facing types (with JS Date)
export interface Project {
  id: string;
  name: string;
  faction: string;
  gameSystem: string;
  targetPoints: number;
  userId: string;
  createdAt: Date;
}

export interface ProjectUnit {
  id: string;
  name: string;
  quantity: number;
  status: UnitStatus;
  pointsCost: number;
  recipeId: string | null;
}
