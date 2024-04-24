import React, { useState, useEffect, useMemo } from 'react';
import { Text, View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Hyperlink from 'react-native-hyperlink';
import { useFonts } from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';
import Profile from './Profile';
import FeedItemTile from './FeedItemTile';

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
  const [feedType, setFeedType] = useState('For You');
  const [topPostsTime, setTopPostsTime] = useState('Past Hour');
  const [itemInfo, setItemInfo] = useState(null);
  const [notifications, setNotifications] = useState(null);


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
    let followingList = []
    get(userFollowingRef).then((snapshot) => {
      if (snapshot.exists()) {
        followingList = Object.keys(snapshot.val());
        const categoryItemsRef = ref(database, 'items');
        get(categoryItemsRef).then((inner_snapshot) => {
          if (inner_snapshot.exists()) {
            const tempListData = Object.values(inner_snapshot.val());
            const filteredData = tempListData.filter(item => followingList.includes(item.user_id));
            setListData(filteredData.sort((a, b) => b.timestamp - a.timestamp));
          }
          setRefreshed(false);
        }).catch((error) => {
          console.error("Error fetching categories:", error);
        });
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
          })).sort((a, b) => b.timestamp - a.timestamp) : []
        );
      }
    })
  }

  useEffect(() => {
    if (feedType === 'For You') {
      getListData();
    } else if (feedType === 'Following') {
      getFollowingListData();
    } else if (feedType === 'Top Posts') {
      getTopPostsListData();
    }
  }, []);

  const NotificationsTile = ({ item }) => {
    const [userInfo, setUserInfo] = useState({});

    useEffect(() => {
      const userRef = ref(database, `users/${item.evokerId}`);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          setUserInfo(snapshot.val());
        }
      })
    }, [])

    const date = new Date(item.timestamp);
    const dateString = date ? date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: '2-digit',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : 'N/A';

    return (
        <View style={{ flexDirection: 'row', padding: 10 }}>
          <TouchableOpacity onPress={() => setFeedView({userKey: item.evokerId, username: userInfo.username})}>
            <Image
              source={userInfo.profile_pic || profilePic}
              style={{height: 30, width: 30, borderWidth: 0.5, marginRight: 10, borderRadius: 15, borderColor: 'lightgrey' }}
            />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', marginRight: 20 }}>{userInfo.name}</Text>
              <Text style={{ color: 'grey', fontSize: 10 }}>{dateString}</Text>
            </View>
            <Text style={{ marginTop: 5 }}>{item.content}</Text>
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
            <MaterialIcons name="arrow-back" size={30} color="black" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Notifications</Text>
        </View>
        <FlatList
          data={notifications}
          renderItem={({ item}) => <NotificationsTile item={item} />}
        />
      </View>
    )
  }

  if (itemInfo) {
    return (
      <View style={{ backgroundColor: 'white', height: '100%' }}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
          <TouchableOpacity onPress={() => {
            setItemInfo(null) 
            setFeedType('For You')
            getListData();
          }}> 
            <MaterialIcons name="arrow-back" size={30} color="black" />
          </TouchableOpacity>
        </View>
        <FeedItemTile item={itemInfo} visitingUserId={userKey} navigation={navigation} editMode={false} showComments={true}/>
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
              source={profilePic}
              style={{height: 30, width: 30, borderWidth: 0.5, borderRadius: 15, borderColor: 'lightgrey' }}
            />
          )}
        </TouchableOpacity>
        <Text style={{ color: 'black', fontSize: 24, fontWeight: 'bold', fontFamily: 'Poppins Regular' }}>ambora\social</Text>
        <TouchableOpacity onPress={() => getNotifications()}>
          <MaterialIcons name="notifications-none" size={28} color="gray"/>
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
          <TouchableOpacity style={[styles.timesButton, topPostsTime === 'Past Hour' && {backgroundColor: 'black'}]} onPress={() => {setTopPostsTime('Past Hour') 
          console.log("loc2")}}>
            <Text style={[styles.timesText, topPostsTime === 'Past Hour' && {color: 'white'}]}>Past Hour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timesButton, topPostsTime === 'Past Day' && {backgroundColor: 'black'}]} onPress={() => {setTopPostsTime('Past Day') 
          console.log("loc2")}}>
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'gray', fontSize: 20, fontStyle: 'italic' }}>Loading . . . </Text>
        </View>
      ) : (
        <>
        <FlatList
          data={feedType === 'Top Posts' && listData && listData[topPostsTime] ? listData[topPostsTime].slice(0, numFeedItems) : listData.slice(0, numFeedItems)}
          renderItem={({ item }) => <FeedItemTile item={item} userKey={userKey} setFeedView={setFeedView} navigation={navigation} visitingUserId={userKey} topPostsTime={topPostsTime} setItemInfo={setItemInfo}/>}
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
          // onEndReachedThreshold={0.1}
          // onEndReached={() => setNumFeedItems(prevNumFeedItems => Math.min(prevNumFeedItems + 10, listData.length))}
          // ListFooterComponent={() => isFetchingMore ?  : null}
          style={{ zIndex: 1 }}
          showsVerticalScrollIndicator={false}
        />
        <View style={{ position: 'absolute', width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: 170 }}>
          <MaterialIcons name='autorenew' size={60} color='lightgray' />
        </View>
        </>
      )}
    </View>
  )
};

export default Feed;