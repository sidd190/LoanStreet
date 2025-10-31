# 🧪 Authentication Flow Testing Guide

## Quick Test Steps

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test Login Flow
1. Go to `http://localhost:3000/admin`
2. Login with: `admin@quickloan.com` / `admin123`
3. Page should reload and stay on `/admin`
4. You should see the login form disappear (authenticated state)

### 3. Test Dashboard Access
1. Manually navigate to `http://localhost:3000/admin/dashboard`
2. Dashboard should load with stats
3. Should NOT show infinite loading spinner
4. Should display: Total Contacts, Active Campaigns, Messages Sent, Response Rate

### 4. Test Admin Pages
Navigate to each page and verify they load:
- ✅ `/admin/campaigns` - Should load campaign list
- ✅ `/admin/contacts` - Should load contact list  
- ✅ `/admin/analytics` - Should load analytics
- ✅ `/admin/import` - Should load import page
- ✅ `/admin/messages` - Should load messages
- ✅ `/admin/leads` - Should load leads

### 5. Test Logout
1. Click "Logout" in sidebar
2. Should redirect to `/admin` login page
3. Try accessing `/admin/dashboard` - should show "Authentication Required"

## Expected Behavior

### ✅ Working Correctly
- Login reloads page, stays on `/admin`
- No automatic redirects after login
- Dashboard loads stats without infinite spinner
- All admin pages accessible after login
- Logout clears session and redirects to login

### ❌ Issues to Watch For
- Infinite loading spinner on dashboard
- Automatic redirect to dashboard after login
- Pages showing "Authentication Required" when logged in
- Redirect loops between pages

## Debugging Tips

### Check Browser Console
```javascript
// Check if auth cookie is set
document.cookie

// Check user context in AdminLayout
// Should see user object logged when authenticated
```

### Check Network Tab
- `/api/auth/me` should return 200 with user data when authenticated
- `/api/dashboard/stats` should return 200 with stats data
- No 401 errors when logged in

### Common Issues

**Dashboard keeps loading:**
- Check if `/api/auth/me` returns user data
- Check if `userLoading` is set to false in AdminLayout
- Check browser console for errors

**Pages show "Authentication Required":**
- Check if auth cookie is set: `document.cookie`
- Check if `/api/auth/me` returns 200
- Try logging out and back in

**Redirect loops:**
- Check RouteProtection component
- Check AdminLayout authentication logic
- Look for `router.push()` calls in useEffect

## API Endpoints to Test

```bash
# Test auth status (should return user when logged in)
curl http://localhost:3000/api/auth/me \
  -H "Cookie: auth-token=YOUR_TOKEN"

# Test dashboard stats
curl http://localhost:3000/api/dashboard/stats \
  -H "Cookie: auth-token=YOUR_TOKEN"

# Test logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: auth-token=YOUR_TOKEN"
```

## Success Criteria

All of these should work:
- [x] Login without redirect
- [x] Dashboard loads stats
- [x] Campaigns page loads
- [x] Contacts page loads
- [x] Analytics page loads
- [x] Import page loads
- [x] Messages page loads
- [x] Leads page loads
- [x] Logout works
- [x] No infinite loading
- [x] No redirect loops

If all tests pass, the authentication system is working correctly! 🎉
