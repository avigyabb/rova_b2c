import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ActivityIndicator, FlatList } from 'react-native';
import { Image } from 'expo-image';
import RNPickerSelect from 'react-native-picker-select';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ref, set, onValue, off, query, orderByChild, push, equalTo, get, update, runTransaction } from "firebase/database";
import { database, storage } from '../../firebaseConfig';
import { useFonts } from 'expo-font';
import profilePic from '../../assets/images/lebron_profile_pic.webp';
import AddPost from './AddPost';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import axios from 'axios';
import qs from 'qs';
import { Buffer } from 'buffer';
import { useIsFocused } from '@react-navigation/native';
import { search } from './Search';
import CategoryTile from './CategoryTile';

const styles = StyleSheet.create({
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  option: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: 'white',
  },
  optionText: {
    textAlign: 'center',
    marginTop: 4,
  },
  optionBox: {
    width: '26%',
    alignItems: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    width: '96%',
  },
  card: {
    borderWidth: 1,
    borderColor: 'lightgray',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '47%',
    marginHorizontal: '1.5%',
    height: 150,
  },
  orText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  orContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    position: 'absolute',
    zIndex: 1,
  },
  itemContent: {
    fontSize: 16,
    fontWeight: 'bold',
    width: '83%',
    textAlign: 'center',
  },
  location: {
    fontSize: 14,
    color: 'grey',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
  },
  actionButton: {
    padding: 10,
  },
  actionText: {
    fontSize: 16,
  }
});

