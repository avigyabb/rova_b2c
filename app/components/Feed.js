import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Text, View, FlatList, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, limitToLast, endBefore, startAt, get, update, set, push } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Hyperlink from 'react-native-hyperlink';
import { useFonts } from 'expo-font';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Profile from './Profile';
// import FeedItemTile from './FeedItemTile';
import NormalItemTile from './NormalItemTile';
import { getSpotifyAccessToken } from '../consts';
import axios from 'axios';
import qs from 'qs';
import { Buffer } from 'buffer';
import * as AuthSession from 'expo-auth-session';
import moment from 'moment';

const styles = StyleSheet.create({
  timesText: {
    color: 'black',
    fontWeight: 'bold',
  },
  timesButton: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'lightgrey',
    width: 85,
    borderRadius: 5,
  }
});

const useSpotifyAuth = (clientId, redirectUri) => {
  return AuthSession.useAuthRequest({
    redirectUri,
    clientId,
    scopes: ['user-modify-playback-state', 'user-read-playback-state'],
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
    extraParams: {
      show_dialog: 'true',
    },
  }, {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
  });
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const Feed = ({ route, navigation }) => {
  const [profileInfo, setProfileInfo] = useState({});
  const [listData, setListData] = useState([]);
  const [feedView, setFeedView] = useState(null);
  const [refreshed, setRefreshed] = useState(false);
  const [numFeedItems, setNumFeedItems] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const oldestTimestampRef = useRef(null);
  const { userKey } = route.params;
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    'Unbounded': require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });
  const [feedType, setFeedType] = useState('Following');
  const [topPostsTime, setTopPostsTime] = useState('All Time');
  const [notifications, setNotifications] = useState(null);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState(null);
  const spotifyRedirectUri = AuthSession.makeRedirectUri({ scheme: 'amborasocial' });
  const [request, response, promptAsync] = useSpotifyAuth('3895cb48f70545b898a65747b63b430d', spotifyRedirectUri);
  const [individualSpotifyAccessToken, setIndividualSpotifyAccessToken] = useState(null);
  const [numFollowers, setNumFollowers] = useState(1);
  const [index, setIndex] = useState(0);
  const [focusedItem, setFocusedItem] = useState(null);
  const [focusedItemDescription, setFocusedItemDescription] = useState(null);
  const [profileView, setProfileView] = useState(null);
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());

  const isBlockedUser = (userId) => blockedUserIds.has(userId);

  const filterBlockedPosts = (items = []) => {
    return items.filter((feedItem) => !isBlockedUser(feedItem.user_id));
  };

  const filterBlockedTopPosts = (groupedData = {}) => {
    return Object.keys(groupedData).reduce((acc, key) => {
      acc[key] = filterBlockedPosts(groupedData[key] || []);
      return acc;
    }, {});
  };

  const getListData = () => {
    setRefreshed(true);
    const constsRef = ref(database, 'consts');
    get(constsRef).then((snapshot0) => {
      const categoryItemsRef = query(ref(database, 'items'), orderByChild('timestamp'), limitToLast(50));

      get(categoryItemsRef).then((snapshot) => {
        if (snapshot.exists()) {
          const tempListData = Object.entries(snapshot.val())
          .filter(([key, value]) => {
            // return snapshot0.val().feedType === 'customDescription' ? value.description && !value.description.startsWith(": ") : true;
            return snapshot0.val().feedType === 'customDescription' ? value?.custom ?? true : true;
          })
          .map(([key, value]) => ({ key, ...value }));
          const filteredData = filterBlockedPosts(tempListData).sort((a, b) => b.timestamp - a.timestamp);
          setListData(filteredData);
          setNumFeedItems(20);
          if (filteredData.length > 0) {
            oldestTimestampRef.current = filteredData[filteredData.length - 1].timestamp;
          }
        }
        setRefreshed(false);
      }).catch((error) => {
        console.error("Error fetching categories:", error);
      });
  
      const userRef = ref(database, 'users/' + userKey);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          console.log(snapshot.val());
          setProfileInfo(snapshot.val());
        } else {
          console.log("No user data.");
        }
      }).catch((error) => {
        console.error(error);
      });
    })
  }

  const loadMoreItems = () => {
    if (loadingMore) return;

    if (feedType === 'For You') {
      if (!oldestTimestampRef.current) return;
      setLoadingMore(true);
      const moreRef = query(ref(database, 'items'), orderByChild('timestamp'), limitToLast(20), endBefore(oldestTimestampRef.current));
      get(moreRef).then((snapshot) => {
        if (snapshot.exists()) {
          const moreData = filterBlockedPosts(
            Object.entries(snapshot.val()).map(([key, value]) => ({ key, ...value }))
          ).sort((a, b) => b.timestamp - a.timestamp);
          setListData(prev => [...prev, ...moreData]);
          if (moreData.length > 0) {
            oldestTimestampRef.current = moreData[moreData.length - 1].timestamp;
          }
        }
        setLoadingMore(false);
      }).catch(() => setLoadingMore(false));
    } else {
      // Following / Top Posts: data already fetched, just reveal more
      setLoadingMore(true);
      setNumFeedItems(prev => prev + 20);
    }
  };

  // Reset the loadingMore guard after numFeedItems renders for Following/Top Posts
  useEffect(() => {
    if (feedType !== 'For You') {
      setLoadingMore(false);
    }
  }, [numFeedItems]);

  const getFollowingListData = () => {
    setRefreshed(true);
    const userFollowingRef = ref(database, 'users/' + userKey + '/following');
    let followingList = [];
    get(userFollowingRef).then((snapshot) => {
      if (snapshot.exists()) {
        followingList = Object.keys(snapshot.val());
        const categoryItemsRef = query(ref(database, 'items'), orderByChild('timestamp'), limitToLast(1000));
        get(categoryItemsRef).then((inner_snapshot) => {
          if (inner_snapshot.exists()) {
            const tempListData = Object.entries(inner_snapshot.val()).map(([key, value]) => ({ key, ...value }));
            const filteredData = tempListData.filter(item => followingList.includes(item.user_id) && !isBlockedUser(item.user_id));
            setListData(filteredData.sort((a, b) => b.timestamp - a.timestamp));
            setNumFeedItems(20);
          }
          setRefreshed(false);
        }).catch((error) => {
          console.error("Error fetching categories:", error);
        });
      } else {
        setNumFollowers(0);
      }
    })

    const userRef = ref(database, 'users/' + userKey);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setProfileInfo(snapshot.val());
      } else {
        console.log("No user data.");
      }
    }).catch((error) => {
      console.error(error);
    });
  }
  
  const getTopPostsListData = async () => {
    setRefreshed(true);

    const now = Date.now();

    const engagement = item =>
      (item.likes    ? Object.keys(item.likes).length    : 0) +
      (item.dislikes ? Object.keys(item.dislikes).length : 0) +
      (item.stars    ? Object.keys(item.stars).length    : 0);

    // Fetch items since a timestamp cutoff, sort by engagement client-side
    const fetchByTimestamp = cutoff =>
      get(query(ref(database, 'items'), orderByChild('timestamp'), startAt(cutoff)))
        .then(snap => {
          if (!snap.exists()) return [];
          return Object.entries(snap.val())
            .map(([key, val]) => ({ key, ...val }))
            .sort((a, b) => engagement(b) - engagement(a))
            .slice(0, 200);
        });

    // Fetch full items for a precomputed ranked ID array
    const fetchRankedItems = ids => {
      if (!ids) return Promise.resolve([]);
      return Promise.all(
        Object.values(ids).map(id => get(ref(database, 'items/' + id)))
      ).then(snaps =>
        snaps.filter(snap => snap.exists()).map(snap => ({ key: snap.key, ...snap.val() }))
      );
    };

    try {
      // All 3 initial reads fire in parallel
      const [lbSnap, pastHour, pastDay] = await Promise.all([
        get(ref(database, 'leaderboards')),
        fetchByTimestamp(now - 3600000),
        fetchByTimestamp(now - 86400000),
      ]);

      const lb = lbSnap.val() || {};
      const [allTime, pastWeek] = await Promise.all([
        fetchRankedItems(lb.top_posts_all_time),
        fetchRankedItems(lb.top_posts_past_week),
      ]);

      setListData(filterBlockedTopPosts({
        'Past Hour': pastHour,
        'Past Day':  pastDay,
        'Past Week': pastWeek,
        'All Time':  allTime,
      }));
      setNumFeedItems(20);
    } catch (err) {
      console.error('Top posts fetch failed:', err);
    } finally {
      setRefreshed(false);
    }

    get(ref(database, 'users/' + userKey)).then((snapshot) => {
      if (snapshot.exists()) {
        setProfileInfo(snapshot.val());
      } else {
        console.log("No user data.");
      }
    }).catch((error) => {
      console.error(error);
    });
  }

  const getNotifications = () => {
    const notificationsRef = ref(database, 'events/' + userKey);
    get(notificationsRef).then((snapshot) => {
      if (snapshot.exists()) {
        setNotifications(snapshot.val() ? 
          Object.keys(snapshot.val()).map(key => ({
            id: key,
            ...snapshot.val()[key]
          }))
          .filter(notification => notification.evokerId !== userKey) // Filter notifications by evokerId
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50)
          : []
        );
      }
    })

    const userRef = ref(database, 'users/' + userKey);
    update(userRef, {
      unreadNotifications: false
    })
  }

  // replace with function in consts ~
  const getSpotifyAccessToken = async () => {
    const client_id = '3895cb48f70545b898a65747b63b430d';
    const client_secret = '8d70ee092b614f58b488ce149e827ab1';
    const url = 'https://accounts.spotify.com/api/token';
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
    };
    const data = qs.stringify({'grant_type': 'client_credentials'});

    try {
      const response = await axios.post(url, data, {headers});
      setSpotifyAccessToken(response.data.access_token);
    } catch (error) {
      console.error('Error obtaining token:', error);
    }
  }

  useEffect(() => {
    const blockedUsersRef = ref(database, `users/${userKey}/blocked_users`);
    const unsubscribeBlockedUsers = onValue(blockedUsersRef, (snapshot) => {
      const blockedMap = snapshot.val() || {};
      setBlockedUserIds(new Set(Object.keys(blockedMap)));
    });

    return () => {
      unsubscribeBlockedUsers();
    };
  }, [userKey]);

  useEffect(() => {
    getSpotifyAccessToken()
    if (response?.type === 'success') {
      AuthSession.exchangeCodeAsync({
        clientId: '3895cb48f70545b898a65747b63b430d',
        redirectUri: spotifyRedirectUri,
        code: response.params.code,
        extraParams: {
          code_verifier: request.codeVerifier,  // Ensure this is correctly captured
        }
      }, {
        tokenEndpoint: 'https://accounts.spotify.com/api/token',
      })
      .then(result => {
        console.log('Access Token:', result.accessToken);
        setIndividualSpotifyAccessToken(result.accessToken);
      })
      .catch(error => {
        console.error("Failed to exchange token:", error);
      });
    }
    if (feedType === 'For You') {
      getListData();
    } else if (feedType === 'Following') {
      getFollowingListData();
    } else if (feedType === 'Top Posts') {
      getTopPostsListData();
    }
  }, [response, blockedUserIds]);

  const onBlockUserLocal = useCallback((blockedUserId) => {
    setBlockedUserIds((prev) => {
      const next = new Set(prev);
      next.add(blockedUserId);
      return next;
    });

    setListData((prev) => {
      if (Array.isArray(prev)) {
        return prev.filter((feedItem) => feedItem.user_id !== blockedUserId);
      }
      if (prev && typeof prev === 'object') {
        return Object.keys(prev).reduce((acc, key) => {
          acc[key] = (prev[key] || []).filter((feedItem) => feedItem.user_id !== blockedUserId);
          return acc;
        }, {});
      }
      return prev;
    });

    if (focusedItem && focusedItem.user_id === blockedUserId) {
      setFocusedItem(null);
    }
  }, [focusedItem]);

  const NotificationsTile = ({ item, visitingUserId }) => {
    const [userInfo, setUserInfo] = useState({});
    const [isFollowingBack, setIsFollowingBack] = useState(false);
    const [isLoadingFollowBack, setIsLoadingFollowBack] = useState(true);

    useEffect(() => {
      const userRef = ref(database, `users/${item.evokerId}`);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          setUserInfo(snapshot.val());
        }
      })

      const followingRef = ref(database, `users/${visitingUserId}/following/${item.evokerId}`);
      get(followingRef).then((snapshot) => {
        if (snapshot.exists()) {
          setIsFollowingBack(true);
          setIsLoadingFollowBack(false);
        } else {
          setIsFollowingBack(false);
          setIsLoadingFollowBack(false);
        }
      });
    }, [])

    const date = new Date(item.timestamp);
    const realDateStr = moment(item.timestamp).fromNow();
    const dateString = date ? date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: '2-digit',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : 'N/A';

    const handleFollowBack = () => {
      const followersRef = ref(database, `users/${item.evokerId}/followers/${visitingUserId}`);
      set(followersRef, { closeFriend: false }).then(() => {
        const followingRef = ref(database, `users/${visitingUserId}/following/${item.evokerId}`);
        set(followingRef, { closeFriend: false }).then(() => {
          setIsFollowingBack(true);
        });
      });
      const eventsRef = push(ref(database, 'events/' + item.evokerId));
      set(eventsRef, {
        evokerId: visitingUserId,
        content: 'followed you back!',
        timestamp: Date.now()
      });
      const userRef = ref(database, 'users/' + item.evokerId);
      update(userRef, {
        unreadNotifications: true
      })
    };

    const onItemPress = (item) => {
      const itemRef = ref(database, `items/${item.postId}`);
      get(itemRef).then((snapshot) => {
        const tempFocusedItem = snapshot.val();
        tempFocusedItem.key = item.postId;
        setFocusedItem(tempFocusedItem);
        setNotifications(null);
      });
    }

    return (
      <View style={{ width: '95%', flexDirection: 'row', padding: 10 }}>
        <TouchableOpacity onPress={() => {
          setFeedView({ userKey: item.evokerId, username: userInfo.username });
          setNotifications(null);
        }}>
          <Image
            source={userInfo.profile_pic || 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
            style={{ height: 30, width: 30, borderWidth: 0.5, marginRight: 10, borderRadius: 15, borderColor: 'lightgrey' }}
            contentFit="cover"
            cachePolicy="memory-and-disk"
            transition={100}
            recyclingKey={userInfo.profile_pic || item.evokerId}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', marginRight: 20 }}>{userInfo.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 15, marginTop: 5, flexShrink: 1 }}>{item.content} <Text style={{ color: 'grey', fontSize: 10 }}>{realDateStr}</Text></Text>
            {item.content.includes('follow') ? (
              <>
              {isLoadingFollowBack ? (
                <ActivityIndicator size="medium" color="black" style={{ marginTop: 20 }} />
              ) : (
                <TouchableOpacity style={{ backgroundColor: isFollowingBack ? 'gray' : '#00aced', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5, alignSelf: 'flex-end' }} onPress={handleFollowBack} disabled={isFollowingBack}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>
                    {isFollowingBack ? 'Friends' : 'Follow Back'}
                  </Text>
                </TouchableOpacity>
              )}
              </>
            ) : (
              item.image ? ( // TODO: should probably fetch from the postID instead of passing through the notification, but this works for now
                <TouchableOpacity onPress={() => onItemPress(item)}>
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: 50, height: 50 }}
                    contentFit="cover"
                    cachePolicy="memory-and-disk"
                    transition={100}
                    recyclingKey={item.image || item.id}
                  />
                </TouchableOpacity>
              ) : null
            )}
          </View>
        </View>
      </View>
    );
  }

  const keyExtractor = useCallback((item) => item.key, []);
  const renderFeedItem = useCallback(({ item }) => (
    <NormalItemTile item={item} userKey={userKey} setFeedView={setFeedView} navigation={navigation} visitingUserId={userKey} topPostsTime={topPostsTime} individualSpotifyAccessToken={individualSpotifyAccessToken} promptAsync={promptAsync} onBlockUser={onBlockUserLocal} />
  ), [topPostsTime, individualSpotifyAccessToken, promptAsync, onBlockUserLocal]);

  if (notifications) {
    return (
      <View style={{ backgroundColor: 'white', height: '100%' }}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
          <TouchableOpacity onPress={() => {
            setNotifications(null)
            setFeedType('For You')
            getListData();
          }}> 
            <Ionicons name="arrow-back" size={30} color="black" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Notifications</Text>
        </View>
        <FlatList
          data={notifications}
          renderItem={({ item}) => <NotificationsTile item={item} visitingUserId={userKey}/>}
        />
      </View>
    )
  }

  if (focusedItem) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => {
          setFocusedItem(null)
        }}> 
          <Ionicons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
  
      </View>
      <NormalItemTile item={focusedItem} userKey={userKey} visitingUserId={userKey} navigation={navigation} showComments={true} setFeedView={setFeedView} onBlockUser={onBlockUserLocal}/>
      </View>
    );
  }

  if (feedView) {
    return (
      <Profile 
        route={{'params': {
          userKey: feedView.userKey,
          username: feedView.username,
          visitingUserId: userKey,
          setFeedView: setFeedView
        }}}
        navigation={navigation}
      />
    )
  }

  return (
    <View style={{ backgroundColor: 'white', height: '100%' }}>
      <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center', width: '100%', paddingHorizontal: 20, justifyContent: 'space-between', }}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          {profileInfo && profileInfo.profile_pic ? (
            <Image
              source={{ uri: profileInfo.profile_pic }}
              style={{height: 30, width: 30, borderWidth: 0.5, borderRadius: 15, borderColor: 'lightgrey' }}
              contentFit="cover"
              cachePolicy="memory-and-disk"
              transition={100}
              recyclingKey={profileInfo.profile_pic || userKey}
            />
          ) : (
            <Image
              source={'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
              style={{height: 30, width: 30, borderWidth: 0.5, borderRadius: 15, borderColor: 'lightgrey' }}
              contentFit="cover"
              cachePolicy="memory-and-disk"
              transition={100}
              recyclingKey={userKey}
            />
          )}
        </TouchableOpacity>
        <Text style={{ color: 'black', fontSize: 24, fontFamily: 'Poppins Regular' }}>ambora\social</Text>
        <TouchableOpacity onPress={() => getNotifications()}>
          {profileInfo.unreadNotifications ? (
            <Ionicons name="notifications-sharp" size={28} color="#eb4034"/>
          ) : (
            <Ionicons name="notifications-outline" size={28} color="gray"/>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', padding: 20, justifyContent: 'space-evenly', borderColor: 'lightgrey', borderBottomWidth: 0.5 }}>
        <TouchableOpacity onPress={() => {
          setFeedType('Top Posts')
          getTopPostsListData();
        }}>
          <Text style={feedType === 'Top Posts' ? { color: 'black', fontSize: 16, fontWeight: 'bold' } : { color: 'gray', fontSize: 14, fontWeight: 'bold' }}>Top Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setFeedType('For You')
          getListData();
        }}>
          <Text style={feedType === 'For You' ? { color: 'black', fontSize: 16, fontWeight: 'bold' } : { color: 'gray', fontSize: 14, fontWeight: 'bold' }}>For You</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setFeedType('Following')
          getFollowingListData();
        }}>
          <Text style={feedType === 'Following' ? { color: 'black', fontSize: 16, fontWeight: 'bold' } : { color: 'gray', fontSize: 14, fontWeight: 'bold' }}>Following</Text>
        </TouchableOpacity>
      </View>
      
      {feedType === 'Top Posts' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 10, justifyContent: 'space-evenly' }}>
          <TouchableOpacity style={[styles.timesButton, topPostsTime === 'Past Hour' && {backgroundColor: 'black'}]} onPress={() => setTopPostsTime('Past Hour')}>
            <Text style={[styles.timesText, topPostsTime === 'Past Hour' && {color: 'white'}]}>Past Hour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timesButton, topPostsTime === 'Past Day' && {backgroundColor: 'black'}]} onPress={() => setTopPostsTime('Past Day')}>
            <Text style={[styles.timesText, topPostsTime === 'Past Day' && {color: 'white'}]}>Past Day</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timesButton, topPostsTime === 'Past Week' && {backgroundColor: 'black'}]} onPress={() => setTopPostsTime('Past Week')}>
            <Text style={[styles.timesText, topPostsTime === 'Past Week' && {color: 'white'}]}>Past Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timesButton, topPostsTime === 'All Time' && {backgroundColor: 'black'}]} onPress={() => setTopPostsTime('All Time')}>
            <Text style={[styles.timesText, topPostsTime === 'All Time' && {color: 'white'}]}>All Time</Text>
          </TouchableOpacity>
        </View>
      )}

      {refreshed ? (
        <>
        {numFollowers === 0 && feedType === 'Following' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontStyle: 'italic' }}>Follow Your Friends to See Posts</Text>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
          </View>
        )}
        </>
      ) : (
        <>
        {/*{listData.length > 0 && (
          <FeedItemTile item={listData[index]} userKey={userKey} setFeedView={setFeedView} navigation={navigation} visitingUserId={userKey} topPostsTime={topPostsTime} individualSpotifyAccessToken={individualSpotifyAccessToken} promptAsync={promptAsync} setIndex={setIndex}/>
        )} uncomment this for swiping*/}
        <FlatList
          data={
            feedType === 'Top Posts' && listData && listData[topPostsTime]
              ? listData[topPostsTime].slice(0, numFeedItems)
              : feedType === 'For You'
                ? listData
                : listData.slice(0, numFeedItems)
          }
          renderItem={renderFeedItem}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          numColumns={1}
          key={"single-column"}
          ListEmptyComponent={
            feedType === 'Top Posts' ? (
              <View style={{ alignItems: 'center', marginTop: 80 }}>
                <Text style={{ color: 'gray', fontSize: 16 }}>
                  {topPostsTime === 'All Time'
                    ? 'No posts yet'
                    : `No posts in the ${topPostsTime.toLowerCase()}`}
                </Text>
              </View>
            ) : null
          }
          onEndReached={loadMoreItems}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshed}
              onRefresh={() => {
                if (feedType === 'For You') getListData();
                else if (feedType === 'Following') getFollowingListData();
                else if (feedType === 'Top Posts') getTopPostsListData();
              }}
            />
          }
          style={{ zIndex: 1 }}
          showsVerticalScrollIndicator={false}
        />
        </>
      )}
    </View>
  )
};

export default Feed;
