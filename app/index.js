import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, Platform, SafeAreaView, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Add from './components/Add';
import Profile from './components/Profile';
import SignIn from './components/SignIn.js';
import Login from './components/Login.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feed from './components/Feed';
import Explore from './components/Explore.js';
import { useNavigation } from '@react-navigation/native';
import Groups from './components/Groups.js';
import PickCategory from './components/LoginFlow/PickCategory.js';

// import * as Analytics from 'expo-firebase-analytics';
// import analytics from '@react-native-firebase/analytics';

// Add more screens here
const ComingSoon = () => (
  <View style={{ backgroundColor: 'white', padding: 20, height: '100%' }}>
    <Text>Coming Soon!</Text>
  </View>
);

const Tab = createBottomTabNavigator();

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

function MyTabs({ userKey, setView, fetchUserData }) {
  const navigation = useNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleDarkModeChange = (newDarkMode) => {
    setIsDarkMode(newDarkMode);
  };

  const FeedScreen = React.useCallback((props) => (
    <Feed {...props} isDarkMode={isDarkMode} darkTheme={darkTheme} />
  ), [isDarkMode]);

  const ExploreScreen = React.useCallback((props) => (
    <Explore {...props} isDarkMode={isDarkMode} darkTheme={darkTheme} />
  ), [isDarkMode]);

  const AddScreen = React.useCallback((props) => (
    <Add {...props} isDarkMode={isDarkMode} darkTheme={darkTheme} />
  ), [isDarkMode]);

  const GroupsScreen = React.useCallback((props) => (
    <Groups {...props} isDarkMode={isDarkMode} darkTheme={darkTheme} />
  ), [isDarkMode]);

  return (
    <Tab.Navigator
      initialRouteName="Profile"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Feed') {
            iconName = 'newspaper';
          } else if (route.name === 'Explore') {
            iconName = 'search';
          } else if (route.name === 'Add') {
            iconName = 'add-circle';
          } else if (route.name === 'Groups') {
            iconName = 'people';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }
          size = focused ? 28 : 25;

          return (
            <TouchableOpacity onPress={() => navigation.navigate(route.name)}>
              <Ionicons name={iconName} size={size} color={color} />
            </TouchableOpacity>
          );
        },
        tabBarStyle: { 
          paddingBottom: 10, 
          paddingTop: 5,
          height: 55,
          backgroundColor: isDarkMode ? '#121212' : 'white',
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? '#333333' : 'lightgrey',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0
        },
      })}

      tabBarOptions={{
        activeTintColor: isDarkMode ? '#FFFFFF' : 'black',
        inactiveTintColor: isDarkMode ? '#999999' : 'gray',
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{headerStyle: { height: 0 }}}
        initialParams={{ 
          userKey: userKey, 
        }}
        />
      <Tab.Screen 
        name="Explore" 
        component={ExploreScreen}
        options={{headerStyle: { height: 0 }}}
        initialParams={{ 
          userKey: userKey, 
        }}
      />
      <Tab.Screen 
        name="Add" 
        component={AddScreen}
        options={{headerStyle: { height: 0 }}}
        initialParams={{ 
          userKey: userKey,
          itemName: '',
          itemCategory: null,
          itemDescription: '',
          itemImage: [],
        }}
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsScreen}
        options={{headerStyle: { height: 0 }}}
        initialParams={{ 
          userKey: userKey, 
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={Profile} 
        options={{headerStyle: { height: 0 }}} 
        initialParams={{ 
          userKey: userKey, 
          setView: setView, 
          fetchUserData: fetchUserData,
          visitingUserId: null,
          onDarkModeChange: handleDarkModeChange
        }}
        />
    </Tab.Navigator>
  );
}

const App = () => {
  const [view, setView] = useState('signin');
  const [userKey, setUserKey] = useState('');

  const fetchUserData = async () => {
    setUserKey(await AsyncStorage.getItem('key'));
  }

  // const logAppOpen = async () => {
  //   console.log("loc7")
  //   console.log(Analytics)
  //   try {
  //     await Analytics.logEvent('app_open');
  //   } catch (error) {
  //       console.error("Error logging the app open event:", error);
  //   }
  // };

  useEffect(() => {
    fetchUserData();
    // logAppOpen();
    // analytics().logEvent('some_event', {
    //   id: 3745092,
    //   item: 'sample_item',
    //   description: ['array', 'of', 'items'],
    // });
  }, []);
  
  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white' }} />
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <StatusBar style="dark" />
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <NavigationContainer independent={true} theme={{
          dark: false,
          colors: {
            primary: 'rgb(255, 45, 85)',
            background: 'white',
            card: 'white',
            text: 'black',
            border: 'rgb(199, 199, 204)',
            notification: 'rgb(255, 69, 58)',
          },
        }}>
          {userKey ? (
            <>
            {view === 'pickCategory' ? (
              <PickCategory userKey={userKey} setView={() => setView(null)}/>
            ) : (
              <MyTabs userKey={userKey} setView={setView} fetchUserData={fetchUserData}/>
            )}
            </>
          ) : view === 'signin' ? (
            <SignIn setView={setView} setUserKeyIndex={setUserKey} />
          ) : (
            <Login setView={setView} setUserKeyIndex={setUserKey} />
          )}
        </NavigationContainer>
        </SafeAreaView>
      </View>
    </>
  );
};

export default App;
