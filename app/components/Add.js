import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { MaterialIcons } from '@expo/vector-icons';
import { ref, set, onValue, off, query, orderByChild, push, equalTo, get } from "firebase/database";
import { database } from '../../firebaseConfig';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 20
  },
  question: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
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
  pickingContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '96%',
  },
  card: {
    borderWidth: 1,
    borderColor: 'black',
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
});

const Add = () => {
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
  const user = 'lebron';

  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    const userCategoriesQuery = query(categoriesRef, orderByChild('user_id'), equalTo(user));
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
  }, [user]);

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

  if (itemAdded) {
    return (
      <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, paddingRight: 20, height: '100%' }}>
        <Text style={{ fontSize: 30, fontWeight: 'bold' }}> rova </Text>
        <Text>Item added!</Text>
        <Text>{newItem}</Text>
        <Text>{newItemFinalScore}</Text>
      </View>
    )
  }

  return (
    <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, paddingRight: 20, height: '100%' }}>
      <Text style={{ fontSize: 30, fontWeight: 'bold' }}> rova </Text>

      <TextInput
        placeholder="Album, Movie, Restaurant..."
        placeholderTextColor="#000"
        onChangeText={setNewItem}
        style={{
          marginTop: 20,
          backgroundColor: 'lightgray',
          height: 38,
          padding: 10,
          borderRadius: 10
        }}
      />

      {newItem.length > 0 && (
        <RNPickerSelect
          onValueChange={(value) => setNewItemCategory(value)}
          items={userCategories.map((item) => ({ label: item.category_name, value: item.id }))}
          style={{
            inputIOS: {
              padding: 10,
              borderWidth: 1,
              borderColor: 'gray',
              borderRadius: 10,
              marginTop: 20,
            },
          }}
        />
      )}
      
      {newItem.length > 0 && newItemCategory !== 'null' && (
        <View style={styles.container}>
          <Text style={styles.question}>How was it?</Text>
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
              <Text style={styles.optionText}>I liked it!</Text>
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
              <Text style={styles.optionText}>It was fine</Text>
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
              <Text style={styles.optionText}>I didn't like it</Text>
            </View>
          </View>
        </View>
      )}
      
      {newItem.length > 0 && newItemCategory !== 'null' && itemComparisons.length > 0 && !itemAdded && (
        <View style={styles.pickingContainer}>
          <Text style={styles.headerText}>Which do you prefer?</Text>
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
  );
};

export default Add;