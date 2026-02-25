import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

initializeApp();

const TOP_N = 200;

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

    // 2. Score each item — only need id, timestamp, and engagement for ranking
    const scored = Object.entries(items)
      .filter(([, item]) => item?.content)
      .map(([id, item]) => {
        const like_count    = item.likes    ? Object.keys(item.likes).length    : 0;
        const dislike_count = item.dislikes ? Object.keys(item.dislikes).length : 0;
        const star_count    = item.stars    ? Object.keys(item.stars).length    : 0;
        return {
          itemId:     id,
          timestamp:  item.timestamp || 0,
          engagement: like_count + dislike_count + star_count,
        };
      });

    // 3. Top posts all time — store ordered ID array (rank = index)
    const allTimeSorted = [...scored]
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, TOP_N)
      .map(item => item.itemId);

    // 4. Top posts past week — same, time-filtered
    const weekSorted = scored
      .filter(item => item.timestamp >= oneWeekAgo)
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, TOP_N)
      .map(item => item.itemId);

    // 5. Explore leaderboards — top items per category type, ranked by avg score
    //    Single pass: build catId→type lookup, then aggregate items by image URL
    const EXPLORE_TYPES = ['Movies', 'Albums', 'Songs', 'Shows'];
    const catTypeMap = {};
    for (const [catId, cat] of Object.entries(categories)) {
      catTypeMap[catId] = cat.category_type;
    }

    const exploreAgg = { Movies: {}, Albums: {}, Songs: {}, Shows: {} };
    for (const [, item] of Object.entries(items)) {
      const type = catTypeMap[item.category_id];
      if (!EXPLORE_TYPES.includes(type)) continue;
      if (!item.image || !item.content || item.score == null || item.score < 0) continue;

      const key = item.image;
      if (!exploreAgg[type][key]) {
        exploreAgg[type][key] = { image: key, name: item.content, score: 0, num_items: 0 };
        if (item.artist) exploreAgg[type][key].artist = item.artist;
      }
      exploreAgg[type][key].score     += item.score;
      exploreAgg[type][key].num_items += 1;
      exploreAgg[type][key].name       = item.content; // last write wins for name
      if (item.artist) exploreAgg[type][key].artist = item.artist;
    }

    const topExplore = {};
    for (const type of EXPLORE_TYPES) {
      topExplore[`top_${type.toLowerCase()}`] = Object.values(exploreAgg[type])
        .filter(v => v.num_items > 1)
        .sort((a, b) => (b.score / b.num_items) - (a.score / a.num_items))
        .slice(0, TOP_N);
    }

    // 6. Top catalogers — sum num_items per user with per-type breakdown
    //    Kept fully denormalized since total_items is computed, not stored on user nodes
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
        rank:             i + 1,
      }));

    const catalogersMap = topCatalogers.reduce((acc, item) => {
      const { userId, ...rest } = item;
      acc[userId] = rest;
      return acc;
    }, {});

    // 7. Atomic write — replaces entire /leaderboards node
    await db.ref('leaderboards').set({
      top_posts_all_time:  allTimeSorted,
      top_posts_past_week: weekSorted,
      top_catalogers:      catalogersMap,
      ...topExplore,
      meta: {
        last_updated:  now,
        items_scanned: Object.keys(items).length,
        users_scanned: Object.keys(users).length,
      },
    });

    console.log(
      `Done — all_time: ${allTimeSorted.length}, ` +
      `past_week: ${weekSorted.length}, ` +
      `catalogers: ${topCatalogers.length}, ` +
      EXPLORE_TYPES.map(t => `${t.toLowerCase()}: ${topExplore[`top_${t.toLowerCase()}`].length}`).join(', ')
    );
  }
);
