import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

initializeApp();

const TOP_N = 50;

export const computeLeaderboards = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'America/New_York',
  },
  async () => {
    const db = getDatabase();
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // 1. Fetch all data in 3 parallel reads
    const [itemsSnap, usersSnap, categoriesSnap] = await Promise.all([
      db.ref('items').get(),
      db.ref('users').get(),
      db.ref('categories').get(),
    ]);

    const items = itemsSnap.val() || {};
    const users = usersSnap.val() || {};
    const categories = categoriesSnap.val() || {};

    // 2. Build user lookup map (denormalized for display)
    const userMap = {};
    for (const [uid, u] of Object.entries(users)) {
      userMap[uid] = {
        username: u.username || '',
        name: u.name || '',
        profile_pic: u.profile_pic || '',
      };
    }

    // 3. Enrich each item with engagement metrics
    const enriched = Object.entries(items)
      .filter(([, item]) => item?.content)
      .map(([id, item]) => {
        const like_count    = item.likes    ? Object.keys(item.likes).length    : 0;
        const dislike_count = item.dislikes ? Object.keys(item.dislikes).length : 0;
        const star_count    = item.stars    ? Object.keys(item.stars).length    : 0;
        const user = userMap[item.user_id] || {};
        return {
          itemId:        id,
          content:       item.content,
          score:         item.score ?? -1,
          user_id:       item.user_id || '',
          username:      user.username,
          name:          user.name,
          profile_pic:   user.profile_pic,
          image:         item.image || '',
          category_name: item.category_name || '',
          timestamp:     item.timestamp || 0,
          like_count,
          dislike_count,
          star_count,
          engagement:    like_count + dislike_count + star_count,
        };
      });

    // 4. Top posts all time
    const allTimeSorted = [...enriched]
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, TOP_N);

    // 5. Top posts past week
    const weekSorted = enriched
      .filter(item => item.timestamp >= oneWeekAgo)
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, TOP_N);

    // 6. Top catalogers — sum num_items per user across all categories, with per-type breakdown
    const userCatalogData = {};
    for (const cat of Object.values(categories)) {
      if (!cat.user_id || !cat.num_items) continue;
      const uid = cat.user_id;
      if (!userCatalogData[uid]) userCatalogData[uid] = { total: 0, by_type: {} };
      userCatalogData[uid].total += cat.num_items;
      const type = cat.category_type;
      if (type && type !== 'Locations') {
        userCatalogData[uid].by_type[type] =
          (userCatalogData[uid].by_type[type] || 0) + cat.num_items;
      }
    }
    const topCatalogers = Object.entries(userCatalogData)
      .filter(([uid]) => users[uid])
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, TOP_N)
      .map(([uid, data], i) => ({
        userId:           uid,
        username:         users[uid].username    || '',
        name:             users[uid].name        || '',
        profile_pic:      users[uid].profile_pic || '',
        total_items:      data.total,
        by_category_type: data.by_type,
        rank: i + 1,
      }));

    // 7. Shape into Firebase maps (key = id, rank added)
    const toMap = (arr, idField) =>
      arr.reduce((acc, item, i) => {
        const key = item[idField];
        const { [idField]: _, ...rest } = item;
        acc[key] = { ...rest, rank: i + 1 };
        return acc;
      }, {});

    // 8. Atomic write — replaces entire /leaderboards node
    await db.ref('leaderboards').set({
      top_posts_all_time:  toMap(allTimeSorted, 'itemId'),
      top_posts_past_week: toMap(weekSorted, 'itemId'),
      top_catalogers:      toMap(topCatalogers, 'userId'),
      meta: {
        last_updated:  now,
        items_scanned: Object.keys(items).length,
        users_scanned: Object.keys(users).length,
      },
    });

    console.log(
      `Done — all_time: ${allTimeSorted.length}, ` +
      `past_week: ${weekSorted.length}, ` +
      `catalogers: ${topCatalogers.length}`
    );
  }
);
