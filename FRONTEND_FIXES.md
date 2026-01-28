# 🐛 Frontend Query Fix Summary

## Problem Identified

**Issue:** Frontend showing "Total Stories: 0" despite database having 2,396 stories.

**Root Cause:** Query files still referencing OLD schema column names that no longer exist:
- `hebrew_month_index` ❌ 
- `hebrew_day` ❌
- `external_id` ❌

**Error:** Supabase queries failing silently because columns don't exist in new schema.

---

## Files Updated

### 1. ✅ `/src/features/stories/api/getStories.ts`

**Before:**
```typescript
.order("hebrew_month_index", { ascending: true })
.order("hebrew_day", { ascending: true });
```

**After:**
```typescript
.order("date_en", { ascending: true });
```

### 2. ✅ `/src/app/admin/page.tsx`

**Updated:**
- Search query: `external_id` → `story_id`
- Sort columns: `external_id` → `story_id`, `date` → `date_he`/`date_en`
- Table display: All column references updated

### 3. ✅ `/src/features/stories/types.ts`

**Updated:** Story type definition to match new 10-column schema

### 4. ✅ `/src/features/stories/components/StoryTable.tsx`

**Updated:** Display columns for new schema fields

---

## Testing Checklist

- [ ] Refresh admin dashboard - should show 2,396 stories
- [ ] Verify table displays all 8 columns correctly
- [ ] Test search functionality
- [ ] Test column sorting (ID, Hebrew Date, English Date, Title EN)
- [ ] Verify Hebrew text displays correctly

---

## Expected Result

**Admin Dashboard should now show:**
- Total Stories: 2,396
- All columns populated: ID, Hebrew Date, English Date, Rabbi (HE/EN), Title (HE/EN)
- Sortable columns working
- Search working across all fields
