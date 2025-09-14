# 📱 Cellar Sessions - Setup Instructions

This guide will help you get the Cellar Sessions React Native mobile application up and running for development.

## ✅ Task FSD-W1-001 Completion Summary

**Status: COMPLETED** ✅

The React Native project has been successfully initialized with all required components:

### ✅ Deliverables Completed

1. **React Native Project Repository Structure** ✅
   - Expo TypeScript project created with comprehensive folder structure
   - Organized into logical modules: components, screens, services, stores, etc.

2. **TypeScript Configuration** ✅  
   - Optimized `tsconfig.json` for React Native development
   - Path mapping configured for clean imports (@/components, @/services, etc.)
   - Strict type checking enabled

3. **Complete package.json with Dependencies** ✅
   - All core dependencies from implementation plan included
   - Expo SDK 53 with latest compatible versions
   - Development tools: ESLint, Prettier, Jest, TypeScript
   - Production dependencies: Supabase, React Hook Form, Zustand, etc.

4. **Project Structure Documentation** ✅
   - Comprehensive README with architecture overview
   - Detailed folder structure explanation
   - Development workflow and best practices

5. **Initial Setup Instructions** ✅
   - Environment configuration guide
   - Installation and running instructions
   - Build and deployment guidelines

## 🛠️ Quick Start Guide

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js 18+**: https://nodejs.org/
- **npm** (comes with Node.js)
- **Expo CLI**: `npm install -g @expo/cli`
- **Git**: https://git-scm.com/

### 2. Development Environment
For mobile development, you'll need:

**iOS Development:**
- Xcode (Mac only)
- iOS Simulator

**Android Development:**
- Android Studio
- Android SDK
- Android Emulator or physical device

### 3. Project Setup

```bash
# 1. Navigate to the project directory
cd CellarSessions

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual API keys

# 4. Start the development server
npm start
```

### 4. Running the App

Once the development server starts:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Press `w` to open in web browser
- Scan QR code with Expo Go app on physical device

## 📁 Project Architecture

### Core Technologies
- **Frontend**: React Native with Expo 53
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router
- **State**: Zustand stores
- **Forms**: React Hook Form + Zod validation
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Testing**: Jest + Testing Library

### Folder Structure
```
src/
├── app/                    # Expo Router app directory
├── components/            # Reusable components
│   ├── ui/               # Basic UI elements
│   ├── forms/            # Form components
│   ├── tasting/          # WSET tasting components
│   ├── social/           # Squad and social features
│   └── camera/           # Camera and scanning
├── screens/              # Screen components
├── services/             # API and external services
├── stores/               # Zustand state management
├── types/                # TypeScript definitions
├── utils/                # Utility functions
├── constants/            # App configuration
├── navigation/           # Navigation setup
└── hooks/                # Custom React hooks
```

## 🔧 Environment Configuration

### Required Environment Variables
Create `.env.local` from `.env.example`:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Services (for future integration)
EXPO_PUBLIC_GOOGLE_VISION_API_KEY=your-google-vision-key
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-key

# Environment
EXPO_PUBLIC_ENV=development
```

### Backend Setup
This mobile app connects to a Supabase backend. Ensure you have:
1. Supabase project created
2. Database schema deployed
3. Authentication configured
4. Storage buckets set up

## 🧪 Development Workflow

### Code Quality
The project is configured with:
- **ESLint**: Code linting with React Native rules
- **Prettier**: Automatic code formatting  
- **TypeScript**: Strict type checking
- **Jest**: Unit and integration testing

### Available Commands
```bash
# Development
npm start                # Start Expo dev server
npm run android         # Run on Android
npm run ios             # Run on iOS
npm run web             # Run on web

# Building
npm run build           # Production build
npm run build:android   # Android build (requires EAS)
npm run build:ios       # iOS build (requires EAS)

# Quality Assurance  
npm run test            # Run tests
npm run test:watch      # Run tests in watch mode
npm run lint            # Run linting
npm run type-check      # TypeScript validation
```

### Git Workflow
1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Run tests and linting before pushing
4. Create pull request for code review
5. Merge after approval and successful CI

## 🚀 Next Steps

With FSD-W1-001 complete, the mobile development team can now proceed with:

### Immediate Next Tasks (FSD-W1-002)
- **Navigation Structure Setup**
  - Implement React Navigation with auth flow
  - Create tab navigation for main app sections
  - Set up protected routes

### Week 1 Remaining Tasks
- **Supabase Client Integration** (FSD-W1-003)
- **Authentication Flow** (FSD-W1-004)
- **WSET Tasting Form Component** (FSD-W1-005)
- **Camera Integration** (FSD-W1-006)

## 🔍 Verification Checklist

✅ **Project builds successfully**
- TypeScript compilation passes without errors
- Expo development server starts correctly
- No critical dependency conflicts

✅ **All required dependencies installed**
- Core Expo and React Native packages
- Supabase client and authentication
- Form handling and validation libraries
- Development and testing tools

✅ **Project structure follows best practices**
- Clear separation of concerns
- Logical folder organization
- TypeScript path mapping configured
- Consistent naming conventions

✅ **Development environment ready**
- Environment variables template provided
- Testing setup configured
- Linting and formatting rules established
- Documentation complete

## 📞 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx expo start --clear
```

**Dependency conflicts:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
```bash
npm run type-check
```

**Environment variables not loading:**
- Ensure `.env.local` exists and follows correct format
- Restart Expo development server after changes

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Task FSD-W1-001 Status: ✅ COMPLETED**

The React Native project is now fully initialized and ready for feature development. The mobile development team can begin implementing the core tasting features and authentication flows.