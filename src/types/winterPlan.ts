export interface Shift {
  id: string
  label: string // TM, TT, TN etc.
  startTime: string
  endTime: string
  facilityName: string
  unit?: string
  field?: string
  status?: 'pending' | 'claimed' | 'rejected' | 'confirmed' // confirmed = APPROVED or PENDING_APPROVAL from API
  price?: number
}

export interface DayShifts {
  date: string
  shifts: Shift[]
}

export interface MonthData {
  month: string // YYYY-MM
  days: DayShifts[]
}

export interface WinterPlan {
  professionalId: string
  status: 'ready' | 'processing' | 'not_started'
  generatedAt: string
  months: MonthData[]
}

export interface Facility {
  id: string
  name: string
  rating: number
  reviewsCount: number
  address: string
  city: string
  googleMapsUrl?: string
  images?: {
    logo?: string
    banner?: string
  }
  allowInternalProsToCancelApprovedClaims?: boolean
  generalInfoDocumentUrl?: string
  shiftGuidanceDocumentUrl?: string
}

export interface Remuneration {
  facilityAmount: number
  bonusAmount: number
  currency: string
  total: number
}

export interface ShiftTags {
  parking: boolean
  food: boolean
  cafeteria: boolean
  programa?: string // "casiopea" or other programs
  casiopea?: boolean // legacy support
}

export interface ShiftDetails {
  id: string
  externalId?: string
  professionalId: string
  facility: Facility
  unit: string
  field: string
  date: string
  startTime: string
  endTime: string
  remuneration: Remuneration
  tags: ShiftTags
  description: string
}

export interface PolicySection {
  title: string
  body: string
}

export interface CancellationPolicy {
  id: string
  title: string
  sections: PolicySection[]
}

export type FeedbackReason = 'not_available' | 'not_interested'

// ============================================
// Available Shifts API Types
// ============================================

export interface IconDefinition {
  name: string
  color?: string
  backgroundColor?: string
  filledColor?: string
  width?: string
}

export interface LabelDefinition {
  displayText: string
  color?: string
  backgroundColor?: string
  icon?: IconDefinition
  typographyStyle?: string
  typographySize?: string
  targetScreen?: string
}

export interface TagDefinition {
  icon?: IconDefinition
  label?: LabelDefinition
  backgroundColor?: string
  borderColor?: string
  modal?: {
    title?: LabelDefinition
    description?: LabelDefinition
    icon?: IconDefinition
  }
}

export interface FacilityReview {
  averageRating: number
  totalReviews: number
  rating?: string
  hasMoreReviews?: boolean
}

export interface AvailableShiftFacility {
  id: number
  name: string
  logo?: string
  banner?: string
  address?: string
  addressCity?: string
  addressCountry?: string
  latitude?: number
  longitude?: number
  mapLink?: string
  facilityReview?: FacilityReview
  shiftGuidanceDocumentUrl?: string
  generalInfoDocumentUrl?: string
  agentDescription?: string
  facilityType?: string
  tag?: TagDefinition
  allowInternalProsToCancelApprovedClaims?: boolean
}

export interface PaymentBreakdownItem {
  label: string
  amount: string
}

export interface ShiftBadge {
  displayText: string
  color?: string
  backgroundColor?: string
  isNewShiftBadge?: boolean
}

export interface ShiftTagDefinition {
  tagCode: string
  displayText: string
  color?: string
  backgroundColor?: string
  leftIcon?: IconDefinition
  icon?: IconDefinition
  title?: string
  body?: string
  countdown?: {
    title?: LabelDefinition
    timestamp?: string
  }
}

export interface AvailableShift {
  id: number
  dbCreatedTime?: string
  externalId?: string
  facility: AvailableShiftFacility
  modality?: 'INTERNAL' | 'EXTERNAL'
  startTime: string
  finishTime: string
  localStartTime: string
  localFinishTime: string
  shiftDay?: string
  shiftTimeInDay?: 'DAY_SHIFT' | 'MORNING_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_SHIFT' | 'EVENING_SHIFT'
  weekDayType?: 'WEEKDAY' | 'WEEKEND'
  specialization?: {
    name?: string
    displayText?: string
  }
  details?: string
  hourRate?: string
  currency?: string
  professionalTotalPayText?: string
  bonus?: string
  status?: 'AVAILABLE' | 'CLAIMED' | 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED'
  isInWaitList?: boolean
  guaranteed?: boolean
  urgent?: boolean
  displayPrioritised?: boolean
  paymentBreakdown?: PaymentBreakdownItem[]
  cancellationPolicyConfirmationRequired?: boolean
  urgentShiftInformation?: {
    header?: string
    body?: string
  }
  urgentShiftDetails?: string
  tags?: string[]
  tagsDefinitions?: Record<string, ShiftTagDefinition>
  badge?: ShiftBadge
  shiftTotalPay?: number
  unit?: string
  livoUnit?: string
  professionalField?: string
  capacity?: number
  totalClaimedSlots?: number
  tag?: TagDefinition
  promotions?: LabelDefinition[]
  promotionCount?: number
  shiftTimeNote?: TagDefinition
  perks?: TagDefinition[]
}

export interface AvailableShiftsByDate {
  date: string
  shifts: AvailableShift[]
  hasShifts?: boolean
}

export interface AvailableShiftsResponse {
  shiftsByDate: AvailableShiftsByDate[]
}
