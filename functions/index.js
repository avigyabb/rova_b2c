import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

initializeApp();

const TOP_N = 200;

// Duplicated from app/consts.js — kept in sync manually
const DEFAULT_CATEGORY_TYPES = new Set(['Songs', 'Albums', 'Movies', 'Artists', 'Shows']);

const NOT_INCLUDED_CATEGORIES = new Set([
  'Test', 'Test3', 'When the', 'New2', 'New test', 'Random stuff',
  'Shows Test', 'The', 'New Test', 'Random items', 'Dvgg', 'dtd',
  'Things I Didn\'t Enjoy That Much', 'Things i dislike',
]);

const LARGER_CATEGORIES = {
  'anime': 'Anime', 'Shows/Anime': 'Anime',
  'Disney rides': 'Amusement Park Rides',
  'artists': 'Artists',
  'carry brawlers': 'Brawl Stars', 'Top 10 Brawlers': 'Brawl Stars',
  'My favorite Brawlers': 'Brawl Stars', 'Brawl Stars Brawlers': 'Brawl Stars',
  'Hyper Cars': 'Cars',
  'Hikes/Cliff Jumping': 'Cliff Jumping',
  'Bevs': 'Food', 'Meals': 'Food', 'Chocolate': 'Food',
  'Homecooked Meals': 'Food', 'starbucks orders': 'Food',
  "every food i've ever eaten": 'Food', 'Food Around USC': 'Food',
  'Disneyland food': 'Food', "Food I've Had While High": 'Food', 'Cuisines': 'Food',
  'fit checks': 'Fashion', 'Jeans/tops': 'Fashion',
  'Interesting life takes n advice of mine': 'Life Advice',
  'Self improvement': 'Life Advice', 'Life': 'Life Advice',
  'places': 'Locations', 'General Locations': 'Locations',
  'Destinations': 'Locations', 'Places': 'Locations',
  'Best Countries': 'Locations', 'Cities': 'Locations',
  "Places i've been too/restaurants": 'Locations',
  'Cities/Locations': 'Locations', 'Regions': 'Locations',
  "Places i've been off the drank": 'Locations', 'Sesh spots': 'Locations',
  'Cities/Towns': 'Locations', 'USC study spots': 'Locations',
  'Places in SD': 'Locations', 'Specific Locations/Experiences': 'Locations',
  'mmmm': 'NBA', 'Basketball Players': 'NBA',
  'NBA Games I\u2019ve Been To': 'NBA',
  'GHC Freaks': 'People', 'unc wylin': 'People',
  'HopSkipDriver Uncs': 'People', 'Boxers': 'People',
  'The Bhaddest': 'People', 'Best Africans': 'People',
  'Best Armenian Thugs': 'People', 'People/characters': 'People',
  'IB Warriors': 'People', 'Top Melkonian Marauders': 'People',
  'GHC Big Backs': 'People', 'Ghc Teachers': 'People',
  'People who need to go to sleep': 'People',
  'El segundo freaks': 'People', 'Freaky ah': 'People',
  'Dylans': 'People', 'hi jason': 'People', 'Yahdel': 'People',
  'Ambora Profiles': 'People', 'Impractical Jokes Special Guests': 'People',
  'best starter(all gens)': 'Pokemon', 'pokemon regions': 'Pokemon',
  'Photos With Aura': 'Photos', 'Pictures': 'Photos', 'Images': 'Photos',
  'Street Taco Rankings': 'Restaurants', 'Food Spots': 'Restaurants',
  'Restaurants/Food': 'Restaurants', 'Fast Food': 'Restaurants',
  'Street Food': 'Restaurants', 'Eats': 'Restaurants',
  'Street Tacos': 'Restaurants', "Places i've been too/restaurants": 'Restaurants',
  'Faves \uD83E\uDD29': 'Restaurants',
  'On Repeat': 'Songs', 'top 5 songs of all time': 'Songs',
  'Kendrick vs. Drake Disstracks': 'Songs',
  'sneakers/shoes': 'Shoes', 'running shoes': 'Shoes',
  'shows/movies': 'Shows', 'shows': 'Shows', 'TV Shows': 'Shows',
  'Superhero Shows': 'Shows',
  'shows ranked on how happy they made me': 'Shows',
  'TV': 'Shows', 'goodness': 'Shows',
  'Valorant Maps': 'Valorant', 'Val Maps': 'Valorant',
  'Urbex spots': 'Urbex', 'Urbex destinations': 'Urbex',
};

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

    // Pre-pass: find custom category names used by 2+ users (for chip visibility threshold)
    const customNameUserSets = {};
    for (const cat of Object.values(categories)) {
      if (!cat.user_id || !cat.num_items) continue;
      const type = cat.category_type;
      if (type && type !== 'null' && DEFAULT_CATEGORY_TYPES.has(type)) continue;
      const raw = cat.category_name?.trim();
      if (!raw || NOT_INCLUDED_CATEGORIES.has(raw)) continue;
      const mapped = LARGER_CATEGORIES[raw] || raw;
      if (!customNameUserSets[mapped]) customNameUserSets[mapped] = new Set();
      customNameUserSets[mapped].add(cat.user_id);
    }
    const popularCustomNames = new Set(
      Object.entries(customNameUserSets)
        .filter(([, users]) => users.size > 1)
        .map(([name]) => name)
    );

    const userCatalogData = {};
    for (const cat of Object.values(categories)) {
      if (!cat.user_id || !cat.num_items) continue;
      const uid = cat.user_id;
      if (!userCatalogData[uid]) userCatalogData[uid] = { total: 0, by_type: {} };
      userCatalogData[uid].total += cat.num_items;

      const type = cat.category_type;
      if (type && type !== 'null' && DEFAULT_CATEGORY_TYPES.has(type)) {
        // Default type (Songs, Albums, Movies, Artists, Shows)
        userCatalogData[uid].by_type[type] =
          (userCatalogData[uid].by_type[type] || 0) + cat.num_items;
      } else {
        // Custom category — map through largerCategories, include only if popular
        const raw = cat.category_name?.trim();
        if (!raw || NOT_INCLUDED_CATEGORIES.has(raw)) continue;
        const mapped = LARGER_CATEGORIES[raw] || raw;
        if (!popularCustomNames.has(mapped)) continue;
        userCatalogData[uid].by_type[mapped] =
          (userCatalogData[uid].by_type[mapped] || 0) + cat.num_items;
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
