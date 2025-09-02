# Anonymous Survey Platform


 A full-stack survey creation and management application built with a modern TypeScript tech stack. The application allows users to create anonymous surveys with multiple question types, collect responses, and analyze data through a comprehensive analytics dashboard. It features user authentication through Replit's OIDC system, a clean React frontend with shadcn/ui components, and a robust Express.js backend with PostgreSQL database integration.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with **React 18** using **TypeScript** and follows a component-based architecture. The application uses **Wouter** for client-side routing instead of React Router, providing a lightweight navigation solution. State management is handled through **TanStack Query (React Query)** for server state and caching, eliminating the need for additional state management libraries like Redux.

The UI is built using **shadcn/ui components** with **Radix UI primitives**, providing accessible and customizable components. **Tailwind CSS** handles styling with a custom design system including CSS variables for theming. The build system uses **Vite** for fast development and optimized production builds.

Key architectural decisions:
- **Component structure**: Organized into `components/ui` for reusable UI components and `pages` for route components
- **Custom hooks**: `useAuth` for authentication state and `useToast` for notifications
- **Form handling**: React Hook Form with Zod validation for type-safe form management
- **Charts and analytics**: Recharts for data visualization components

## Backend Architecture
The backend follows a **REST API** pattern built with **Express.js** and **TypeScript**. The architecture separates concerns into distinct modules:

- **Authentication layer**: Uses Passport.js with OpenID Connect for Replit authentication
- **Database layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Storage layer**: Abstracted storage interface for data operations
- **Route handlers**: RESTful endpoints organized by feature (surveys, responses, analytics)

The server implements **session-based authentication** with PostgreSQL session storage for security and scalability. Error handling is centralized with custom middleware for consistent API responses.

## Database Design
The database uses **PostgreSQL** with **Drizzle ORM** for schema management and migrations. The schema includes:

- **Users table**: Stores user profiles from OIDC authentication
- **Surveys table**: Main survey entities with metadata and sharing tokens
- **Questions table**: Survey questions with different types (multiple-choice, text, rating, textarea)
- **Responses table**: User response sessions linked to surveys
- **Answers table**: Individual answers linked to questions and responses
- **Sessions table**: Required for Replit authentication session storage

The design supports anonymous surveys, multiple response collection, and flexible question types. Share tokens enable public survey access without authentication.

## Key Features
- **Survey creation**: Dynamic form builder with multiple question types
- **Public sharing**: Anonymous survey participation via share tokens
- **Analytics dashboard**: Response visualization with charts and statistics
- **User management**: Profile-based survey ownership and management
- **Responsive design**: Mobile-friendly interface with Tailwind CSS

# External Dependencies

## Authentication & Authorization
- **Replit OIDC**: Primary authentication provider using OpenID Connect
- **Passport.js**: Authentication middleware with custom Replit strategy
- **Express sessions**: Session management with PostgreSQL storage via `connect-pg-simple`

## Database & ORM
- **Neon PostgreSQL**: Cloud PostgreSQL database service via `@neondatabase/serverless`
- **Drizzle ORM**: Type-safe database toolkit for schema management and queries
- **Drizzle Kit**: Migration and schema management tools

## Frontend Libraries
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Accessible component primitives for complex UI elements
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with `@hookform/resolvers` for validation
- **Zod**: TypeScript-first schema validation
- **Wouter**: Lightweight client-side routing
- **Recharts**: Chart library for analytics visualization
- **date-fns**: Date formatting and manipulation

## Development & Build Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing with Autoprefixer
- **ESBuild**: Fast JavaScript bundler for production builds

## Utility Libraries
- **Lucide React**: Icon library for consistent iconography
- **clsx & tailwind-merge**: Conditional class name utilities
- **nanoid**: Unique ID generation for tokens and identifiers
- **memoizee**: Function memoization for performance optimization