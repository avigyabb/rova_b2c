import React, { useState, useEffect, useMemo } from 'react';
import { Text, View, FlatList, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, TextInput, Keyboard } from 'react-native';
import { useFonts } from 'expo-font';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { search } from './../Search';
import { Image } from 'expo-image';

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
    itemContent: {
      fontSize: 16,
      fontWeight: 'bold',
      width: '83%',
      textAlign: 'center',
    },
    location: {
      fontSize: 14,
      color: 'grey',
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '90%',
    },
    actionButton: {
      padding: 10,
    },
    actionText: {
      fontSize: 16,
    }
  });

const LocationList = ({}) => {

    const [searchResults, setSearchResults] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [newItemCategoryType, setNewItemCategoryType] = useState('');
    const [spotifyAccessToken, setSpotifyAccessToken] = useState(null);
    const [itemsInCategory, setItemsInCategory] = useState(null);
    
    return (
        <View>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}> 
                <View style={{ backgroundColor: 'white', paddingHorizontal: 20, height: '100%' }}>
                    {/* <View style={{
                        flexDirection: 'row',
                        marginTop: 15,
                        backgroundColor: 'lightgray',
                        paddingHorizontal: 15,
                        borderRadius: 10,
                        alignItems: 'center', // Aligns the TextInput and the icon vertically
                        marginBottom: 10
                    }}>
                        <Ionicons name="search" size={24} color="black" style={styles.icon} />
                        <TextInput
                            placeholder={'Search Locations...'}
                            placeholderTextColor="gray"
                            onChangeText={(text) => {
                                setNewItem(text);
                                search(spotifyAccessToken, 'Locations', setSearchResults, text);
                            }}
                            style={{ 
                            fontSize: 16,
                            letterSpacing: 0.4,
                            paddingLeft: 10,
                            fontWeight: 'bold',
                            height: 50
                            }}
                        /> 
                    </View> */}
                    <View style={{ flex: 1, alignItems: 'center', marginTop: '30%' }}>
                        <Text style={{ color: 'gray', fontSize: 20, marginBottom: 30 }}>Coming Soon! 📍</Text>
                    </View>
                    {/* <FlatList
                        data={searchResults}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => {
                            setNewItem(item.content)
                            setNewItemImageUris([item.image])
                            setNewItemDescription(item.description)
                            setPresetDescription(item.description)
                            setTrackUri(item.uri || null)
                            }} 
                            style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center',
                            padding: 5,
                            borderColor: 'lightgray',
                            borderBottomWidth: 0.5,
                            }}>
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={{ 
                                width: newItemCategoryType === 'Movies' || newItemCategoryType === 'Shows' ? 40 : 60, height: 60,
                                borderRadius: 5,
                                borderWidth: 0.5,
                                borderColor: 'lightgray'
                                }}/>
                            ) : (
                                <View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: 'lightgray', borderRadius: 5 }}>
                                <Ionicons name="location-sharp" size={40} color="black" />
                                </View>
                            )}
                            <View style={{ marginLeft: 10, width: 250 }}>
                                <Text style={{ fontWeight: 'bold' }}>{item.content}</Text>
                                <Text style={{ color: 'gray', fontSize: 12 }}>{item.description}</Text>
                            </View>
                            { itemsInCategory && itemsInCategory.has(item.content) && <Ionicons name="list" size={25} />}
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item, index) => index.toString()}
                        numColumns={1}
                        key={"single-column"}
                    /> */}
                </View> 
            </TouchableWithoutFeedback>
        </View>
    );
  };
  
  export default LocationList;