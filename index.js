/**
 * Custom entry point - react-native-gesture-handler MUST be imported first.
 * Required for production/EAS builds - Expo Go includes it pre-built, but standalone
 * builds need this import or the app shows a black screen (RNGestureHandlerModule not found).
 * @see https://medium.com/@matias.turra/react-native-expo-app-shows-blank-screen-on-testflight-but-works-in-expo-go-de6d184ed96d
 */
import 'react-native-gesture-handler';

import 'expo-router/entry';
