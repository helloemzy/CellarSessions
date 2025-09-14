export interface ValidationResult {
  isValid: boolean
  error?: string
}

export class FormValidator {
  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    if (!email?.trim()) {
      return { isValid: false, error: 'Email is required' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return { isValid: false, error: 'Please enter a valid email address' }
    }

    return { isValid: true }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): ValidationResult {
    if (!password?.trim()) {
      return { isValid: false, error: 'Password is required' }
    }

    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' }
    }

    // Check password strength requirements
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!hasUpperCase) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' }
    }

    if (!hasLowerCase) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' }
    }

    if (!hasNumbers) {
      return { isValid: false, error: 'Password must contain at least one number' }
    }

    // Optional: Require special character for stronger security
    if (!hasSpecialChar) {
      return { 
        isValid: true, 
        error: 'Consider adding special characters for stronger security' 
      }
    }

    return { isValid: true }
  }

  /**
   * Validate password confirmation
   */
  static validatePasswordConfirmation(password: string, confirmPassword: string): ValidationResult {
    if (!confirmPassword?.trim()) {
      return { isValid: false, error: 'Please confirm your password' }
    }

    if (password !== confirmPassword) {
      return { isValid: false, error: 'Passwords do not match' }
    }

    return { isValid: true }
  }

  /**
   * Validate display name
   */
  static validateDisplayName(displayName: string): ValidationResult {
    if (!displayName?.trim()) {
      return { isValid: false, error: 'Display name is required' }
    }

    if (displayName.trim().length < 2) {
      return { isValid: false, error: 'Display name must be at least 2 characters long' }
    }

    if (displayName.trim().length > 50) {
      return { isValid: false, error: 'Display name must be less than 50 characters' }
    }

    // Check for inappropriate characters
    const invalidChars = /[<>{}[\]\\\/`~]/
    if (invalidChars.test(displayName)) {
      return { isValid: false, error: 'Display name contains invalid characters' }
    }

    return { isValid: true }
  }

  /**
   * Validate first/last name (optional fields)
   */
  static validateName(name: string, fieldName: string = 'Name'): ValidationResult {
    // Names are optional, so empty is valid
    if (!name?.trim()) {
      return { isValid: true }
    }

    if (name.trim().length < 1) {
      return { isValid: false, error: `${fieldName} cannot be empty if provided` }
    }

    if (name.trim().length > 30) {
      return { isValid: false, error: `${fieldName} must be less than 30 characters` }
    }

    // Check for numbers or special characters in names
    const nameRegex = /^[a-zA-Z\s'-]+$/
    if (!nameRegex.test(name.trim())) {
      return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` }
    }

    return { isValid: true }
  }

  /**
   * Validate graduation class (optional field)
   */
  static validateGraduationClass(graduationClass: string): ValidationResult {
    // Graduation class is optional
    if (!graduationClass?.trim()) {
      return { isValid: true }
    }

    if (graduationClass.trim().length > 100) {
      return { isValid: false, error: 'Graduation class must be less than 100 characters' }
    }

    return { isValid: true }
  }

  /**
   * Validate location (optional field)
   */
  static validateLocation(location: string): ValidationResult {
    // Location is optional
    if (!location?.trim()) {
      return { isValid: true }
    }

    if (location.trim().length > 100) {
      return { isValid: false, error: 'Location must be less than 100 characters' }
    }

    return { isValid: true }
  }

  /**
   * Validate bio (optional field)
   */
  static validateBio(bio: string): ValidationResult {
    // Bio is optional
    if (!bio?.trim()) {
      return { isValid: true }
    }

    if (bio.trim().length > 500) {
      return { isValid: false, error: 'Bio must be less than 500 characters' }
    }

    return { isValid: true }
  }

  /**
   * Validate complete login form
   */
  static validateLoginForm(email: string, password: string): ValidationResult {
    const emailValidation = this.validateEmail(email)
    if (!emailValidation.isValid) {
      return emailValidation
    }

    // For login, we just check if password is not empty
    if (!password?.trim()) {
      return { isValid: false, error: 'Password is required' }
    }

    return { isValid: true }
  }

  /**
   * Validate complete signup form
   */
  static validateSignupForm(
    email: string,
    password: string,
    confirmPassword: string,
    displayName: string,
    firstName?: string,
    lastName?: string
  ): ValidationResult {
    const emailValidation = this.validateEmail(email)
    if (!emailValidation.isValid) {
      return emailValidation
    }

    const displayNameValidation = this.validateDisplayName(displayName)
    if (!displayNameValidation.isValid) {
      return displayNameValidation
    }

    const passwordValidation = this.validatePassword(password)
    if (!passwordValidation.isValid) {
      return passwordValidation
    }

    const passwordConfirmValidation = this.validatePasswordConfirmation(password, confirmPassword)
    if (!passwordConfirmValidation.isValid) {
      return passwordConfirmValidation
    }

    if (firstName) {
      const firstNameValidation = this.validateName(firstName, 'First name')
      if (!firstNameValidation.isValid) {
        return firstNameValidation
      }
    }

    if (lastName) {
      const lastNameValidation = this.validateName(lastName, 'Last name')
      if (!lastNameValidation.isValid) {
        return lastNameValidation
      }
    }

    return { isValid: true }
  }
}

/**
 * Get password strength score and feedback
 */
export function getPasswordStrength(password: string): {
  score: number
  feedback: string
  color: string
} {
  if (!password) {
    return { score: 0, feedback: 'Enter a password', color: '#9CA3AF' }
  }

  let score = 0
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }

  // Calculate score
  if (checks.length) score += 1
  if (checks.uppercase) score += 1
  if (checks.lowercase) score += 1
  if (checks.numbers) score += 1
  if (checks.special) score += 1

  // Additional points for longer passwords
  if (password.length >= 12) score += 1

  if (score <= 2) {
    return { score, feedback: 'Weak password', color: '#EF4444' }
  } else if (score <= 4) {
    return { score, feedback: 'Fair password', color: '#F59E0B' }
  } else if (score <= 5) {
    return { score, feedback: 'Good password', color: '#10B981' }
  } else {
    return { score, feedback: 'Strong password', color: '#059669' }
  }
}