const Add = ({ route }) => {
  const isFocused = useIsFocused();
  const { userKey } = route.params;
  const [newItem, setNewItem] = useState(''); // this is the item name
  const [userCategories, setUserCategories] = useState([]);
  const [newItemCategory, setNewItemCategory] = useState(null);
  const [newItemCategoryName, setNewItemCategoryName] = useState('');
  const [newItemCategoryType, setNewItemCategoryType] = useState('');
  const [newItemDescription, setNewItemDescription] = useState(''); // ~ why does this work
  const [newItemImageUris, setNewItemImageUris] = useState([]); // ~ why does this work
  const [newItemBucket, setNewItemBucket] = useState(null);
  const [itemComparisons, setItemComparisons] = useState([]);
  const [addView, setAddView] = useState('');
  const [binarySearchL, setBinarySearchL] = useState(0);
  const [binarySearchR, setBinarySearchR] = useState(0);
  const [binarySearchM, setBinarySearchM] = useState(0);
  const [newItemFinalScore, setNewItemFinalScore] = useState(-1);
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    'Unbounded': require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });
  const [rankMode, setRankMode] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState(null);
  const [addedCustomImage, setAddedCustomImage] = useState(false);
  const [numItems, setNumItems] = useState(0);
  const [presetDescription, setPresetDescription] = useState('');
  const [trackUri, setTrackUri] = useState(null);
  const [itemsInCategory, setItemsInCategory] = useState(null);

  const getUserCategories = () => {
    const categoriesRef = ref(database, 'categories');
    const userCategoriesQuery = query(categoriesRef, orderByChild('user_id'), equalTo(userKey));
    get(userCategoriesQuery).then((snapshot) => {
      const categories = [];

      snapshot.forEach((childSnapshot) => {
        const categoryKey = childSnapshot.key;
        const categoryData = childSnapshot.val();

        categories.push({ id: categoryKey, ...categoryData });
      });

      setUserCategories(categories.sort((a, b) => b.latest_add - a.latest_add));
    }).catch((error) => {
      console.error("Error getUserCategories:", error);
    });
  }

  // replace with function in consts ~
  const getSpotifyAccessToken = async () => {
    const client_id = '3895cb48f70545b898a65747b63b430d';
    const client_secret = '8d70ee092b614f58b488ce149e827ab1';
    const url = 'https://accounts.spotify.com/api/token';
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
    };
    const data = qs.stringify({'grant_type': 'client_credentials'});

    try {
      const response = await axios.post(url, data, {headers});
      setSpotifyAccessToken(response.data.access_token);
    } catch (error) {
      console.error('Error obtaining token:', error);
    }
  }

  useEffect(() => {
    getUserCategories();
    getSpotifyAccessToken(); 
    setNewItem(route.params.itemName);
    setNewItemCategory(route.params.itemCategory);
    setNewItemCategoryName(route.params.itemCategoryName);
    setNewItemDescription(
      route.params.taggedUser ?
        'Added from ' + route.params.taggedUser + '\'s item: \n\n' + route.params.itemDescription
      : route.params.itemDescription
    );
    setPresetDescription(
      route.params.taggedUser ?
        'Added from ' + route.params.taggedUser + '\'s item: \n\n' + route.params.itemDescription
      : route.params.itemDescription
    );
    setNewItemImageUris(route.params.itemImage);
    setTrackUri(route.params.trackUri);
    setNumItems(route.params.numItems);
    setSearchResults([]);
  }, [route]);

  function addElementAndRecalculate(array, newItemObj, newBinarySearchM, isNewCard) {
    const minMaxMap = {'like': [10.0, 6.7], 'neutral': [6.6, 3.3], 'dislike': [3.2, 0.0]}
    if (isNewCard) {
      array.splice(newBinarySearchM, 0, newItemObj);
    } else {
      array.splice(newBinarySearchM + 1, 0, newItemObj);
    }

    let isLike = newItemObj.bucket === 'like' ? 0 : 1;

    const step = (minMaxMap[newItemObj.bucket][0] - minMaxMap[newItemObj.bucket][1]) / (array.length + isLike);
    for (let i = 0; i < array.length; i++) {
      array[i].score = minMaxMap[newItemObj.bucket][0] - step * (i + isLike);
    }
    return array
  }

  // update 4 here ***
  // I've had errors where some fields in the database don't have a field causing an error that is not logged
  const addNewItem = async (newItemBucket, newBinarySearchM, isNewCard) => {
    setRankMode(false);
    setAddView('addingItem');
    // eventually have to do a for loop for all the images
    if (newItemImageUris.length > 0 && addedCustomImage) {
      const imageUri = newItemImageUris[0];
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const filename = imageUri.substring(imageUri.lastIndexOf('/') + 1);
      const storageRef = storRef(storage, filename);
      const uploadTask = uploadBytesResumable(storageRef, blob);
      let imageType = 'image';
      if (imageUri.endsWith('.mp4') || imageUri.endsWith('.avi') || imageUri.endsWith('.mov') || imageUri.endsWith('.mkv') || imageUri.endsWith('.wmv') || imageUri.endsWith('.webm') || imageUri.endsWith('.flv') || imageUri.endsWith('.mp3')) { 
        imageType = 'video';
      }

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        }, 
        (error) => {
          console.error('Upload failed', error);
        }, 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log('File available at', downloadURL);

            const newItemObj = {
              'bucket': newItemBucket, // can't remove
              'content': newItem, 
              'description': newItemDescription, 
              'image': downloadURL, 
              'score': null,
              'timestamp': Date.now(),
              'custom': true,
              'trackUri': trackUri,
              'imageType': imageType
            };
            // make sure any changes to newItemObj are also reflected in itemComparisons
            let items = addElementAndRecalculate(itemComparisons, newItemObj, newBinarySearchM, isNewCard);
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              let itemRef = null;
              if (item.key) { // There is a key, this is an item that already has been added
                itemRef = ref(database, `items/${item.key}`);
              } else {
                setNewItemFinalScore(item.score.toFixed(1));
                itemRef = push(ref(database, 'items'));
              }
              update(itemRef, { 
                bucket: newItemBucket,
                category_id: newItemCategory,
                category_name: newItemCategoryName,
                content: item.content, 
                description: item.description,
                image: item.image,
                score: item.score,
                timestamp: item.timestamp || 0,
                user_id: userKey,
                custom: item.custom,
                trackUri: item.trackUri || null,
                imageType: item.imageType || null
              })
              .then(() => console.log(`Score updated for ${item.content} ${items}`))
              .catch((error) => console.error(`Failed to update score for ${item.content}: ${error}`));
              
              // update category photo if its the best
              if (item.score === 10.0) {
                const categoryRef = ref(database, 'categories/' + newItemCategory);
                get(categoryRef).then((snapshot) => {
                  if (snapshot.exists() && !snapshot.val().presetImage) {
                    console.log("switched photos")
                    update(categoryRef, {
                      imageUri: item.image
                    })
                  }
                })
              }
            }
            setAddView('itemAdded'); // ~ do we need this?
          });
        }
      );
    } else {
      const newItemObj = {
        'bucket': newItemBucket, 
        'content': newItem, 
        'description': newItemDescription, 
        'image': newItemImageUris[0]|| '', 
        'score': null,
        'timestamp': Date.now(),
        'custom': presetDescription !== newItemDescription,
        'trackUri': trackUri,
      };
      // make sure any changes to newItemObj are also reflected in itemComparisons
      let items = addElementAndRecalculate(itemComparisons, newItemObj, newBinarySearchM, isNewCard);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let itemRef = null;
        if (item.key) { // There is a key, this is an item that already has been added
          itemRef = ref(database, `items/${item.key}`);
        } else {
          setNewItemFinalScore(item.score.toFixed(1));
          itemRef = push(ref(database, 'items'));
        }
        update(itemRef, { 
          bucket: newItemBucket,
          category_id: newItemCategory,
          category_name: newItemCategoryName,
          content: item.content, 
          description: item.description,
          image: item.image,
          score: item.score,
          timestamp: item.timestamp || 0,
          user_id: userKey,
          custom: item.custom,
          trackUri: item.trackUri || null,
        })
        .then(() => console.log(`Score updated for ${item.content} ${items}`))
        .catch((error) => console.error(`Failed to update score for ${item.content}: ${error}`));

        // update category photo if its the best
        if (item.score === 10.0) {
          const categoryRef = ref(database, 'categories/' + newItemCategory);
          get(categoryRef).then((snapshot) => {
            if (snapshot.exists() && !snapshot.val().presetImage) {
              console.log("switched photos")
              update(categoryRef, {
                imageUri: item.image
              })
            }
          })
        }
      }
      setAddView('itemAdded');
    }

    // increment counters
    const categoryRef = ref(database, 'categories/' + newItemCategory);
    update(categoryRef, {
      latest_add: Date.now(),
      num_items: numItems + 1
    })

    // notify user if item was added from another post
    if (route.params.taggedUserId) {
      const eventsRef = push(ref(database, 'events/' + route.params.taggedUserId));
      const userRef = ref(database, 'users/' + route.params.taggedUserId);
      set(eventsRef, {
        evokerId: userKey,
        content: 'added [' + newItem + '] from your post!',
        timestamp: Date.now()
      })
      update(userRef, {
        unreadNotifications: true
      })
    }
  }

  // update here ***
  const onBucketPress = (bucket) => {
    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(newItemCategory));

    get(categoryItemsQuery).then((snapshot) => {
      const itemComparisons = [];
      if (snapshot.exists()) { // didn't affect anything
        snapshot.forEach((childSnapshot) => {
          if (childSnapshot.val().bucket === bucket) {
            itemComparisons.push({ // this is used as a parameter in the recalc function
              'key': childSnapshot.key,
              'content':childSnapshot.val().content, 
              'description': childSnapshot.val().description,
              'image': childSnapshot.val().image || null, 
              'score': childSnapshot.val().score,
              'timestamp': childSnapshot.val().timestamp || 0, // do this for new fields where previous items may not have
              'user_id': childSnapshot.val().user_id,
              'custom': childSnapshot.val().custom || false,
              'trackUri': childSnapshot.val().trackUri || null,
              'imageType': childSnapshot.val().imageType || null,
            });
          }
        });
        itemComparisons.sort((a, b) => b.score - a.score);
      } 
      setItemComparisons(itemComparisons)
      setNewItemBucket(bucket); // bucket doesn't update fast enough so need to pass in as a parameter
      setBinarySearchL(0);
      setBinarySearchR(itemComparisons.length - 1);
      setBinarySearchM(Math.floor((itemComparisons.length - 1) / 2));
      if (itemComparisons.length === 0) {
        setBinarySearchL(0);
        setBinarySearchR(0);
        addNewItem(bucket, 0, true); // if there are no items to compare add it to the first position
      }
    }).catch((error) => {
      console.error("Error onBucketPress:", error);
    });
  }

  const onCardComparisonPress = (isNewCard) => {
    let newBinarySearchL = binarySearchL;
    let newBinarySearchR = binarySearchR;
    let newBinarySearchM = binarySearchM;
    if (isNewCard) {
      newBinarySearchR = binarySearchM - 1;
      if (newBinarySearchL > newBinarySearchR) {
        setBinarySearchL(0);
        setBinarySearchR(0);
        addNewItem(newItemBucket, newBinarySearchM, isNewCard);
      }
      newBinarySearchM = Math.floor((newBinarySearchR + newBinarySearchL) / 2)
      setBinarySearchR(newBinarySearchR);
      setBinarySearchM(newBinarySearchM);
    } else {
      newBinarySearchL = binarySearchM + 1;
      if (newBinarySearchL > newBinarySearchR) {
        setBinarySearchL(0);
        setBinarySearchR(0);
        addNewItem(newItemBucket, newBinarySearchM, isNewCard);
      }
      newBinarySearchM = Math.floor((newBinarySearchR + newBinarySearchL) / 2)
      setBinarySearchL(newBinarySearchL);
      setBinarySearchM(newBinarySearchM);
    }
  }

  const onTooToughPress = () => {
    setBinarySearchM(prev => prev + 1);
    if (binarySearchM >= binarySearchR) {
      setBinarySearchL(0);
      setBinarySearchR(0);
      addNewItem(newItemBucket, binarySearchM, true);
    }
  }

  const onSkipPress = () => {
    setBinarySearchM(prev => prev - 1);
    if (binarySearchM <= binarySearchL) {
      setBinarySearchL(0);
      setBinarySearchR(0);
      addNewItem(newItemBucket, binarySearchM, false);
    }
  }

  // update here ***
  onAddLaterPress = () => {
    const newLaterItemRef = push(ref(database, 'items'));
    let imageType = 'image';
    // if (imageUri.endsWith('.mp4') || imageUri.endsWith('.avi') || imageUri.endsWith('.mov') || imageUri.endsWith('.mkv') || imageUri.endsWith('.wmv') || imageUri.endsWith('.webm') || imageUri.endsWith('.flv') || imageUri.endsWith('.mp3')) { 
    //   imageType = 'video';
    // }

    let updateObject = {
      category_id: newItemCategory,
      category_name: newItemCategoryName,
      content: newItem, 
      score: -1, 
      bucket: 'later',
      description: newItemDescription,
      image: newItemImageUris[0] || '',
      timestamp: Date.now(),
      user_id: userKey,
      custom: presetDescription !== newItemDescription,
      imageType: imageType
    };

    if (trackUri) {
      updateObject.trackUri = trackUri;
    }

    update(newLaterItemRef, updateObject)
    .then(() => console.log(`New later item added`))
    .catch((error) => console.error(`Failed to add later item: ${error}`));

    // increment counters
    const categoryRef = ref(database, 'categories/' + newItemCategory);
    update(categoryRef, {
      latest_add: Date.now(),
      num_items: numItems + 1
    })

    // notify user if item was added from another post
    if (route.params.taggedUserId) {
      const eventsRef = push(ref(database, 'events/' + route.params.taggedUserId));
      const userRef = ref(database, 'users/' + route.params.taggedUserId);
      set(eventsRef, {
        evokerId: userKey,
        content: 'added [' + newItem + '] from your post!',
        timestamp: Date.now()
      })
      update(userRef, {
        unreadNotifications: true
      })
    }

    setAddView('itemAdded');
  }

  onContinuePress = () => {
    setNewItem('');
    setNewItemCategory(null); 
    setNewItemBucket(null);
    setItemComparisons([]);
    setAddView('');
    setBinarySearchL(0);
    setBinarySearchR(0);
    setBinarySearchM(0);
    setNewItemFinalScore(-1);
    setNewItemDescription('');
    setNewItemImageUris([]);
    getUserCategories();
  }

  if (addView === 'addingItem') {
    return (
      <View style={{ backgroundColor: 'white', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Adjusting rankings...</Text>
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'grey', marginTop: 5, fontStyle: 'italic' }}>Custom Images May Take Longer to Load</Text>
        <Text style={{ fontSize: 40, fontWeight: 'bold', marginTop: 20 }}>🌐</Text>
      </View>
    )
  }

  if (addView === 'AddPost') {
    return (
      <AddPost 
        newItemDescription={newItemDescription}
        setNewItemDescription={setNewItemDescription} 
        newItemImageUris={newItemImageUris}
        setNewItemImageUris={setNewItemImageUris} 
        setAddView={setAddView}  
        setAddedCustomImage={setAddedCustomImage}
      />
    );
  }

  function getScoreColorHSL(score) {
    if (score < 0) {
      return '#A3A3A3'; // Gray color for negative scores
    }
    const cappedScore = Math.max(0, Math.min(score, 10)); // Cap the score between 0 and 100
    const hue = (cappedScore / 10) * 120; // Calculate hue from green to red
    const lightness = 50 - score ** 1.3; // Constant lightness
    return `hsl(${hue}, 100%, ${lightness}%)`; // Return HSL color string
  }

  if (addView === 'itemAdded') {

    let scoreColor = getScoreColorHSL(newItemFinalScore);

    return (
      <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, paddingRight: 20, height: '100%' }}>
        <View style={{ alignItems: 'center', justifyContent: 'space-evenly', height: '100%' }}>
          <Text style={{ fontSize: 30, fontWeight: 'bold' }}>Item added! 🎉</Text>
          <View style={{ 
            borderWidth: 3, 
            borderColor: 'lightgray', 
            width: 300, 
            height: 300, 
            alignItems: 'center', 
            justifyContent: 'space-evenly', 
            borderRadius: 25,
            padding: 10
          }}>
            {newItemImageUris.length > 0 && (
              <Image
                source={{ uri: newItemImageUris[0] }}
                style={{height: 80, width: 80, borderWidth: 0.5, borderRadius: 5, borderColor: 'lightgrey' }}
              />
            )}
            
            <View style={{ alignItems: 'center', width: 240 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{newItem}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%' }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                justifyContent: 'center',
                alignItems: 'center',
                borderColor: scoreColor,
                borderWidth: 4
              }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: scoreColor }}>{newItemFinalScore >= 0 ? newItemFinalScore : '...'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => onContinuePress()} style={{
            width: 250,
            backgroundColor: 'black',
            alignItems: 'center',
            height: 50,
            justifyContent: 'center',
            borderRadius: 15
          }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, paddingRight: 20, height: '100%' }}>
        <Text style={{ color: 'black', fontSize: 24, fontFamily: 'Poppins Regular', marginTop: 10 }}>ambora\social</Text>

        {!rankMode && (
          <>
          {!newItemCategory ? (
            <>
            {newItem ? (
              <>
              <Text style={{ marginTop: 20, fontWeight: 'bold', fontSize: 14, color: 'gray' }}>SELECT A LIST TO ADD:</Text>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, fontStyle: 'italic', marginTop: 8, flexShrink: 1 }}>{newItem}</Text>
              </>
            ) : (
              <Text style={{ marginTop: 20, fontWeight: 'bold', fontSize: 14, marginBottom: 10, color: 'gray', fontStyle: 'italic' }}>SELECT A LIST:</Text>
            )}

            {userCategories.length === 0 && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ marginTop: 35, fontWeight: 'bold', fontSize: 16, color: 'black' }}>You have not created any lists!</Text>
                <Text style={{ marginTop: 15, fontWeight: 'bold', fontSize: 14, color: 'black' }}>To create a list go to: Profile → Add List</Text>
              </View>
            )}

            <FlatList
              data={userCategories}
              renderItem={({ item }) => <CategoryTile 
                category_name={item.category_name} 
                imageUri={item.imageUri} 
                num_items={item.num_items} 
                onCategoryPress={() => {
                  setNewItemCategory(item.id)
                  setNewItemCategoryName(item.category_name)
                  setNewItemCategoryType(item.category_type)
                  const categoryItemsRef = ref(database, 'items');
                  const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(item.id));
                  get(categoryItemsQuery).then((snapshot) => {
                    if (snapshot.exists()) {
                      let items = new Set();
                      snapshot.forEach((childSnapshot) => {
                        let item = childSnapshot.val();
                        items.add(item.content);
                      })
                      setNumItems(Object.keys(snapshot.val()).length)
                      setItemsInCategory(items)
                    } else {
                      setNumItems(0)
                    }
                  })
                }}
                fromPage={'Add'}
              />}
              keyExtractor={(item, index) => index.toString()}
              numColumns={3}
              contentContainerStyle={{}}
            />
            </>
          ) : (
            <>
            <Text style={{ marginTop: 15, fontWeight: 'bold', fontSize: 12 }}>List: </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ marginTop: 5, fontWeight: 'bold', fontSize: 20 }}>{newItemCategoryName}</Text>
              <TouchableOpacity onPress={() => {
                setNewItemCategory(null)
                setSearchResults([])
              }}>
                <Text>Change</Text>
              </TouchableOpacity>
            </View>
            </>
          )}
          </>
        )}

        {newItem.length > 0 && newItemCategory && rankMode && (
          <TouchableOpacity style={{ marginTop: 25 }} onPress={() => {
            setRankMode(false)
            setNewItemBucket(null)
            setItemComparisons([])
            setBinarySearchL(0)
            setBinarySearchR(0)
            setBinarySearchM(0)
            setNewItemFinalScore(-1)
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'black' }}>Cancel</Text>
          </TouchableOpacity>
        )}

        {newItemCategory && (
          <View style={{
            flexDirection: 'row',
            marginTop: 15,
            backgroundColor: 'lightgray',
            paddingHorizontal: 15,
            borderRadius: 10,
            alignItems: 'center', // Aligns the TextInput and the icon vertically
            marginBottom: 10
          }}>
            <Ionicons name="search" size={24} color="black" style={styles.icon} />
            <TextInput
              placeholder={`Add to ${userCategories.find(item => item.id === newItemCategory)?.category_name || ''}`}
              value={newItem}
              placeholderTextColor="gray"
              onChangeText={(text) => {
                setNewItem(text);
                search(spotifyAccessToken, newItemCategoryType, setSearchResults, text);
              }}
              onFocus={() => setAddView('')}
              style={{
                flex: 1, // Takes up the maximum space leaving the icon on the far side
                letterSpacing: 0.4,
                paddingLeft: 10, // Optional: Adds some space between the icon and the text input
                fontWeight: 'bold',
                fontSize: 16,
                height: 50
              }}
            />
          </View>
        )}

        {newItem.length > 0 && newItemCategory && !rankMode && addView === '' && (
          <>
            <FlatList
              data={searchResults}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => {
                  setNewItem(item.content)
                  setNewItemImageUris([item.image])
                  setNewItemDescription(item.description)
                  setPresetDescription(item.description)
                  setTrackUri(item.uri || null)
                }} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  padding: 5,
                  borderColor: 'lightgray',
                  borderBottomWidth: 0.5,
                }}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={{ 
                      width: newItemCategoryType === 'Movies' || newItemCategoryType === 'Shows' ? 40 : 60, height: 60,
                      borderRadius: 5,
                      borderWidth: 0.5,
                      borderColor: 'lightgray'
                    }}/>
                  ) : (
                    <View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: 'lightgray', borderRadius: 5 }}>
                      <Ionicons name="location-sharp" size={40} color="black" />
                    </View>
                  )}
                  <View style={{ marginLeft: 10, width: 250 }}>
                    <Text style={{ fontWeight: 'bold' }}>{item.content}</Text>
                    <Text style={{ color: 'gray', fontSize: 12 }}>{item.description}</Text>
                  </View>
                  { itemsInCategory && itemsInCategory.has(item.content) && <Ionicons name="list" size={25} />}
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => index.toString()}
              numColumns={1}
              key={"single-column"}
            />
            
            {(newItemImageUris.length === 0 && newItemDescription.length === 0 && newItemCategory) ? (
              <>
              <Text style={{ marginTop: 10, marginLeft: 5, fontSize: 11, color: 'gray', fontStyle: 'italic' }}>Add a custom description or image to appear in the feed!</Text>
              <TouchableOpacity onPress={() => setAddView('AddPost')} style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginTop: 5, 
                borderWidth: 2,
                padding: 5,
                paddingHorizontal: 10,
                borderRadius: 10
              }}>
                <Ionicons name="add-circle-outline" size={30} color="black" />
                <Text style={{ marginLeft: 10, fontWeight: 'bold' }}>Add Image or Description</Text>
              </TouchableOpacity>
              </>
            ) : (
              <>
              <Text style={{ marginTop: 10, fontWeight: 'bold', fontSize: 12 }}>My Post:</Text>
              <View style={{ flexDirection: 'row', marginTop: 5, alignItems: 'center' }}>
                {newItemImageUris.length > 0 && (
                  <Image
                    source={{ uri: newItemImageUris[0] }}
                    style={{height: 50, width: 50, borderWidth: 0.5, marginRight: 10, borderRadius: 15, borderColor: 'lightgrey' }}
                  />
                )}
                {newItemDescription.length > 0 && (
                  <Text style={{ color: 'grey', fontSize: 16, width: '68%' }}>
                    {newItemDescription.length > 50 ? newItemDescription.slice(0, 50) + '...' : newItemDescription}
                  </Text>
                )}
                <TouchableOpacity onPress={() => setAddView('AddPost')} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  justifyContent: 'center', 
                  marginLeft: 'auto',
                  borderWidth: 2,
                  height: 40,
                  width: 40,
                  borderRadius: 10
                }}>
                  <Ionicons name="pencil" size={25} color="black" />
                </TouchableOpacity>
              </View>
              </>
            )}
            
            <View style={{flexDirection: 'row', marginTop: 10, justifyContent: 'space-between', marginBottom: 5 }}>
              <TouchableOpacity onPress={() => {
                if (!newItemCategory) {
                  alert('Please select a category');
                } else if (!newItem) {
                  alert('Please enter an item');
                } else {
                  onAddLaterPress()
                }
              }} 
              style={{ 
                borderWidth: 2, 
                borderColor: 'lightgray', 
                borderRadius: 15,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: 170
              }}>
                <Ionicons name="bookmark" size={20} color="gray" />
                <Text style={{ color: 'gray', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>Add to 'Later'</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => {
                if (!newItemCategory) {
                  alert('Please select a category');
                } else if (!newItem) {
                  alert('Please enter an item');
                } else {
                  setRankMode(true);
                }
              }} 
              style={{
                backgroundColor: 'black',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 28,
                height: 50,
                width: 175,
              }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Add to List</Text>
              </TouchableOpacity>
              
            </View>
          </>
        )}
        
        {newItem.length > 0 && newItemCategory && rankMode && (
          <>
          <View style={{
            alignItems: 'center',
            borderColor: 'lightgray',
            borderWidth: 2,
            borderRadius: 10,
            padding: 10,
            paddingVertical: 15,
            marginTop: 20
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 15,
            }}>
              How was it?
            </Text>
            <View style={styles.optionsContainer}>
              <View style={styles.optionBox}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: 'lightgreen' },
                    newItemBucket === 'like' && styles.selectedOption,
                  ]}
                  onPress={() => newItemBucket ? {} : onBucketPress('like')}
                >
                  {newItemBucket === 'like' && (
                    <Ionicons name="checkmark" size={24} color="white" />
                  )}
                </TouchableOpacity>
                <Text style={styles.optionText}>Good!</Text>
              </View>
              
              <View style={styles.optionBox}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: 'gold' },
                    newItemBucket === 'neutral' && styles.selectedOption,
                  ]}
                  onPress={() => newItemBucket ? {} : onBucketPress('neutral')}
                >
                  {newItemBucket === 'neutral' && (
                    <Ionicons name="checkmark" size={24} color="white" />
                  )}
                </TouchableOpacity>
                <Text style={styles.optionText}>Mid</Text>
              </View>
              
              <View style={styles.optionBox}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: 'tomato' },
                    newItemBucket === 'dislike' && styles.selectedOption,
                  ]}
                  onPress={() => newItemBucket ? {} : onBucketPress('dislike')}
                >
                  {newItemBucket === 'dislike' && (
                    <Ionicons name="checkmark" size={24} color="white" />
                  )}
                </TouchableOpacity>
                <Text style={styles.optionText}>Bad.</Text>
              </View>
            </View>
          </View>
          </>
        )}
        
        {newItem.length > 0 && newItemCategory && itemComparisons.length > 0 && rankMode && (
          <View style={{
            alignItems: 'center',
            backgroundColor: 'white',
            borderColor: 'lightgray',
            borderWidth: 2,
            borderRadius: 10,
            marginTop: 20,
            paddingVertical: 10
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 15,
              marginTop: 10
            }}>
              Which do you prefer?
            </Text>
            <View style={styles.cardsContainer}>
              <TouchableOpacity style={styles.card} onPress={() => onCardComparisonPress(true)}>
                <Text style={styles.itemContent}>
                  {newItem.length > 30 ? newItem.slice(0, 30) + '...' : newItem}
                </Text>
                <View style={{
                  borderWidth: 1.5,
                  height: 40,
                  width: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderColor: 'gray',
                  marginTop: 10
                }}>
                  <Text style={{
                    color: 'gray'
                  }}>
                    ?
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.orContainer}>
                <Text style={styles.orText}>OR</Text>
              </View>
              
              <TouchableOpacity style={styles.card} onPress={() => onCardComparisonPress(false)}>
                <Text style={styles.itemContent}>
                  {itemComparisons[binarySearchM].content.length > 30 ? itemComparisons[binarySearchM].content.slice(0, 30) + '...' : itemComparisons[binarySearchM].content}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
                  {itemComparisons[binarySearchM].image && (
                    <Image
                      source={{ uri: itemComparisons[binarySearchM].image }}
                      style={{height: 40, width: 40, borderWidth: 0.5, marginRight: 10, borderRadius: 5, borderColor: 'lightgrey' }}
                    />
                  )}
                  <View style={{
                    borderWidth: 1.5,
                    height: 40,
                    width: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: getScoreColorHSL(itemComparisons[binarySearchM].score),
                  }}>
                    <Text style={{
                      color: getScoreColorHSL(itemComparisons[binarySearchM].score)
                    }}>
                      {itemComparisons[binarySearchM].score.toFixed(1)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionText}>      </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => onTooToughPress()}>
                <Text style={styles.actionText}>Too Tough</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => onSkipPress()}>
                <Text style={styles.actionText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Add;