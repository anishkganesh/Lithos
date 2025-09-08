# Authentication Setup Complete

The authentication system from lithos_main has been successfully replicated in the main lithos app with the following features:

## Features Implemented

1. **Sign Up Page** (`/signup`)
   - Two-step form: Account details → Company details
   - Company name (stored as brand in database)
   - Email verification required
   - Creates both Supabase Auth user and usr table entry
   - First user for a company becomes admin

2. **Login Page** (`/login`)
   - Email and password authentication
   - Redirects to dashboard after successful login
   - Shows appropriate error messages

3. **Authentication Context**
   - Global auth state management
   - Automatic session persistence
   - Sign up, sign in, and sign out methods

4. **Protected Routes**
   - Dashboard requires authentication
   - Automatic redirect to login if not authenticated
   - User data displayed in sidebar

5. **Database Integration**
   - Uses existing `usr` and `brands` tables
   - Service role key for bypassing RLS during signup
   - Fetches user data from database

## Key Files Created/Modified

- `/lib/auth-context.tsx` - Authentication context provider
- `/lib/auth-utils.ts` - Authentication utility hooks
- `/lib/supabase-service.ts` - Supabase service client
- `/lib/hooks/use-user-data.ts` - Hook to fetch user data from database
- `/components/signup-form.tsx` - Sign up form component
- `/components/login-form.tsx` - Login form component
- `/app/signup/page.tsx` - Sign up page
- `/app/login/page.tsx` - Login page
- `/app/api/auth/signup/route.ts` - Sign up API route
- `/app/layout.tsx` - Added AuthProvider
- `/app/dashboard/page.tsx` - Added authentication protection
- `/components/app-sidebar.tsx` - Display user data
- `/components/nav-user.tsx` - Added sign out functionality
- `/middleware.ts` - Route protection middleware

## Environment Variables Required

Make sure you have these in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Testing the Authentication Flow

1. Start the development server: `npm run dev`
2. Navigate to `/signup` to create a new account
3. Fill in account details and company information
4. Check your email for verification link
5. After verification, login at `/login`
6. You'll be redirected to `/dashboard`
7. User information appears in the sidebar
8. Click logout to sign out

## Database Requirements

The following tables must exist in your Supabase database:

### `brands` table
- brand_id (primary key)
- brand_name
- brand_code
- description
- category
- website
- founded_year
- country
- is_active
- target_* fields (demographics)

### `usr` table
- email (primary key)
- password (managed by Supabase Auth)
- name
- brand_id (foreign key to brands)
- role (admin/member)
- is_active

## Notes

- The UI uses "Company Name" instead of "Brand Name" as requested
- Industry categories updated for mining/minerals context
- Email verification is required before login
- First user for a company becomes admin automatically
- Subsequent users for the same company become members
