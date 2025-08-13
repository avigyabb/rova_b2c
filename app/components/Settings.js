import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dark mode theme colors
const darkTheme = {
  background: '#121212',
  surface: '#121212',
  textPrimary: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textTertiary: '#999999',
  border: '#333333',
  borderLight: '#1e1e1e',
  accent: '#00aced',
  cardBackground: '#121212',
  tabBarBackground: '#121212',
  tabBarBorder: '#333333',
  tabBarActive: '#FFFFFF',
  tabBarInactive: '#999999',
  buttonPrimary: '#FFFFFF',
  buttonPrimaryText: '#121212',
  buttonSecondary: '#333333',
  buttonSecondaryText: '#FFFFFF',
  inputBackground: '#333333',
  inputBorder: '#444444',
  placeholder: '#999999',
  profileCardBackground: '#121212',
  profileBorder: '#333333',
  feedItemBackground: '#121212',
  feedItemBorder: '#1e1e1e',
  exploreCardBackground: '#121212',
  exploreCardBorder: '#333333',
  moviePosterBorder: '#333333',
  ratingCircleBorder: '#333333',
  shadow: '#121212',
  overlay: 'rgba(18, 18, 18, 0.7)',
};


const Settings = ({ onBackPress, fetchUserData, setView, isDarkMode, toggleDarkMode }) => {


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
    <View style={[styles.container, { backgroundColor: isDarkMode ? darkTheme.background : 'white' }]}>
      <View style={[styles.header, { borderBottomColor: isDarkMode ? darkTheme.border : 'lightgrey' }]}>
        <TouchableOpacity onPress={onBackPress}>
          <Ionicons name="arrow-back" size={30} color={isDarkMode ? darkTheme.textPrimary : 'black'} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: isDarkMode ? darkTheme.textPrimary : 'black' }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.settingsContainer}>
        <View style={[styles.settingItem, { borderBottomColor: isDarkMode ? darkTheme.border : 'lightgrey' }]}>
          <Ionicons name="moon-outline" size={24} color={isDarkMode ? darkTheme.textPrimary : 'black'} />
          <Text style={[styles.settingText, { color: isDarkMode ? darkTheme.textPrimary : 'black' }]}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: isDarkMode ? darkTheme.border : 'lightgrey', true: darkTheme.accent }}
            thumbColor={isDarkMode ? darkTheme.background : 'white'}
          />
        </View>
        
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: isDarkMode ? darkTheme.border : 'lightgrey' }]} onPress={onLogOutPress}>
          <Ionicons name="exit-outline" size={24} color="red" />
          <Text style={[styles.settingText, { color: 'red' }]}>Log Out</Text>
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? darkTheme.textSecondary : 'grey'} />
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