import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Image as ReactImage } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import { useFonts } from 'expo-font';
// import profilePic from '../../assets/images/lebron_profile_pic.webp';
import { database, storage } from '../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get, remove, update } from "firebase/database"; // Import 'ref' and 'set' from the database package
import { useEffect, useState } from 'react';
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
    width: '48%',
    borderRadius: 10,
    alignItems: 'center',
  }
});

const Profile = ({ route, navigation }) => {
  const { userKey, setView, fetchUserData, visitingUserId, setFeedView } = route.params;
  const [profileInfo, setProfileInfo] = useState({});
  const [categories, setCategories] = useState({});
  const [focusedCategory, setFocusedCategory] = useState(null);
  const [focusedCategoryId, setFocusedCategoryId] = useState(null);
  const [focusedList, setFocusedList] = useState({'now': [], 'later': []});
  const [addCategoryName, setAddCategoryName] = useState('');
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadImage, setDownloadImage] = useState(null);
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [numItems, setNumItems] = useState(0);

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
      const categories = [];

      snapshot.forEach((childSnapshot) => {
        // childSnapshot.key will contain the unique key of each category
        const categoryKey = childSnapshot.key;
        const categoryData = childSnapshot.val();

        categories.push({ id: categoryKey, ...categoryData });
      });

      setCategories(categories.sort((a, b) => b.latest_add - a.latest_add));
    });

    getUserInfo();
  }, []);

  const onCategoryPress = (category_name, category_id, num_items) => {
    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(category_id));

    get(categoryItemsQuery).then((snapshot) => {
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
      setFocusedCategory(category_name);
      setFocusedCategoryId(category_id);
      setNumItems(num_items);
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }

  onBackPress = () => {
    setFocusedList({});
    setFocusedCategory(null);
    setFocusedCategoryId(null);
    setFocusedList({});
  }

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // ~ may need to change to just pictures
      allowsEditing: true,
      aspect: [4,3], // search up
      quality: 1,
    });
    setImageUri(result.assets[0].uri);
  }; 

  const onLogOutPress = async () => {
    await AsyncStorage.removeItem('username');
    await AsyncStorage.removeItem('key');
    fetchUserData();
    setView('signin');
  }

  const followUser = async () => {
    // THIS IS TO VERIFY USERS
    // const userRef = ref(database, 'users/' + userKey);
    // update(userRef, {
    //   user_type: 'verified'
    // })
    
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

    getUserInfo();
  }

  const unfollowUser = async () => {
    const followersRef = ref(database, 'users/' + userKey + '/followers/' + visitingUserId);
    remove(followersRef);
    const followingRef = ref(database, 'users/' + visitingUserId + '/following/' + userKey);
    remove(followingRef);
    getUserInfo();
  }

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
        <EditProfile userKey={userKey} onBackPress={() => onBackPress()} getUserInfo={() => getUserInfo()}/>
      ) : focusedCategory === 'Add List Page' ? (
        <>
          <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey', backgroundColor: 'white' }}>
            <TouchableOpacity onPress={() => setFocusedCategory(null)}> 
              <Ionicons name="arrow-back" size={30} color="black" />
            </TouchableOpacity>
            <Text style={{ marginLeft: 'auto', marginRight: 10, fontSize: 15, fontWeight: 'bold' }}> </Text>
          </View>

          <AddCategory onBackPress={() => onBackPress()} userKey={userKey}/>
        </>
      ) : focusedCategoryId ? (
        <CategoryList 
          focusedCategory={focusedCategory} 
          focusedList={focusedList} 
          focusedCategoryId={focusedCategoryId} 
          numItems={numItems}
          onBackPress={() => onBackPress()}
          isMyProfile={visitingUserId ? visitingUserId === userKey : true}
          visitingUserId={visitingUserId || userKey} // in CategoryList there must always be a visitingUserId to check for showButtons
          userKey={userKey}
          navigation={navigation}
        />
      ) : (
        <ScrollView style={{ backgroundColor: 'white', height: '100%'}}>
          {!visitingUserId ? (
            <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center', width: '100%', paddingHorizontal: 20  }}>
              <Text style={{ color: 'black', fontSize: 24, fontFamily: 'Poppins Regular' }}>ambora\social</Text>
              <TouchableOpacity onPress={() => onLogOutPress()} style={{ marginLeft: 'auto' }}>
                <Ionicons name="exit-outline" size={25} color="black"/>
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
            {profileInfo.profile_pic ? (
              <Image
                source={{ uri: profileInfo.profile_pic }}
                style={styles.profilePic}
              />
            ) : (
              <Image
                source={"https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png"}
                style={styles.profilePic} 
              />
            )}
            <View>
              <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
                <Text style={{ marginLeft: 10, fontSize: 20, fontWeight: 'bold', fontFamily: 'Poppins Bold', marginRight: 10 }}>{profileInfo.name}</Text>
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
          
          <Hyperlink
            linkDefault={ true }
            linkStyle={ { color: '#2980b9', textDecorationLine: 'underline' } }
            onPress={ (url, text) => Linking.openURL(url) }
          >
            <Text style={{ paddingHorizontal: 15, marginBottom: 20 }}>
              {profileInfo.bio}
            </Text>
          </Hyperlink>
          
          {!visitingUserId ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 20, borderColor: 'lightgrey', borderBottomWidth: 1}}>
              <TouchableOpacity style={styles.editContainer} onPress={() => setFocusedCategory('editProfile')}>
                <Text style={styles.editButtons}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editContainer} onPress={() => setFocusedCategory('Add List Page')}>
                <Text style={styles.editButtons}>Add List</Text>
              </TouchableOpacity>
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
              renderItem={({ item }) => <CategoryTile 
                category_name={item.category_name} 
                imageUri={item.imageUri} 
                num_items={item.num_items} 
                onCategoryPress={() => onCategoryPress(item.category_name, item.id, item.num_items)}
              />}
              scrollEnabled={false}
              numColumns={3}
              contentContainerStyle={styles.grid}
            />
          ) : (
            <Text style={{ textAlign: 'center', marginTop: '20%', fontWeight: 'bold', fontSize: 16, color: 'lightgray' }}>add a list to get started...</Text>
          )}
        </ScrollView> 
      )}
      </>
  )
};

export default Profile;