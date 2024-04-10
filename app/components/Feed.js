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

// this function is repeated many times -> condense into one file ~
function getScoreColorHSL(score) {
  if (score < 0) {
    return '#A3A3A3'; // Gray color for negative scores
  }
  const cappedScore = Math.max(0, Math.min(score, 10));
  const hue = (cappedScore / 10) * 120;
  const lightness = 50 - score ** 1.3;
  return `hsl(${hue}, 100%, ${lightness}%)`;
}

const Feed = ({ route, navigation }) => {
  const [profileInfo, setProfileInfo] = useState({});
  const [listData, setListData] = useState([]);
  const [feedView, setFeedView] = useState(null);
  const [refreshed, setRefreshed] = useState(false);
  const [numFeedItems, setNumFeedItems] = useState(10);
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
      <Profile route={{'params': {
        userKey: feedView.userKey,
        username: feedView.username,
        visitingUserId: userKey,
        setFeedView: setFeedView
      }}}/>
    )
  }

  const ListItemTile = React.memo(({ item }) => {
    const userRef = ref(database, `users/${item.user_id}`);
    const [username, setUsername] = useState('');
    const [userImage, setUserImage] = useState(profilePic);
    const [dimensions, setDimensions] = useState({ width: undefined, height: undefined });

    const onImageLoad = (event) => {
      const { width, height } = event.source;
      // if (width < 260 ) {
      //   setDimensions({ width: 80, height: 80 * height / width });
      // } else {
        setDimensions({ width: 260, height: 260 * height / width });
      // }
    };

    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setUsername(snapshot.val().name)
        setUserImage(snapshot.val().profile_pic)
      }
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });

    let scoreColor = getScoreColorHSL(Number(item.score));
    const date = new Date(item.timestamp);
    const dateString = date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: '2-digit',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={{ padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, backgroundColor: 'white' }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 320 }}>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => userKey === item.user_id ? navigation.navigate('Profile') : setFeedView({userKey: item.user_id, username: username})}>
                <Image
                  source={userImage}
                  style={{height: 50, width: 50, borderWidth: 0.5, marginRight: 10, borderRadius: 25, borderColor: 'lightgrey' }}
                />
              </TouchableOpacity>
              <View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginRight: 20 }}>{username}</Text>
                  <Text style={{ color: 'grey', fontSize: 12 }}>{dateString}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, width: 260 }}>
                  {/* <Text>added</Text> */}
                  <Text style={{ color: 'gray', fontWeight: 'bold', fontSize: 13, fontStyle: 'italic' }}>
                    {item.category_name ? (item.score < 0 ? `${item.category_name}/Later/ ` : `${item.category_name}/ `) : null}
                    <Text style={{ fontWeight: 'bold', fontSize: 16, fontStyle: 'italic', color: 'black' }}>{item.content}</Text>
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={{ marginLeft: 60 }}>
                {item.description && item.description.length > 0 && (
                  <Hyperlink
                    linkDefault={ true }
                    linkStyle={ { color: '#2980b9', textDecorationLine: 'underline' } }
                    onPress={ (url, text) => Linking.openURL(url) }
                  >
                    <Text style={{ color: 'grey', fontSize: 15, marginTop: 5 }}>
                      {item.description}
                    </Text>
                  </Hyperlink>
                )}
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={{
                      height: dimensions.height, 
                      width: dimensions.width, 
                      borderWidth: 0.5, 
                      marginRight: 10, 
                      borderRadius: 5, 
                      borderColor: 'lightgrey' ,
                      marginTop: 10
                    }}
                    onLoad={onImageLoad}
                  />
                )}
            </View>
          </View>
          <View style={{ 
            borderColor: scoreColor, 
            marginLeft: 'auto',
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 4,
            borderWidth: 3
          }}>
            <Text style={{ color: scoreColor, fontWeight: 'bold' }}>{item.score > 0 ? item.score.toFixed(1) : '...'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          <TouchableOpacity style={{ marginRight: 10 }}>
            <MaterialIcons name="thumb-up" size={22} color="grey" />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginRight: 10 }}>
            <MaterialIcons name="thumb-down" size={22} color="grey" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ marginLeft: 'auto', marginRight: 10 }} 
            onPress={() => navigation.navigate('Add', {
              itemName: item.content,
              itemDescription: item.description,
              itemImage: item.image,
              hello: 'bye'
            })}>
            <MaterialIcons name="bookmark-add" size={30} color="grey" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Add', {
              itemCategory: item.category_id,
              itemName: item.content,
              itemDescription: item.description,
              itemImage: item.image
            })}
          >
            <MaterialIcons style={{}} name="add-circle" size={30} color="grey" />
          </TouchableOpacity>
        </View>
      </View>
    );
  })

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
          renderItem={({ item }) => <ListItemTile item={item} />}
          keyExtractor={(item, index) => index.toString()}
          numColumns={1}
          key={"single-column"}
          onScroll={(event) => {
            const scrollY = event.nativeEvent.contentOffset.y;
            if (scrollY < -110 && !refreshed) {
              setRefreshed(true);
              getListData();
              console.log('Scrolled too far up!');
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