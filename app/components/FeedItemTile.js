// import React, { useState, useEffect, useMemo, useRef } from 'react';
// import { Text, View, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
// import { database } from '../../firebaseConfig';
// import { ref, onValue, off, query, orderByChild, equalTo, get, set, remove, push, update } from "firebase/database";
// import { Image } from 'expo-image';
// import profilePic from '../../assets/images/emptyProfilePic3.png';
// import Hyperlink from 'react-native-hyperlink';
// import { useFonts } from 'expo-font';
// import { Ionicons, MaterialIcons } from '@expo/vector-icons';
// import Profile from './Profile';
// import axios from 'axios';
// import { generateRandom, deriveChallenge } from 'expo-auth-session';
// import { Video } from 'expo-av';
// import { Directions, Swipeable, GestureHandlerRootView, GestureDetector, Gesture, FlingGestureHandler } from 'react-native-gesture-handler';
// import { runOnJS } from 'react-native-reanimated';
// import Animated, {
//   interpolate,
//   useAnimatedStyle,
//   useSharedValue,
//   withDelay,
//   withTiming,
// } from 'react-native-reanimated'; 
 

// // this function is repeated many times -> condense into one file ~
// function getScoreColorHSL(score) {
//   if (score < 0) {
//     return '#A3A3A3'; // Gray color for negative scores
//   }
//   const cappedScore = Math.max(0, Math.min(score, 10));
//   const hue = (cappedScore / 10) * 120;
//   const lightness = 50 - score ** 1.3;
//   return `hsl(${hue}, 100%, ${lightness}%)`;
// }

// const FeedItemTile = React.memo(({ item, showButtons=true, userKey, setFeedView, navigation, visitingUserId, editMode=false, setFocusedItemDescription, topPostsTime, setItemInfo, showComments=false, individualSpotifyAccessToken, promptAsync, setIndex }) => {
//   const userRef = ref(database, `users/${item.user_id}`);
//   const [username, setUsername] = useState('');
//   const [userImage, setUserImage] = useState('https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png');
//   const [dimensions, setDimensions] = useState({ width: undefined, height: undefined });
//   const [itemDescription, setItemDescription] = useState(item.description);
//   const [likes, setLikes] = useState({});
//   const [dislikes, setDislikes] = useState({});
//   const [stars, setStars] = useState({});
//   const [comments, setComments] = useState([]);
//   const [newComment, setNewComment] = useState('');
//   const [commentTypingMode, setCommentTypingMode] = useState(false);
//   const [isVerified, setIsVerified] = useState(false);

//   const onImageLoad = (event) => {
//     const { width, height } = event.source;
//     setDimensions({ width: 260, height: 260 * height / width });
//   };

//   useEffect(() => {
//     const userRef = ref(database, `users/${item.user_id}`);
//     get(userRef).then((snapshot) => {
//       if (snapshot.exists()) {
//         setUsername(snapshot.val().name)
//         setUserImage(snapshot.val().profile_pic || 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png');
//         setIsVerified(snapshot.val().user_type === 'verified');
//       }
//     }).catch((error) => {
//       console.error("Error fetching categories:", error);
//     });

//     setLikes(item.likes || {});
//     setDislikes(item.dislikes || {});
//     setStars(item.stars || {});
//     setComments( item.comments ? 
//       Object.keys(item.comments).map(key => ({
//         id: key,
//         ...item.comments[key]
//       })).sort((a, b) => a.timestamp - b.timestamp) : []
//     );    
//     setItemDescription(item.description);
//   }, [topPostsTime, item])

//   let scoreColor = getScoreColorHSL(Number(item.score));
//   const date = new Date(item.timestamp);
//   const dateString = date.toLocaleDateString("en-US", {
//     year: 'numeric',
//     month: '2-digit',
//     day: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit',
//   });

//   const onLikePress = (item) => {
//     const itemLikeRef = ref(database, 'items/' + item.key + '/likes/' + visitingUserId);
//     const eventsRef = push(ref(database, 'events/' + item.user_id));
//     const userRef = ref(database, 'users/' + item.user_id);
//     console.log(itemLikeRef)

