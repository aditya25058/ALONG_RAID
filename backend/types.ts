
/**
 * Represents a geographical point with latitude and longitude.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Represents a Rider in the system (Firestore Model).
 */
export interface Rider {
  id: string;
  name: string;
  pickup: LatLng;
  destination: LatLng;
  currentFare?: number;
  soloFare?: number;
  status: 'ACTIVE' | 'POOLING_REQUEST' | 'MATCHED' | 'IN_TRIP' | 'COMPLETED';
  currentRouteId?: string;
  destinationIsHighDemandZone?: boolean;
  requestedSeats?: number;
  requestedBagUnits?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  openToAll?: boolean;
  corporateDomainHash?: string;
  isAadhaarVerified: boolean;
  averageRating: number;
  hasCorporateMatch?: boolean;
  soloRoute?: LatLng[]; // Solo path for detour baseline
  currentDetourSec?: number; // Baseline for marginal harm calculation
}

/**
 * Represents a Stop on a route.
 */
export interface Stop {
  id: string;
  riderId: string;
  location: LatLng;
  type: 'PICKUP' | 'DROPOFF';
}

/**
 * Represents the different vehicle categories in the ALONG fleet.
 */
// NEW: Vehicle Types & Specs
export enum VehicleType {
  AUTO = 'AUTO', // Keeping existing just in case, though specs usually imply 4-wheeler
  MINI = 'MINI',
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  VAN = 'VAN',
  XUV = 'XUV',
  LUXURY = 'LUXURY',
}

export const VehicleConfigs: Record<VehicleType, { maxSeats: number; maxBags: number; speedMultiplier: number }> = {
  [VehicleType.AUTO]: { maxSeats: 2, maxBags: 1, speedMultiplier: 0.8 },
  [VehicleType.MINI]: { maxSeats: 3, maxBags: 2, speedMultiplier: 0.9 },
  [VehicleType.SEDAN]: { maxSeats: 4, maxBags: 3, speedMultiplier: 1.0 },
  [VehicleType.SUV]: { maxSeats: 6, maxBags: 5, speedMultiplier: 0.9 },
  [VehicleType.VAN]: { maxSeats: 7, maxBags: 6, speedMultiplier: 0.8 },
  [VehicleType.XUV]: { maxSeats: 6, maxBags: 5, speedMultiplier: 1.0 }, // Legacy support
  [VehicleType.LUXURY]: { maxSeats: 3, maxBags: 3, speedMultiplier: 1.1 },
};

// NEW: Layered Logs
export type LogLayer =
  | 'L1_USER'      // Interaction
  | 'L2_APP'       // State/Validation
  | 'L3_MATCH'     // Core Algorithm
  | 'L4_PROTOCOL'  // Crypto/Privacy
  | 'L5_NETWORK'   // Latency/Simulated Comms
  | 'L6_CONSENSUS' // Agreement
  | 'L7_DATABASE'; // Persistence

export interface SimulationLog {
  id: string;
  timestamp: string;
  message: string;
  layer: LogLayer; // NEW
  type: 'info' | 'success' | 'warning' | 'error' | 'protocol';
}

export interface Notification {
  id: string;
  type: 'MATCH' | 'PICKUP' | 'DROPOFF' | 'REROUTE' | 'INFO';
  title: string;
  message: string;
  timestamp: number;
  highlight?: boolean;
}


/**
 * Represents the routing strategy based on product tier.
 */
export enum RoutingStrategy {
  DIRECT_CORRIDOR = 'DIRECT_CORRIDOR', // 500m
  FLEX_CORRIDOR = 'FLEX_CORRIDOR',     // 1km
  SPINE_SUPERPOOL = 'SPINE_SUPERPOOL'  // 2km
}

/**
 * Represents a Driver in the system (Firestore Model).
 */
export interface Driver {
  id: string;
  name: string;
  currentLocation: LatLng;
  vehicleId: string;
  currentEarnings?: number;
  vehicleSpeedKmH: number;
  status: 'AVAILABLE' | 'EN_ROUTE_TO_PICKUP' | 'IN_TRIP' | 'OFFLINE';
  currentRideId?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  isAadhaarVerified: boolean;
  averageRating: number;
}

/**
 * Represents a Vehicle in the system.
 */
export interface Vehicle {
  id: string;
  driverId: string;
  type: VehicleType;
  currentRoute: LatLng[];
  currentLegIndex: number;
  seatsAvailable: number;
  bootUnitsAvailable: number;
  totalSeats: number;
  totalBootUnits: number;
  profitabilityScore: number;
}

/**
 * Represents a logical segment of a journey.
 */
