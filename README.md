# EaseInspect Frontend - API Testing Dashboard

This is a comprehensive Next.js frontend application designed to test all the EaseInspect API endpoints. It provides a user-friendly interface to interact with the backend API and verify that all functionality is working correctly.

## Features

### 🔐 Authentication
- JWT-based authentication with cookie support
- Login form with test credentials
- Protected routes and session management

### 🏢 Agency Management
- Create new agencies with complete contact and billing information
- View all agencies (role-based access)
- Delete agencies (SuperAdmin only)
- Real-time form validation

### 🏠 Property Management
- Create and manage properties with detailed information
- Property types, states, and inspection frequency settings
- Landlord management for each property
- Tenancy and tenant management
- Property details modal with comprehensive information

### 🔍 Inspection Management
- Create property inspections with scheduling
- Assign inspectors and inspection types
- Update inspection statuses
- Filter inspections by property, inspector, status, and date range
- Search properties for inspection assignment

### 📐 Property Layout Management
- Hierarchical layout system (Layouts → Areas → Items)
- Create and manage property layout templates
- Area management within layouts
- Item management within areas
- Display order management

### 📊 Reference Data
- View all reference data (States, Property Types, Inspection Types, Statuses)
- Real-time data refresh
- Summary cards with counts
- Tabbed interface for easy navigation

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- EaseInspect backend running on `http://localhost:5000`
- PostgreSQL database with the EaseInspect schema

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Test Credentials

The application includes test credentials for immediate testing:

**SuperAdmin Account:**
- Email: `super@gmail.com`
- Password: `Super123`

**Or create a new agency** through the Agency Management tab to get user credentials for that agency.

## API Testing Workflow

### 1. Authentication Testing
- Login with the provided credentials
- Verify JWT token is stored and used for subsequent requests
- Test logout functionality

### 2. Agency Management Testing
- Create a new agency with complete information
- Verify the agency appears in the list
- Test agency deletion (SuperAdmin only)

### 3. Property Management Testing
- Create properties with different types and locations
- Add landlords to properties
- Create tenancies and tenants
- Test property deletion and updates

### 4. Inspection Management Testing
- Create inspections for existing properties
- Assign different inspectors and types
- Update inspection statuses
- Test date range filtering

### 5. Layout Management Testing
- Create property layouts
- Add areas to layouts
- Add items to areas
- Test the hierarchical structure

### 6. Reference Data Testing
- Verify all reference data loads correctly
- Test data refresh functionality
- Check data counts and summaries

## API Endpoints Tested

### Authentication
- `POST /api/user/login` - User authentication

### Agency Management
- `GET /api/agency` - Get all agencies
- `GET /api/agency/all` - Get all agencies (SuperAdmin)
- `POST /api/agency` - Create agency
- `DELETE /api/agency/{id}` - Delete agency

### Property Management
- `GET /api/property` - Get all properties
- `GET /api/property/{id}` - Get property by ID
- `POST /api/property` - Create property
- `PUT /api/property/{id}` - Update property
- `DELETE /api/property/{id}` - Delete property
- Landlord, tenancy, and tenant endpoints

### Inspection Management
- `GET /api/inspection` - Get all inspections
- `POST /api/inspection` - Create inspection
- `PUT /api/inspection/{id}` - Update inspection
- `PATCH /api/inspection/{id}/status` - Update status
- `DELETE /api/inspection/{id}` - Delete inspection
- Filtering and search endpoints

### Property Layout Management
- Layout, area, and item CRUD operations
- Hierarchical data management

### Reference Data
- States, property types, inspection types, and statuses

## Error Handling

The application includes comprehensive error handling:
- Network error display
- Form validation
- API error messages
- Loading states
- User feedback for all operations

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **State Management**: React Context API

## Development

### Project Structure
```
src/
├── app/                 # Next.js app directory
├── components/          # React components
├── contexts/           # React contexts (Auth)
├── lib/                # API client and utilities
└── types/              # TypeScript type definitions
```

### Key Components
- `AuthContext` - Authentication state management
- `LoginForm` - User authentication
- `Dashboard` - Main application interface
- `AgencyManagement` - Agency CRUD operations
- `PropertyManagement` - Property and related entity management
- `InspectionManagement` - Inspection scheduling and management
- `LayoutManagement` - Property layout hierarchy
- `ReferenceData` - Reference data viewing

## Testing the Backend

This frontend is designed to comprehensively test the EaseInspect backend API. It covers:

✅ **Authentication & Authorization**
✅ **Agency Management**
✅ **Property Management**
✅ **Inspection Management**
✅ **Property Layout Management**
✅ **Reference Data Management**
✅ **Error Handling**
✅ **Data Validation**
✅ **Role-based Access Control**

Use this application to verify that all backend endpoints are working correctly and that the API responds as expected to various scenarios.