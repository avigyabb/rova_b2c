import React, {useEffect, useState, useMemo, useLayoutEffect, memo, useCallback} from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, TextInput, FlatList, ActivityIndicator, InteractionManager } from "react-native";
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ref, set, remove, query, orderByChild, equalTo, get, update, runTransaction } from "firebase/database";
import { database, storage } from '../../firebaseConfig';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Hyperlink from 'react-native-hyperlink';
import * as ImagePicker from 'expo-image-picker';
import NormalItemTile from "./NormalItemTile";
import Profile from './Profile';
import CategoryComparison from "./CategoryListComponents/CategoryComparison";

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

const ListThumbnail = memo(({ imageUri }) => {
  if (!imageUri) return null;

  return (
    <Image
      source={imageUri}
      style={{height: 40, width: 40, borderWidth: 0.5, marginRight: 10, borderRadius: 5, borderColor: 'lightgrey' }}
      contentFit="cover"
      cachePolicy="memory-and-disk"
    />
  );
});

const INITIAL_VISIBLE_ITEMS = 20;
const VISIBLE_ITEMS_INCREMENT = 20;

function getScoreColorHSL(score) {
  if (score < 0) {
    return '#A3A3A3';
  }
  const cappedScore = Math.max(0, Math.min(score, 10));
  const hue = (cappedScore / 10) * 120;
  const lightness = 50 - score ** 1.3;
  return `hsl(${hue}, 100%, ${lightness}%)`;
}

