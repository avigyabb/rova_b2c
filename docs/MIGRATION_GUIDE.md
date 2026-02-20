# Migration Guide: moment → date-fns

## Why Migrate?
- moment is in maintenance mode
- date-fns is smaller and tree-shakeable
- Both in current dependencies

## API Equivalents

### fromNow()
```javascript
// Before (moment)
import moment from 'moment';
const str = moment(timestamp).fromNow();

// After (date-fns)
import { formatDistanceToNow } from 'date-fns';
const str = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
```

### format()
```javascript
// Before (moment)
moment(date).format('MMMM Do YYYY');

// After (date-fns)
import { format } from 'date-fns';
format(new Date(date), 'MMMM do yyyy');
```

### isSame()
```javascript
// Before (moment)
moment(a).isSame(b, 'day');

// After (date-fns')
import { isSameDay } from 'date-fns';
isSameDay(a, b);
```

## Files to Update
- `app/components/Feed.js` (line 18, 289)
- `app/components/NormalItemTile.js` (line 14, 242, 422)