export interface Segment {
  id: string;
  start: LatLng;
  end: LatLng;
  distanceKm: number;
  durationSeconds: number;
  baseCostPerKm: number;
  dynamicMultiplier: number;
  ridersOnSegment: string[];
}

/**
 * MARGINAL HARM (Fairness Metric)
 * Measures the impact of adding a new rider on an existing rider's experience.
 */
export interface MarginalHarm {
  riderId: string;
  previousDetourSec: number;
  newDetourSec: number;
  deltaSec: number;
}

/**
 * Represents the contextual data used by the dynamic pricing engine.
 */
export interface PricingContext {
  activeRequests: number;
  expectedBaseline: number;
  availableDrivers: number;
  totalRequests: number;
  congestionLevel: number;
  isRaining: boolean;
  isLateNight: boolean;
  isFestival: boolean;
  predictedSurgeProbability: number;
  isEmergencyMode: boolean;
  isUnsafePickupZone: boolean;
  currentSegmentIsLowStress?: boolean;
  isEarlyStartupPhase?: boolean;
  forceUnsafePickup?: boolean;
  isDeterministic?: boolean;
  minTrustThreshold?: number;
  demandHeatmap?: { [region: string]: number };
  systemIntegrityScore?: number; // 0-100, High = organic, Low = coordination detected
  isDefensiveMode?: boolean; // When SIS < 50
  chaosProfile?: ChaosProfile;
  chaosProfileFingerprint?: string;
}

/**
 * MOBILITY PROTOCOL TYPES (The Bangalore Standard)
 */
export enum ZoneType {
  NORMAL = 'NORMAL',
  TECH_PARK = 'TECH_PARK',
  HIGHWAY = 'HIGHWAY',
  CANYON = 'CANYON'
}

export enum TimeBucket {
  MORNING_PEAK = 'MORNING_PEAK',
  EVENING_PEAK = 'EVENING_PEAK',
  NORMAL = 'NORMAL'
}

export interface ChaosProfile {
  id: 'NORMAL' | 'BANGALORE_PEAK' | 'EXTREME_CONGESTION';
  velocityProfile: Record<TimeBucket, number>;
  defaultBoardingBufferSec: number;
  zoneOverrides: Partial<Record<ZoneType, { boardingBuffer?: number; corridorRadius?: number; speedMultiplier?: number }>>;
  connectivityPenaltyBaseSec: number;
  highSpeedCorridorPenaltySec: number;
}

export const ChaosProfiles: Record<string, ChaosProfile> = {
  'NORMAL': {
    id: 'NORMAL',
    velocityProfile: { [TimeBucket.MORNING_PEAK]: 25, [TimeBucket.EVENING_PEAK]: 20, [TimeBucket.NORMAL]: 35 },
    defaultBoardingBufferSec: 60,
    zoneOverrides: {},
    connectivityPenaltyBaseSec: 60,
    highSpeedCorridorPenaltySec: 120
  },
  'BANGALORE_PEAK': {
    id: 'BANGALORE_PEAK',
    velocityProfile: { [TimeBucket.MORNING_PEAK]: 15, [TimeBucket.EVENING_PEAK]: 10, [TimeBucket.NORMAL]: 25 },
    defaultBoardingBufferSec: 90,
    zoneOverrides: {
      [ZoneType.TECH_PARK]: { boardingBuffer: 180 },
      [ZoneType.CANYON]: { corridorRadius: 0.004 }, // Tighten to ~400m
      [ZoneType.HIGHWAY]: { speedMultiplier: 1.5 }
    },
    connectivityPenaltyBaseSec: 180,
    highSpeedCorridorPenaltySec: 300
  }
};

/**
 * Represents the result of the ride matching algorithm.
 */
export interface RideMatchResult {
  decision: 'ACCEPT' | 'REJECT';
  reason: string;
  details?: {
    detourSeconds?: string;
    savingsPool?: string;
    trustScore?: string;
    matchReason?: string;
    detourTax?: string;
    [key: string]: any;
  };
}

/**
 * Standard Failure Codes for Ride Operations (Audit & Regulation)
 */
export enum RideFailureCode {
  CONSENT_EXPIRED = 'CONSENT_EXPIRED',
  PRICE_MISMATCH = 'PRICE_MISMATCH',
  ROUTE_MISMATCH = 'ROUTE_MISMATCH',
  POOLING_DISABLED = 'POOLING_DISABLED',
  INVARIANT_FAILED = 'INVARIANT_FAILED',
  CONSENT_REJECTED = 'CONSENT_REJECTED',
  SYSTEM_LOCKED = 'SYSTEM_LOCKED'
}

