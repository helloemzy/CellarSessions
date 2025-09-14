# 🍷 CellarSessions

A social wine tasting journal app for wine school graduates (WSET L2/L3, CMS, ISG) who want to continue developing their palate within their wine community.

## 📱 About

Cellar Sessions is a React Native mobile application designed to help WSET students and wine professionals document their tasting experiences, improve their blind tasting skills, and connect with fellow wine enthusiasts in study groups (called "squads").

## 🚀 Features

### Core Tasting Features
- **WSET SAT Framework**: Complete systematic approach to tasting implementation
- **Blind Tasting Mode**: Practice blind tasting with accuracy scoring
- **Camera Integration**: Scan wine labels for automatic wine information entry
- **Voice Notes**: Record audio notes during tastings
- **Manual Entry**: Fallback for when scanning doesn't work

### Social Features
- **Squads**: Create or join wine study groups
- **Activity Feeds**: See what your squad members are tasting
- **Challenge System**: Compete in blind tasting challenges
- **Note Sharing**: Share your tasting notes with different visibility levels

### Progress Tracking
- **Personal Statistics**: Track your tasting accuracy and progress
- **Achievement System**: Unlock badges and milestones
- **Wine Discovery**: Explore new regions, varieties, and producers

## 🏗️ Architecture

### Tech Stack
- **Framework**: Expo 53 + React Native
- **Language**: TypeScript
- **Navigation**: Expo Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **AI Integration**: Google Vision API + OpenAI Whisper

### Project Structure
```
CellarSessions/
├── src/
│   ├── app/                    # Expo Router pages
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Basic UI components
│   │   ├── forms/            # Form components
│   │   ├── tasting/          # Tasting-specific components
│   │   ├── social/           # Social features components
│   │   └── camera/           # Camera integration components
│   ├── screens/              # Screen components
│   │   ├── auth/             # Authentication screens
│   │   ├── profile/          # Profile management
│   │   ├── tasting/          # Tasting note screens
│   │   ├── squad/            # Squad management
│   │   ├── settings/         # App settings
│   │   └── discovery/        # Wine discovery
│   ├── services/             # API and external services
│   │   ├── api/              # Supabase client
│   │   ├── storage/          # File storage
│   │   ├── auth/             # Authentication
│   │   └── ai/               # AI integrations
│   ├── stores/               # Zustand state stores
│   │   ├── auth/             # Authentication state
│   │   ├── tasting/          # Tasting data
│   │   ├── squad/            # Squad management
│   │   └── ui/               # UI state
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   ├── constants/            # App constants and configuration
│   ├── navigation/           # Navigation configuration
│   └── hooks/                # Custom React hooks
├── assets/                   # Static assets
├── __tests__/               # Test files
└── docs/                    # Additional documentation
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio and emulator (for Android development)

### Environment Setup
1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Configure your environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `EXPO_PUBLIC_GOOGLE_VISION_API_KEY`: Google Vision API key for label scanning
   - `EXPO_PUBLIC_OPENAI_API_KEY`: OpenAI API key for voice transcription

### Installation
1. Clone and navigate to the project:
   ```bash
   git clone <repository-url>
   cd CellarSessions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Available Scripts
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run on web browser
- `npm run build` - Create production build
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## 🧪 Testing

The project includes comprehensive testing setup:

- **Unit Tests**: Jest + Testing Library for component testing
- **Type Checking**: TypeScript compiler validation
- **Linting**: ESLint with React Native and TypeScript rules
- **Code Formatting**: Prettier for consistent code style

Run tests:
```bash
npm run test        # Run all tests
npm run test:watch  # Run tests in watch mode
npm run type-check  # TypeScript validation
npm run lint        # Code linting
```

## 📱 Build & Deploy

### Development Builds
```bash
# Start development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web
```

### Production Builds
```bash
# Build for production
npm run build

# Build for specific platforms (requires EAS CLI)
npm run build:android
npm run build:ios
```

### App Store Submission
The app is configured for submission to both Apple App Store and Google Play Store with proper metadata, icons, and permissions.

## 🔧 Configuration

### Key Configuration Files
- `app.json` - Expo configuration
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Test configuration
- `.eslintrc.js` - Linting rules
- `.prettierrc.json` - Code formatting rules

### Environment Variables
All sensitive configuration is managed through environment variables. See `.env.example` for required variables.

## 🚀 Deployment

The app is configured for deployment through:
- **Expo Application Services (EAS)** for building and distributing
- **TestFlight** for iOS beta testing
- **Google Play Internal Testing** for Android beta testing

## 🤝 Contributing

This is a private project for the Cellar Sessions team. Please follow the established coding standards and testing practices.

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Functional components with hooks
- Clear naming conventions for components and functions

### Git Workflow
- Feature branches from `main`
- Pull request reviews required
- Automated testing on PRs
- Semantic commit messages

## 📄 License

Private project - All rights reserved.

## 📞 Support

For technical questions or issues:
- Create an issue in the project repository
- Contact the development team
- Check the documentation in the `/docs` directory

---

Built with ❤️ for wine education and community.