//     if (visitingUserId in likes) {
//       remove(itemLikeRef);
//       setLikes(prevLikes => {
//         const {[visitingUserId]: _, ...newLikes} = prevLikes;  // Use destructuring to exclude the `userId` key
//         return newLikes;
//       });
//     } else if (!(visitingUserId in dislikes)) {
//       console.log("ran2")
//       set(itemLikeRef, {
//         userId: visitingUserId
//       })
//       setLikes(prevLikes => ({
//         ...prevLikes,
//         [visitingUserId]: visitingUserId
//       }));
//       set(eventsRef, {
//         evokerId: visitingUserId,
//         content: 'liked your post: ' + item.content + '!',
//         timestamp: Date.now()
//       })
//       update(userRef, {
//         unreadNotifications: true
//       })
//     }
//     setIndex((prevIndex) => prevIndex + 1);
//   }

//   const onDislikePress = (item) => {
//     const itemDislikeRef = ref(database, 'items/' + item.key + '/dislikes/' + visitingUserId);
//     const eventsRef = push(ref(database, 'events/' + item.user_id));
//     const userRef = ref(database, 'users/' + item.user_id);

//     if (visitingUserId in dislikes) {
//       remove(itemDislikeRef);
//       setDislikes(prevDislikes => {
//         const {[visitingUserId]: _, ...newDislikes} = prevDislikes;  // Use destructuring to exclude the `userId` key
//         return newDislikes;
//       });
//     } else if (!(visitingUserId in likes)) {
//       set(itemDislikeRef, {
//         userId: visitingUserId
//       })
//       setDislikes(prevDislikes => ({
//         ...prevDislikes,
//         [visitingUserId]: visitingUserId
//       }));
//       set(eventsRef, {
//         evokerId: visitingUserId,
//         content: 'disliked your post: ' + item.content + '!',
//         timestamp: Date.now()
//       })
//       update(userRef, {
//         unreadNotifications: true
//       })
//     }
//     setIndex((prevIndex) => prevIndex + 1);
//   }

//   const onStarPress = (item) => {
//     'worklet'

//     const itemStarRef = ref(database, 'items/' + item.key + '/stars/' + visitingUserId);
//     const eventsRef = push(ref(database, 'events/' + item.user_id));
//     const userRef = ref(database, 'users/' + item.user_id);

//     console.log(stars)
//     if (visitingUserId in stars) {
//       console.log("ran3")
//       remove(itemStarRef);
//       setStars(prevStars => {
//         const {[visitingUserId]: _, ...newStars} = prevStars;  // Use destructuring to exclude the `userId` key
//         return newStars;
//       });
//     } else {
//       console.log("ran")
//       set(itemStarRef, {
//         userId: visitingUserId
//       })
//       setStars(prevStars => ({
//         ...prevStars,
//         [visitingUserId]: visitingUserId
//       }));
//       set(eventsRef, {
//         evokerId: visitingUserId,
//         content: 'spotlighted your post: ' + item.content + '!',
//         timestamp: Date.now()
//       })
//       if (item.user_id !== visitingUserId) {
//         update(userRef, {
//           unreadNotifications: true
//         }) 
//       }
//     }
//   }

//   const onNewCommentSubmit = (item) => {
//     console.log(item)
//     const itemCommentRef = push(ref(database, 'items/' + item.key + '/comments/'));
//     set(itemCommentRef, {
//       userId: visitingUserId,
//       comment: newComment,
//       timestamp: Date.now()
//     })
//     setComments([{
//       userId: visitingUserId,
//       comment: newComment,
//       timestamp: Date.now()
//     }, ...comments]);
//     setNewComment(''); // Clear the input after submission

//     const eventsRef = push(ref(database, 'events/' + item.user_id));
//     const userRef = ref(database, 'users/' + item.user_id);
//     set(eventsRef, {
//       evokerId: visitingUserId,
//       content: 'commented on your post: ' + item.content + '!',
//       timestamp: Date.now()
//     })
//     update(userRef, {
//       unreadNotifications: true
//     })
//   }

//   const onCommentPress = () => {
//     setItemInfo(item);
//   }  

//   const CommentTile = ({ item }) => {
//     const [userInfo, setUserInfo] = useState({});

//     useEffect(() => {
//       const userRef = ref(database, `users/${item.userId}`);
//       get(userRef).then((snapshot) => {
//         if (snapshot.exists()) {
//           setUserInfo(snapshot.val());
//         }
//       })
//     }, [])

