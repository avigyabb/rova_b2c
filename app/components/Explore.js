import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Keyboard, TouchableWithoutFeedback, FlatList, TouchableOpacity } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, query, orderByChild, equalTo, get } from "firebase/database";
import { Image } from 'expo-image';
import Profile from './Profile';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import ExploreItemTile from './ExploreComponents/ExploreItemTile';


const CATEGORY_VIEWS = [
  { key: 'top_movies', label: 'Top Movies', type: 'Movies', icon: 'film', iconLib: 'Ionicons' },
  { key: 'top_albums', label: 'Top Albums', type: 'Albums', icon: 'albums', iconLib: 'Ionicons' },
  { key: 'top_shows',  label: 'Top Shows',  type: 'Shows',  icon: 'tv',    iconLib: 'Ionicons' },
  { key: 'top_songs',  label: 'Top Songs',  type: 'Songs',  icon: 'musical-notes', iconLib: 'Ionicons' },
];

const Explore = ({ route, navigation }) => {
  const { userKey } = route.params;
  const [userListData, setUserListData] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [exploreView, setExploreView] = useState('Home');
  const [leaderboards, setLeaderboards] = useState({});
  const [itemsInCategories, setItemsInCategories] = useState({
    Movies: new Set(),
    Albums: new Set(),
    Songs:  new Set(),
    Shows:  new Set(),
  });

  // Build a Set of item.image values the user has already ranked, per category type
  const checkUserMatches = async () => {
    const q = query(ref(database, 'categories'), orderByChild('user_id'), equalTo(userKey));
    const snap = await get(q);
    if (!snap.exists()) return;

    const promises = [];
    const catsByType = { Movies: [], Albums: [], Songs: [], Shows: [] };
    snap.forEach(child => {
      const type = child.val().category_type;
      if (catsByType[type]) catsByType[type].push(child.key);
    });

    const sets = { Movies: new Set(), Albums: new Set(), Songs: new Set(), Shows: new Set() };
    for (const [type, catIds] of Object.entries(catsByType)) {
      for (const catId of catIds) {
        promises.push(
          get(query(ref(database, 'items'), orderByChild('category_id'), equalTo(catId)))
            .then(itemsSnap => {
              if (itemsSnap.exists()) {
                itemsSnap.forEach(item => {
                  if (item.val().image) sets[type].add(item.val().image);
                });
              }
            })
        );
      }
    }
    await Promise.all(promises);
    setItemsInCategories(sets);
  };

  useEffect(() => {
    // Fetch leaderboards and users in parallel
    Promise.all([
      get(ref(database, 'leaderboards')),
      get(ref(database, 'users')),
    ]).then(([lbSnap, usersSnap]) => {
      if (lbSnap.exists()) {
        const lb = lbSnap.val();
        setLeaderboards({
          top_movies: Object.values(lb.top_movies || {}),
          top_albums: Object.values(lb.top_albums || {}),
          top_shows:  Object.values(lb.top_shows  || {}),
          top_songs:  Object.values(lb.top_songs  || {}),
        });
      }
      if (usersSnap.exists()) {
        setUserListData(
          Object.entries(usersSnap.val()).map(([id, u]) => ({ ...u, id }))
        );
      }
    }).catch(err => console.error('Explore fetch failed:', err));

    checkUserMatches();
  }, []);

  const UserTile = ({ item }) => {
    if (item.username && item.username.toLowerCase().includes(searchVal.toLowerCase())) {
      return (
        <TouchableOpacity onPress={() => userKey === item.id ? {} : setExploreView({ userKey: item.id, username: item.username })}>
          <View style={{ flexDirection: 'row', padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, backgroundColor: 'white', alignItems: 'center' }}>
            <Image
              source={item.profile_pic ? { uri: item.profile_pic } : 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
              style={{ height: 50, width: 50, borderWidth: 0.5, marginRight: 10, borderRadius: 25, borderColor: 'lightgrey' }}
              contentFit="cover"
              cachePolicy="memory-and-disk"
              transition={100}
              recyclingKey={item.profile_pic || item.id}
            />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.name}</Text>
                {item.user_type === 'verified' && <MaterialIcons name="verified" size={16} color="#00aced" style={{ marginLeft: 5 }} />}
              </View>
              <Text style={{ color: 'grey' }}>@{item.username}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
  };

  const CategoryLeaderboardView = ({ leaderboardKey, label, type }) => {
    const data = leaderboards[leaderboardKey] || [];
    return (
      <View style={{ backgroundColor: 'white', height: '100%' }}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setExploreView('Home')}>
            <Ionicons name="arrow-back" size={30} color="black" />
          </TouchableOpacity>
          <Text>{label}</Text>
        </View>
        <View style={{ padding: 20, borderBottomWidth: 1, borderColor: 'lightgrey' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 30, fontStyle: 'italic' }}>{label}</Text>
          <Text style={{ color: 'grey', marginTop: 10 }}>{data.length} ranked.</Text>
        </View>
        <FlatList
          data={data}
          renderItem={({ item, index }) => (
            <ExploreItemTile item={item} index={index} itemsInCategory={itemsInCategories[type]} />
          )}
          keyExtractor={item => item.image}
          numColumns={1}
          key="single-column"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
        />
      </View>
    );
  };

  if (exploreView === 'Home') {
    return (
      <View style={{ backgroundColor: 'white', height: '100%', paddingHorizontal: 20 }}>
        <Text style={{ color: 'black', fontSize: 24, fontFamily: 'Poppins Regular', marginTop: 10 }}>ambora\social</Text>
        <View>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderRadius: 5, borderColor: 'lightgrey', marginTop: 20 }}
            onPress={() => setExploreView(null)}
          >
            <MaterialIcons name="person-search" size={30} color="black" />
            <Text style={{ marginLeft: 10, fontWeight: 'bold', fontSize: 15 }}>Search Users</Text>
          </TouchableOpacity>

          {CATEGORY_VIEWS.map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderRadius: 5, borderColor: 'lightgrey', marginTop: 20 }}
              onPress={() => setExploreView(key)}
            >
              <Ionicons name={icon} size={30} color="black" />
              <Text style={{ marginLeft: 10, fontWeight: 'bold', fontSize: 15 }}>{label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderRadius: 5, borderColor: 'lightgrey', marginTop: 20 }}
            onPress={() => setExploreView('Events')}
          >
            <Ionicons name="basketball-sharp" size={30} color="black" />
            <Text style={{ marginLeft: 10, fontWeight: 'bold', fontSize: 15 }}>Events</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (exploreView === 'Events') {
    return (
      <View>
        <View style={{ backgroundColor: 'white' }}>
          <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setExploreView('Home')}>
              <Ionicons name="arrow-back" size={30} color="black" />
            </TouchableOpacity>
            <Text>Events</Text>
          </View>
        </View>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={{ backgroundColor: 'white', paddingHorizontal: 20, height: '100%' }}>
            <View style={{ flex: 1, alignItems: 'center', marginTop: '30%' }}>
              <Text style={{ color: 'gray', fontSize: 20, marginBottom: 30 }}>Coming Soon! 🗓️</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    );
  }

  // Category leaderboard views (Movies, Albums, Shows, Songs)
  const categoryView = CATEGORY_VIEWS.find(v => v.key === exploreView);
  if (categoryView) {
    return <CategoryLeaderboardView leaderboardKey={categoryView.key} label={categoryView.label} type={categoryView.type} />;
  }

  // Profile view (exploreView is an object { userKey, username })
  if (exploreView) {
    return (
      <Profile
        route={{ params: {
          userKey:       exploreView.userKey,
          username:      exploreView.username,
          visitingUserId: userKey,
          setFeedView:   setExploreView,
        }}}
        navigation={navigation}
      />
    );
  }

  // User search view
  return (
    <>
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ backgroundColor: 'white', paddingHorizontal: 20, height: '100%' }}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setExploreView('Home')}>
            <Ionicons name="arrow-back" size={30} color="black" />
          </TouchableOpacity>
          <Text>User Search</Text>
        </View>
        <TextInput
          placeholder="Search Users..."
          value={searchVal}
          onChangeText={setSearchVal}
          placeholderTextColor="gray"
          style={{ fontSize: 16, borderColor: 'lightgrey', borderWidth: 0.5, borderRadius: 30, padding: 10, paddingHorizontal: 20, marginVertical: 15 }}
        />
        <FlatList
          data={userListData}
          renderItem={({ item, index }) => <UserTile item={item} index={index} />}
          keyExtractor={item => item.id}
          numColumns={1}
          key="single-column"
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={5}
          initialNumToRender={20}
        />
      </View>
    </TouchableWithoutFeedback>
    </>
  );
};

export default Explore;
