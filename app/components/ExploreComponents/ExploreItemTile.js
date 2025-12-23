import React, {useEffect, useState, useMemo} from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Linking, TextInput, ScrollView } from "react-native";
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Hyperlink from 'react-native-hyperlink';
import { getScoreColorHSL } from '../../consts';

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

const ExploreItemTile = ({ item, index, itemsInCategory, isDarkMode=false, darkTheme=null }) => {
  // Use weighted rating if available, otherwise fall back to simple average
  const rating = item.weightedRating ? item.weightedRating : (item.score / item.num_items);
  let scoreColor = getScoreColorHSL(Number(rating.toFixed(1)));

  return (
      <View style={{ 
        paddingVertical: 10, 
        borderBottomColor: isDarkMode ? darkTheme?.border : 'lightgrey', 
        borderBottomWidth: 1, 
        alignItems: 'center',
        backgroundColor: isDarkMode ? darkTheme?.background : 'white'
      }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: '85%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16.5, color: isDarkMode ? darkTheme?.textPrimary : 'black' }}>{index + 1}) {item.name}</Text>
            <View style={{ flexDirection: 'row', marginTop: 10, }}>
              {item.image && (
                <Image
                  source={item.image }
                  style={{height: 40, width: 40, borderWidth: 0.5, marginRight: 10, borderRadius: 5, borderColor: isDarkMode ? darkTheme?.border : 'lightgrey' }}
                />
              )}
                <View style={{ width: 250 }}>
                  <Text style={{ color: isDarkMode ? darkTheme?.textSecondary : 'grey', fontSize: 16 }}>
                    {item.num_items} rankings
                  </Text>
                </View>
            </View>
          </View>
          <View>
            <View style={[
              styles.listTileScore, 
              { 
                borderColor: scoreColor, 
                marginLeft: 'auto',
                backgroundColor: isDarkMode ? darkTheme?.background : 'white',
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
              }}>{rating.toFixed(1)}</Text>
            </View>
            {itemsInCategory && itemsInCategory.has(item.image) && (
              <MaterialIcons name="playlist-add-check-circle" size={20} color="gray" style={{ marginLeft: 'auto', marginTop: 'auto' }} /> 
            )}
          </View>
        </View>
      </View>
  );
}

export default ExploreItemTile;