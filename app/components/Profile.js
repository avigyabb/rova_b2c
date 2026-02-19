import React from 'react';
import { View, Alert, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ScrollView, ActivityIndicator, Share } from 'react-native';
import { Image as ReactImage } from 'react-native';
import { useFonts } from 'expo-font';
// import profilePic from '../../assets/images/lebron_profile_pic.webp';
import { database } from '../../firebaseConfig';
import { ref, set, onValue, push, query, equalTo, orderByChild, get, remove, update } from "firebase/database";
import { useEffect, useRef, useState } from 'react';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import CategoryList from './CategoryList';
import EditProfile from './EditProfile';
import AddCategory from './AddCategory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Hyperlink from 'react-native-hyperlink';
import FollowUsers from './FollowUsers';
import CategoryTile from './CategoryTile';

const styles = StyleSheet.create({
  profilePic: {
    width: 100,        // Specify the width
    height: 100,       // Specify the height
    borderRadius: 50,  // Make sure this is half of the width and height
    borderWidth: 0.5, 
    borderColor: 'lightgrey'
  },
  grid: {
    // alignItems: 'center',
    justifyContent: 'space-around'
  },
  tileText: {
    // existing text styles...
    color: 'white', // Ensure text is visible on likely darker images
    padding: 8, // Add padding to separate text from the edges
    fontWeight: 'bold',
    fontSize: 15
  },
  editButtons: {
    fontWeight: 'bold',
  },
  editContainer: {
    backgroundColor: 'lightgrey',
    padding: 8,
    fontSize: 13,
    width: '44%',
    borderRadius: 10,
    alignItems: 'center',
  },
  shareContainer: {
    backgroundColor: '#33c1ff',
    padding: 4,
    fontSize: 8,
    width: '10%',
    borderRadius: 10,
    alignItems: 'center',
  },
});

