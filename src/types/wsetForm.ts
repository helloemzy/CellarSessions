import { z } from 'zod'

// Wine color options for different wine types
export const WINE_COLORS = {
  RED: [
    'Purple', 'Ruby', 'Garnet', 'Tawny', 'Brown'
  ],
  WHITE: [
    'Lemon-green', 'Lemon', 'Gold', 'Amber', 'Brown'
  ],
  ROSE: [
    'Pink', 'Salmon', 'Orange', 'Onion-skin'
  ],
  SPARKLING: [
    'Lemon-green', 'Lemon', 'Gold', 'Pink', 'Salmon'
  ]
} as const

// Clarity options
export const CLARITY_OPTIONS = [
  'Clear', 'Hazy', 'Cloudy'
] as const

// Development options
export const DEVELOPMENT_OPTIONS = [
  'Youthful', 'Developing', 'Fully developed', 'Tired'
] as const

// Body options
export const BODY_OPTIONS = [
  'Light', 'Medium(-)', 'Medium', 'Medium(+)', 'Full'
] as const

// Finish options
export const FINISH_OPTIONS = [
  'Short', 'Medium(-)', 'Medium', 'Medium(+)', 'Long'
] as const

// Readiness options
export const READINESS_OPTIONS = [
  'Too young', 'Can drink now, but has potential', 'Drink now', 'Past its best'
] as const

// Ageing potential options
export const AGEING_POTENTIAL_OPTIONS = [
  '1-2 years', '3-5 years', '5-10 years', '10+ years'
] as const

// WSET Tasting Form Schema
export const WSETTastingFormSchema = z.object({
  // Wine Selection
  wineId: z.string().min(1, 'Please select a wine'),
  
  // Basic Info
  tastingDate: z.string().min(1, 'Tasting date is required'),
  location: z.string().optional(),
  occasion: z.string().optional(),
  isBlindTasting: z.boolean().default(false),
  visibility: z.enum(['PRIVATE', 'SQUAD', 'PUBLIC']).default('PRIVATE'),

  // APPEARANCE
  appearance: z.object({
    intensity: z.number().min(1).max(5),
    color: z.string().min(1, 'Color is required'),
    rimVariation: z.boolean().default(false),
    clarity: z.enum(CLARITY_OPTIONS),
    observations: z.string().max(500).optional(),
  }),

  // NOSE
  nose: z.object({
    intensity: z.number().min(1).max(5),
    aromaCharacteristics: z.array(z.string()).min(1, 'At least one aroma characteristic is required'),
    development: z.enum(DEVELOPMENT_OPTIONS),
    observations: z.string().max(500).optional(),
  }),

  // PALATE
  palate: z.object({
    sweetness: z.number().min(1).max(5),
    acidity: z.number().min(1).max(5),
    tannin: z.number().min(1).max(5).optional(), // Optional for white wines
    alcohol: z.number().min(1).max(5),
    body: z.enum(BODY_OPTIONS),
    flavorIntensity: z.number().min(1).max(5),
    flavorCharacteristics: z.array(z.string()).min(1, 'At least one flavor characteristic is required'),
    finish: z.enum(FINISH_OPTIONS),
    observations: z.string().max(500).optional(),
  }),

  // CONCLUSION
  conclusion: z.object({
    qualityLevel: z.number().min(1).max(5),
    readiness: z.enum(READINESS_OPTIONS),
    ageingPotential: z.enum(AGEING_POTENTIAL_OPTIONS).optional(),
    observations: z.string().max(500).optional(),
  }),

  // Additional fields
  rating: z.number().min(1).max(5).optional(),
  wouldBuyAgain: z.boolean().optional(),
  foodPairingSuggestions: z.array(z.string()).optional(),
  photoUrls: z.array(z.string()).optional(),
  voiceNoteUrl: z.string().optional(),
  voiceNoteDuration: z.number().optional(),
})

export type WSETTastingFormData = z.infer<typeof WSETTastingFormSchema>

// Form sections for step-by-step navigation
export interface FormSection {
  id: string
  title: string
  description: string
  fields: (keyof WSETTastingFormData)[]
}

export const FORM_SECTIONS: FormSection[] = [
  {
    id: 'wine-selection',
    title: 'Wine Selection',
    description: 'Select the wine you are tasting',
    fields: ['wineId', 'tastingDate', 'location', 'occasion', 'isBlindTasting', 'visibility']
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Systematic Approach to Tasting - Visual Assessment',
    fields: ['appearance']
  },
  {
    id: 'nose',
    title: 'Nose',
    description: 'Systematic Approach to Tasting - Aromatic Assessment',
    fields: ['nose']
  },
  {
    id: 'palate',
    title: 'Palate',
    description: 'Systematic Approach to Tasting - Taste Assessment',
    fields: ['palate']
  },
  {
    id: 'conclusion',
    title: 'Conclusion',
    description: 'Overall Assessment and Quality Evaluation',
    fields: ['conclusion', 'rating', 'wouldBuyAgain', 'foodPairingSuggestions']
  }
]

// Helper function to get wine colors based on wine type
export function getWineColorsForType(wineType: string): readonly string[] {
  switch (wineType) {
    case 'RED':
      return WINE_COLORS.RED
    case 'WHITE':
      return WINE_COLORS.WHITE
    case 'ROSE':
      return WINE_COLORS.ROSE
    case 'SPARKLING':
      return WINE_COLORS.SPARKLING
    default:
      return WINE_COLORS.WHITE
  }
}

// Helper function to validate form section
export function validateFormSection(sectionId: string, data: Partial<WSETTastingFormData>) {
  const section = FORM_SECTIONS.find(s => s.id === sectionId)
  if (!section) return { isValid: true, errors: [] }

  try {
    // Create a schema for just this section
    const sectionFields = section.fields.reduce((acc, field) => {
      const value = data[field as keyof typeof data]
      if (value !== undefined) {
        acc[field as string] = value
      }
      return acc
    }, {} as any)

    WSETTastingFormSchema.pick(
      section.fields.reduce((acc, field) => {
        acc[field as keyof WSETTastingFormData] = true
        return acc
      }, {} as Record<keyof WSETTastingFormData, boolean>)
    ).parse(sectionFields)

    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }
    }
    return { isValid: false, errors: [{ field: 'general', message: 'Validation error' }] }
  }
}