//     const date = new Date(item.timestamp);
//     const dateString = date ? date.toLocaleDateString("en-US", {
//       year: 'numeric',
//       month: '2-digit',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//     }) : 'N/A';

//     return (
//         <View style={{ flexDirection: 'row', paddingVertical: 10 }}>
//           <TouchableOpacity onPress={() => visitingUserId === item.userId ? navigation.navigate('Profile') : setFeedView({userKey: item.userId, username: userInfo.username})}>
//             <Image
//               source={userInfo.profile_pic || 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
//               style={{height: 30, width: 30, borderWidth: 0.5, marginRight: 10, borderRadius: 15, borderColor: 'lightgrey' }}
//             />
//           </TouchableOpacity>
//           <View>
//             <View style={{ flexDirection: 'row' }}>
//               <Text style={{ fontSize: 13, fontWeight: 'bold', marginRight: 20 }}>{userInfo.name}</Text>
//               <Text style={{ color: 'grey', fontSize: 10 }}>{dateString}</Text>
//             </View>
//             <Text style={{ marginTop: 5, width: 320 }}>{item.comment}</Text>
//           </View>
//         </View>
//     );
//   }

//   const fetchDevices = async () => {
//     const devicesUrl = 'https://api.spotify.com/v1/me/player/devices';
//     try {
//       const response = await axios.get(devicesUrl, {
//         headers: {
//           'Authorization': `Bearer ${individualSpotifyAccessToken}`
//         }
//       });
//       console.log("Available devices: ", response.data.devices);
//     } catch (error) {
//       console.error("Error fetching devices: ", error.response);
//     }
//   };

//   const onItemImagePress = async (item) => {
//     if (!individualSpotifyAccessToken) {
//       promptAsync();
//       return;
//     }
//     const playUrl = 'https://api.spotify.com/v1/me/player/play';
    
//     try {
//       await axios.put(playUrl, {
//         uris: [item.trackUri],
//       }, {
//         headers: {
//           'Authorization': `Bearer ${individualSpotifyAccessToken}`,
//           'Content-Type': 'application/json'
//         }
//       });
//     } catch (error) {
//         console.log("error: ", error.response);
//         if (error.response && error.response.data && error.response.data.error && error.response.data.error.reason === "NO_ACTIVE_DEVICE") {
//           alert("No active Spotify devices found. Please open Spotify and start playback, or select a device.");
//           fetchDevices(); // Optional: Implement device selection here
//         }
//     }
//   }

//   const memoizedComments = useMemo(() => comments.map((item, index) => <CommentTile item={item} key={index} />), [comments]);
//   const LeftActions = () => {
//     if (navigation.getState().index === 0 && !showComments){
// return (  
//   <View style = {{backgroundColor: '#388e3c', justifyContent: 'center' , flex: 1}}>
//       <Text style = {{color: '#fff', fontWeight: '600', padding: 20}}>Agree</Text>
//     </View>
// );
//   }
// }
//   const RightActions = () => {
//     if (navigation.getState().index === 0 && !showComments){
//     return (
//       <View style = {{backgroundColor: '#f00808', justifyContent: 'center' , flex: 1}}>
//       <Text style = {{color: '#fff', fontWeight: '600', padding: 20}}>DISAGREE</Text>
//     </View>
//     );
//   }
//   }
//   const swipeRef = useRef(null);
//   const holdRef = useRef();
//   // const manager = GestureStateManager.create()


//   const longHold = Gesture.LongPress().runOnJS(true).withRef(holdRef)
//   .onEnd(()=>onStarPress(item));

//   const onFling = event => {
 
//     console.log('Fling detected');
 
//   };
  
//   // const next = Gesture.Pan().runOnJS(true).withRef(manager)
//   // .onTouchesMove(() => {
//   //     manager.activate();
//   // })
//   // .onUpdate(({ y }) => 

//   // console.log(y)
//   // // {if (translationY){
//   // //   console.log(translationY)
//   // // }}
//   // );

//   // const composed = Gesture.Simultaneous(next, longHold)
//   return (
//     <GestureHandlerRootView>
//     <GestureDetector gesture={longHold}>
//       <FlingGestureHandler direction={Directions.UP} onActivated={onFling}>
//       <View>
//     <Swipeable 
//     ref = {swipeRef}
//     simultaneousHandlers={holdRef}