const Profile = ({ route, navigation }) => {
  const { userKey, setView, fetchUserData, visitingUserId, setFeedView } = route.params;
  const [profileInfo, setProfileInfo] = useState({});
  const [categories, setCategories] = useState({});
  const [archivedCategories, setArchivedCategories] = useState([]);
  const [focusedCategory, setFocusedCategory] = useState(null);
  const [focusedCategoryId, setFocusedCategoryId] = useState(null);
  const [focusedList, setFocusedList] = useState({'now': [], 'later': []});
  const [refreshed, setRefreshed] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [numItems, setNumItems] = useState(0);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [stableProfilePicUri, setStableProfilePicUri] = useState(null);
  const categoryRequestRef = useRef(0);

  const getUserInfo = () => {
    const userRef = ref(database, 'users/' + userKey);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setIsFollowing(snapshot.val().followers && snapshot.val().followers.hasOwnProperty(visitingUserId));
        setProfileInfo(snapshot.val());
      } else {
        console.log("No user data.");
      }
    }).catch((error) => {
      console.error(error);
    });
  }

  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    const userCategoriesQuery = query(categoriesRef, orderByChild('user_id'), equalTo(userKey));
    // Execute the query and listen for updates
    onValue(userCategoriesQuery, (snapshot) => {
      const activeCategories = [];
      const archived = [];

      snapshot.forEach((childSnapshot) => {
        // childSnapshot.key will contain the unique key of each category
        const categoryKey = childSnapshot.key;
        const categoryData = childSnapshot.val();

        if (!categoryData?.archived) {
          activeCategories.push({ id: categoryKey, ...categoryData });
        } else {
          archived.push({ id: categoryKey, ...categoryData });
        }
      });

      setCategories(activeCategories.sort((a, b) => b.latest_add - a.latest_add));
      setArchivedCategories(archived.sort((a, b) => (b.archived_at || 0) - (a.archived_at || 0)));
    });

    getUserInfo();
  }, []);

  useEffect(() => {
    if (profileInfo?.profile_pic) {
      setStableProfilePicUri(profileInfo.profile_pic);
      ReactImage.prefetch(profileInfo.profile_pic);
    }
  }, [profileInfo?.profile_pic]);

  const onCategoryPress = (category_name, category_id, num_items) => {
    const requestId = ++categoryRequestRef.current;

    // Navigate immediately, then fetch items in the background.
    setFocusedCategory(category_name);
    setFocusedCategoryId(category_id);
    setNumItems(num_items);
    setFocusedList({ now: [], later: [] });
    setIsCategoryLoading(true);

    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(category_id));

    get(categoryItemsQuery).then((snapshot) => {
      if (requestId !== categoryRequestRef.current) return;
      let tempFocusedList = {'now': [], 'later': []};
      if (snapshot.exists()) {
        for (const [key, value] of Object.entries(snapshot.val())) {
          if (value.bucket === 'later') {
            tempFocusedList['later'].push([key, value]);
          } else {
            tempFocusedList['now'].push([key, value]);
          }
        }
        tempFocusedList['now'].sort((a, b) => b[1].score - a[1].score);
      }
      setFocusedList(tempFocusedList);
      setIsCategoryLoading(false);
    }).catch((error) => {
      if (requestId !== categoryRequestRef.current) return;
      console.error("Error fetching categories:", error);
      setIsCategoryLoading(false);
    });
  }

  const shareLink = () => {
    Share.share({
      message: 'Follow these steps and rank with me on ambora/social!',
      url: 'https://testflight.apple.com/join/6VpEA1gh',
    })
    .then((result) => {
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared with activity type: ', result.activityType);
        } else {
          console.log('Shared');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Dismissed');
      }
    })
    .catch((error) => console.error('Error sharing:', error));
  };

  const onBackPress = () => {
    // Invalidate any in-flight category fetch so stale responses are ignored.
    categoryRequestRef.current += 1;
    setFocusedList(null);
    setFocusedCategory(null);
    setFocusedCategoryId(null);
    setIsCategoryLoading(false);
  }

  const onLogOutPress = () => {
    Alert.alert(
      "Log out of ambora/social?",
      "You can sign back in at anytime",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Logout cancelled"),
          style: "cancel"
        },
        {
          text: "Log out",
          onPress: async () => {
            await AsyncStorage.removeItem('username');
            await AsyncStorage.removeItem('key');
            fetchUserData();
            setView('signin');
          }
        }
      ]
    );
  }

  const onProfileMenuPress = () => {
    Alert.alert(
      "Profile menu",
      "",
      [
        { text: "View Archived Lists", onPress: () => setFocusedCategory('Archived Lists') },
        { text: "Log out", style: "destructive", onPress: () => onLogOutPress() },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  const followUser = async () => {
    // THIS IS TO VERIFY USERS
    // const userRef1 = ref(database, 'users/' + userKey);
    // update(userRef1, {
    //   user_type: 'verified'
    // })

    //THIS IS TO GET PASSWORD BACK
    // const auth = getAuth();
    // const database = getDatabase();
    // const emailVal = "EMAIL";
    // sendPasswordResetEmail(auth, emailVal).then(() => {
    //   alert("Check your email for password reset");
    //   console.log("Password reset email sent");
    // }).catch(err => {
    //   alert("Error sending password reset email: " + err.message);
    // });
    
    const followersRef = ref(database, 'users/' + userKey + '/followers/' + visitingUserId);
    set(followersRef, {
      closeFriend: false
    })
    const followingRef = ref(database, 'users/' + visitingUserId + '/following/' + userKey);
    set(followingRef, {
      closeFriend: false
    })

    const eventsRef = push(ref(database, 'events/' + userKey));
    set(eventsRef, {
      evokerId: visitingUserId,
      content: 'followed you!',
      timestamp: Date.now()
    })

    console.log(userKey)
    const userRef = ref(database, 'users/' + userKey);
    update(userRef, {
      unreadNotifications: true
    })

    getUserInfo();
  }

  const unfollowUser = async () => {
    const followersRef = ref(database, 'users/' + userKey + '/followers/' + visitingUserId);
    remove(followersRef);
    const followingRef = ref(database, 'users/' + visitingUserId + '/following/' + userKey);
    remove(followingRef);
    getUserInfo();
  }

  const refreshProfile = () => {
    setRefreshed(true);
    getUserInfo();
    setRefreshed(false);
  };

  if (focusedCategory === 'Followers') {
    return <FollowUsers 
      userIds={Object.keys(profileInfo.followers)} 
      setFocusedCategory={setFocusedCategory}
      focusedCategory={'Followers'}
      username={profileInfo.username}
      userKey={userKey}
      visitingUserId={visitingUserId}
      navigation={navigation}
    />
  }

  if (focusedCategory === 'Following') {
    return <FollowUsers 
      userIds={profileInfo.following ? Object.keys(profileInfo.following) : []} 
      setFocusedCategory={setFocusedCategory}
      focusedCategory={'Following'}
      username={profileInfo.username}
      userKey={userKey}
      visitingUserId={visitingUserId}
      navigation={navigation}
    />
  }

  return (
    <>
      {focusedCategory === 'editProfile' ? (
        <EditProfile userKey={userKey} onBackPress={() => onBackPress()} getUserInfo={() => getUserInfo()} />
      ) : focusedCategory === 'Add List Page' ? (
        <>
          <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey', backgroundColor: 'white' }}>
            <TouchableOpacity onPress={() => onBackPress()}>
              <Ionicons name="arrow-back" size={30} color="black" />
            </TouchableOpacity>
            <Text style={{ marginLeft: 'auto', marginRight: 10, fontSize: 15, fontWeight: 'bold' }}> </Text>
          </View>

          <AddCategory onBackPress={() => onBackPress()} userKey={userKey} />
        </>
      ) : focusedCategory === 'Archived Lists' ? (
        <>
          <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey', backgroundColor: 'white' }}>
            <TouchableOpacity onPress={() => onBackPress()}>
              <Ionicons name="arrow-back" size={30} color="black" />
            </TouchableOpacity>
            <Text style={{ marginLeft: 'auto', marginRight: 'auto', fontSize: 15, fontWeight: 'bold' }}>Archived Lists</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 10 }}>
            {archivedCategories.length > 0 ? (
              <FlatList
                data={archivedCategories}
                renderItem={({ item }) => (
                  <CategoryTile
                    category_name={item.category_name}
                    imageUri={item.imageUri}
                    num_items={item.num_items}
                    onCategoryPress={() => onCategoryPress(item.category_name, item.id, item.num_items)}
                  />
                )}
                numColumns={3}
                contentContainerStyle={styles.grid}
              />
            ) : (
              <Text style={{ textAlign: 'center', marginTop: '20%', fontWeight: 'bold', fontSize: 16, color: 'lightgray' }}>
                No archived lists yet.
              </Text>
            )}
          </View>
        </>
      ) : (
        <>
        <View style={{ flex: 1 }}>
          {scrollY < -110 && (
            <View style={{position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1000,}}>
              <ActivityIndicator size="large" color="black" />
            </View>
          )}
          <ScrollView
            style={{ backgroundColor: 'white', height: '100%' }}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              setScrollY(y);
              if (y < -110 && !refreshed) {
                refreshProfile();
              }
            }}
            scrollEventThrottle={1} // This ensures the scroll position is updated frequently
          >
            {!visitingUserId ? (
              <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                <Text style={{ color: 'black', fontSize: 24, fontFamily: 'Poppins Regular' }}>ambora\social</Text>
                <TouchableOpacity onPress={onProfileMenuPress} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="menu" size={27} color="black" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setFeedView(null)}>
                  <Ionicons name="arrow-back" size={30} color="black" />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', padding: 15 }}>
              <ReactImage
                source={stableProfilePicUri ? { uri: stableProfilePicUri } : profilePic}
                defaultSource={profilePic}
                style={styles.profilePic}
              />
              <View>
                <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ marginLeft: 10, fontSize: 20, fontWeight: 'bold', fontFamily: 'Poppins Bold', marginRight: 10 }}>
                    {profileInfo.name}
                  </Text>
                  {profileInfo.user_type === 'verified' && <MaterialIcons name="verified" size={20} color="#00aced" />}
                </View>
                <Text style={{ marginLeft: 10, fontSize: 16, marginTop: 0, fontWeight: 'bold', color: 'gray' }}>@{profileInfo.username}</Text>

                <View style={{ flexDirection: 'row', marginLeft: 10, marginTop: 15 }}>
                  <TouchableOpacity onPress={() => profileInfo.followers && setFocusedCategory('Followers')}>
                    <Text style={{ marginRight: 30, fontWeight: 'bold' }}>{profileInfo.followers ? Object.keys(profileInfo.followers).length : 0} Followers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => profileInfo.following && setFocusedCategory('Following')}>
                    <Text style={{ fontWeight: 'bold' }}>{profileInfo.following ? Object.keys(profileInfo.following).length : 0} Following</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Hyperlink linkDefault={true} linkStyle={{ color: '#2980b9', textDecorationLine: 'underline' }} onPress={(url, text) => Linking.openURL(url)}>
              <Text style={{ paddingHorizontal: 15, marginBottom: 20 }}>{profileInfo.bio}</Text>
            </Hyperlink>

            {!visitingUserId ? (
              <View style={{ paddingHorizontal: 15, paddingBottom: 20, borderColor: 'lightgrey', borderBottomWidth: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity style={styles.editContainer} onPress={() => setFocusedCategory('editProfile')}>
                    <Text style={styles.editButtons}>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editContainer} onPress={() => setFocusedCategory('Add List Page')}>
                    <Text style={styles.editButtons}>Add List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={shareLink} style={styles.shareContainer}>
                      <Ionicons name="person-add-sharp" size={17} color="black" style={{ marginTop: 3 }} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 15, paddingBottom: 20, borderColor: 'lightgrey', borderBottomWidth: 1 }}>
                {isFollowing ? (
                  <TouchableOpacity style={styles.editContainer} onPress={() => unfollowUser()}>
                    <Text style={styles.editButtons}>Unfollow</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.editContainer} onPress={() => followUser()}>
                    <Text style={styles.editButtons}>Follow</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {categories.length > 0 ? (
              <FlatList
                data={categories}
                renderItem={({ item }) => (
                  <CategoryTile
                    category_name={item.category_name}
                    imageUri={item.imageUri}
                    num_items={item.num_items}
                    onCategoryPress={() => onCategoryPress(item.category_name, item.id, item.num_items)}
                  />
                )}
                scrollEnabled={false}
                numColumns={3}
                contentContainerStyle={styles.grid}
              />
            ) : (
              <Text style={{ textAlign: 'center', marginTop: '20%', fontWeight: 'bold', fontSize: 16, color: 'lightgray' }}>
                add a list to get started...
              </Text>
            )}
          </ScrollView>
        </View>
        {focusedCategoryId && (
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 2000, backgroundColor: 'white' }]}>
            <CategoryList
              focusedCategory={focusedCategory}
              focusedList={focusedList}
              focusedCategoryId={focusedCategoryId}
              numItems={numItems}
              isLoading={isCategoryLoading}
              onBackPress={() => onBackPress()}
              isMyProfile={visitingUserId ? visitingUserId === userKey : true}
              visitingUserId={visitingUserId || userKey}
              userKey={userKey}
              navigation={navigation}
            />
          </View>
        )}
        </>
      )}
    </>
  );
};

export default Profile;