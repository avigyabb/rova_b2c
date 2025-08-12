# Building From Source
create new file on desktop
git clone link from green code button in repo
cd rova_b2c
make sure node is installed / restart vs to ensure node is installed
npm install
download expo go
make an account on expo
run npx expo start -c or npx expo start --tunnel
enter email and password into terminal
ALWAYS PULL BEFORE YOU PUSH

# Starting App in Expo
```npm install```
```npm start/npx expo start -c```

# Pushing to App Store Connect
update version number in app.json
```npx expo prebuild --platform ios```
```eas login```
```eas build:configure```
```eas build --platform ios```  
```eas submit -p ios --latest```

# Troubleshooting

**Error: Expo is taking too long to load**

Run ```npx expo start --tunnel```

**Error: LAN ERROR**

Reset phone (power off) and then run npx expo start
