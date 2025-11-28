export interface Shift {
  id: string
  label: string // TM, TT, TN etc.
  startTime: string
  endTime: string
  facilityName: string
  unit?: string
  field?: string
  status?: 'pending' | 'claimed' | 'rejected'
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
