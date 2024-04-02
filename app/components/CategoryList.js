import React, {useState} from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  listTileScore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderColor: 'green',
    borderWidth: 3
  }
});

const CategoryList = ({ focusedCategory, focusedList, onBackPress }) => {
  const [listView, setListView] = useState('ranked');
  const [listData, setListData] = useState(focusedList['now']);

  function getScoreColorHSL(score) {
    if (score < 0) {
      return '#A3A3A3'; // Gray color for negative scores
    }
    const cappedScore = Math.max(0, Math.min(score, 10)); // Cap the score between 0 and 100
    const hue = (cappedScore / 10) * 120; // Calculate hue from green to red
    const lightness = 30; // Constant lightness
    return `hsl(${hue}, 100%, ${lightness}%)`; // Return HSL color string
  }

  const ListItemTile = ({ item }) => {
    let scoreColor = getScoreColorHSL(Number(item.score));
    return (
      <View style={{ padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: 'bold' }}>{item.content}</Text>
        <View style={[styles.listTileScore, { borderColor: scoreColor }]}>
          <Text style={{ color: scoreColor, fontWeight: 'bold' }}>{item.score.toFixed(1)}</Text>
        </View>
      </View>
    );
  }

  const onIconViewPress = () => {
    if (listView === 'ranked') {
      setListData(focusedList['later']);
      setListView('later');
    } else {
      setListData(focusedList['now']);
      setListView('ranked');
    }
  }

  return (
    <>
      <View style={{ flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderColor: 'lightgrey' }}>
        <TouchableOpacity onPress={onBackPress}> 
          <MaterialIcons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>

        <Text style={{ marginLeft: 'auto', marginRight: 10, fontSize: 15, fontWeight: 'bold' }}> {focusedCategory}</Text>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: '50%', alignItems: 'center', padding: 8, borderBottomColor: listView === 'ranked' ? 'black' : 'transparent', borderBottomWidth: 2 }}>
          <TouchableOpacity onPress={() => onIconViewPress()}>
            <MaterialIcons name="format-list-bulleted" size={listView === 'ranked' ? 32 : 30} color={listView === 'ranked' ? 'black' : 'gray'} />
          </TouchableOpacity>
        </View>
        <View style={{ width: '50%', alignItems: 'center', padding: 8, borderBottomColor: listView === 'later' ? 'black' : 'transparent', borderBottomWidth: 2 }}>
          <TouchableOpacity onPress={() => onIconViewPress()}>
            <MaterialIcons name="watch-later" size={listView === 'later' ? 32 : 30} color={listView === 'later' ? 'black' : 'gray'} />
          </TouchableOpacity>
        </View>
      </View>

      {focusedList ? (           
        <FlatList
          data={listData}
          renderItem={({ item }) => <ListItemTile item={item} />}
          keyExtractor={(item, index) => index.toString()}
          numColumns={1}
          key={"single-column"}
        />
      ) : (
        <Text>Add some items to this category!</Text>
      )}
    </>
  )
}

export default CategoryList;