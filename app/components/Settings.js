import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';


const Settings = ({ onBackPress, fetchUserData, setView }) => {


  const onLogOutPress = () => {
    Alert.alert(
      "Log out of ambora/social?",
      "You can sign back in at anytime",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Logout cancelled"),
          style: "cancel"
        },
        {
          text: "Log out",
          onPress: async () => {
            await AsyncStorage.removeItem('username');
            await AsyncStorage.removeItem('key');
            fetchUserData();
            setView('signin');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: 'white' }]}>
      <View style={[styles.header, { borderBottomColor: 'lightgrey' }]}>
        <TouchableOpacity onPress={onBackPress}>
          <Ionicons name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: 'black' }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.settingsContainer}>
        <View style={[styles.settingItem, { borderBottomColor: 'lightgrey' }]}>
          <Ionicons name="moon-outline" size={24} color="black" />
          <Text style={[styles.settingText, { color: 'black' }]}>Dark Mode</Text>
          <Switch
            value={false}
            onValueChange={() => {}}
            trackColor={{ false: 'lightgrey', true: '#00aced' }}
            thumbColor="white"
          />
        </View>
        
                  <TouchableOpacity style={[styles.settingItem, { borderBottomColor: 'lightgrey' }]} onPress={onLogOutPress}>
            <Ionicons name="exit-outline" size={24} color="red" />
            <Text style={[styles.settingText, { color: 'red' }]}>Log Out</Text>
            <Ionicons name="chevron-forward" size={20} color="grey" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsContainer: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  settingText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Settings; 