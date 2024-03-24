import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { MaterialIcons } from '@expo/vector-icons';

const Add = () => {
  const [value, setValue] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);

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

  return (
    <View style={{ backgroundColor: 'white', padding: 5, paddingLeft: 20, paddingRight: 20, height: '100%' }}>
      <Text style={{ fontSize: 30, fontWeight: 'bold' }}> rova </Text>
      {/* text input */}
      <TextInput
        placeholder="Album, Movie, Restaurant..."
        placeholderTextColor="#000"
        style={{
          marginTop: 20,
          backgroundColor: 'lightgray',
          height: 38,
          padding: 10,
          borderRadius: 10
        }}
      />
      
      <RNPickerSelect
        onValueChange={(value) => setValue(value)}
        items={[
          { label: 'Item 1', value: 'item1' },
          { label: 'Item 2', value: 'item2' },
          { label: 'Item 3', value: 'item3' },
          // ...more items
        ]}
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

      <View style={styles.container}>
        <Text style={styles.question}>How was it?</Text>
        <View style={styles.optionsContainer}>
          <View style={styles.optionBox}>
            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: 'lightgreen' },
                selectedOption === 'like' && styles.selectedOption,
              ]}
              onPress={() => setSelectedOption('like')}
            >
              {selectedOption === 'like' && (
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
                selectedOption === 'neutral' && styles.selectedOption,
              ]}
              onPress={() => setSelectedOption('neutral')}
            >
              {selectedOption === 'neutral' && (
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
                selectedOption === 'dislike' && styles.selectedOption,
              ]}
              onPress={() => setSelectedOption('dislike')}
            >
              {selectedOption === 'dislike' && (
                <MaterialIcons name="check" size={24} color="white" />
              )}
            </TouchableOpacity>
            <Text style={styles.optionText}>I didn't like it</Text>
          </View>
        </View>
      </View>

      <View style={styles.pickingContainer}>
        <Text style={styles.headerText}>Which do you prefer?</Text>
        <View style={styles.cardsContainer}>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.restaurantName}>Ghostburger</Text>
            <Text style={styles.location}>Washington, DC</Text>
          </TouchableOpacity>

          <View style={styles.orContainer}>
            <Text style={styles.orText}>OR</Text>
          </View>
          
          <TouchableOpacity style={styles.card}>
            <Text style={styles.restaurantName}>doi moi</Text>
            <Text style={styles.location}>Washington, DC</Text>
            <Text style={styles.location}> 8.2 </Text>
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

    </View>
  );
};

export default Add;