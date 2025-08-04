import React, {useEffect, useState, useMemo} from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Linking, TextInput, ScrollView } from "react-native";
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ref, set, remove, onValue, off, query, orderByChild, equalTo, get, update, runTransaction } from "firebase/database";
import { database, storage } from '../../firebaseConfig';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import Hyperlink from 'react-native-hyperlink';
import * as ImagePicker from 'expo-image-picker';
import FeedItemTile from "./FeedItemTile";
import NormalItemTile from "./NormalItemTile";
import Profile from './Profile';
import CategoryComparison from "./CategoryListComponents/CategoryComparison";
import { useFocusEffect } from '@react-navigation/native';

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
    return '#A3A3A3';
  }
  const cappedScore = Math.max(0, Math.min(score, 10));
  const hue = (cappedScore / 10) * 120;
  const lightness = 50 - score ** 1.3;
  return `hsl(${hue}, 100%, ${lightness}%)`;
}

const CategoryList = ({ focusedCategory, focusedList, onBackPress, focusedCategoryId, numItems, isMyProfile, visitingUserId, navigation, userKey, isDarkMode=false, darkTheme=null }) => {
  const [listView, setListView] = useState('now');
  const [listData, setListData] = useState(focusedList);
  const [editMode, setEditMode] = useState(false);
  const [categoryInfo, setCategoryInfo] = useState({});
  const [categoryImage, setCategoryImage] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [focusedItemDescription, setFocusedItemDescription] = useState(null);
  const [presetImage, setPresetImage] = useState(true);
  const [profileView, setProfileView] = useState(null);
  const [searchVal, setSearchVal] = useState('');
  const [itemsInCategory, setItemsInCategory] = useState(new Set());
  const [visitingUserCategories, setVisitingUserCategories] = useState([]);
  const [categoryListView, setCategoryListView] = useState(null);
  const [itemRankingCounts, setItemRankingCounts] = useState({});



  useEffect(() => {
    const categoryRef = ref(database, 'categories/' + focusedCategoryId);
    get(categoryRef).then((snapshot) => {
      if (snapshot.exists()) {
        setCategoryInfo(snapshot.val());
        // check item matches with user
        const sameUserCategoriesRef = ref(database, 'categories');
        const sameUserCategoriesQuery = query(sameUserCategoriesRef, orderByChild('user_id'), equalTo(visitingUserId));
        get(sameUserCategoriesQuery).then((sameUserCategoriesSnapshot) => {
          if (sameUserCategoriesSnapshot.exists()) {
            let promises = [];
            let visitingUserCategoriesTemp = [];
            sameUserCategoriesSnapshot.forEach((childSnapshot) => {
              if (childSnapshot.val().category_type === snapshot.val().category_type) {
                visitingUserCategoriesTemp.push({id: childSnapshot.key, ...childSnapshot.val()});
                const categoryItemsRef = ref(database, 'items');
                const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(childSnapshot.key));
                promises.push(get(categoryItemsQuery));
              }
            });

            setVisitingUserCategories(visitingUserCategoriesTemp);
            Promise.all(promises).then((results) => {
              let items = new Set();
              results.forEach((categoryItemsSnapshot) => {
                if (categoryItemsSnapshot.exists()) {
                  categoryItemsSnapshot.forEach((childCategoryItemsSnapshot) => {
                    let item = childCategoryItemsSnapshot.val();
                    items.add(item.image);
                  });
                }
              });
              setItemsInCategory(items)
              // Now you can use 'items' or set it in your state
            }).catch((error) => {
              console.error(error);
            });

          } else {
            console.log("No categories found for the user.");
          }
        })
      } else {
        console.log("No user data.");
      }
    }).catch((error) => {
      console.error(error);
    });
  }, [focusedCategoryId, database, visitingUserId]);

  // Calculate ranking counts for initial focusedList
  useEffect(() => {
    console.log('Initial focusedList useEffect triggered:', focusedList);
    if (focusedList && (focusedList.now || focusedList.later)) {
      const allItems = [...(focusedList.now || []), ...(focusedList.later || [])].map(([key, value]) => ({ 
        key, 
        ...value,
        item_key: key // Add item_key for consistency
      }));
      console.log('Mapped allItems:', allItems.length, 'items');
      
      // Calculate ranking counts from database efficiently
      const uniqueImages = [...new Set(allItems.filter(item => item.image).map(item => item.image))];
      
      if (uniqueImages.length > 0) {
        // Fetch ranking counts efficiently
        const fetchRankingCounts = async () => {
          try {
            const itemsRef = ref(database, 'items');
            const snapshot = await get(itemsRef);
            
            if (snapshot.exists()) {
              const allDbItems = Object.values(snapshot.val());
              const counts = {};
              
              // Process each item in our list
              for (const item of allItems) {
                if (item.image) {
                  // Find items with same image and content, excluding current user
                  const sameContentItems = allDbItems.filter(dbItem => 
                    dbItem.image === item.image &&
                    dbItem.content === item.content && 
                    dbItem.score !== -1 && 
                    dbItem.user_id !== userKey
                  );
                  
                  const itemKey = item.item_key || item.key || item.image;
                  counts[itemKey] = sameContentItems.length;
                }
              }
              
              console.log('Setting ranking counts for focusedList:', counts);
              setItemRankingCounts(counts);
            }
          } catch (error) {
            console.error('Error fetching ranking counts:', error);
            setItemRankingCounts({});
          }
        };
        
        fetchRankingCounts();
      } else {
        setItemRankingCounts({});
      }
    }
  }, [focusedList]);

  // Calculate ranking counts when component mounts and listData is available
  useEffect(() => {
    console.log('Component mount useEffect triggered, listData:', listData);
    if (listData && (listData.now || listData.later)) {
      const allItems = [...(listData.now || []), ...(listData.later || [])].map(([key, value]) => ({ 
        key, 
        ...value,
        item_key: key
      }));
      console.log('Mapped allItems from listData:', allItems.length, 'items');
      
      // Calculate ranking counts from database efficiently
      const uniqueImages = [...new Set(allItems.filter(item => item.image).map(item => item.image))];
      
      if (uniqueImages.length > 0) {
        // Fetch ranking counts efficiently
        const fetchRankingCounts = async () => {
          try {
            const itemsRef = ref(database, 'items');
            const snapshot = await get(itemsRef);
            
            if (snapshot.exists()) {
              const allDbItems = Object.values(snapshot.val());
              const counts = {};
              
              // Process each item in our list
              for (const item of allItems) {
                if (item.image) {
                  // Find items with same image and content, excluding current user
                  const sameContentItems = allDbItems.filter(dbItem => 
                    dbItem.image === item.image &&
                    dbItem.content === item.content && 
                    dbItem.score !== -1 && 
                    dbItem.user_id !== userKey
                  );
                  
                  const itemKey = item.item_key || item.key || item.image;
                  counts[itemKey] = sameContentItems.length;
                }
              }
              
              console.log('Setting ranking counts for listData:', counts);
              setItemRankingCounts(counts);
            }
          } catch (error) {
            console.error('Error fetching ranking counts:', error);
            setItemRankingCounts({});
          }
        };
        
        fetchRankingCounts();
      } else {
        setItemRankingCounts({});
      }
    }
  }, [listData]);

  // Calculate ranking counts whenever the component becomes visible or data changes
  useEffect(() => {
    console.log('Visibility/data change useEffect triggered');
    const currentData = focusedList || listData;
    if (currentData && (currentData.now || currentData.later)) {
      const allItems = [...(currentData.now || []), ...(currentData.later || [])].map(([key, value]) => ({ 
        key, 
        ...value,
        item_key: key
      }));
      console.log('Mapped allItems from currentData:', allItems.length, 'items');
      
      // Calculate ranking counts from database efficiently
      const uniqueImages = [...new Set(allItems.filter(item => item.image).map(item => item.image))];
      
      if (uniqueImages.length > 0) {
        // Fetch ranking counts efficiently
        const fetchRankingCounts = async () => {
          try {
            const itemsRef = ref(database, 'items');
            const snapshot = await get(itemsRef);
            
            if (snapshot.exists()) {
              const allDbItems = Object.values(snapshot.val());
              const counts = {};
              
              // Process each item in our list
              for (const item of allItems) {
                if (item.image) {
                  // Find items with same image and content, excluding current user
                  const sameContentItems = allDbItems.filter(dbItem => 
                    dbItem.image === item.image &&
                    dbItem.content === item.content && 
                    dbItem.score !== -1 && 
                    dbItem.user_id !== userKey
                  );
                  
                  const itemKey = item.item_key || item.key || item.image;
                  counts[itemKey] = sameContentItems.length;
                }
              }
              
              console.log('Setting ranking counts for visibility/data change:', counts);
              setItemRankingCounts(counts);
            }
          } catch (error) {
            console.error('Error fetching ranking counts:', error);
            setItemRankingCounts({});
          }
        };
        
        fetchRankingCounts();
      } else {
        setItemRankingCounts({});
      }
    }
  }, [focusedList, listData]);



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
      const imagePath = imageUri.split('/o/')[1].split('?')[0];
      const decodedImagePath = decodeURIComponent(imagePath);
      const imageRef = storageRef(storage, decodedImagePath);
      await deleteObject(imageRef);
      console.log('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const onDeleteItemPress = (item_bucket, item_category_id) => {
    const delItemRef = ref(database, `items/${item_category_id}`);
    remove(delItemRef)
    .then(() => {
      console.log('Item deleted successfully!');
    })
    .catch((error) => {
      console.error('Error deleting item:', error);
    });

    if (listView === 'now') {
      let similarBucketItems = [];
      
      listData[listView].forEach(item => {
        if (item[1].bucket === item_bucket && item[0] !== item_category_id) {
          similarBucketItems.push(item);
        }
      });

      let items = recalculateItems(similarBucketItems, item_bucket);

      if (items) {
        items.forEach((item) => {
          const itemRef = ref(database, `items/${item[0]}`);
          update(itemRef, { score: item[1].score })
          .then(() => console.log(`Score updated for ${item[0]}`))
          .catch((error) => console.error(`Failed to update score for ${item[0]}: ${error}`));

          if (item[1].score === 10.0) {
            const categoryRef = ref(database, 'categories/' + item_category_id);
            get(categoryRef).then((snapshot) => {
              if (snapshot.exists() && !snapshot.val().presetImage) {
                update(categoryRef, { imageUri: item.image });
              }
            });
          }
        });
      }
    }

    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(focusedCategoryId));

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
      
      // Calculate ranking counts from database efficiently
      const allItems = [...tempFocusedList.now, ...tempFocusedList.later].map(([key, value]) => ({ 
        key, 
        ...value,
        item_key: key // Add item_key for consistency
      }));
      
      // Get unique images to query efficiently
      const uniqueImages = [...new Set(allItems.filter(item => item.image).map(item => item.image))];
      
      if (uniqueImages.length > 0) {
        // Fetch ranking counts efficiently
        const fetchRankingCounts = async () => {
          try {
            const itemsRef = ref(database, 'items');
            const snapshot = await get(itemsRef);
            
            if (snapshot.exists()) {
              const allDbItems = Object.values(snapshot.val());
              const counts = {};
              
              // Process each item in our list
              for (const item of allItems) {
                if (item.image) {
                  // Find items with same image and content, excluding current user
                  const sameContentItems = allDbItems.filter(dbItem => 
                    dbItem.image === item.image &&
                    dbItem.content === item.content && 
                    dbItem.score !== -1 && 
                    dbItem.user_id !== userKey
                  );
                  
                  const itemKey = item.item_key || item.key || item.image;
                  counts[itemKey] = sameContentItems.length;
                }
              }
              
              console.log('Setting ranking counts:', counts);
              setItemRankingCounts(counts);
            }
          } catch (error) {
            console.error('Error fetching ranking counts:', error);
            setItemRankingCounts({});
          }
        };
        
        fetchRankingCounts();
      } else {
        setItemRankingCounts({});
      }
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });

    const categoryRef = ref(database, 'categories/' + focusedCategoryId);
    runTransaction(categoryRef, (currentData) => {
      currentData.num_items = (currentData.num_items || 0) - 1;
      return currentData;
    });
  }

  const onItemPress = (item_key) => {
    const itemRef = ref(database, `items/${item_key}`);
    get(itemRef).then((snapshot) => {
      const tempFocusedItem = snapshot.val();
      tempFocusedItem.key = item_key;
      setFocusedItem(tempFocusedItem);
    });
  }



  const ListItemTile = ({ item, item_key, index }) => {
    let scoreColor = getScoreColorHSL(Number(item.score));
    const rankingCount = itemRankingCounts[item_key || item.image] || 0;
    
    console.log(`ListItemTile for ${item.content}: rankingCount = ${rankingCount}, item_key = ${item_key}, item.image = ${item.image}`);
    console.log('Current itemRankingCounts state:', itemRankingCounts);

    return (
      <TouchableOpacity onPress={() => onItemPress(item_key)}>
        <View style={{ 
          paddingVertical: 10, 
          borderBottomColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
          borderBottomWidth: 1, 
          alignItems: 'center',
          backgroundColor: isDarkMode ? darkTheme?.background : 'white'
        }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: editMode && 10 }}>
            {editMode && (
              <TouchableOpacity onPress={() => onDeleteItemPress(item.bucket, item_key)} style={{ marginRight: 10 }}>
                <Ionicons name="remove-circle" size={25} color="red" />
              </TouchableOpacity>
            )}
            <View style={{ width: '85%' }}>
              <Text style={{ 
                fontWeight: 'bold', 
                fontSize: 16.5,
                color: isDarkMode ? darkTheme?.textPrimary : 'black'
              }}>{index + 1}) {item.content}</Text>
              <View style={{ flexDirection: 'row', marginTop: 10, }}>
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={{
                      height: 40, 
                      width: 40, 
                      borderWidth: 0.5, 
                      marginRight: 10, 
                      borderRadius: 5, 
                      borderColor: isDarkMode ? darkTheme?.border : 'lightgrey' 
                    }}
                  />
                )}
                {item.description && item.description.length > 0 && (
                  <Hyperlink
                    linkDefault={ true }
                    linkStyle={ { color: '#2980b9', textDecorationLine: 'underline' } }
                    onPress={ (url, text) => Linking.openURL(url) }
                    style={{ flex: 1 }}
                  >
                  <View style={{ width: 250 }}>
                    <Text style={{ 
                      color: isDarkMode ? darkTheme?.textSecondary : 'grey', 
                      fontSize: 16 
                    }}>
                      {item.description.length > 50 ? item.description.slice(0, 50) + '...' : item.description}
                    </Text>
                  </View>
                  </Hyperlink>
                )}
              </View>
            </View>
            { !editMode && (
              <View>
                <View style={[
                  styles.listTileScore, 
                  { 
                    borderColor: scoreColor, 
                    marginLeft: 'auto',
                    shadowColor: isDarkMode ? '#000' : scoreColor,
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: isDarkMode ? 0.3 : 0.2,
                    shadowRadius: 4,
                    elevation: isDarkMode ? 4 : 2,
                  }
                ]}>
                  <Text style={{ 
                    color: scoreColor, 
                    fontWeight: 'bold',
                    fontSize: 14,
                    textShadowColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}>{item.score < 0 ? '...' : item.score.toFixed(1)}</Text>
                </View>
                
                {/* Ranking count display */}
                {rankingCount > 0 && (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginTop: 4,
                    marginLeft: 'auto',
                    backgroundColor: isDarkMode ? darkTheme?.buttonSecondary : '#f0f0f0',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10
                  }}>
                    <Ionicons 
                      name="people" 
                      size={14} 
                      color={isDarkMode ? darkTheme?.textSecondary : "gray"} 
                    />
                    <Text style={{ 
                      color: isDarkMode ? darkTheme?.textSecondary : "gray",
                      fontSize: 11,
                      marginLeft: 3,
                      fontWeight: '600'
                    }}>
                      {rankingCount}
                    </Text>
                  </View>
                )}
                
                { visitingUserId !== userKey && itemsInCategory && itemsInCategory.has(item.image) && categoryInfo.category_type !== "" && (
                  <MaterialIcons 
                    name="playlist-add-check-circle" 
                    size={20} 
                    color={isDarkMode ? darkTheme?.textSecondary : "gray"} 
                    style={{ marginLeft: 'auto', marginTop: 'auto' }} 
                  /> 
                )}
              </View>
            )}
          </View>
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

  const removePresetImage = async (categoryId) => {
    try {
      const categoryItemsRef = ref(database, 'items');
      const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(categoryId));

      const snapshot = await get(categoryItemsQuery);
      if (snapshot.exists()) {
        let topItem = null;
        let maxScore = -1;

        snapshot.forEach((childSnapshot) => {
          const item = childSnapshot.val();
          if (item.score > maxScore) {
            maxScore = item.score;
            topItem = item;
          }
        });

        const categoryRef = ref(database, 'categories/' + categoryId);
        await update(categoryRef, {
          imageUri: topItem && topItem.image ? topItem.image : null,
        });

        console.log('Category image updated to the best item image successfully!');
      } else {
        console.log('No items found for this category.');
      }
    } catch (error) {
      console.error('Error updating category image:', error);
    }
  };

  const onEditPress = async () => {
    if (editMode && !focusedItem) {
      if (categoryImage) {
        const response = await fetch(categoryImage);
        const blob = await response.blob();
        const filename = categoryImage.substring(categoryImage.lastIndexOf('/') + 1);
        const storageRef = storageRef(storage, filename);
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

    if (editMode && focusedItemDescription && focusedItem) {
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
      { cancelable: false }
    );
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4,3],
      quality: 1,
    });
    setCategoryImage(result.assets[0].uri);
  }; 

  const onRerankItemPress = () => {
    onDeleteItemPress(focusedItem.bucket, focusedItem.key);
    navigation.navigate('Add', {
      itemName: focusedItem.content,
      itemDescription: focusedItem.description,
      itemImage: [focusedItem.image],
      itemCategory: focusedItem.category_id,
      itemCategoryName: focusedItem.category_name,
      trackUri: focusedItem.trackUri,
      itemId: focusedItem.id,
      itemContentDescription: focusedItem.contentDescription,
      numItems: numItems - 1,
      taggedUser: null,
      presetImage: categoryInfo.presetImage
    })
  }

  const memoizedList = useMemo(() => {
    // Filter the items based on the search value, keeping the original index
    const filteredList = listData[listView]
      .map((item, index) => ({ ...item, originalIndex: index })) // Add the original index to each item
      .filter(({ 1: item }) =>
        item.content && item.content.toLowerCase().includes(searchVal.toLowerCase())
      );
  
    // Map the filtered items to ListItemTile components, using the original index
    return filteredList.map(({ 1: item, 0: key, originalIndex }) => (
      <ListItemTile item={item} item_key={key} index={originalIndex} key={key} />
    ));
  }, [listData, listView, searchVal, editMode, itemsInCategory, itemRankingCounts]);  

  if (categoryListView === 'Similarity Score') {
    return (
      <>
      <View style={{ 
        flexDirection: 'row', 
        padding: 10, 
        borderBottomWidth: 1, 
        borderColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: isDarkMode ? darkTheme?.background : 'white' 
      }}>
        <TouchableOpacity onPress={() => setCategoryListView(null)}> 
          <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
        </TouchableOpacity>
        <Text style={{ 
          fontSize: 15, 
          fontWeight: 'bold',
          color: isDarkMode ? darkTheme?.textPrimary : 'black'
        }}>Similarity Score</Text>
      </View>
      <CategoryComparison onContinuePress={() => setCategoryListView(null)} userCategories={visitingUserCategories} curListData={listData['now']} curListInfo={categoryInfo}/>
      </>
    )
  }

  if (focusedItem) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: isDarkMode ? darkTheme?.background : 'white' 
      }}>
      <View style={{ 
        flexDirection: 'row', 
        padding: 10, 
        borderBottomWidth: 1, 
        borderColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <TouchableOpacity onPress={() => {
          setFocusedItem(null)
          setEditMode(false)
        }}> 
          <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
        </TouchableOpacity>
        {editMode && (
          <>
          <TouchableOpacity onPress={() => {
            onDeleteItemPress(focusedItem.bucket, focusedItem.key)
            setFocusedItem(null)
          }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: 'red' }}>Delete Item</Text>
          </TouchableOpacity>
          </>
        )}
        
        {editMode ? (
          <TouchableOpacity onPress={() => onEditPress()}>
            <Text style={{ 
              fontSize: 15, 
              fontWeight: 'bold',
              color: isDarkMode ? darkTheme?.textPrimary : 'black'
            }}>Done</Text>
          </TouchableOpacity>
        ) : isMyProfile ? (
          <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => onRerankItemPress()}>
            <Text style={{ 
              fontSize: 15, 
              marginRight: 30,
              color: isDarkMode ? darkTheme?.textPrimary : 'black'
            }}>Rerank</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEditPress()}>
            <Text style={{ 
              fontSize: 15,
              color: isDarkMode ? darkTheme?.textPrimary : 'black'
            }}>Edit</Text>
          </TouchableOpacity>
          </View>
        ) : (
          <Text>       </Text>
        )}
      </View>
      <NormalItemTile item={focusedItem} visitingUserId={visitingUserId} navigation={navigation} editMode={editMode} setFocusedItemDescription={setFocusedItemDescription} showComments={true} setFeedView={setProfileView}/>
      </View>
    );
  }

  if (profileView) {
    return (
      <Profile 
        route={{'params': {
          userKey: profileView.userKey,
          username: profileView.username,
          visitingUserId: userKey,
          setFeedView: setProfileView
        }}}
        navigation={navigation}
      />
    )
  }

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: isDarkMode ? darkTheme?.background : 'white' 
    }}>
      <View style={{ 
        flexDirection: 'row', 
        padding: 10, 
        borderBottomWidth: 1, 
        borderColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
        alignItems: 'center' 
      }}>
  <TouchableOpacity onPress={onBackPress}> 
    <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme?.textPrimary : "black"} />
  </TouchableOpacity>
  
  <View style={{ flex: 1, alignItems: 'center', position: 'absolute', left: 0, right: 0 }}>
    {editMode ? (
      <TouchableOpacity onPress={() => onDeleteCategoryPress()}>
        <Text style={{ 
          fontSize: 15, 
          fontWeight: 'bold', 
          color: 'red' 
        }}>Delete {focusedCategory}</Text>
      </TouchableOpacity>
    ) : (
      <Text style={{ fontSize: 15, fontWeight: 'bold' }}></Text>
    )}
  </View>

  <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
    {!editMode && !isMyProfile && (
      <TouchableOpacity onPress={() => setCategoryListView('Similarity Score')}>
        <Text style={{ 
          fontSize: 15,
          color: isDarkMode ? darkTheme?.textPrimary : 'black'
        }}>Compare</Text>
      </TouchableOpacity>
    )}
    

    <TouchableOpacity onPress={() => onEditPress()}>
      {editMode ? (
        <Text style={{ 
          fontSize: 15, 
          fontWeight: 'bold',
          marginLeft: 25,
          color: isDarkMode ? darkTheme?.textPrimary : 'black'
        }}>Done</Text>
      ) : isMyProfile ? ( // change this variable to true to delete other people's comments
        <Text style={{ 
          fontSize: 15, 
          marginLeft: 25,
          color: isDarkMode ? darkTheme?.textPrimary : 'black'
        }}>Edit</Text>
      ) : (
        <></>
      )}
    </TouchableOpacity>
  </View>
