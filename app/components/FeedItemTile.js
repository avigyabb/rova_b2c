import React, { useState, useEffect } from 'react';
import { Text, View, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get, set, remove } from "firebase/database";
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

const FeedItemTile = React.memo(({ item, showButtons=true, userKey, setFeedView, navigation, visitingUserId, editMode=false, setFocusedItemDescription, topPostsTime }) => {
  const [username, setUsername] = useState('');
  const [userImage, setUserImage] = useState(profilePic);
  const [dimensions, setDimensions] = useState({ width: undefined, height: undefined });
  const [itemDescription, setItemDescription] = useState(item.description);
  const [likes, setLikes] = useState({});
  const [dislikes, setDislikes] = useState({});

  const onImageLoad = (event) => {
    const { width, height } = event.source;
    // if (width < 260 ) {
    //   setDimensions({ width: 80, height: 80 * height / width });
    // } else {
      setDimensions({ width: 260, height: 260 * height / width });
    // }
  };

  useEffect(() => {
    const userRef = ref(database, `users/${item.user_id}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setUsername(snapshot.val().name)
        setUserImage(snapshot.val().profile_pic || profilePic);
      }
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });

    setLikes(item.likes || {});
    setDislikes(item.dislikes || {});
    setItemDescription(item.description);
  }, [topPostsTime])

  let scoreColor = getScoreColorHSL(Number(item.score));
  const date = new Date(item.timestamp);
  const dateString = date.toLocaleDateString("en-US", {
    year: 'numeric',
    month: '2-digit',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const onLikePress = (item) => {
    console.log("loc6")
    console.log(likes)
    if (visitingUserId in likes) {
      const itemLikeRef = ref(database, 'items/' + item.key + '/likes/' + visitingUserId);
      remove(itemLikeRef);
      setLikes(prevLikes => {
        const {[visitingUserId]: _, ...newLikes} = prevLikes;  // Use destructuring to exclude the `userId` key
        return newLikes;
      });
    } else if (!(visitingUserId in dislikes)) {
      const itemLikeRef = ref(database, 'items/' + item.key + '/likes/' + visitingUserId);
      set(itemLikeRef, {
        userId: visitingUserId
      })
      setLikes(prevLikes => ({
        ...prevLikes,
        [visitingUserId]: visitingUserId
      }));
    }
  }

  const onDislikePress = (item) => {
    if (visitingUserId in dislikes) {
      const itemDislikeRef = ref(database, 'items/' + item.key + '/dislikes/' + visitingUserId);
      remove(itemDislikeRef);
      setDislikes(prevDislikes => {
        const {[visitingUserId]: _, ...newDislikes} = prevDislikes;  // Use destructuring to exclude the `userId` key
        return newDislikes;
      });
    } else if (!(visitingUserId in likes)) {
      const itemLikeRef = ref(database, 'items/' + item.key + '/dislikes/' + visitingUserId);
      set(itemLikeRef, {
        userId: visitingUserId
      })
      setDislikes(prevDislikes => ({
        ...prevDislikes,
        [visitingUserId]: visitingUserId
      }));
    }
  }

  return (
    <View style={{ padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, backgroundColor: 'white' }}>
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
          
      <View style={{ marginLeft: 60, width: 300, marginTop: 10 }}>
        {editMode ? (
          <TextInput
            value={itemDescription}
            onChangeText={(text) => {
              setItemDescription(text)
              setFocusedItemDescription(text)
            }}
            multiline
            style={{ 
              fontSize: 15, 
              borderColor: 'lightgrey',
              borderBottomWidth: 1,
              paddingBottom: 5
            }}
          />
        ) : (
          <>
          {item.description && item.description.length > 0 && (
            <Hyperlink
              linkDefault={ true }
              linkStyle={ { color: '#2980b9', textDecorationLine: 'underline' } }
              onPress={ (url, text) => Linking.openURL(url) }
            >
              <Text style={{ fontSize: 15, marginTop: 5, lineHeight: 20 }}>
                {itemDescription}
              </Text>
            </Hyperlink>
          )}
          </>
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
      
      {/* {visitingUserId !== item.user_id && ( */}
        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          <TouchableOpacity style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }} onPress={() => onLikePress(item)}>
            <MaterialIcons name="thumb-up" size={22} color={visitingUserId in likes ? "black" : "grey"} />
            <Text style={{ color: 'grey', fontSize: 12 }}>{Object.keys(likes).length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }} onPress={() => onDislikePress(item)}>
            <MaterialIcons name="thumb-down" size={22} color={visitingUserId in dislikes ? "black" : "grey"} />
            <Text style={{ color: 'grey', fontSize: 12 }}>{Object.keys(dislikes).length}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ marginLeft: 'auto', marginRight: 10 }} 
            onPress={() => navigation.navigate('Add', {
              itemName: item.content,
              itemDescription: item.description,
              itemImage: [item.image],
              itemCategory: null,
              taggedUser: username
            })}>
            <MaterialIcons name="bookmark-add" size={30} color="grey" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Add', {
              itemName: item.content,
              itemDescription: item.description,
              itemImage: [item.image],
              itemCategory: null,
              taggedUser: username
            })}
          >
            <MaterialIcons style={{}} name="add-circle" size={30} color="grey" />
          </TouchableOpacity>
        </View>
      {/* )} */}
    </View>
  );
})

export default FeedItemTile;