import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const Settings = ({ onBackPress, fetchUserData, setView }) => {
  const { isDarkMode, toggleDarkMode, colors } = useTheme();

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBackPress}>
          <Ionicons name="arrow-back" size={30} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.settingsContainer}>
        <View style={[styles.settingItem, { borderBottomColor: colors.borderLight }]}>
          <Ionicons name="moon-outline" size={24} color={colors.text} />
          <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={isDarkMode ? colors.glow : colors.surfaceSecondary}
          />
        </View>
        
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.borderLight }]} onPress={onLogOutPress}>
          <Ionicons name="exit-outline" size={24} color={colors.error} />
          <Text style={[styles.settingText, { color: colors.error }]}>Log Out</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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