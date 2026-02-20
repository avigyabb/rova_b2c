# Performance Issues Analysis

## 1. FlatList Missing Optimizations

**Files Affected:**
- `app/components/Feed.js` (line 530)
- `app/components/FollowingFeed.js` (line 437)
- `app/components/Explore.js` (lines 264, 320)
- `app/components/CategoryList.js`

**Problem:** FlatLists use default rendering parameters which can cause:
- No `initialNumToRender` - renders all items immediately
- No `maxToRenderPerBatch` - renders too many items at once
- No `windowSize` - keeps too many items in memory
- No `removeClippedSubviews` - doesn't unmount off-screen items
- `keyExtractor` uses index which defeats React's diffing

**Impact:** Poor scrolling performance, especially on lower-end devices with large lists.

**Recommended Fix:**
```javascript
<FlatList
  data={listData}
  keyExtractor={(item) => item.key || item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  // ...
/>
```

## 2. Missing Memory Cleanup (onValue Listeners)

**Files Affected:**
- `app/components/Profile.js` (line 108+)

**Problem:** `onValue` listeners are attached but never cleaned up with `off()`. This causes:
- Memory leaks when component unmounts
- Stale listener accumulation
- Unexpected behavior on re-renders

**Recommended Fix:**
```javascript
useEffect(() => {
  const ref = query(...);
  const listener = onValue(ref, (snapshot) => {
    // ...
  });
  
  return () => off(ref, listener); // Cleanup on unmount
}, [userKey]);
```

## 3. Potential Firebase Query Issues

**Files Affected:** Multiple components using `orderByChild`

**Problem:** Queries like:
```javascript
query(itemsRef, orderByChild('category_id'), equalTo(category_id))
```

These require indexes on the Firebase side. Without proper indexing, full table scans occur.

**Recommended:** Define Firebase rules/indexes:
```json
{
  "rules": {
    ".read": "auth != null",
    "items": {
      ".indexOn": ["category_id", "user_id"]
    }
  }
}
```

## 4. Image Loading Without Caching

**Files Affected:** Multiple components using `Image` from expo-image

**Problem:** Large images loaded without proper caching configuration.

**Recommended:** Use proper caching:
```javascript
<Image
  source={{ uri: url }}
  cacheKey={item.id} // Enables disk caching
  transition={300}
/>
```

## 5. Large Bundle Size

**Potential Issues:**
- `react-native-vector-icons` imports all icons
- No code splitting/lazy loading
- Large assets (fonts, images) bundled

**Recommended:**
- Use tree-shaking for icons
- Implement lazy loading for screens
- Optimize assets