const ListItemTile = memo(({
  item,
  item_key,
  index,
  editMode,
  onItemPress,
  onDeleteItemPress,
  visitingUserId,
  userKey,
  itemsInCategory,
  categoryType,
}) => {
  let scoreColor = getScoreColorHSL(Number(item.score));

  return (
    <TouchableOpacity onPress={() => onItemPress(item_key)}>
      <View style={{ paddingVertical: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, alignItems: 'center', }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: editMode && 10 }}>
          {editMode && (
            <TouchableOpacity onPress={() => onDeleteItemPress(item.bucket, item_key)} style={{ marginRight: 10 }}>
              <Ionicons name="remove-circle" size={25} color="red" />
            </TouchableOpacity>
          )}
          <View style={{ width: '85%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16.5 }}>{index + 1}) {item.content}</Text>
            <View style={{ flexDirection: 'row', marginTop: 10, }}>
              {item.image && (
                <ListThumbnail imageUri={item.image} />
              )}
              {item.description && item.description.length > 0 && (
                <Hyperlink
                  linkDefault={ true }
                  linkStyle={ { color: '#2980b9', textDecorationLine: 'underline' } }
                  onPress={ (url, text) => Linking.openURL(url) }
                  style={{ flex: 1 }}
                >
                <View style={{ width: 250 }}>
                  <Text style={{ color: 'grey', fontSize: 16 }}>
                    {item.description.length > 50 ? item.description.slice(0, 50) + '...' : item.description}
                  </Text>
                </View>
                </Hyperlink>
              )}
            </View>
          </View>
          { !editMode && (
            <View>
              <View style={[styles.listTileScore, { borderColor: scoreColor, marginLeft: 'auto' }]}>
                <Text style={{ color: scoreColor, fontWeight: 'bold' }}>{item.score < 0 ? '...' : item.score.toFixed(1)}</Text>
              </View>
              { visitingUserId !== userKey && itemsInCategory && itemsInCategory.has(item.image) && categoryType !== "" && (
                <MaterialIcons name="playlist-add-check-circle" size={20} color="gray" style={{ marginLeft: 'auto', marginTop: 'auto' }} /> 
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const CategoryList = ({ focusedCategory, focusedList, onBackPress, focusedCategoryId, numItems, isMyProfile, visitingUserId, navigation, userKey, isLoading = false }) => {
  const [listView, setListView] = useState('now');
  const [listData, setListData] = useState(focusedList || { now: [], later: [] });
  const [editMode, setEditMode] = useState(false);
  const [categoryInfo, setCategoryInfo] = useState({});
  const [categoryImage, setCategoryImage] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [focusedItemDescription, setFocusedItemDescription] = useState(null);
  const [presetImage, setPresetImage] = useState(true);
  const [localMutation, setLocalMutation] = useState(false);
  const [profileView, setProfileView] = useState(null);
  const [searchVal, setSearchVal] = useState('');
  const [itemsInCategory, setItemsInCategory] = useState(new Set());
  const [visitingUserCategories, setVisitingUserCategories] = useState([]);
  const [categoryListView, setCategoryListView] = useState(null);
  const [listBackButtonKey, setListBackButtonKey] = useState(0);
  const [isListBackPressing, setIsListBackPressing] = useState(false);
  const [visibleItemCount, setVisibleItemCount] = useState(INITIAL_VISIBLE_ITEMS);

  // Keep local editable list data in sync with parent updates before paint to avoid empty-state flicker.
  useLayoutEffect(() => {
    setListData(focusedList || { now: [], later: [] });
  }, [focusedList]);

  const parentNowLen = focusedList?.now?.length ?? 0;
  const parentLaterLen = focusedList?.later?.length ?? 0;
  const localNowLen = listData?.now?.length ?? 0;
  const localLaterLen = listData?.later?.length ?? 0;
  const isSyncingFromParent = !localMutation && (parentNowLen !== localNowLen || parentLaterLen !== localLaterLen);
  const shouldRenderList = !isLoading && !isSyncingFromParent;

  useEffect(() => {
    if (isLoading || !focusedCategoryId) return;
    let isCancelled = false;
    setItemsInCategory(new Set());

    const categoryRef = ref(database, 'categories/' + focusedCategoryId);
    get(categoryRef).then((snapshot) => {
      if (isCancelled) return;
      if (snapshot.exists()) {
        const category = snapshot.val();
        setCategoryInfo(category);

        // If this list has no cover image, pick the first available image from its items.
        if (!category.imageUri) {
          const categoryItemsRef = ref(database, 'items');
          const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(focusedCategoryId));
          get(categoryItemsQuery).then((itemsSnapshot) => {
            if (isCancelled || !itemsSnapshot.exists()) return;

            const items = [];
            itemsSnapshot.forEach((child) => {
              const val = child.val();
              if (val?.image) {
                items.push(val);
              }
            });

            if (items.length === 0) return;

            // Prefer ranked "now" items first, then by score desc.
            items.sort((a, b) => {
              const aNow = a.bucket === 'later' ? 1 : 0;
              const bNow = b.bucket === 'later' ? 1 : 0;
              if (aNow !== bNow) return aNow - bNow;
              return (b.score ?? -1) - (a.score ?? -1);
            });

            const fallbackImage = items[0].image;
            if (!fallbackImage) return;

            update(categoryRef, { imageUri: fallbackImage }).then(() => {
              if (!isCancelled) {
                setCategoryInfo((prev) => ({ ...prev, imageUri: fallbackImage }));
              }
            }).catch((error) => {
              console.error("Error setting fallback category image:", error);
            });
          }).catch((error) => {
            console.error("Error fetching category items for fallback image:", error);
          });
        }

        // Defer heavy comparison data fetch to keep interactions responsive.
        InteractionManager.runAfterInteractions(() => {
          if (isCancelled) return;
          const sameUserCategoriesRef = ref(database, 'categories');
          const sameUserCategoriesQuery = query(sameUserCategoriesRef, orderByChild('user_id'), equalTo(visitingUserId));
          get(sameUserCategoriesQuery).then((sameUserCategoriesSnapshot) => {
            if (isCancelled) return;
            if (sameUserCategoriesSnapshot.exists()) {
              let promises = [];
              let visitingUserCategoriesTemp = [];
              const currentCategoryType = snapshot.val().category_type;
              sameUserCategoriesSnapshot.forEach((childSnapshot) => {
                const childCategory = childSnapshot.val();
                const sameCategoryType = childCategory.category_type === currentCategoryType;

                if (sameCategoryType) {
                  visitingUserCategoriesTemp.push({id: childSnapshot.key, ...childCategory});
                  const categoryItemsRef = ref(database, 'items');
                  const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(childSnapshot.key));
                  promises.push(get(categoryItemsQuery));
                }
              });

              setVisitingUserCategories(visitingUserCategoriesTemp);
              Promise.all(promises).then((results) => {
                if (isCancelled) return;
                let items = new Set();
                results.forEach((categoryItemsSnapshot) => {
                  if (categoryItemsSnapshot.exists()) {
                    categoryItemsSnapshot.forEach((childCategoryItemsSnapshot) => {
                      let item = childCategoryItemsSnapshot.val();
                      if (item.score >= 0 && item.image) {
                        items.add(item.image);
                      }
                    });
                  }
                });
                setItemsInCategory(items)
              }).catch((error) => {
                console.error(error);
              });

            } else {
              console.log("No categories found for the user.");
            }
          })
        });
      } else {
        console.log("No user data.");
      }
    }).catch((error) => {
      console.error(error);
    });
    return () => {
      isCancelled = true;
    };
  }, [focusedCategoryId, database, visitingUserId, isLoading]);

  useEffect(() => {
    // Prevent stuck dimmed state after returning from nested views.
    if (focusedItem || categoryListView || profileView) {
      setIsListBackPressing(false);
    }
  }, [focusedItem, categoryListView, profileView]);

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
    setLocalMutation(true);
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

          if (item[1].score === 10.0 && item[1].image) {
            const categoryRef = ref(database, 'categories/' + item_category_id);
            get(categoryRef).then((snapshot) => {
              if (snapshot.exists() && !snapshot.val().presetImage) {
                update(categoryRef, { imageUri: item[1].image });
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
          user_set_image: false,
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
        const imageStorageRef = storageRef(storage, filename);
        const uploadTask = uploadBytesResumable(imageStorageRef, blob);

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
                presetImage: true,
                user_set_image: true
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

  const onArchiveCategoryPress = () => {
    Alert.alert(
      "Archive this list?",
      "Archived lists are hidden from your profile.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              const categoryRef = ref(database, 'categories/' + focusedCategoryId);
              await update(categoryRef, {
                archived: true,
                archived_at: Date.now(),
              });
              onBackPress();
            } catch (error) {
              console.error("Error archiving category:", error);
            }
          },
        },
      ]
    );
  };

  const onListMenuPress = () => {
    Alert.alert(
      "List options",
      "",
      [
        { text: "Edit list", onPress: () => onEditPress() },
        { text: "Archive list", style: "destructive", onPress: () => onArchiveCategoryPress() },
        { text: "Cancel", style: "cancel" },
      ]
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
    navigation.navigate('Add', {
      itemName: focusedItem.content,
      itemDescription: focusedItem.description,
      itemImage: [focusedItem.image],
      itemCategory: focusedItem.category_id,
      itemCategoryName: focusedItem.category_name,
      trackUri: focusedItem.trackUri,
      itemId: focusedItem.id,
      itemContentDescription: focusedItem.contentDescription,
      numItems: numItems,
      rerankItemKey: focusedItem.key,
      taggedUser: null,
      presetImage: categoryInfo.presetImage
    })
  }

  const filteredListData = useMemo(() => {
    if (!shouldRenderList) return [];

    return listData[listView]
      .map((entry, index) => ({
        itemKey: entry[0],
        itemData: entry[1],
        originalIndex: index,
      }))
      .filter(({ itemData }) =>
        itemData.content && itemData.content.toLowerCase().includes(searchVal.toLowerCase())
      );
  }, [shouldRenderList, listData, listView, searchVal]);

  const visibleListData = useMemo(() => {
    return filteredListData.slice(0, visibleItemCount);
  }, [filteredListData, visibleItemCount]);

  useEffect(() => {
    setVisibleItemCount(INITIAL_VISIBLE_ITEMS);
  }, [focusedCategoryId, listView, searchVal]);

  useEffect(() => {
    setVisibleItemCount((prev) => Math.min(Math.max(prev, INITIAL_VISIBLE_ITEMS), filteredListData.length || INITIAL_VISIBLE_ITEMS));
  }, [filteredListData.length]);

  const loadMoreVisibleItems = useCallback(() => {
    if (visibleItemCount >= filteredListData.length) return;
    setVisibleItemCount((prev) => Math.min(prev + VISIBLE_ITEMS_INCREMENT, filteredListData.length));
  }, [visibleItemCount, filteredListData.length]);

  const renderListItem = useCallback(({ item }) => (
    <ListItemTile
      item={item.itemData}
      item_key={item.itemKey}
      index={item.originalIndex}
      editMode={editMode}
      onItemPress={onItemPress}
      onDeleteItemPress={onDeleteItemPress}
      visitingUserId={visitingUserId}
      userKey={userKey}
      itemsInCategory={itemsInCategory}
      categoryType={categoryInfo.category_type}
    />
  ), [editMode, onItemPress, onDeleteItemPress, visitingUserId, userKey, itemsInCategory, categoryInfo.category_type]);

  if (categoryListView === 'Similarity Score') {
    return (
      <>
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
        <TouchableOpacity onPress={() => setCategoryListView(null)}> 
          <Ionicons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Similarity Score</Text>
      </View>
      <CategoryComparison onContinuePress={() => setCategoryListView(null)} userCategories={visitingUserCategories} curListData={listData['now']} curListInfo={categoryInfo}/>
      </>
    )
  }

  if (focusedItem) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => {
          setFocusedItem(null)
          setFocusedItemDescription(null)
          setEditMode(false)
          setListBackButtonKey((prev) => prev + 1)
        }}> 
          <Ionicons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
        {editMode && (
          <>
          <TouchableOpacity onPress={() => {
            onDeleteItemPress(focusedItem.bucket, focusedItem.key)
            setFocusedItem(null)
            setFocusedItemDescription(null)
            setListBackButtonKey((prev) => prev + 1)
          }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: 'red' }}>Delete Item</Text>
          </TouchableOpacity>
          </>
        )}
        
        {editMode ? (
          <TouchableOpacity onPress={() => onEditPress()}>
            <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Done</Text>
          </TouchableOpacity>
        ) : isMyProfile ? (
          <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => onRerankItemPress()}>
            <Text style={{ fontSize: 15, marginRight: 30 }}>Rerank</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEditPress()}>
            <Ionicons name="ellipsis-horizontal" size={22} color="black" />
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
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', alignItems: 'center' }}>
  <TouchableOpacity
    key={listBackButtonKey}
    activeOpacity={1}
    onPressIn={() => setIsListBackPressing(true)}
    onPressOut={() => setIsListBackPressing(false)}
    onPress={onBackPress}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <View style={{ padding: 4, opacity: isListBackPressing ? 0.35 : 1 }}>
      <Ionicons name="arrow-back" size={30} color="black" />
    </View>
  </TouchableOpacity>
  
  <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', position: 'absolute', left: 0, right: 0 }}>
    {editMode ? (
      <TouchableOpacity onPress={() => onDeleteCategoryPress()}>
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: 'red' }}>Delete {focusedCategory}</Text>
      </TouchableOpacity>
    ) : (
      <Text style={{ fontSize: 15, fontWeight: 'bold' }}></Text>
    )}
  </View>

  <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
    {!editMode && !isMyProfile && (
      <TouchableOpacity onPress={() => setCategoryListView('Similarity Score')}>
        <Text style={{ fontSize: 15 }}>Compare</Text>
      </TouchableOpacity>
    )}

    {isMyProfile && (
      editMode ? (
        <TouchableOpacity onPress={() => onEditPress()}>
          <Text style={{ fontSize: 15, fontWeight: 'bold', marginLeft: 25 }}>Done</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onListMenuPress} style={{ marginLeft: 8, marginRight: 6 }}>
          <Ionicons name="ellipsis-horizontal" size={24} color="black" />
        </TouchableOpacity>
      )
    )}
  </View>
</View>

      <FlatList
        data={isLoading || isSyncingFromParent ? [] : visibleListData}
        renderItem={renderListItem}
        keyExtractor={(item) => item.itemKey}
        extraData={{ itemsInCategory, editMode, categoryType: categoryInfo.category_type }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={INITIAL_VISIBLE_ITEMS}
        maxToRenderPerBatch={VISIBLE_ITEMS_INCREMENT}
        windowSize={8}
        onEndReached={loadMoreVisibleItems}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={(
          <>
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
                      <Ionicons name="image" size={40} color="gray" />
                      <Text style={{ marginTop: 4, fontWeight: 'bold', fontSize: 12, color: 'gray' }}>Edit Image</Text>
                  </TouchableOpacity>
                  {presetImage && (
                    <TouchableOpacity style={{ marginLeft: 20, borderColor: 'red', padding: 5, borderWidth: 1, borderRadius: 5}} onPress={() => removePresetImage(focusedCategoryId)}>
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
                  multiline={true}
                  onChangeText={(text) => {
                    setCategoryInfo(prevState => ({
                      ...prevState,
                      category_description: text
                    }))
                  }}
                  maxHeight={150}
                  scrollEnabled={true}
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
                  <Ionicons name="podium" size={listView === 'now' ? 32 : 30} color={listView === 'now' ? 'black' : 'gray'} />
                </TouchableOpacity>
              </View>
              <View style={{ width: '50%', alignItems: 'center', padding: 8, borderBottomColor: listView === 'later' ? 'black' : 'transparent', borderBottomWidth: 2 }}>
                <TouchableOpacity onPress={() => onIconViewPress()}>
                  <Ionicons name="bookmarks" size={listView === 'later' ? 30 : 28} color={listView === 'later' ? 'black' : 'gray'} />
                </TouchableOpacity>
              </View>
            </View>

            {!isLoading && !isSyncingFromParent && listData[listView].length > 0 && (
              <TextInput
                placeholder={'Search Items...'}
                value={searchVal} 
                onChangeText={setSearchVal}
                placeholderTextColor="gray"
                style={{ 
                  fontSize: 16, 
                  borderColor: 'lightgrey',
                  borderWidth: 0.5,
                  borderRadius: 30,
                  padding: 10,
                  marginRight: 10,
                  marginLeft: 10,
                  paddingHorizontal: 20,
                  marginVertical: 15
                }}
              />
            )}
          </>
        )}
        ListEmptyComponent={(
          isLoading || isSyncingFromParent ? (
            <View pointerEvents="none" style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="black" />
              <Text style={{ marginTop: 10, color: 'gray' }}>Loading items...</Text>
            </View>
          ) : (
            <Text style={{ textAlign: 'center', fontWeight: 'bold', color: 'gray', fontSize: 16, marginTop: 120 }}>Add items to see your rankings... 😶‍🌫️</Text>
          )
        )}
        ListFooterComponent={visibleListData.length < filteredListData.length ? (
          <View style={{ paddingVertical: 18, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="gray" />
          </View>
        ) : <View style={{ height: 24 }} />}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
      />
    </View>
  );
}

export default CategoryList;