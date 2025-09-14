import { WSETTastingFormData } from '@/types/wsetForm'

export type RootStackParamList = {
  Onboarding: undefined
  AuthStack: undefined
  MainTabs: undefined
  WSETForm: {
    initialData?: Partial<WSETTastingFormData>
    wineId?: string
    editMode?: boolean
    tastingNoteId?: string
  }
  WineDetail: { wineId: string }
  CameraCapture: {
    onCapture: (imageUri: string) => void
    type: 'wine' | 'cellar' | 'tasting'
  }
  ManualWineEntry: undefined
  Profile: undefined
}

export type AuthStackParamList = {
  Login: undefined
  Signup: undefined
  ForgotPassword: undefined
  ProfileSetup: {
    email: string
    userId: string
  }
}

export type MainTabParamList = {
  Home: undefined
  Cellar: undefined
  Tasting: undefined
  Social: undefined
  Profile: undefined
}

export type TastingStackParamList = {
  TastingHome: undefined
  NewTasting: undefined
  TastingHistory: undefined
  BlindTasting: undefined
  WSETForm: {
    initialData?: Partial<WSETTastingFormData>
    wineId?: string
    editMode?: boolean
    tastingNoteId?: string
  }
}

export type CellarStackParamList = {
  CellarHome: undefined
  WineDetail: { wineId: string }
  AddWine: undefined
  CellarStats: undefined
}

export type SocialStackParamList = {
  Feed: undefined
  Squads: undefined
  Leaderboard: undefined
  SquadDetail: { squadId: string }
}