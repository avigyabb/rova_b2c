import React, { useState, useEffect } from 'react';
import { Text, View, FlatList, TouchableOpacity } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Hyperlink from 'react-native-hyperlink';
import { useFonts } from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';
import Profile from './Profile';
import FeedItemTile from './FeedItemTile';


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


  const getListData = () => {
    setRefreshed(true);
    const categoryItemsRef = ref(database, 'items');

    get(categoryItemsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const tempListData = Object.values(snapshot.val());
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

  useEffect(() => {
    if (feedType === 'For You') {
      getListData();
    } else if (feedType === 'Following') {
      getFollowingListData();
    }
  }, []);

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
      <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center', width: '100%', paddingHorizontal: 20, justifyContent: 'space-between'  }}>
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
        <TouchableOpacity>
          <MaterialIcons name="settings" size={25} color="black"/>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', padding: 20, justifyContent: 'space-evenly', borderColor: 'lightgrey', borderBottomWidth: 0.5 }}>
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
      
      {refreshed ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'gray', fontSize: 20, fontStyle: 'italic' }}>Loading . . . </Text>
        </View>
      ) : (
        <>
        <FlatList
          data={listData.slice(0, numFeedItems)}
          renderItem={({ item }) => <FeedItemTile item={item} userKey={userKey} setFeedView={setFeedView} navigation={navigation}/>}
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
        <View style={{ position: 'absolute', width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: 120 }}>
          <MaterialIcons name='autorenew' size={60} color='lightgray' />
        </View>
        </>
      )}
    </View>
  )
};

export default Feed;