</View>

      
      <ScrollView style={{ backgroundColor: isDarkMode ? darkTheme?.background : 'white' }}>
      <View style={{ padding: 10 }}>
        {editMode ? (
          <>
          {categoryImage ? (
            <Image
              source={{ uri: categoryImage }}
              style={[
                styles.addedImages, 
                {
                  height: 150, 
                  width: 150, 
                  borderWidth: 0.5, 
                  marginRight: 10,
                  borderColor: isDarkMode ? darkTheme?.border : 'gray'
                }
              ]}
            />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={pickImage} style={[
              styles.addedImages,
              { borderColor: isDarkMode ? darkTheme?.border : 'gray' }
            ]}>
                <Ionicons name="image" size={40} color={isDarkMode ? darkTheme?.textSecondary : "gray"} />
                <Text style={{ 
                  marginTop: 4, 
                  fontWeight: 'bold', 
                  fontSize: 12, 
                  color: isDarkMode ? darkTheme?.textSecondary : 'gray' 
                }}>Edit Image</Text>
            </TouchableOpacity>
            {presetImage && (
              <TouchableOpacity style={{ 
                marginLeft: 20, 
                borderColor: 'red', 
                padding: 5, 
                borderWidth: 1, 
                borderRadius: 5
              }} onPress={() => removePresetImage(focusedCategoryId)}>
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
              borderColor: isDarkMode ? darkTheme?.border : 'lightgrey',
              borderBottomWidth: 1,
              paddingBottom: 5,
              color: isDarkMode ? darkTheme?.textPrimary : 'black'
            }}
          />
          <TextInput
            value={categoryInfo.category_description}
            multiline={true}
            onChangeText={(text) => {
              setCategoryInfo(prevState => ({
                ...prevState,
                category_description: text
              }))
            }}
            maxHeight={150} // this height seemed okay to me, but feel free to make it bigger / smaller
            scrollEnabled={true}
            style={{ 
              color: isDarkMode ? darkTheme?.textSecondary : 'gray', 
              marginVertical: 10,
              borderColor: isDarkMode ? darkTheme?.border : 'lightgrey',
              borderBottomWidth: 1,
              paddingBottom: 5
            }}
          />
          </>
        ) : (
          <>
          <Text style={{ 
            fontWeight: 'bold', 
            fontSize: 30, 
            fontStyle: 'italic', 
            padding: 1,
            color: isDarkMode ? darkTheme?.textPrimary : 'black'
          }}>{categoryInfo.category_name}</Text>
          <Text style={{ 
            color: isDarkMode ? darkTheme?.textSecondary : 'gray', 
            marginVertical: 10 
          }}>{categoryInfo.category_description}</Text>
          </>
        )}
      </View>

      <View style={{ 
        flexDirection: 'row', 
        borderBottomWidth: 0.5, 
        borderTopWidth: 0.5, 
        borderColor: isDarkMode ? darkTheme?.border : 'lightgrey',
        backgroundColor: isDarkMode ? darkTheme?.background : 'white'
      }}>
        <View style={{ 
          width: '50%', 
          alignItems: 'center', 
          padding: 8, 
          borderBottomColor: listView === 'now' ? (isDarkMode ? darkTheme?.textPrimary : 'black') : 'transparent', 
          borderBottomWidth: 2 
        }}>
          <TouchableOpacity onPress={() => onIconViewPress()}>
            <Ionicons 
              name="podium" 
              size={listView === 'now' ? 32 : 30} 
              color={listView === 'now' ? (isDarkMode ? darkTheme?.textPrimary : 'black') : (isDarkMode ? darkTheme?.textSecondary : 'gray')} 
            />
          </TouchableOpacity>
        </View>
        <View style={{ 
          width: '50%', 
          alignItems: 'center', 
          padding: 8, 
          borderBottomColor: listView === 'later' ? (isDarkMode ? darkTheme?.textPrimary : 'black') : 'transparent', 
          borderBottomWidth: 2 
        }}>
          <TouchableOpacity onPress={() => onIconViewPress()}>
            <Ionicons 
              name="bookmarks" 
              size={listView === 'later' ? 30 : 28} 
              color={listView === 'later' ? (isDarkMode ? darkTheme?.textPrimary : 'black') : (isDarkMode ? darkTheme?.textSecondary : 'gray')} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {listData[listView].length > 0 ? (  
        <>
        <TextInput
          placeholder={'Search Items...'}
          value={searchVal} 
          onChangeText={setSearchVal}
          placeholderTextColor={isDarkMode ? darkTheme?.placeholder : "gray"}
          style={{ 
            fontSize: 16, 
            borderColor: isDarkMode ? darkTheme?.border : 'lightgrey',
            borderWidth: 0.5,
            borderRadius: 30,
            padding: 10,
            marginRight: 10,
            marginLeft: 10,
            paddingHorizontal: 20,
            marginVertical: 15,
            color: isDarkMode ? darkTheme?.textPrimary : 'black',
            backgroundColor: isDarkMode ? darkTheme?.inputBackground : 'white'
          }}
        />          
        {memoizedList}
        </>
      ) : (
        <Text style={{ 
          textAlign: 'center', 
          fontWeight: 'bold', 
          color: isDarkMode ? darkTheme?.textSecondary : 'gray', 
          fontSize: 16, 
          marginTop: '50%' 
        }}>Add items to see your rankings... 😶‍🌫️</Text>
      )}
      </ScrollView>
    </View>
  );
}

export default CategoryList;