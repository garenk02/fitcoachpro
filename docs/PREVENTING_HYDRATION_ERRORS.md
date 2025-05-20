# Preventing Hydration Errors in Next.js

This document provides guidelines for preventing hydration errors in our Next.js application, particularly when dealing with client-side data and server-side rendering.

## What are Hydration Errors?

Hydration errors occur when the HTML generated on the server doesn't match what the client tries to render during hydration. Common causes include:

1. Using browser-only APIs during server rendering (like `window`, `navigator`, etc.)
2. Different data being available on server vs. client
3. Date objects and formatting differences
4. Random values or IDs generated differently on server vs. client

## Solutions Implemented

We've implemented several solutions to prevent hydration errors:

### 1. ClientOnly Component

We created a `ClientOnly` component that only renders its children on the client side after hydration:

```tsx
// components/client-only.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### 2. Safe Initial State

We ensure that components have safe initial states that match on both server and client:

```tsx
// Instead of this:
const [isOnline, setIsOnline] = useState(navigator.onLine);

// Do this:
const [isOnline, setIsOnline] = useState(true); // Safe default

useEffect(() => {
  if (typeof window !== 'undefined') {
    setIsOnline(navigator.onLine);
  }
}, []);
```

### 3. Client-Side Data Fetching

We ensure data fetching happens only on the client side:

```tsx
useEffect(() => {
  // Only fetch data on the client side
  if (typeof window !== 'undefined') {
    fetchData();
  }
}, [fetchData]);
```

### 4. Safe Date Handling

We handle dates safely by only formatting them on the client side:

```tsx
{lastSyncTime && typeof window !== 'undefined' && (
  <span>Last update: {format(lastSyncTime, 'HH:mm')}</span>
)}
```

## Best Practices for Preventing Hydration Errors

1. **Use the ClientOnly component** for any UI that depends on client-side data or browser APIs
2. **Check for window/navigator** before using browser-only APIs
3. **Provide fallback UI** for server rendering
4. **Initialize state safely** with values that work on both server and client
5. **Defer data fetching** to client-side effects
6. **Handle dates carefully** by formatting them only on the client side
7. **Add null checks** for data that might not be available during server rendering

## Example Usage

### For components that use browser APIs:

```tsx
<ClientOnly fallback={<LoadingSkeleton />}>
  <MyComponentThatUsesBrowserAPIs />
</ClientOnly>
```

### For data-dependent UI:

```tsx
<ClientOnly>
  {data && data.length > 0 && (
    <DataTable data={data} />
  )}
</ClientOnly>
```

### For date formatting:

```tsx
<ClientOnly>
  {timestamp && (
    <span>Created: {format(new Date(timestamp), 'PPP')}</span>
  )}
</ClientOnly>
```

By following these guidelines, we can prevent hydration errors across our application and ensure a smooth user experience.