//     renderLeftActions={LeftActions}
//     renderRightActions={RightActions}
//     onSwipeableOpen = 
//     {direction => {
//       if (direction === "right") {
//       onLikePress(item);
//       swipeRef.current.reset()
//       } else if (direction === "left") {
//       onDislikePress(item);
//       swipeRef.current.reset()      }
//     }}>

//     <Animated.ScrollView style={{ backgroundColor: 'white' }} showsVerticalScrollIndicator={false}>
//     <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
//     <>
//     {!commentTypingMode && (
//     <View style={{ padding: 14, width: '94%', margin: '3%', backgroundColor: '#e6e6e6', borderRadius: 10 }}>
//       <>
//       <View style={{ flexDirection: 'row' }}>
//         <TouchableOpacity onPress={() => userKey === item.user_id ? navigation.navigate('Profile') : setFeedView({userKey: item.user_id, username: username})}>
//           <Image
//             source={userImage}
//             style={{height: 40, width: 40, borderWidth: 0.5, marginRight: 10, borderRadius: 25, borderColor: 'lightgrey' }}
//           />
//         </TouchableOpacity>
//         <View style={{ width: 230 }}>
//           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//             <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{username}</Text>
//             {isVerified && <MaterialIcons name="verified" size={16} color="#00aced" style={{ marginLeft: 5 }}/>}
//             <Text style={{ color: 'grey', fontSize: 10, marginLeft: 5 }}>{dateString}</Text>
//           </View>
//           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, }}>
//             <Text style={{ color: 'gray', fontWeight: 'bold', fontSize: 13, fontStyle: 'italic' }}>
//               {item.category_name ? (item.score < 0 ? `${item.category_name}/Later/ ` : `${item.category_name}/ `) : null}
//               <Text style={{ fontWeight: 'bold', fontSize: 16, fontStyle: 'italic', color: 'black' }}>{item.content}</Text>
//             </Text>
//           </View>
//         </View>
//         <View style={{ 
//           borderColor: scoreColor, 
//           marginLeft: 'auto',
//           width: 44,
//           height: 44,
//           borderRadius: 22,
//           justifyContent: 'center',
//           alignItems: 'center',
//           marginBottom: 4,
//           borderWidth: 3
//         }}>
//           <Text style={{ color: scoreColor, fontWeight: 'bold' }}>{item.score > 0 ? item.score.toFixed(1) : '...'}</Text>
//         </View>
//       </View>
          
//       <View style={{ marginLeft: 50, width: 300, marginTop: 10 }}>
//         {editMode ? (
//           <TextInput
//             value={itemDescription}
//             onChangeText={(text) => {
//               setItemDescription(text)
//               setFocusedItemDescription(text)
//             }}
//             multiline
//             style={{ 
//               fontSize: 15, 
//               borderColor: 'lightgrey',
//               borderBottomWidth: 1,
//               paddingBottom: 5
//             }}
//           />
//         ) : (
//           <>
//           {item.description && item.description.length > 0 && (
//             <Hyperlink
//               linkDefault={ true }
//               linkStyle={ { color: '#2980b9', textDecorationLine: 'underline' } }
//               onPress={ (url, text) => Linking.openURL(url) }
//             >
//               <Text style={{ fontSize: 15, marginTop: 5, lineHeight: 20 }}>
//                 {itemDescription}
//               </Text>
//             </Hyperlink>
//           )}
//           </>
//         )}
//         {item.image && ( 
//           <>
//           {item.imageType && item.imageType === 'video' ? (
//             <Video
//               source={{ uri: item.image }}        // Can be a URL or a local file.
//               rate={0}                            // 0 is paused, 1 is normal.
//               volume={1.0}                        // 0 is muted, 1 is normal.
//               isMuted={false}                     // Mutes the audio.
//               resizeMode="cover"                  // Cover, contain, stretch, etc.
//               shouldPlay                          // Can be set to true to play automatically.
//               isLooping                           // Repeat the video when it ends.
//               useNativeControls                   // Show the native controls.
//               style={{ width: 300, height: 300 }} // You can adjust the size.
//             />
//           ) : (
//             <>
//             {/* <TouchableOpacity onPress={() => onItemImagePress(item)}> */}
//               <Image
//                 source={{ uri: item.image }}
//                 style={{
//                   height: dimensions.height, 
//                   width: dimensions.width, 
//                   borderWidth: 0.5, 
//                   marginRight: 10, 
//                   borderRadius: 5, 
//                   borderColor: 'lightgrey' ,
//                   marginTop: 10
//                 }}
//                 onLoad={onImageLoad}
//               />
//             {/* </TouchableOpacity> */}
//             </>
//           )}
//           </>
//         )}
//       </View>
      
