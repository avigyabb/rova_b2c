import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, TouchableWithoutFeedback, Keyboard } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { MaterialIcons } from '@expo/vector-icons';
import { ref, set, onValue, off, query, orderByChild, push, equalTo, get } from "firebase/database";
import { database } from '../../firebaseConfig';
import { useFonts } from 'expo-font';
import profilePic from '../../assets/images/lebron_profile_pic.webp';

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
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  location: {
    fontSize: 14,
    color: 'grey',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    padding: 10,
  },
  actionText: {
    fontSize: 16,
  },
  profilePic: {
    width: 36,        // Specify the width
    height: 36,       // Specify the height
    borderRadius: 18,  // Make sure this is half of the width and height
  },
  postButtons: {
    flexDirection: 'row',
    borderWidth: 2,
    padding: 6,
    alignItems: 'center',
    borderRadius: 17,
    marginRight: 8
  }
});

const Add = ({ route }) => {
  const { userKey, username, setView, fetchUserData } = route.params;
  const [newItem, setNewItem] = useState('');
  const [userCategories, setUserCategories] = useState([]);
  const [newItemCategory, setNewItemCategory] = useState('null');
  const [newItemRating, setNewItemRating] = useState(null);
  const [itemComparisons, setItemComparisons] = useState([]);
  const [itemAdded, setItemAdded] = useState(false);
  const [binarySearchL, setBinarySearchL] = useState(0);
  const [binarySearchR, setBinarySearchR] = useState(0);
  const [binarySearchM, setBinarySearchM] = useState(0);
  const [newItemFinalScore, setNewItemFinalScore] = useState(0);
  const [loaded] = useFonts({
    'Poppins Regular': require('../../assets/fonts/Poppins-Regular.ttf'), 
    'Poppins Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Hedvig Letters Sans Regular': require('../../assets/fonts/Hedvig_Letters_Sans/HedvigLettersSans-Regular.ttf'),
    'Unbounded': require('../../assets/fonts/Unbounded/Unbounded-VariableFont_wght.ttf'),
  });
  const [rankMode, setRankMode] = useState(false);

  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    const userCategoriesQuery = query(categoriesRef, orderByChild('user_id'), equalTo(userKey));
    get(userCategoriesQuery).then((snapshot) => {
      const categories = [];

      snapshot.forEach((childSnapshot) => {
        const categoryKey = childSnapshot.key;
        const categoryData = childSnapshot.val();

        categories.push({ id: categoryKey, ...categoryData });
      });

      setUserCategories(categories);
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }, []);

  const addNewItem = (rating, newBinarySearchM, isNewCard) => {
    let items = addElementAndRecalculate(itemComparisons, newItem, rating, newBinarySearchM, isNewCard);

    items.forEach((item) => {
      // Check if a Firebase key exists in the third position of the sub-array
      if (item.length === 3 && item[2]) {
        // There is a key, so update the score for the existing item
        const itemRef = ref(database, `items/${item[2]}`);
        set(itemRef, { 
          bucket: newItemRating,
          category_id: newItemCategory,
          content: item[0],
          score: item[1]
        })
        .then(() => console.log(`Score updated for ${item[2]}`))
        .catch((error) => console.error(`Failed to update score for ${item[2]}: ${error}`));
      } else {
        // There is no key, so add a new item with a score of 10
        setNewItemFinalScore(item[1].toFixed(1));
        const newItemRef = push(ref(database, 'items'));
        set(newItemRef, { 
          category_id: newItemCategory,
          content: item[0], 
          score: item[1], 
          bucket: rating
        })
        .then(() => console.log(`New item added`))
        .catch((error) => console.error(`Failed to add new item: ${error}`));
      }
    });

    setItemAdded(true);
  }

  const onBucketPress = (rating) => {
    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(newItemCategory));

    get(categoryItemsQuery).then((snapshot) => {
      const itemComparisons = [];
      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val().bucket === rating) {
          itemComparisons.push([childSnapshot.val().content, childSnapshot.val().score, childSnapshot.key]);
        }
      });
      itemComparisons.sort((a, b) => b[1] - a[1]);
      setItemComparisons(itemComparisons)
      setNewItemRating(rating);
      setBinarySearchL(0);
      setBinarySearchR(itemComparisons.length - 1);
      setBinarySearchM(Math.floor((itemComparisons.length - 1) / 2));
      if (itemComparisons.length === 0) {
        setBinarySearchL(0);
        setBinarySearchR(0);
        addNewItem(rating, 0, true);
      }
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }

  function addElementAndRecalculate(array, newItemContent, newItemBucket, newBinarySearchM, isNewCard) {
    const minMaxMap = {
      'like': [10.0, 6.7],
      'neutral': [6.6, 3.3],
      'dislike': [3.2, 0.0]
    }
    if (isNewCard) {
      array.splice(newBinarySearchM, 0, [newItemContent, null]);
    } else {
      array.splice(newBinarySearchM + 1, 0, [newItemContent, null]);
    }

    let isLike = 1
    if (newItemBucket === 'like') {
      isLike = 0
    }

    // Calculate the step based on the range and the length of the array
    const step = (minMaxMap[newItemBucket][0] - minMaxMap[newItemBucket][1]) / (array.length + isLike);
  
    // Recalculate the numbers for each element
    for (let i = 0; i < array.length; i++) {
        array[i][1] = minMaxMap[newItemBucket][0] - step * (i + isLike);
    }
    return array
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
        addNewItem(newItemRating, newBinarySearchM, isNewCard);
      }
      newBinarySearchM = Math.floor((newBinarySearchR + newBinarySearchL) / 2)
      setBinarySearchR(newBinarySearchR);
      setBinarySearchM(newBinarySearchM);
    } else {
      newBinarySearchL = binarySearchM + 1;
      if (newBinarySearchL > newBinarySearchR) {
        setBinarySearchL(0);
        setBinarySearchR(0);
        addNewItem(newItemRating, newBinarySearchM, isNewCard);
      }
      newBinarySearchM = Math.floor((newBinarySearchR + newBinarySearchL) / 2)
      setBinarySearchL(newBinarySearchL);
      setBinarySearchM(newBinarySearchM);
    }
  }

  onAddLaterPress = () => {
    const newLaterItemRef = push(ref(database, 'items'));
    set(newLaterItemRef, { 
      category_id: newItemCategory,
      content: newItem, 
      score: -1, 
      bucket: 'later'
    })
    .then(() => console.log(`New later item added`))
    .catch((error) => console.error(`Failed to add later item: ${error}`));
    setItemAdded(true);
  }

  onContinuePress = () => {
    setNewItem('');
    setNewItemCategory('null'); 
    setNewItemRating(null);
    setItemComparisons([]);
    setItemAdded(false);
    setBinarySearchL(0);
    setBinarySearchR(0);
    setBinarySearchM(0);
    setNewItemFinalScore(0);
    setRankMode(false);
  }

  if (itemAdded) {
    return (
      <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, paddingRight: 20, height: '100%' }}>
        <Text style={{ fontSize: 30 }}> rova </Text>
        <Text>Item added!</Text>
        <Text>{newItem}</Text>
        <Text>{newItemFinalScore}</Text>
        <TouchableOpacity onPress={() => onContinuePress()}>
          <Text>Continue</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, paddingRight: 20, height: '100%' }}>
        <Text style={{ color: 'black', fontSize: 24, fontWeight: 'bold', fontFamily: 'Poppins Bold', marginTop: 10 }}>ambora\social</Text>

        {!rankMode && (
          <RNPickerSelect
            onValueChange={(value) => setNewItemCategory(value)}
            items={userCategories.map((item) => ({ label: item.category_name, value: item.id }))}
            style={{
              inputIOS: {
                padding: 15,
                borderWidth: 2,
                borderColor: 'lightgray',
                borderRadius: 10,
                marginTop: 15,
                fontWeight: 'bold',
                letterSpacing: 0.4,
                fontSize: 16
              },
            }}
          />
        )}

        {newItemCategory && newItemCategory !== 'null' && (
          <View style={{
            flexDirection: 'row',
            marginTop: 15,
            backgroundColor: 'lightgray',
            paddingHorizontal: 15,
            borderRadius: 10,
            alignItems: 'center', // Aligns the TextInput and the icon vertically
          }}>
            <MaterialIcons name="search" size={24} color="black" style={styles.icon} />
            <TextInput
              placeholder={`Add to ${userCategories.find(item => item.id === newItemCategory)?.category_name || ''}`}
              placeholderTextColor="gray"
              onChangeText={setNewItem}
              style={{
                flex: 1, // Takes up the maximum space leaving the icon on the far side
                fontSize: 15,
                letterSpacing: 0.4,
                paddingLeft: 10, // Optional: Adds some space between the icon and the text input
                fontWeight: 'bold',
                fontSize: 16,
                height: 50
              }}
            />
          </View>
        )}

        {newItem.length > 0 && newItemCategory !== 'null' && !rankMode &&(
          <>
          <View style={{ flexDirection: 'row', marginTop: 15 }}>
            <Image
              source={profilePic}
              style={styles.profilePic}
            />
            <TextInput
              placeholder={'Add a description...'}
              placeholderTextColor="gray"
              multiline={true}
              style={{ 
                marginLeft: 10, 
                fontSize: 16, 
                height: 'auto', 
                flex: 1,
                height: 160
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', marginTop: 15, borderBottomWidth: 1, borderColor: 'lightgray', paddingBottom: 15 }}>
            <TouchableOpacity style={styles.postButtons}>
              <MaterialIcons name="photo-camera" size={20} color="black" />
              <Text style={{ marginLeft: 8, fontWeight: 'bold', fontSize: 14 }}>Add Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.postButtons}>
              <MaterialIcons name="person-pin" size={20} color="black" />
              <Text style={{ marginLeft: 8, fontWeight: 'bold', fontSize: 14 }}>Tag Friends</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{alignItems: 'center', marginTop: 60}}>
            <TouchableOpacity onPress={() => setRankMode(true)} style={{
              backgroundColor: 'black',
              alignItems: 'center',
              padding: 20,
              paddingHorizontal: 80,
              borderRadius: 28
            }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Add to List</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onAddLaterPress()} style={{ 
              marginTop: 20, 
              borderWidth: 2, 
              borderColor: 'lightgray', 
              padding: 15, 
              borderRadius: 15,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <MaterialIcons name="watch-later" size={20} color="gray" />
              <Text style={{ color: 'gray', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>Add to 'Later'</Text>
            </TouchableOpacity>
          </View>
          </>
        )}
        
        {newItem.length > 0 && newItemCategory !== 'null' && rankMode && (
          <>
          <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setRankMode(false)}>
            <Text style={{ fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <View style={{
            alignItems: 'center',
            borderColor: 'lightgray',
            borderWidth: 2,
            borderRadius: 10,
            padding: 10,
            paddingVertical: 15,
            marginTop: 10
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
                    newItemRating === 'like' && styles.selectedOption,
                  ]}
                  onPress={() => onBucketPress('like')}
                >
                  {newItemRating === 'like' && (
                    <MaterialIcons name="check" size={24} color="white" />
                  )}
                </TouchableOpacity>
                <Text style={styles.optionText}>Good!</Text>
              </View>
              
              <View style={styles.optionBox}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: 'gold' },
                    newItemRating === 'neutral' && styles.selectedOption,
                  ]}
                  onPress={() => onBucketPress('neutral')}
                >
                  {newItemRating === 'neutral' && (
                    <MaterialIcons name="check" size={24} color="white" />
                  )}
                </TouchableOpacity>
                <Text style={styles.optionText}>Mid</Text>
              </View>
              
              <View style={styles.optionBox}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: 'tomato' },
                    newItemRating === 'dislike' && styles.selectedOption,
                  ]}
                  onPress={() => onBucketPress('dislike')}
                >
                  {newItemRating === 'dislike' && (
                    <MaterialIcons name="check" size={24} color="white" />
                  )}
                </TouchableOpacity>
                <Text style={styles.optionText}>Bad.</Text>
              </View>
            </View>
          </View>
          </>
        )}
        
        {newItem.length > 0 && newItemCategory !== 'null' && itemComparisons.length > 0 && !itemAdded  && rankMode && (
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
                <Text style={styles.restaurantName}>{newItem}</Text>
                <Text style={styles.location}>Washington, DC</Text>
              </TouchableOpacity>

              <View style={styles.orContainer}>
                <Text style={styles.orText}>OR</Text>
              </View>
              
              <TouchableOpacity style={styles.card} onPress={() => onCardComparisonPress(false)}>
                <Text style={styles.restaurantName}>{itemComparisons[binarySearchM][0]}</Text>
                <Text style={styles.location}>Washington, DC</Text>
                <Text style={styles.location}>{itemComparisons[binarySearchM][1].toFixed(1)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionText}>Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionText}>Too tough</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
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