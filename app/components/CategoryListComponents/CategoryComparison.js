import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard, FlatList } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref as storRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Modular imports for storage
import { database, storage } from '../../../firebaseConfig';
import { ref, set, onValue, off, push, query, equalTo, orderByChild, get } from "firebase/database"; // Import 'ref' and 'set' from the database package
import RNPickerSelect from 'react-native-picker-select';
import CategoryTile from '../CategoryTile';
import { getScoreColorHSL } from '../../consts';

const CategoryComparison = ({ onContinuePress, userCategories, curListData, curListInfo }) => {
  const [categoryComparisonView, setCategoryComparisonView] = useState(null);
  const [similarityScore, setSimilarityScore] = useState(-1);
  const [comparisonCategoryInfo, setComparisonCategoryInfo] = useState(null);

  const calculateSimilarityScore = (map1, map2) => {
    // Find common items
    const commonItems = Object.keys(map1).filter(id => id in map2);

    // Calculate Jaccard Similarity
    const set1 = new Set(Object.keys(map1));
    const set2 = new Set(Object.keys(map2));
    const intersectionSize = new Set([...set1].filter(id => set2.has(id))).size;
    const unionSize = new Set([...set1, ...set2]).size;
    let jaccardSimilarity = (intersectionSize / unionSize) * 100;
    jaccardSimilarity = Math.min(Math.atan(5 * jaccardSimilarity / 100) * 100, 100);

    // Calculate the ranking similarity
    let rankingSimilarity = 0;
    if (commonItems.length > 0) {
      // Assign ranks to the movies in each list
      const ranks1 = {};
      const ranks2 = {};

      commonItems.sort((a, b) => map1[a] - map1[b]).forEach((key, index) => {
        ranks1[key] = index + 1;
      });

      commonItems.sort((a, b) => map2[a] - map2[b]).forEach((key, index) => {
        ranks2[key] = index + 1;
      });

      // Calculate the difference in ranks for common movies
      const rankDifferences = commonItems.map(id => {
        const diff = ranks1[id] - ranks2[id];
        return diff * diff;
      });

      // Calculate the Spearman's rank correlation coefficient
      const n = commonItems.length;
      const sumOfSquaredDifferences = rankDifferences.reduce((sum, val) => sum + val, 0);

      // Ensure the denominator is correctly computed to avoid large negative values
      const denominator = n * (n * n - 1);
      const spearmanRankCoefficient = 1 - (6 * sumOfSquaredDifferences) / denominator;

      // Convert the Spearman's rank correlation coefficient to a similarity score (0 to 100)
      rankingSimilarity = ((spearmanRankCoefficient + 1) / 2) * 100;
      // rankingSimilarity = 100 / (1 + (rankingSimilarity/(1 - rankingSimilarity))**(-2));
    }
    
    console.log('Jaccard Similarity:', jaccardSimilarity);
    console.log('Ranking Similarity:', rankingSimilarity);

    // Combine both similarities
    const finalSimilarityScore = jaccardSimilarity*0.1 + rankingSimilarity*0.9;

    return Math.round(finalSimilarityScore);
  }

  const onCategoryComparisonPress = (category_id, categoryInfo) => {
    setComparisonCategoryInfo(categoryInfo);
    let curItemToScore = {};
    curListData.forEach((item) => {
      curItemToScore[item[1].image] =  item[1].score;
    })
    
    let itemToScore = {};
    const categoryItemsRef = ref(database, 'items');
    const categoryItemsQuery = query(categoryItemsRef, orderByChild('category_id'), equalTo(category_id));

    get(categoryItemsQuery).then((snapshot) => {
      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val().score >= 0) {
          itemToScore[childSnapshot.val().image] = childSnapshot.val().score;
        }
      });
      // console.log(calculateSimilarityScore(curItemToScore, itemToScore));
      setSimilarityScore(calculateSimilarityScore(curItemToScore, itemToScore));
      setCategoryComparisonView('itemAdded');
    }).catch((error) => {
      console.error("Error fetching categories:", error);
    });
  }

  if (categoryComparisonView === 'itemAdded') {

    let scoreColor = getScoreColorHSL(similarityScore/10);

    return (
      <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, paddingRight: 20, height: '100%' }}>
        <View style={{ alignItems: 'center', justifyContent: 'space-evenly', height: '100%' }}>

          <View style={{ alignItems: 'center', width: '100%' }}>
            <Text style={{ fontSize: 30, fontWeight: 'bold', marginBottom: 20 }}>Your list similarity is</Text>
            <Text style={{ fontSize: 35, fontWeight: 'bold', color: scoreColor }}>✨ {similarityScore}% ✨</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%' }}>
            <View style={{ flexDirection: 'column', alignItems: 'center', width: '40%' }}>
              <Image
                source={{ uri: curListInfo.imageUri }}
                style={{height: 80, width: 80, borderWidth: 0.5, borderRadius: 5, borderColor: 'lightgrey' }}
              />
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 10, textAlign: 'center' }}>{curListInfo.category_name}</Text>
            </View>
            <Ionicons name="repeat-outline" size={60} color="lightgrey" />
            <View style={{ flexDirection: 'column', alignItems: 'center', width: '40%' }}>
              <Image
                source={{ uri: comparisonCategoryInfo.imageUri }}
                style={{height: 80, width: 80, borderWidth: 0.5, borderRadius: 5, borderColor: 'lightgrey' }}
              />
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 10, textAlign: 'center' }}>{comparisonCategoryInfo.category_name}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onContinuePress} style={{
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
      <View style={{ backgroundColor: 'white', padding: 10, height: '100%' }}>    
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 14, color: 'gray', paddingLeft: 5, marginBottom: 10 }}>choose a category:</Text>
          <FlatList
            data={userCategories}
            renderItem={({ item }) => <CategoryTile 
              category_name={item.category_name} 
              imageUri={item.imageUri} 
              num_items={-1} 
              onCategoryPress={() => onCategoryComparisonPress(item.id, item)}
              fromPage={'PickCategory'}
            />}
            numColumns={3}
            contentContainerStyle={{}}
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default CategoryComparison;