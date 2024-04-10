import React, { useEffect, useState } from 'react';
import { View, Text, Keyboard, TouchableWithoutFeedback, FlatList, TouchableOpacity } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Profile from './Profile';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';


const FollowUsers = ({ userIds, setFocusedCategory, focusedCategory, username, userKey, visitingUserId }) => {
  const [userListData, setUserListData] = useState([]);
  const [followUsersView, setFollowUsersView] = useState(null);

  useEffect(() => {
    let tempListData = [];
    const userPromises = userIds.map(id => {
      const userRef = ref(database, 'users/' + id);
      return get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          console.log("ran");
          const userData = snapshot.val();
          userData.id = id; // Add or modify the id property
          return userData; // This value will be pushed into the array in Promise.all
        } else {
          console.log("No user data for ID:", id);
          return null; // Return null or similar if no data, to keep consistent array length
        }
      });
    });

    Promise.all(userPromises).then(results => {
      // Filter out any null values if there were IDs with no data
      tempListData = results.filter(result => result !== null);
      setUserListData(tempListData);
    }).catch(error => {
      console.error("Error fetching user data:", error);
    });
  }, []);

  const UserTile = ({ item }) => {
    return (
      <TouchableOpacity onPress={() => visitingUserId === item.id ? {} : setFollowUsersView({userKey: item.id, username: item.username })}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, backgroundColor: 'white', alignItems: 'center' }}>
          <Image
            source={item.profile_pic ? { uri: item.profile_pic } : profilePic}
            style={{height: 50, width: 50, borderWidth: 0.5, marginRight: 10, borderRadius: 25, borderColor: 'lightgrey' }}
          />
          <View>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.name}</Text>
            <Text style={{ color: 'grey' }}>@{item.username}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (followUsersView) {
    return (
      <Profile route={{'params': {
        userKey: followUsersView.userKey,
        username: followUsersView.username,
        visitingUserId: visitingUserId || userKey,
        setFeedView: setFocusedCategory
      }}}/>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <>
      <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey', backgroundColor: 'white' }}>
        <TouchableOpacity onPress={() => setFocusedCategory(null)}> 
          <MaterialIcons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
        <Text style={{ marginLeft: 'auto', marginRight: 10, fontSize: 15, fontWeight: 'bold' }}>{username}'s   {focusedCategory}</Text>
      </View>

      <View style={{ backgroundColor: 'white', paddingHOrizontal: 20, height: '100%' }}>
        <FlatList
            data={userListData}
            renderItem={({ item }) => <UserTile item={item} />}
            keyExtractor={(item, index) => index.toString()}
            numColumns={1}
            key={"single-column"}
          />
      </View>
      </>
    </TouchableWithoutFeedback>
  )
};

export default FollowUsers;