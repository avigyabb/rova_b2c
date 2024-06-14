import React, { useEffect, useState } from 'react';
import { View, Text, Keyboard, TouchableWithoutFeedback, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get, set, push, update } from "firebase/database";
import { Image } from 'expo-image';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Profile from './Profile';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';


const FollowUsers = ({ userIds, setFocusedCategory, focusedCategory, username, userKey, visitingUserId, navigation }) => {
  const [userListData, setUserListData] = useState([]);
  const [followUsersView, setFollowUsersView] = useState(null);

  useEffect(() => {
    let tempListData = [];
    const userPromises = userIds.map(id => {
      const userRef = ref(database, 'users/' + id);
      return get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          console.log("u: " + userKey)
          console.log(visitingUserId);
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
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowedBy, setIsFollowedBy] = useState(false);
    const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);
    const [isLoadingFollowers, setIsLoadingFollowers] = useState(true);

    useEffect(() => {
      const userRef = visitingUserId || userKey;
      const followingRef = ref(database, `users/${userRef}/following/${item.id}`);
      get(followingRef).then((followingSnapshot) => {
        if (followingSnapshot.exists()) {
          setIsFollowing(true);
          setIsLoadingFollowing(false);
        } else {
          setIsFollowing(false);
          setIsLoadingFollowing(false);
        }
      });

      const followedByRef = ref(database, `users/${item.id}/following/${userRef}`);
      get(followedByRef).then((followedBySnapshot) => {
        if (followedBySnapshot.exists()) {
          setIsFollowedBy(true);
          setIsLoadingFollowers(false);
        } else {
          setIsFollowedBy(false);
          setIsLoadingFollowers(false);
        }
      });
    }, [])

    const handleFollowBack = () => {
      const followersRef = ref(database, `users/${item.id}/followers/${userKey}`);
      set(followersRef, { closeFriend: false }).then(() => {
        const followingRef = ref(database, `users/${userKey}/following/${item.id}`);
        set(followingRef, { closeFriend: false }).then(() => {
          setIsFollowing(true);
        });
      });
      const eventsRef = push(ref(database, 'events/' + item.id));
      set(eventsRef, {
        evokerId: userKey,
        content: 'followed you!',
        timestamp: Date.now()
      });
      const userRef = ref(database, 'users/' + item.id);
      update(userRef, {
        unreadNotifications: true
      })
    };

    return (
      <TouchableOpacity onPress={() => visitingUserId === item.id ? {} : setFollowUsersView({ userKey: item.id, username: item.username })}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, backgroundColor: 'white', alignItems: 'center' }}>
          <Image
            source={item.profile_pic ? { uri: item.profile_pic } : { uri: 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png' }}
            style={{ height: 50, width: 50, borderWidth: 0.5, marginRight: 10, borderRadius: 25, borderColor: 'lightgrey' }}
          />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.name}</Text>
              {item.user_type === 'verified' && <MaterialIcons name="verified" size={16} color="#00aced" style={{ marginLeft: 5 }} />}
            </View>
            <Text style={{ color: 'grey' }}>@{item.username}</Text>
          </View>
          { !visitingUserId && (
            <>
            {isLoadingFollowing || isLoadingFollowers ? (
              <ActivityIndicator size="medium" color="black" style={{ marginTop: 20 }} />
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: isFollowing && isFollowedBy ? 'gray' : isFollowing ? 'gray' : isFollowedBy ? '#00aced' : '#00aced',
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  borderRadius: 5,
                }}
                onPress={handleFollowBack}
                disabled={!(isFollowedBy && !isFollowing)}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {isFollowing && isFollowedBy ? 'Friends' :
                  isFollowing ? 'Following' :
                  isFollowedBy ? 'Follow Back' :
                  'Follow'}
                </Text>
              </TouchableOpacity>
            )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
    )
  }

  if (followUsersView) {
    return (
      <Profile 
        route={{'params': {
          userKey: followUsersView.userKey,
          username: followUsersView.username,
          visitingUserId: visitingUserId || userKey,
          setFeedView: setFocusedCategory
        }}}
        navigation={navigation}
      />
    )
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <>
      <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey', backgroundColor: 'white' }}>
        <TouchableOpacity onPress={() => setFocusedCategory(null)}> 
          <Ionicons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
        <Text style={{ marginLeft: 'auto', marginRight: 10, fontSize: 15, fontWeight: 'bold' }}>{username}'s {focusedCategory}</Text>
      </View>

      <View style={{ backgroundColor: 'white', paddingHOrizontal: 20, height: '94.5%' }}>
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