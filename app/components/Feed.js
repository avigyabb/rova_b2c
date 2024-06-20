import React, { useState, useEffect, useMemo } from 'react';
import { Text, View, FlatList, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get, update, set, push } from "firebase/database";
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
  const [numFeedItems, setNumFeedItems] = useState(50);
  const { userKey } = route.params;
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    'Unbounded': require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });
  const [feedType, setFeedType] = useState('Following');
  const [topPostsTime, setTopPostsTime] = useState('Past Hour');
  const [itemInfo, setItemInfo] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState(null);
  const [request, response, promptAsync] = useSpotifyAuth('3895cb48f70545b898a65747b63b430d', 'exp://10.0.0.187:8081'); // how do I do this on my actual app
  const [individualSpotifyAccessToken, setIndividualSpotifyAccessToken] = useState(null);
  const [numFollowers, setNumFollowers] = useState(1);
  const [index, setIndex] = useState(0);
  const [focusedItem, setFocusedItem] = useState(null);
  const [focusedItemDescription, setFocusedItemDescription] = useState(null);
  const [profileView, setProfileView] = useState(null);

  const getListData = () => {
    setRefreshed(true);
    const constsRef = ref(database, 'consts');
    get(constsRef).then((snapshot0) => {
      const categoryItemsRef = ref(database, 'items');

      get(categoryItemsRef).then((snapshot) => {
        if (snapshot.exists()) {
          const tempListData = Object.entries(snapshot.val())
          .filter(([key, value]) => {
            // return snapshot0.val().feedType === 'customDescription' ? value.description && !value.description.startsWith(": ") : true;
            return snapshot0.val().feedType === 'customDescription' ? value?.custom ?? true : true;
          })
          .map(([key, value]) => ({ key, ...value }));
          setListData(tempListData.sort((a, b) => b.timestamp - a.timestamp));
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

  const getFollowingListData = () => {
    setRefreshed(true);
    const userFollowingRef = ref(database, 'users/' + userKey + '/following');
    let followingList = [];
    get(userFollowingRef).then((snapshot) => {
      if (snapshot.exists()) {
        followingList = Object.keys(snapshot.val());
        const categoryItemsRef = ref(database, 'items');
        get(categoryItemsRef).then((inner_snapshot) => {
          if (inner_snapshot.exists()) {
            const tempListData = Object.entries(inner_snapshot.val()).map(([key, value]) => ({ key, ...value }));
            const filteredData = tempListData.filter(item => followingList.includes(item.user_id));
            setListData(filteredData.sort((a, b) => b.timestamp - a.timestamp));
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
  
  const getTopPostsListData = () => {
    setRefreshed(true);
    const categoryItemsRef = ref(database, 'items');
    let tempListData = {};
    const oneHourAgo = Date.now() - 3600000;
    const oneDayAgo = Date.now() - 86400000;
    const oneWeekAgo = Date.now() - 604800000;

    get(categoryItemsRef).then((snapshot) => {
      if (snapshot.exists()) {
        tempListDataSorted = Object.entries(snapshot.val())
          .filter(([key, value]) => key !== 'undefined')
          .map(([key, value]) => ({ key, ...value }))
          .sort((a, b) => ((b.likes ? Object.keys(b.likes).length : 0) + (b.dislikes ? Object.keys(b.dislikes).length : 0)) - ((a.likes ? Object.keys(a.likes).length : 0) + (a.dislikes ? Object.keys(a.dislikes).length : 0)));

        tempListData['Past Hour'] = tempListDataSorted.filter(item => item.timestamp && item.timestamp > oneHourAgo)
        tempListData['Past Day'] = tempListDataSorted.filter(item => item.timestamp && item.timestamp > oneDayAgo)
        tempListData['Past Week'] = tempListDataSorted.filter(item => item.timestamp && item.timestamp > oneWeekAgo)
        tempListData['All Time'] = tempListDataSorted
        // console.log(tempListData)
        setListData(tempListData);
      }
      setRefreshed(false);
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });

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
    getSpotifyAccessToken()
    if (response?.type === 'success') {
      AuthSession.exchangeCodeAsync({
        clientId: '3895cb48f70545b898a65747b63b430d',
        redirectUri: 'exp://10.0.0.187:8081',
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
  }, [response]);

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
              item.image ? (
                <TouchableOpacity onPress={() => onItemPress(item)}>
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: 50, height: 50 }}
                  />
                </TouchableOpacity>
              ) : null
            )}
          </View>
        </View>
      </View>
    );
  }

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
      <NormalItemTile item={focusedItem} visitingUserId={userKey} navigation={navigation} showComments={true}/>
      </View>
    );
  }

  if (itemInfo) {
    const onBackPress = (params) => {
      setFeedView(params)
      setItemInfo(null)
    }

    return (
      <View style={{ backgroundColor: 'black', height: '100%' }}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
          <TouchableOpacity onPress={() => {
            setItemInfo(null) 
            setFeedType('For You')
            getListData();
          }}> 
            <Ionicons name="arrow-back" size={30} color="black" />
          </TouchableOpacity>
        </View>
        <NormalItemTile item={itemInfo} visitingUserId={userKey} navigation={navigation} editMode={false} showComments={true} setFeedView={onBackPress} individualSpotifyAccessToken={individualSpotifyAccessToken} promptAsync={promptAsync}/>
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
            />
          ) : (
            <Image
              source={'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
              style={{height: 30, width: 30, borderWidth: 0.5, borderRadius: 15, borderColor: 'lightgrey' }}
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
          <TouchableOpacity style={[styles.timesButton, topPostsTime === 'Past Hour' && {backgroundColor: 'black'}]} onPress={() => {setTopPostsTime('Past Hour') }}>
            <Text style={[styles.timesText, topPostsTime === 'Past Hour' && {color: 'white'}]}>Past Hour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timesButton, topPostsTime === 'Past Day' && {backgroundColor: 'black'}]} onPress={() => {setTopPostsTime('Past Day')}}>
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
          <FeedItemTile item={listData[index]} userKey={userKey} setFeedView={setFeedView} navigation={navigation} visitingUserId={userKey} topPostsTime={topPostsTime} setItemInfo={setItemInfo} individualSpotifyAccessToken={individualSpotifyAccessToken} promptAsync={promptAsync} setIndex={setIndex}/>
        )} uncomment this for swiping*/}
        <FlatList
          data={feedType === 'Top Posts' && listData && listData[topPostsTime] ? listData[topPostsTime].slice(0, numFeedItems) : listData.slice(0, numFeedItems)}
          renderItem={({ item }) => <NormalItemTile item={item} userKey={userKey} setFeedView={setFeedView} navigation={navigation} visitingUserId={userKey} topPostsTime={topPostsTime} setItemInfo={setItemInfo} individualSpotifyAccessToken={individualSpotifyAccessToken} promptAsync={promptAsync} />}
          keyExtractor={(item, index) => index.toString()}
          numColumns={1}
          key={"single-column"}
          onScroll={(event) => {
            const scrollY = event.nativeEvent.contentOffset.y;
            if (scrollY < -110 && !refreshed) {
              setRefreshed(true);
              if (feedType === 'For You') {
                getListData();
              } else if (feedType === 'Following') {
                getFollowingListData();
              } else if (feedType === 'Top Posts') {
                getTopPostsListData();
              }
            }
          }}
          scrollEventThrottle={1} // Define how often to update the scroll position
          style={{ zIndex: 1 }}
          showsVerticalScrollIndicator={false}
        />
        <View style={{ position: 'absolute', width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: 170 }}>
          <Ionicons name='reload' size={40} color='lightgray' />
        </View>
        </>
      )}
    </View>
  )
};

export default Feed;