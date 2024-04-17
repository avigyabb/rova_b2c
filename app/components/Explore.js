import React, { useEffect, useState } from 'react';
import { View, Text, Keyboard, TouchableWithoutFeedback, FlatList, TouchableOpacity } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Profile from './Profile';


const Explore = ({ route, navigation }) => {
  const { userKey } = route.params;
  const [userListData, setUserListData] = useState([]);
  const [exploreView, setExploreView] = useState(null);

  useEffect(() => {
    const usersRef = ref(database, 'users');

    get(usersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const usersObject = snapshot.val();
        // Transform the usersObject into an array of user objects, each with its Firebase key
        const usersArray = Object.keys(usersObject).map((key) => ({
          ...usersObject[key], // Spread the user data
          id: key // Add the Firebase key as an 'id' field
        }));
        setUserListData(usersArray);
      }
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }, []);

  const UserTile = ({ item }) => {
    return (
      <TouchableOpacity onPress={() => userKey === item.id ? {} : setExploreView({userKey: item.id, username: item.username })}>
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

  if (exploreView) {
    return (
      <Profile 
        route={{'params': {
          userKey: exploreView.userKey,
          username: exploreView.username,
          visitingUserId: userKey,
          setFeedView: setExploreView
        }}}
        navigation={navigation}  
      />
    )
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ backgroundColor: 'white', paddingHOrizontal: 20, height: '100%' }}>
        <View style={{ borderColor: 'lightgrey', borderBottomWidth: 3 }}>
          <Text style={{ color: 'black', fontSize: 24, fontWeight: 'bold', fontFamily: 'Poppins Regular', margin: 10 }}>ambora\social</Text>
          <Text style={{ color: 'black', fontSize: 20, fontWeight: 'bold', margin: 10, fontStyle: 'italic' }}>Users</Text>
        </View>
        <FlatList
          data={userListData}
          renderItem={({ item }) => <UserTile item={item} />}
          keyExtractor={(item, index) => index.toString()}
          numColumns={1}
          key={"single-column"}
        />
      </View>
    </TouchableWithoutFeedback>
  )
};

export default Explore;