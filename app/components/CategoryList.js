import React, {useEffect, useState, useMemo} from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Linking, TextInput, ScrollView } from "react-native";
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { ref, set, remove, onValue, off, query, orderByChild, equalTo, get, update, runTransaction } from "firebase/database";
import { database, storage } from '../../firebaseConfig';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import Hyperlink from 'react-native-hyperlink';
import * as ImagePicker from 'expo-image-picker';
import FeedItemTile from "./FeedItemTile";


const styles = StyleSheet.create({
  listTileScore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderColor: 'green',
    borderWidth: 3
  },
  addedImages: {
    height: 80,
    width: 80,
    borderWidth: 2,
    marginTop: 10,
    marginBottom: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'gray'
  }
});

function getScoreColorHSL(score) {
  if (score < 0) {
    return '#A3A3A3'; // Gray color for negative scores
  }
  const cappedScore = Math.max(0, Math.min(score, 10)); // Cap the score between 0 and 100
  const hue = (cappedScore / 10) * 120; // Calculate hue from green to red
  const lightness = 50 - score ** 1.3; // Constant lightness
  return `hsl(${hue}, 100%, ${lightness}%)`; // Return HSL color string
}

const CategoryList = ({ focusedCategory, focusedList, onBackPress, focusedCategoryId, isMyProfile, visitingUserId, navigation }) => {
  const [listView, setListView] = useState('now');
  const [listData, setListData] = useState(focusedList);
  const [editMode, setEditMode] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryInfo, setCategoryInfo] = useState({});
  const [categoryImage, setCategoryImage] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [focusedItemDescription, setFocusedItemDescription] = useState(null);
  const [presetImage, setPresetImage] = useState(true);

  useEffect(() => {
    const categoryRef = ref(database, 'categories/' + focusedCategoryId);
    get(categoryRef).then((snapshot) => {
      if (snapshot.exists()) {
        setCategoryInfo(snapshot.val());
      } else {
        console.log("No user data.");
      }
    }).catch((error) => {
      console.error(error);
    });
  }, [focusedCategoryId]); // ~ why do I need to put this here, why isn't it updating automatically

  function recalculateItems(similarBucketItems, item_bucket) {
    const minMaxMap = {
      'like': [10.0, 6.7],
      'neutral': [6.6, 3.3],
      'dislike': [3.2, 0.0]
    }

    let isLike = 1
    if (item_bucket === 'like') {
      isLike = 0
    }

    const step = (minMaxMap[item_bucket][0] - minMaxMap[item_bucket][1]) / (similarBucketItems.length + isLike);
    for (let i = 0; i < similarBucketItems.length; i++) {
        similarBucketItems[i][1]['score'] = minMaxMap[item_bucket][0] - step * (i + isLike);
    }
    return similarBucketItems;
  }

  const deleteImageFromStorage = async (imageUri) => {
    try {
      const storage = getStorage();
      
      // You need to transform the `imageUri` from your database to the storage reference
      // If your `imageUri` is a full URL like in the example you provided,
      // you will need to extract the path to the file from it.
      // Example: "items/84E4F4D9-D783-4486-8BDD-251FF2752334.png"
      const imagePath = imageUri.split('/o/')[1].split('?')[0];
      const decodedImagePath = decodeURIComponent(imagePath);
  
      const imageRef = storageRef(storage, decodedImagePath);
      await deleteObject(imageRef);
      console.log('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // update 1 here ***
  const onDeleteItemPress = (item_bucket, item_category_id) => {
    const delItemRef = ref(database, `items/${item_category_id}`);
    remove(delItemRef)
    .then(() => {
      console.log('Item deleted successfully!');
    })
    .catch((error) => {
      console.error('Error deleting item:', error);
    });

    // setCategoryLoading(true);
    if (listView === 'now') {
      let similarBucketItems = []
      
      listData[listView].forEach(item => {
        if (item[1].bucket === item_bucket && item[0] !== item_category_id) {
          similarBucketItems.push(item)
        }
      });

      let items = recalculateItems(similarBucketItems, item_bucket);

      if (items) {
        items.forEach((item) => {
          const itemRef = ref(database, `items/${item[0]}`);
          update(itemRef, { 
            score: item[1].score,
          })
          .then(() => console.log(`Score updated for ${item[0]}`))
          .catch((error) => console.error(`Failed to update score for ${item[0]}: ${error}`));

          // update category photo if its the best
          if (item[1].score === 10.0) {
            const categoryRef = ref(database, 'categories/' + item[1].category_id);
            update(categoryRef, {
              imageUri: item[1].image || null
            })
          }
        });
      }
    }

    // setCategoryLoading(false);
    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(focusedCategoryId));

    // some repeated code here from Profile.js
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
      setListData(tempFocusedList);
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });

    const categoryRef = ref(database, 'categories/' + focusedCategoryId);
    runTransaction(categoryRef, (currentData) => {
      currentData.num_items = (currentData.num_items || 0) - 1;
      return currentData; // Returns the updated data to be saved
    })
  }

  onItemPress = (item_key) => {
    const itemRef = ref(database, `items/${item_key}`);
    get(itemRef).then((snapshot) => {
      const tempFocusedItem = snapshot.val();
      tempFocusedItem.key = item_key;
      setFocusedItem(tempFocusedItem);
    })
  }

  const ListItemTile = ({ item, item_key, index }) => {
    let scoreColor = getScoreColorHSL(Number(item.score));

    // ~ eventually want to get this function to delete the extra item as well
    const onRerankItemPress = () => {
      navigation.navigate('Add', {
        itemName: item.content,
        itemDescription: item.description,
        itemImage: [item.image],
        itemCategory: item.category_id,
        itemCategoryName: item.category_name,
        taggedUser: null
      })
    }

    return (
      <TouchableOpacity onPress={() => onItemPress(item_key)}>
        <View style={{ paddingVertical: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, alignItems: 'center', }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: editMode && 10 }}>
            {editMode && (
              <TouchableOpacity onPress={() => onDeleteItemPress(item.bucket, item_key)} style={{ marginRight: 10 }}>
                <MaterialIcons name="do-disturb-on" size={25} color="red" />
              </TouchableOpacity>
            )}
            <View style={{ width: '85%' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{index + 1}) {item.content}</Text>
              <View style={{ flexDirection: 'row', marginTop: 10, }}>
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={{height: 40, width: 40, borderWidth: 0.5, marginRight: 10, borderRadius: 5, borderColor: 'lightgrey' }}
                  />
                )}
                {item.description && item.description.length > 0 && (
                  <Hyperlink
                    linkDefault={ true }
                    linkStyle={ { color: '#2980b9', textDecorationLine: 'underline' } }
                    onPress={ (url, text) => Linking.openURL(url) }
                    style={{ flex: 1 }}
                  >
                    <Text style={{ color: 'grey', fontSize: 16 }}>
                      {item.description.length > 50 ? item.description.slice(0, 50) + '...' : item.description}
                    </Text>
                  </Hyperlink>
                )}
              </View>
            </View>
            <View style={[styles.listTileScore, { borderColor: scoreColor, marginLeft: 'auto' }]}>
              <Text style={{ color: scoreColor, fontWeight: 'bold' }}>{item.score < 0 ? '...' : item.score.toFixed(1)}</Text>
            </View>
          </View>
          {/* {editMode && (
            <TouchableOpacity onPress={() => onRerankItemPress(item_key)} style={{ flexDirection: 'row', marginTop: 10, borderColor: 'lightgrey', borderWidth: 3, padding: 3, borderRadius: 5 }}>
              <Text style={{ color: 'grey', fontSize: 16, fontWeight: 'bold' }}>Rerank Item</Text>
            </TouchableOpacity>
          )} */}
        </View>
      </TouchableOpacity>
    );
  }

  const onIconViewPress = () => {
    if (listView === 'now') {
      setListView('later');
    } else {
      setListView('now');
    }
  }

  const onEditPress = async () => {
    if (editMode && !focusedItem) {
      if (categoryImage) {
        const response = await fetch(categoryImage);
        const blob = await response.blob();
        const filename = categoryImage.substring(categoryImage.lastIndexOf('/') + 1);
        const storageRef = storRef(storage, filename); // Use the previously renamed 'ref' function
        const uploadTask = uploadBytesResumable(storageRef, blob);

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
              const categoryRef = ref(database, 'categories/' + focusedCategoryId);
              update(categoryRef, {
                category_name: categoryInfo.category_name,
                category_description: categoryInfo.category_description,
                imageUri: downloadURL,
                presetImage: true
              })
              .then(() => {
                console.log('Category updated successfully!');
              })
              .catch((error) => console.error('Error onEditPress:', error));
            });
          }
        );
      } else {
        const categoryRef = ref(database, 'categories/' + focusedCategoryId);
        update(categoryRef, {
          category_name: categoryInfo.category_name,
          category_description: categoryInfo.category_description,
          presetImage: presetImage
        })
        .then(() => {
          console.log('Category updated successfully!');
        })
        .catch((error) => console.error('Error onEditPress:', error));
      }
    }

    if (editMode && !focusedItem) {
      const categoryRef = ref(database, 'categories/' + focusedCategoryId);
      update(categoryRef, {
        category_name: categoryInfo.category_name,
        category_description: categoryInfo.category_description
      })
      .then(() => {
        console.log('Category updated successfully!');
      })
      .catch((error) => console.error('Error onEditPress:', error));
    }

    console.log(editMode, focusedItemDescription, focusedItem);

    if (editMode && focusedItemDescription && focusedItem) {
      console.log('focusedItemDescription:', focusedItemDescription);
      const itemRef = ref(database, `items/${focusedItem.key}`);
      update(itemRef, {
        description: focusedItemDescription
      })
    }
    setEditMode(!editMode);
  }

  const deleteCategoryAndItems = () => {
    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(focusedCategoryId));

    get(categoryItemsQuery).then((snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const itemRef = ref(database, `items/${childSnapshot.key}`);
        remove(itemRef).then(() => {
            console.log(`Item with key ${childSnapshot.key} deleted successfully.`);
        }).catch((error) => {
            console.error("Error deleting item:", error);
        });
      });
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });

    const delCategoryRef = ref(database, `categories/${focusedCategoryId}`);
    remove(delCategoryRef).then(() => {
      console.log('Category deleted successfully!');
    })

    onBackPress();
  }

  const onDeleteCategoryPress = () => {
    Alert.alert(
      "Are you sure?", // Alert Title
      "All items in this category will be deleted.", // Alert Message
      [
        { text: "Cancel", onPress: () => console.log("Cancel Pressed"), style: "cancel"},
        { text: "Delete Category", onPress: () => deleteCategoryAndItems() }
      ],
      { cancelable: false } // This prevents the alert from being dismissed by tapping outside of the alert dialog.
    );
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // ~ may need to change to just pictures
      allowsEditing: true,
      aspect: [4,3], // search up
      quality: 1,
    });
    setCategoryImage(result.assets[0].uri);
  }; 

  const memoizedList = useMemo(() => listData[listView].map((item, index) => <ListItemTile item={item[1]} item_key={item[0]} index={index} key={index} />), [listData, listView, editMode]);

  if (focusedItem) {
    return (
      <>
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => {
          setFocusedItem(null)
          setEditMode(false)
        }}> 
          <MaterialIcons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
        {editMode ? (
          <>
          <TouchableOpacity onPress={() => {
            onDeleteItemPress(focusedItem.bucket, focusedItem.key)
            setFocusedItem(null)
          }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: 'red' }}>Delete Item</Text>
          </TouchableOpacity>
          </>
        ) : (
          <Text style={{ fontSize: 15, fontWeight: 'bold' }}>{focusedCategory}</Text>
        )}

        <TouchableOpacity onPress={() => onEditPress()}>
          {editMode ? (
            <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Done</Text>
          ) : isMyProfile ? (
            <Text style={{ fontSize: 15 }}>Edit</Text>
          ) : (
            <Text>       </Text>
          )}
        </TouchableOpacity>
      </View>
      <FeedItemTile item={focusedItem} visitingUserId={visitingUserId} navigation={navigation} editMode={editMode} setFocusedItemDescription={setFocusedItemDescription} showComments={true}/>
      </>
    );
  }

  return (
    <>
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBackPress}> 
          <MaterialIcons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
        {editMode ? (
          <>
          <TouchableOpacity onPress={() => onDeleteCategoryPress()}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: 'red' }}>Delete {focusedCategory}</Text>
          </TouchableOpacity>
          </>
        ) : (
          <Text style={{ fontSize: 15, fontWeight: 'bold' }}>{focusedCategory}</Text>
        )}

        <TouchableOpacity onPress={() => onEditPress()}>
          {editMode ? (
            <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Done</Text>
          ) : isMyProfile ? (
            <Text style={{ fontSize: 15 }}>Edit</Text>
          ) : (
            <Text>       </Text>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView>
      <View style={{ padding: 10 }}>
        {editMode ? (
          <>
          {categoryImage ? (
            <Image
              source={{ uri: categoryImage }}
              style={[styles.addedImages, {height: 150, width: 150, borderWidth: 0.5, marginRight: 10}]}
            />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={pickImage} style={styles.addedImages}>
                <MaterialIcons name="add-photo-alternate" size={40} color="gray" />
                <Text style={{ marginTop: 4, fontWeight: 'bold', fontSize: 12, color: 'gray' }}>Edit Image</Text>
            </TouchableOpacity>
            {categoryInfo.presetImage && presetImage && (
              <TouchableOpacity style={{ marginLeft: 20, borderColor: 'red', padding: 5, borderWidth: 1, borderRadius: 5}} onPress={() => setPresetImage(false)}>
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: 'red' }}>Remove Preset Image</Text>
              </TouchableOpacity>
            )}
            </View>
          )}
          <TextInput
            value={categoryInfo.category_name}
            onChangeText={(text) => {
              setCategoryInfo(prevState => ({
                ...prevState,
                category_name: text
              }))
            }}
            style={{ 
              fontWeight: 'bold', 
              fontSize: 30, 
              fontStyle: 'italic',
              borderColor: 'lightgrey',
              borderBottomWidth: 1,
              paddingBottom: 5
            }}
          />
          <TextInput
            value={categoryInfo.category_description}
            onChangeText={(text) => {
              setCategoryInfo(prevState => ({
                ...prevState,
                category_description: text
              }))
            }}
            style={{ 
              color: 'gray', 
              marginVertical: 10,
              borderColor: 'lightgrey',
              borderBottomWidth: 1,
              paddingBottom: 5
            }}
          />
          </>
        ) : (
          <>
          <Text style={{ fontWeight: 'bold', fontSize: 30, fontStyle: 'italic', padding: 1 }}>{categoryInfo.category_name}</Text>
          <Text style={{ color: 'gray', marginVertical: 10 }}>{categoryInfo.category_description}</Text>
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderTopWidth: 0.5, borderColor: 'lightgrey' }}>
        <View style={{ width: '50%', alignItems: 'center', padding: 8, borderBottomColor: listView === 'now' ? 'black' : 'transparent', borderBottomWidth: 2 }}>
          <TouchableOpacity onPress={() => onIconViewPress()}>
            <MaterialIcons name="format-list-bulleted" size={listView === 'now' ? 32 : 30} color={listView === 'now' ? 'black' : 'gray'} />
          </TouchableOpacity>
        </View>
        <View style={{ width: '50%', alignItems: 'center', padding: 8, borderBottomColor: listView === 'later' ? 'black' : 'transparent', borderBottomWidth: 2 }}>
          <TouchableOpacity onPress={() => onIconViewPress()}>
            <MaterialIcons name="watch-later" size={listView === 'later' ? 32 : 30} color={listView === 'later' ? 'black' : 'gray'} />
          </TouchableOpacity>
        </View>
      </View>

      {listData[listView].length > 0 ? (  
        <>         
        {memoizedList}
        </>
      ) : (
        <Text style={{ textAlign: 'center', fontWeight: 'bold', color: 'gray', fontSize: 16, marginTop: '50%' }}>Add items to see your rankings... 😶‍🌫️</Text>
      )}
      </ScrollView>
    </>
  )
}

export default CategoryList;