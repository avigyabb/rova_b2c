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

const ExploreItemTile = ({ item, index }) => {
  let scoreColor = getScoreColorHSL(Number(item.score/item.num_items.toFixed(1)));

  return (
      <View style={{ paddingVertical: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, alignItems: 'center', }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: '85%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16.5 }}>{index + 1}) {item.name}</Text>
            <View style={{ flexDirection: 'row', marginTop: 10, }}>
              {item.image && (
                <Image
                  source={item.image }
                  style={{height: 40, width: 40, borderWidth: 0.5, marginRight: 10, borderRadius: 5, borderColor: 'lightgrey' }}
                />
              )}
                <View style={{ width: 250 }}>
                  <Text style={{ color: 'grey', fontSize: 16 }}>
                    {item.num_items} rankings
                  </Text>
                </View>
            </View>
          </View>
          <View style={[styles.listTileScore, { borderColor: scoreColor, marginLeft: 'auto' }]}>
            <Text style={{ color: scoreColor, fontWeight: 'bold' }}>{(item.score/item.num_items).toFixed(1)}</Text>
          </View>
        </View>
      </View>
  );
}

export default ExploreItemTile;