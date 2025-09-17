# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Wedding Portrait Generator built with React, TypeScript, and Vite. It uses Google's Gemini 2.5 Flash Image Preview model to transform uploaded photos (single, couple, or family) into wedding portraits with 12 different style themes.

### Key Features
- **Enhanced Template System**: Conditional prompt sections with `{enhanceSection}` for cleaner output
- **Admin Dashboard**: Complete prompt and theme management with CRUD operations  
- **Multiple Portrait Types**: Single person, couple (default), and family portraits
- **Authentication & Credits**: Supabase Auth integration with Stripe payment system
- **Analytics**: PostHog integration for comprehensive tracking and insights

## Development Commands

**Start development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

**Install dependencies:**
```bash
npm install
```

## Environment Setup

The app requires a `GEMINI_API_KEY` environment variable. This should be set in a `.env.local` file:
```
GEMINI_API_KEY=your_api_key_here
```

The Vite config maps this to both `process.env.API_KEY` and `process.env.GEMINI_API_KEY` for compatibility.

## Architecture

### Main App Flow (`App.tsx`)
- Manages state for source image, generated content, loading, and errors
- Orchestrates image upload → prompt processing → AI generation → results display
- Generates 3 wedding portrait styles simultaneously from 12 available themes
- Supports single person, couple, and family photo uploads

### Key Components
- **ImageUploader**: Handles drag-and-drop and file selection for photos
- **PromptInput**: Allows custom prompt input and triggers generation
- **ImageDisplay**: Shows the three generated wedding portrait results
- **Loader**: Loading state with progress indication
- **Admin Dashboard**: Full CRUD operations for prompts and themes
- **LimitReachedModal**: Credit system integration with Stripe payments

### Services
- **secureGeminiService.ts**: Enhanced Gemini API service with prompt management
- **promptService.ts**: Template processing with conditional `{enhanceSection}` support
- **unifiedThemeService.ts**: Bridge between legacy and database theme systems
- **authService.ts**: Supabase authentication integration
- **rateLimiter.ts**: Daily usage limits with midnight reset (local timezone)

### Error Handling
The app uses `Promise.allSettled()` to generate multiple styles concurrently, gracefully handling partial failures. Individual style generation failures are logged but don't block other styles from completing.

### Styling
Uses Tailwind CSS classes throughout with a dark theme (bg-gray-900 base).

## Types (`types.ts`)
- `GeneratedContent`: Interface for AI-generated results containing imageUrl, text, and optional style identifier

## Development Notes
- No testing framework is configured
- No linting or type checking scripts are defined in package.json
- The project uses modern React 19 with function components and hooks
- Vite provides fast development server and build tooling