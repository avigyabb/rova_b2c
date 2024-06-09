import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, FlatList, Keyboard, TouchableWithoutFeedback, TextInput } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, query, orderByChild, equalTo, get, update } from "firebase/database";
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import profilePic from '../../assets/images/emptyProfilePic3.png';
import Profile from './Profile';
import RNPickerSelect from 'react-native-picker-select';
import { emailSchoolMap, schoolIdMap } from '../consts';
import { largerCategories, notIncludedCategories } from '../consts';


const Groups = ({ route, navigation }) => {
  const { userKey } = route.params;
  const [groupType, setGroupType] = useState('Global');
  const [chips, setChips] = useState([]); // &&&
  const [groupsListData, setGroupsListData] = useState([]);
  const [leaderboardCategory, setLeaderboardCategory] = useState('All Categories');
  const [groupView, setGroupView] = useState(null);
  const [visitingUserInfo, setVisitingUserInfo] = useState(null);
  const [schoolEmail, setSchoolEmail] = useState(null);
  const [school, setSchool] = useState(null);

  useEffect(() => {
    // get user info
    const userRef = ref(database, 'users/' + userKey);
    get(userRef).then((snapshot) => {
      setVisitingUserInfo({...snapshot.val(), key: snapshot.key});
      setSchool(snapshot.val().school || null);
    })

    let usersRef = ref(database, 'users');
    if (groupType === 'School') {
      usersRef = query(usersRef, orderByChild('school'), equalTo(school));
    }
    const tempGroupsListData = [];
    const overallMap = { // &&&
      'All Categories': [0, 0], // first index is number of people, 2nd is number of rankings
      Songs: [0, 0],
      Albums: [0, 0],
      Movies: [0, 0],
      Artists: [0, 0],
    }

    get(usersRef).then((snapshot) => {
      if (snapshot.exists()) {  
        processUsers(snapshot, tempGroupsListData, overallMap)
          .then(() => {
            setGroupsListData(tempGroupsListData.filter((item) => item.map['All Categories'] > 0).sort((a, b) => b.map['All Categories'] - a.map['All Categories'])); // ~ CAUSES TONS OF REFRESHES MUST FIX
            setChips(Object.entries(overallMap).filter(([key, value]) => !Number.isNaN(value) && key !== '').sort((a, b) => {
              if (a[1][0] !== b[1][0]) {
                return b[1][0] - a[1][0];
              }
              return b[1][1] - a[1][1];
            }));
          })
          .catch((error) => {
              console.error('An error occurred:', error);
          });
      }
    }).catch((error) => {
      console.error("Error:", error);
    })
  }, [groupType]);

  const processUsers = (snapshot, tempGroupsListData, overallMap) => {
    const categoryRef = ref(database, 'categories');
    const promises = [];

    snapshot.forEach((userInfo) => {
      const map = { // &&&
        'All Categories': 0,
        Songs: 0,
        Albums: 0,
        Movies: 0,
        Artists: 0,
      }
      const userCategoryQuery = query(categoryRef, orderByChild('user_id'), equalTo(userInfo.key));
      promises.push(get(userCategoryQuery).then((userCategoriesSnap) => {
        if (userCategoriesSnap.exists()) {
          userCategoriesSnap.forEach((categoryInfo) => {
            const catInfo = categoryInfo.val();
            map['All Categories'] += catInfo.num_items;
            overallMap['All Categories'][1] += catInfo.num_items;
            overallMap['All Categories'][0] += 1;
            // console.log(catInfo.category_name);
            if (Object.keys(map).includes(catInfo.category_type) && catInfo.category_type !== 'Locations') {
              map[catInfo.category_type] += catInfo.num_items;
              overallMap[catInfo.category_type][1] += catInfo.num_items;
              overallMap[catInfo.category_type][0] += 1;
            } else if (!notIncludedCategories.includes(catInfo.category_name.trim())) {
              const largerCategory = largerCategories[catInfo.category_name.trim()] || catInfo.category_name.trim();
              map[largerCategory] ? map[largerCategory] += catInfo.num_items : map[largerCategory] = catInfo.num_items; 
              overallMap[largerCategory] ? overallMap[largerCategory][1] += catInfo.num_items : overallMap[largerCategory] = [0, catInfo.num_items]; 
              overallMap[largerCategory] ? overallMap[largerCategory][0] += 1 : overallMap[largerCategory][0] = 1;                 
            }
          })
        }
        tempGroupsListData.push({
          key: userInfo.key,
          ...userInfo.val(),
          map: map
        });
      }));
    })

    return Promise.all(promises);
  }

  const onCategorySwitch = (chip) => {
    setLeaderboardCategory(chip);
    const sortedData = [...groupsListData].sort((a, b) => (b.map[chip] || 0) - (a.map[chip] || 0));
    setGroupsListData(sortedData);
  }

  const Chip = ({chipInfo}) => {
    const chip = chipInfo[0];
    return (
      <TouchableOpacity onPress={() => onCategorySwitch(chip)} style={{ backgroundColor:  chip === leaderboardCategory ? 'black' : 'lightgrey', height: 30, paddingHorizontal: 10, borderRadius: 20, marginRight: 8, justifyContent: 'center' }}>
        <Text style={{ color: chip === leaderboardCategory ? 'white' : 'black', fontWeight: 'bold', fontSize: 14 }}>{chip}</Text>
      </TouchableOpacity>
    )
  }

  const UserTile = ({ item, index }) => {
    return (
      // the conditional in the onPress is necessary to not click on your own profile
      <TouchableOpacity onPress={() => userKey === item.key ? {} : setGroupView({userKey: item.key, username: item.username })}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1, backgroundColor: 'white', alignItems: 'center' }}>
          <Text style={{ color: 'black', marginRight: 20, fontWeight: 'bold', fontSize: 16 }}>{index + 1}</Text>
          <Image
            source={item.profile_pic ? { uri: item.profile_pic } : 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png'}
            style={{height: 40, width: 40, borderWidth: 0.5, marginRight: 10, borderRadius: 20, borderColor: 'lightgrey' }}
          />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.name}</Text>
              {item.user_type === 'verified' && <MaterialIcons name="verified" size={16} color="#00aced" style={{ marginLeft: 5 }}/>}
            </View>
            <Text style={{ color: 'grey' }}>@{item.username}</Text>
          </View>
          <Text style={{ color: 'black', marginLeft: 'auto', marginRight: 10, fontWeight: 'bold', fontSize: 16 }}>{item.map[leaderboardCategory]}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (groupView) {
    return (
      <Profile 
      route={{'params': {
        userKey: groupView.userKey,
        username: groupView.username,
        visitingUserId: userKey,
        setFeedView: setGroupView
      }}}
      navigation={navigation}  
      />
    )
  }

  onSchoolPress = (schoolId) => {
    const userRef = ref(database, 'users/' + userKey);
    update(userRef, {
      school: schoolId,
      schoolEmail: schoolEmail
    })
    setSchool(schoolId);
  }

  return (
    <View style={{ backgroundColor: 'white', height: '100%' }}>
      <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', width: '100%', paddingBottom: 10, justifyContent: 'space-evenly', borderColor: 'lightgrey', borderBottomWidth: 0.5 }}>
        <TouchableOpacity onPress={() => {setGroupType('Global');}} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="earth" size={24} color="black" style={groupType === 'Global' ? { color: 'black', fontSize: 24, fontWeight: 'bold', marginRight: 5 } : { color: 'gray', fontSize: 20, fontWeight: 'bold', marginRight: 5 }}/>
          <Text style={groupType === 'Global' ? { color: 'black', fontSize: 18, fontWeight: 'bold' } : { color: 'gray', fontSize: 16, fontWeight: 'bold' }}>Global</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {setGroupType('School');}} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="school" color="black" style={groupType === 'School' ? { color: 'black', fontSize: 24, fontWeight: 'bold', marginRight: 5 } : { color: 'gray', fontSize: 20, fontWeight: 'bold', marginRight: 5 }}/>
          <Text style={groupType === 'School' ? { color: 'black', fontSize: 18, fontWeight: 'bold' } : { color: 'gray', fontSize: 16, fontWeight: 'bold' }}>School</Text>
        </TouchableOpacity>
      </View>

      {groupType === 'Global' ? (
        <View style={{ flex: 1, height: '92%', alignContent: 'flex-start' }}>
          <FlatList
            data={chips}
            renderItem={({ item }) => <Chip chipInfo={item}/>}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={{ padding: 10, flexGrow: 0 }}
          />
          <FlatList
            data={groupsListData.filter((item) => item.map[leaderboardCategory] > 0)}
            renderItem={({ item, index }) => <UserTile item={item} index={index}/>}
            keyExtractor={(item, index) => index.toString()}
            numColumns={1}
            key={"single-column"}
            style={{ flexGrow: 1 }}
          />
        </View>
      ) : (
        <>
        {school ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, padding: 10, borderBottomColor: 'lightgrey', borderBottomWidth: 1 }}>
              <Image source={{ uri: schoolIdMap[school].image }} style={{ width: 40, height: 40 }}/>
              <Text style={{ color: 'black', fontSize: 20, marginLeft: 5, fontWeight: 'bold' }}>{schoolIdMap[school].name}</Text>
            </View>
            <FlatList
              data={chips}
              renderItem={({ item }) => <Chip chipInfo={item}/>}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={{ padding: 10, flexGrow: 0 }}
            />
            <FlatList
              data={groupsListData.filter((item) => item.map[leaderboardCategory] > 0 && item.school === school)}
              renderItem={({ item, index }) => <UserTile item={item} index={index}/>}
              keyExtractor={(item, index) => index.toString()}
              numColumns={1}
              key={"single-column"}
              style={{ height: 535 }}
            />
          </View>
        ) : (
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{ flex: 1, alignItems: 'center', marginTop: '30%' }}>
              {/* <Text style={{ color: 'gray', fontSize: 20, marginBottom: 30 }}>Coming Soon! 📚</Text> */}
              <View style={{ width: '80%' }}>
                <Text style={{ color: 'black', fontSize: 20, marginBottom: 30 }}>Enter Your School Email 📚</Text>
              </View>
              <TextInput
                placeholder="school email"
                value={schoolEmail}
                onChangeText={setSchoolEmail}
                placeholderTextColor={'gray'}
                style={{ 
                  width: '80%', 
                  fontSize: 16, 
                  borderColor: 'black', 
                  borderBottomWidth: 0.5, 
                  marginTop: 20,
                  padding: 10,
                  letterSpacing: 1
                }}
              />

              {schoolEmail && emailSchoolMap[schoolEmail.split('@')[1] ? schoolEmail.split('@')[1] : ''] && (
                <>
                <Text style={{ color: 'gray', fontSize: 16, marginTop: 50 }}>Select a School</Text>
                <FlatList
                  data={emailSchoolMap[schoolEmail.split('@')[1]].schools}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => onSchoolPress(item.id)} style={{ 
                      flexDirection: 'row', 
                      padding: 10, 
                      borderBottomColor: 'lightgrey', 
                      borderBottomWidth: 1, 
                      alignItems: 'center',
                      width: 350 
                    }}>
                      <Image source={{ uri: item.image }} style={{ width: 40, height: 40 }}/>
                      <Text style={{ color: 'black', fontSize: 18, marginLeft: 10 }}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item, index) => index.toString()}
                  numColumns={1}
                  key={"single-column"}
                  style={{
                    marginTop: 20
                  }}
                />
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        )}
        </>
      )}
    </View>
  )
};

export default Groups;