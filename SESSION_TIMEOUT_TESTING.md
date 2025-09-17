/**
 * Session Timeout Testing Guide
 * 
 * This implementation provides:
 * 
 * 1. JWT Token expires in 15 minutes
 * 2. Auto-logout check runs every 30 seconds 
 * 3. Users are automatically logged out when token expires
 * 4. All protected pages (main dashboard, user-create) have auto-logout protection
 * 
 * Testing Steps:
 * 
 * ## Normal Testing (15 minutes is too long):
 * For testing purposes, you can temporarily change the JWT expiry to 1-2 minutes:
 * 
 * In src/app/api/auth/login/route.ts:
 * Change: { expiresIn: '15m' }
 * To:     { expiresIn: '2m' }  // For testing
 * 
 * And update cookie maxAge:
 * Change: maxAge: 15 * 60 // 15 minutes  
 * To:     maxAge: 2 * 60  // 2 minutes for testing
 * 
 * ## Test Scenarios:
 * 
 * 1. Login with admin/admin123
 * 2. Navigate around the app (dashboard, user-create page)
 * 3. Wait for token expiry (15 minutes in production, 2 minutes for testing)
 * 4. Any navigation or auto-check will trigger logout
 * 5. User will be redirected to login page
 * 
 * ## Auto-Logout Features:
 * 
 * - Checks token validity every 30 seconds automatically
 * - Works on all protected pages
 * - Graceful logout with proper cleanup
 * - Clear error messages in console
 * - Proper cookie cleanup on logout
 * 
 * ## Production Settings:
 * 
 * - JWT expires in exactly 15 minutes
 * - Auto-check every 30 seconds  
 * - No user warning (can be added if needed)
 * - Immediate logout on token expiry
 * 
 * ## Security Benefits:
 * 
 * - Prevents long-lived sessions
 * - Automatic cleanup of expired tokens
 * - Consistent behavior across all pages
 * - No manual logout required
 * - Protection against forgotten sessions
 */

// This file is for documentation only
export {}