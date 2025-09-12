# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Wedding Portrait Generator built with React, TypeScript, and Vite. It uses Google's Gemini 2.5 Flash Image Preview model to transform uploaded couple photos into wedding portraits with different style themes.

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
- Generates 3 wedding portrait styles simultaneously: "Classic & Timeless", "Rustic Barn", and "Bohemian Beach"

### Key Components
- **ImageUploader**: Handles drag-and-drop and file selection for couple photos
- **PromptInput**: Allows custom prompt input and triggers generation
- **ImageDisplay**: Shows the three generated wedding portrait results
- **Loader**: Loading state with progress indication

### AI Service (`services/geminiService.ts`)
- `editImageWithNanoBanana()`: Core function that communicates with Gemini API
- Handles file-to-base64 conversion for image uploads
- Processes multimodal responses (both image and text)
- Uses `gemini-2.5-flash-image-preview` model with `IMAGE` and `TEXT` response modalities

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