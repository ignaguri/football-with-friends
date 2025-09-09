# Storage Migration Plan: Google Sheets to SQLite/Turso

## Overview

This document outlines the comprehensive plan to migrate the football-with-friends application from Google Sheets-based storage to the new SQLite/Turso storage system while maintaining backward compatibility during the transition.

## Current State Analysis

### ✅ Completed Infrastructure
- Repository pattern with interfaces for all data access
- Factory pattern for dependency injection (`AppRepositoryFactory`)
- Service layer (`MatchService`) with business logic
- Environment-based storage provider selection
- Complete Turso/SQLite implementation with proper database schema
- Migration system for database schema changes

### ❌ Issues Identified
1. **Data Structure Mismatch**: Frontend expects `MatchMetadata` (Google Sheets) but backend provides `Match` (domain)
2. **API Response Format**: Manual mapping between new domain objects and old frontend expectations
3. **Frontend Type Dependencies**: Components use legacy types instead of domain types
4. **Legacy Type Definitions**: Duplicate type definitions across files

## Migration Plan

### Phase 1: Type System Consolidation
**Goal**: Unify type system and remove legacy types

#### 1.1 Update Type Definitions
- [x] Remove `MatchMetadata` from `lib/types.ts` (kept for backward compatibility)
- [x] Consolidate all types in `lib/domain/types.ts`
- [x] Create proper mapping functions between domain objects and display objects
- [x] Update type exports and imports

#### 1.2 Create Display Type Mappers
- [x] Create `lib/mappers/display-mappers.ts` for frontend-specific data transformation
- [x] Implement functions to convert `Match` → `MatchDisplay` for UI components
- [x] Implement functions to convert `MatchDetails` → `MatchDetailsDisplay`

### Phase 2: API Layer Modernization
**Goal**: Simplify API responses and remove manual mapping

#### 2.1 Update API Routes
- [x] **`app/api/matches/route.ts`**: Return domain objects directly
- [x] **`app/api/matches/[matchId]/route.ts`**: Remove manual mapping, return `MatchDetails`
- [ ] **`app/api/matches/[matchId]/signup/route.ts`**: Update response format
- [x] Add proper error handling for new storage system
- [x] **`app/api/locations/route.ts`**: Create locations API endpoint

#### 2.2 Create API Response Types
- [x] Define consistent API response format
- [x] Create response mappers for different client needs
- [x] Add proper TypeScript types for all API responses

### Phase 3: Frontend Component Updates
**Goal**: Update all components to use new domain types

#### 3.1 High Priority Components
- [x] **`hooks/use-matches.ts`**: Update types and data handling
- [x] **`app/matches/matches-client-page.tsx`**: Update data mapping
- [x] **`app/organizer/page.tsx`**: Update to use domain types
- [x] **`app/organizer/edit-match-form.tsx`**: Update form schema
- [x] **`app/matches/[matchId]/match-client-page.tsx`**: Update data access

#### 3.2 Component-Specific Updates
- [ ] **`app/matches/[matchId]/components/match-header.tsx`**: Update prop types
- [ ] **`app/matches/[matchId]/components/match-stats.tsx`**: Update data structure
- [ ] **`app/matches/[matchId]/components/players-table.tsx`**: Update data handling
- [x] **`app/organizer/player-drawer.tsx`**: Update data access

### Phase 4: Data Flow Optimization
**Goal**: Optimize data fetching and state management

#### 4.1 React Query Updates
- [ ] Update query keys to reflect new data structure
- [ ] Modify data transformation in hooks
- [ ] Add proper error handling for new storage system
- [ ] Implement optimistic updates where appropriate

#### 4.2 State Management
- [ ] Update component state to use domain types
- [ ] Remove legacy state management patterns
- [ ] Add proper loading and error states

### Phase 5: Form and Validation Updates
**Goal**: Update forms to work with new data model

#### 5.1 Form Schemas
- [x] Update Zod schemas to match domain types
- [x] Add proper validation for new fields
- [x] Update form submission handlers

#### 5.2 Form Components
- [x] Update form field types and validation
- [x] Add support for new domain fields (location selection, etc.)
- [x] Update form error handling

