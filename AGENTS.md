# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

liquidx-mem is a note-taking service that allows users to collect content from across the internet into a simple storage system. Each note is called a "mem" and the system supports automatic content annotation, media mirroring, and various export formats.

## Tech Stack

- **Frontend**: SvelteKit with TypeScript and Vite
- **UI Components**: Tailwind CSS with shadcn/ui-style components (bits-ui)
- **Authentication**: Firebase Authentication
- **Database**: MongoDB (migrated from Firebase Firestore)
- **Storage**: S3-compatible storage for media files
- **Deployment**: Vercel (configured in svelte.config.js)

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Firebase hosting
npm run deploy

# Testing
npm run test        # Playwright end-to-end tests
npm run vitest      # Unit tests with Vitest

# Code quality
npm run lint        # Prettier + ESLint
npm run format      # Prettier formatting
npm run check       # Svelte type checking
npm run check:watch # Svelte type checking in watch mode

# TypeScript compilation
npm run tsc         # Watch mode for tools
npm run tsc-once    # Single compilation
```

## Project Architecture

### Core Data Model
- **Mem**: Central data structure representing a note/memory (defined in `src/lib/common/mems.ts`)
- **MemPhoto/MemVideo/MemLink**: Specialized media types within mems
- Database operations handled in `src/lib/mem.db.server.ts`

### Directory Structure
- **`src/routes/_api/`**: API endpoints for mem operations (add, edit, delete, list, etc.)
- **`src/routes/(web)/`**: Main web application pages
- **`src/routes/(feeds)/`**: RSS/feed generation functionality
- **`src/lib/svelte/`**: Main Svelte components (MemList, MemAdd, MemView, etc.)
- **`src/lib/components/ui/`**: Reusable UI components (shadcn/ui style)
- **`src/lib/server/`**: Server-side utilities (auth, API, annotation, mirroring)
- **`src/tools/`**: Administrative tools for Firebase and MongoDB operations

### Key Components
- **Authentication**: Firebase Auth integration (`src/lib/firebase.server.ts`, `src/lib/server/auth.server.ts`)
- **Content Annotation**: Automatic processing of URLs and media (`src/lib/server/annotator.ts`)
- **Media Mirroring**: S3 storage for cached media files (`src/lib/server/mirror.ts`)
- **Full-text Search**: MongoDB text indexes for searching mems

### Migration Notes
The project is in active migration from Firebase Firestore to MongoDB. Some legacy Firebase code may still exist alongside new MongoDB implementations.

## Database Setup Requirements

For full-text search functionality, MongoDB text indexes must be created manually:
- Reference: https://www.mongodb.com/docs/manual/tutorial/text-search-in-aggregation/

## Environment Configuration

Required environment variables (see README.md for details):
- Firebase Admin credentials (`MEM_FIREBASE_ADMIN_KEY`)
- MongoDB connection (`MONGO_DB_USERNAME`, `MONGO_DB_PASSWORD`)
- S3 storage configuration (`S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, etc.)

## Administrative Tools

Located in `src/tool.ts` - run with `node` after TypeScript compilation for database operations and media mirroring.