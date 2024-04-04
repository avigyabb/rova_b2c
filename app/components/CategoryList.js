import React, {useEffect, useState} from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { ref, set, remove, onValue, off, query, orderByChild, equalTo, get } from "firebase/database";
import { database } from '../../firebaseConfig';
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";

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
  }
});

const CategoryList = ({ focusedCategory, focusedList, onBackPress, focusedCategoryId }) => {
  const [listView, setListView] = useState('now');
  const [listData, setListData] = useState(focusedList);
  const [editMode, setEditMode] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);

  function getScoreColorHSL(score) {
    if (score < 0) {
      return '#A3A3A3'; // Gray color for negative scores
    }
    const cappedScore = Math.max(0, Math.min(score, 10)); // Cap the score between 0 and 100
    const hue = (cappedScore / 10) * 120; // Calculate hue from green to red
    const lightness = 30; // Constant lightness
    return `hsl(${hue}, 100%, ${lightness}%)`; // Return HSL color string
  }

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
      console.log(items);

      if (items) {
        items.forEach((item) => {
          const itemRef = ref(database, `items/${item[0]}`);
          set(itemRef, { 
            bucket: item[1]['bucket'],
            category_id: item[1]['category_id'],
            content: item[1]['content'],
            score: item[1]['score']
          })
          .then(() => console.log(`Score updated for ${item[0]}`))
          .catch((error) => console.error(`Failed to update score for ${item[0]}: ${error}`));
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
  }

  const ListItemTile = ({ item, item_key, index }) => {
    let scoreColor = getScoreColorHSL(Number(item.score));
    return (
      <View style={{ padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, flexDirection: 'row' }}>
        {editMode && (
          <TouchableOpacity onPress={() => onDeleteItemPress(item.bucket, item_key)} style={{ marginRight: 10 }}>
            <MaterialIcons name="do-disturb-on" size={25} color="red" />
          </TouchableOpacity>
        )}
        <View>
          <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{index + 1}) {item.content}</Text>
          <Text style={{ color: 'grey', marginTop: 5 }}>{item.description}</Text>
        </View>
        <View style={[styles.listTileScore, { borderColor: scoreColor, marginLeft: 'auto' }]}>
          <Text style={{ color: scoreColor, fontWeight: 'bold' }}>{item.score.toFixed(1)}</Text>
        </View>
      </View>
    );
  }

  const onIconViewPress = () => {
    if (listView === 'now') {
      setListView('later');
    } else {
      setListView('now');
    }
  }

  const onEditPress = () => {
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

  return (
    <>
      <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderColor: 'lightgrey', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBackPress}> 
          <MaterialIcons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
        {editMode ? (
          <TouchableOpacity onPress={() => onDeleteCategoryPress()}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: 'red' }}>Delete {focusedCategory}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ fontSize: 15, fontWeight: 'bold' }}>{focusedCategory}</Text>
        )}

        <TouchableOpacity onPress={() => onEditPress()}>
          {editMode ? (
            <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Done</Text>
          ) : (
            <Text style={{ fontSize: 15 }}>Edit</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row' }}>
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
        <FlatList
          data={listData[listView]}
          renderItem={({ item, index }) => <ListItemTile item={item[1]} item_key={item[0]} index={index} />}
          keyExtractor={(item, index) => index.toString()}
          numColumns={1}
          key={"single-column"}
        />
      ) : (
        <Text style={{ textAlign: 'center', fontWeight: 'bold', color: 'gray', fontSize: 16, marginTop: '50%' }}>Add items to see your rankings... 😶‍🌫️</Text>
      )}
    </>
  )
}

export default CategoryList;