### Phase 6: Testing and Validation
**Goal**: Ensure system works correctly with new storage

#### 6.1 Functionality Testing
- [ ] Test all CRUD operations with both storage providers
- [ ] Validate data consistency between old and new systems
- [ ] Test error handling and edge cases

#### 6.2 Performance Testing
- [ ] Compare performance between storage providers
- [ ] Optimize queries and data fetching
- [ ] Test with large datasets

### Phase 7: Cleanup and Documentation
**Goal**: Remove legacy code and update documentation

#### 7.1 Code Cleanup
- [ ] Remove unused legacy types and functions
- [ ] Clean up imports and dependencies
- [ ] Remove manual mapping code

#### 7.2 Documentation Updates
- [ ] Update API documentation
- [ ] Update component documentation
- [ ] Update README with new storage options

## Implementation Strategy

### Backward Compatibility
- Maintain both old and new data structures during transition
- Use feature flags to switch between storage providers
- Gradual migration of components

### Testing Strategy
- Test with both `google-sheets` and `turso` storage providers
- Validate data integrity during migration
- Use staging environment for full testing

### Rollback Plan
- Keep Google Sheets implementation as fallback
- Environment variable to switch storage providers
- Database migration rollback scripts

## File Structure Changes

### New Files
```
lib/
├── mappers/
│   ├── display-mappers.ts      # Frontend data transformation
│   └── api-mappers.ts          # API response transformation
├── types/
│   ├── api-types.ts            # API-specific types
│   └── display-types.ts        # Frontend display types
```

### Modified Files
```
app/api/matches/
├── route.ts                    # Simplified response format
└── [matchId]/route.ts          # Remove manual mapping

hooks/
└── use-matches.ts              # Updated types and data handling

app/matches/
├── matches-client-page.tsx     # Updated data mapping
└── [matchId]/
    ├── match-client-page.tsx   # Updated data access
    └── components/             # Updated prop types

app/organizer/
├── page.tsx                    # Updated to use domain types
└── edit-match-form.tsx         # Updated form schema

lib/
├── types.ts                    # Remove legacy types
└── domain/types.ts             # Consolidated type definitions
```

## Success Criteria

- [ ] All components use domain types instead of legacy types
- [ ] API responses are consistent and properly typed
- [ ] No manual data mapping in API routes
- [ ] Both storage providers work seamlessly
- [ ] Performance is maintained or improved
- [ ] All existing functionality works with new storage
- [ ] Code is cleaner and more maintainable

## Timeline

- **Phase 1-2**: 2-3 days (Type system and API updates)
- **Phase 3-4**: 3-4 days (Frontend component updates)
- **Phase 5**: 1-2 days (Form updates)
- **Phase 6**: 2-3 days (Testing and validation)
- **Phase 7**: 1 day (Cleanup and documentation)

**Total Estimated Time**: 9-13 days

## Notes

- This migration maintains backward compatibility with Google Sheets
- The new storage system provides better performance and scalability
- All changes are designed to be non-breaking during transition
- Environment variables control which storage provider is used

## Current Status (Updated)

### ✅ **COMPLETED (Phases 1, 2, 3, 5)**
- Type system consolidation with display mappers
- API layer modernization with proper response formats
- Frontend component updates for core functionality
- Form and validation updates with location selection
- Fixed client-side import issues

### 🔄 **IN PROGRESS (Phase 4)**
- Data flow optimization
- React Query updates
- State management improvements

### ❌ **PENDING (Phases 6, 7)**
- Comprehensive testing with both storage providers
- Performance testing and optimization
- Code cleanup and documentation updates
- Component-specific updates for match detail components

### 🚨 **CRITICAL ISSUES RESOLVED**
- ✅ Fixed client-side Google Sheets import errors
- ✅ Implemented proper location selection in forms
- ✅ Updated all core components to use new data structures

### 📋 **REMAINING TASKS**
1. Update remaining match detail components (match-header, match-stats, players-table)
2. Complete comprehensive testing with both storage providers
3. Performance optimization and testing
4. Code cleanup and documentation updates
5. Update signup API response format
