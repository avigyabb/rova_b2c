import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Load dark mode preference from AsyncStorage on app start
    const loadDarkModePreference = async () => {
      try {
        const darkModeValue = await AsyncStorage.getItem('darkMode');
        if (darkModeValue !== null) {
          setIsDarkMode(JSON.parse(darkModeValue));
        }
      } catch (error) {
        console.error('Error loading dark mode preference:', error);
      }
    };
    loadDarkModePreference();
  }, []);

  const toggleDarkMode = async (value) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem('darkMode', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  const theme = {
    isDarkMode,
    toggleDarkMode,
    colors: {
      // Dark theme - really cool and dark
      background: isDarkMode ? '#0a0a0a' : '#ffffff',
      surface: isDarkMode ? '#1a1a1a' : '#ffffff',
      surfaceSecondary: isDarkMode ? '#2a2a2a' : '#f8f8f8',
      primary: isDarkMode ? '#ffffff' : '#000000',
      secondary: isDarkMode ? '#888888' : '#666666',
      text: isDarkMode ? '#ffffff' : '#000000',
      textSecondary: isDarkMode ? '#888888' : '#666666',
      textTertiary: isDarkMode ? '#555555' : '#999999',
      border: isDarkMode ? '#333333' : '#e0e0e0',
      borderLight: isDarkMode ? '#404040' : '#f0f0f0',
      card: isDarkMode ? '#1a1a1a' : '#ffffff',
      cardSecondary: isDarkMode ? '#2a2a2a' : '#f8f8f8',
      accent: isDarkMode ? '#00d4ff' : '#007AFF',
      accentSecondary: isDarkMode ? '#0099cc' : '#0056b3',
      error: '#ff4444',
      success: '#4caf50',
      warning: '#ff9800',
      info: '#2196f3',
      // Special dark theme colors
      darkGradient: isDarkMode ? ['#0a0a0a', '#1a1a1a'] : ['#ffffff', '#f8f8f8'],
      glow: isDarkMode ? '#00d4ff' : '#007AFF',
      shadow: isDarkMode ? '#000000' : '#000000',
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}; 