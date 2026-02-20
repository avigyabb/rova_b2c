# Dependency Analysis

## 🔴 Known Vulnerabilities

The GitHub security advisory shows **29 vulnerabilities** (3 critical, 14 high, 6 moderate, 6 low).

Common issues in Expo/React Native apps:
- axios < 1.7.x - SSRF vulnerability
- moment - prototype pollution (though using date-fns too)
- react-native-image-picker - various CVEs
- expo-* packages - check specific versions

**Recommendation:** Run `npm audit` and `npx expo-cli audit` to get full list.

## 🟡 Dependency Issues

### 1. Deprecated Packages
- **moment** (^2.30.1) - Use date-fns instead (already in deps!)
- **react-native-elements** (^3.4.3) - Upgrade to v4
- **react-native-hyperlink** (^0.0.22) - Consider react-native-link

### 2. Duplicate Date Libraries
- moment (2.30.1) 
- date-fns (3.6.0)

**Fix:** Remove moment, migrate to date-fns.

### 3. React 19
- react: 19.0.0
- react-dom: 19.0.0
- react-native: ^0.79.5

**Note:** React 19 is very new. May have compatibility issues with some packages.

### 4. Expo SDK 53
- expo: ^53.0.20

**Note:** SDK 53 is recent (as of early 2026). Check for breaking changes.

## 📋 Recommendations

1. Run full audit: `npm audit fix`
2. Remove moment: `npm uninstall moment`
3. Update react-native-elements
4. Review npx expo-cli audit results
