import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { database } from '../../firebaseConfig';
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';

/**
 * CommentText Component
 *
 * Parses comment text to identify @mentions and renders them as clickable links.
 * Non-mentioned text is rendered as plain text.
 *
 * @param {string} text - The raw comment text to parse
 * @param {function} setFeedView - Navigation function to view user profiles
 * @param {object} navigation - React Navigation object
 * @param {function} onCloseComments - Function to close the comments modal when navigating away
 */
const CommentText = ({ text, setFeedView, navigation, onCloseComments }) => {
  const [parsedContent, setParsedContent] = useState([]);

  // Parse the text whenever it changes
  useEffect(() => {
    parseCommentText();
  }, [text]);

  /**
   * Main parsing function that:
   * 1. Uses regex to find all @username mentions
   * 2. Splits text into parts (regular text vs mentions)
   * 3. Resolves usernames to userIds via Firebase
   */
  const parseCommentText = async () => {
    // Regex explanation:
    // @ = literal @ character
    // ([\w.]+) = capture group matching one or more word characters OR periods (a-z, A-Z, 0-9, _, .)
    // g = global flag (find all matches)
    // Note: Includes period to support usernames like "Neil.Rayamajhi"
    const mentionRegex = /@([\w.]+)/g;
    const parts = [];
    let lastIndex = 0; // Track position in string as we parse
    let match;

    // Loop through all regex matches
    // exec() returns: [fullMatch, captureGroup1, ...] or null
    while ((match = mentionRegex.exec(text)) !== null) {
      // match[0] = full match (e.g., "@alice")
      // match[1] = captured username (e.g., "alice")
      // match.index = starting position of match in string

      // Add any regular text BEFORE this mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }

      // Add the mention itself
      const username = match[1]; // Get captured username without @
      parts.push({
        type: 'mention',
        content: '@' + username, // Display with @ symbol
        username: username
      });

      // Update position tracker
      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text after the last mention
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    // Now resolve all usernames to userIds in parallel
    // Promise.all waits for all async operations to complete
    const resolvedParts = await Promise.all(
      parts.map(async (part) => {
        if (part.type === 'mention') {
          // Look up userId for this username
          const userId = await getUserIdByUsername(part.username);
          return { ...part, userId };
        }
        return part; // Regular text parts pass through unchanged
      })
    );

    setParsedContent(resolvedParts);
  };

  /**
   * Queries Firebase to find userId for a given username
   *
   * Firebase query explanation:
   * - We're searching the /users collection
   * - orderByChild('username') creates an index on the username field
   * - equalTo(username) filters for exact match
   *
   * Returns userId or null if not found
   */
  const getUserIdByUsername = async (username) => {
    try {
      const usersRef = ref(database, 'users');

      // Create query: find user where username equals our target
      const q = query(
        usersRef,
        orderByChild('username'),
        equalTo(username)
      );

      const snapshot = await get(q);

      if (snapshot.exists()) {
        // snapshot.val() returns an object like: { "userId123": { username: "alice", ... } }
        // Object.keys() gives us ["userId123"]
        // [0] gets the first (and should be only) userId
        const userId = Object.keys(snapshot.val())[0];
        return userId;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
    return null; // Return null if user not found or error occurred
  };

  /**
   * Navigate to the mentioned user's profile
   *
   * @param {string} userId - The Firebase userId to navigate to
   * @param {string} username - The username for display
   */
  const handleMentionPress = (userId, username) => {
    if (!userId) return; // Don't navigate if username doesn't exist

    // Close the comments modal if it's open
    if (onCloseComments) {
      onCloseComments();
    }

    setFeedView(null); // Clear any existing feed view
    navigation.navigate('Profile', {
      userKey: userId,           // Profile expects userKey, not userId
      visitingUserId: userId,
      username: username,
      setFeedView: setFeedView   // Pass setFeedView so back button works
    });
  };

  // Render the parsed content
  // Note: In React Native, we use nested Text with onPress, not TouchableOpacity inside Text
  // Matching existing app style from NormalItemTile.js tagged_users (color: #2980b9)
  return (
    <Text style={{ fontSize: 14, lineHeight: 20, color: '#000' }}>
      {parsedContent.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <Text
              key={index}
              style={{ color: '#2980b9', fontWeight: '500' }}
              onPress={() => handleMentionPress(part.userId, part.username)}
            >
              {part.content}
            </Text>
          );
        }
        // Regular text
        return <Text key={index}>{part.content}</Text>;
      })}
    </Text>
  );
};

export default CommentText;