//       {/* {visitingUserId !== item.user_id && ( */}
//       <View style={{ flexDirection: 'row', marginTop: 20 }}>
       
//           <Ionicons name="thumbs-up-sharp" size={22} color={visitingUserId in likes ? "black" : "grey"} />
//           <Text style={{ color: 'grey', fontSize: 12 }}>{Object.keys(likes).length}</Text>
        
       
//           <Ionicons name="thumbs-down-sharp" size={22} color={visitingUserId in dislikes ? "black" : "grey"} />
//           <Text style={{ color: 'grey', fontSize: 12 }}>{Object.keys(dislikes).length}</Text>
       
        
//         {!showComments && (
//           <TouchableOpacity style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }} onPress={() => onCommentPress(item)}>
//             <Ionicons name="chatbubble-sharp" size={22} color="grey" />
//             <Text style={{ color: 'grey', fontSize: 12 }}>{Object.keys(comments).length}</Text>
//           </TouchableOpacity>
//         )}

//         {/* <TouchableOpacity style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }} onPress={() => onStarPress(item)}> */}
//           <Ionicons name="star" size={30} color={visitingUserId in stars ? "black" : "grey"} />
//           <Text style={{ color: 'grey', fontSize: 12 }}>{Object.keys(stars).length}</Text>
//         {/* </TouchableOpacity> */}

//         <TouchableOpacity 
//           style={{ marginLeft: 'auto', marginRight: 10 }} 
//           onPress={() => navigation.navigate('Add', {
//             itemName: item.content,
//             itemDescription: item.description,
//             itemImage: [item.image],
//             itemCategory: null,
//             itemCategoryName: '',
//             taggedUser: username,
//             taggedUserId: item.user_id
//           })}>
//           <Ionicons name="bookmark" size={30} color="grey" />
//         </TouchableOpacity>
//         <TouchableOpacity
//           onPress={() => navigation.navigate('Add', {
//             itemName: item.content,
//             itemDescription: item.description,
//             itemImage: [item.image],
//             itemCategory: null,
//             taggedUser: username,
//             taggedUserId: item.user_id,
//           })}
//         >
//           <Ionicons style={{}} name="add-circle" size={30} color="grey" />
//         </TouchableOpacity>
//       </View>
//       </>
//     </View>
//     )}

//     {showComments && (
//       <View style={{ paddingHorizontal: 15 }}>
//         {/* Render your comments section here */}
//         <View style={{
//           flexDirection: 'row',
//           marginTop: 15,
//           paddingHorizontal: 10,
//           borderWidth: 0.5,
//           borderColor: 'lightgrey',
//           borderRadius: 25,
//           alignItems: 'center', // Aligns the TextInput and the icon vertically
//           marginBottom: 10,
//           paddingTop: 7,
//           paddingBottom: 10
//         }}>
//           <TextInput
//             placeholder={`Add a comment for ${username}...`}
//             placeholderTextColor="gray"
//             style={{
//               flex: 1, // Takes up the maximum space leaving the icon on the far side
//               paddingHorizontal: 10, // Optional: Adds some space between the icon and the text input
//               fontSize: 15,
//             }}
//             value={newComment} // Binds the text input to your state
//             onChangeText={text => setNewComment(text)} // Updates state upon every keystroke
//             onFocus={() => setCommentTypingMode(true)}
//             onBlur={() => setCommentTypingMode(false)}
//             multiline={true}
//           />
//           <TouchableOpacity onPress={() => newComment.length > 0 && onNewCommentSubmit(item)}>
//             <Ionicons name="send" size={24} color="black" />
//           </TouchableOpacity>
//         </View>
//         {memoizedComments}
//       </View>
//     )}
//     </>
//     </TouchableWithoutFeedback>
//     </Animated.ScrollView>
//     </Swipeable>
//     </View>
//     </FlingGestureHandler>
//     </GestureDetector>
//     </GestureHandlerRootView>
    
//   );
// })

// export default FeedItemTile;