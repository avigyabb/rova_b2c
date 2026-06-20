import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../../firebaseConfig';
import { ref, onValue, off, push, set, get, update, remove } from 'firebase/database';
import CommentItem from './CommentItem';

const CommentsBottomSheet = ({
  visible,
  onClose,
  item,
  userKey,
  visitingUserId,
  navigation,
  username,
  setFeedView,
  focusCommentId
}) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyMode, setReplyMode] = useState(null); // { commentId, username, userId }
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);

  // Ref for FlatList to enable scrollToIndex
  const flatListRef = useRef(null);

  // Fetch current user profile for avatar
  useEffect(() => {
    if (visible && visitingUserId) {
      const userRef = ref(database, `users/${visitingUserId}`);
      const unsubscribe = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          setCurrentUserProfile(snapshot.val());
        }
      });
      return () => off(userRef, 'value', unsubscribe);
    }
  }, [visible, visitingUserId]);

  // Fetch comments when modal opens
  useEffect(() => {
    if (visible && item && item.key) {
      setLoading(true);
      const commentsRef = ref(database, `items/${item.key}/comments`);

      const unsubscribe = onValue(commentsRef, (snapshot) => {
        const commentsData = [];
        snapshot.forEach((childSnapshot) => {
          commentsData.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });

        // Sort comments by timestamp (newest first for top-level)
        const topLevelComments = commentsData
          .filter(comment => !comment.parentCommentId)
          .sort((a, b) => b.timestamp - a.timestamp);

        setComments(topLevelComments);
        setLoading(false);
      });

      return () => off(commentsRef, 'value', unsubscribe);
    }
  }, [visible, item]);

  // Scroll to and highlight the focused comment when focusCommentId changes
  useEffect(() => {
    if (focusCommentId && visible && comments.length > 0 && !loading) {
      // Small delay to ensure FlatList is fully rendered
      setTimeout(() => {
        const commentIndex = comments.findIndex(c => c.id === focusCommentId);

        if (commentIndex !== -1) {
          // Scroll to the comment
          flatListRef.current?.scrollToIndex({
            index: commentIndex,
            animated: true,
            viewPosition: 0.3 // Position at 30% from top of screen
          });

          // Highlight the comment
          setHighlightedCommentId(focusCommentId);

          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedCommentId(null);
          }, 3000);
        }
      }, 300); // 300ms delay for UI to settle
    }
  }, [focusCommentId, visible, comments, loading]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      const itemCommentRef = push(ref(database, `items/${item.key}/comments/`));
      const newCommentData = {
        userId: visitingUserId,
        comment: newComment,
        timestamp: Date.now(),
        likes: {},
        parentCommentId: replyMode ? replyMode.commentId : null,
        replyCount: 0
      };

      await set(itemCommentRef, newCommentData);

      // If replying, increment parent's replyCount
      if (replyMode) {
        const parentRef = ref(database, `items/${item.key}/comments/${replyMode.commentId}/replyCount`);
        const parentSnapshot = await get(parentRef);
        const currentCount = parentSnapshot.val() || 0;
        await set(parentRef, currentCount + 1);

        // Notify original commenter (if not replying to self)
        if (replyMode.userId !== visitingUserId) {
          const eventsRef = push(ref(database, `events/${replyMode.userId}`));
          await set(eventsRef, {
            evokerId: visitingUserId,
            content: `replied to your comment on ${item.content}`,
            timestamp: Date.now(),
            image: item.image,
            postId: item.key,
            commentId: itemCommentRef.key, // NEW: Include commentId for deep linking
            type: 'comment_reply'
          });

          await update(ref(database, `users/${replyMode.userId}`), {
            unreadNotifications: true
          });
        }
      } else {
        // Notify post owner (existing logic for top-level comments)
        if (item.user_id !== visitingUserId) {
          const eventsRef = push(ref(database, `events/${item.user_id}`));
          await set(eventsRef, {
            evokerId: visitingUserId,
            content: `commented on your post: ${item.content}!`,
            timestamp: Date.now(),
            image: item.image,
            postId: item.key,
            commentId: itemCommentRef.key  // NEW: Include commentId for deep linking
          });

          await update(ref(database, `users/${item.user_id}`), {
            unreadNotifications: true
          });
        }
      }

      setNewComment('');
      setReplyMode(null);
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  const handleReply = (commentId, username, userId, level) => {
    setReplyMode({ commentId, username, userId });
    // Auto-insert @ mention when replying to a reply (level > 0)
    if (level > 0) {
      setNewComment(`@${username} `);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* Modal Content */}
        <View
          style={styles.modalContent}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Comments</Text>
          </View>

          {/* Comments List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="black" />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptySubtitle}>Start the conversation.</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              keyExtractor={(comment) => comment.id}
              style={styles.commentsList}
              contentContainerStyle={styles.commentsListContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: comment }) => (
                <View
                  style={
                    comment.id === highlightedCommentId
                      ? styles.highlighted
                      : null
                  }
                >
                  <CommentItem
                    comment={comment}
                    commentId={comment.id}
                    level={0}
                    itemKey={item.key}
                    itemOwnerId={item.user_id}
                    onReply={handleReply}
                    visitingUserId={visitingUserId}
                    navigation={navigation}
                    setFeedView={setFeedView}
                    onCloseComments={onClose}
                  />
                </View>
              )}
              onScrollToIndexFailed={(info) => {
                // Fallback: scroll to offset if index fails
                flatListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true
                });
              }}
            />
          )}

          {/* Reply Indicator */}
          {replyMode && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyText}>
                Replying to {replyMode.username}
              </Text>
              <TouchableOpacity onPress={() => setReplyMode(null)}>
                <Ionicons name="close" size={20} color="grey" />
              </TouchableOpacity>
            </View>
          )}

          {/* Comment Input */}
          <View style={styles.inputContainer}>
            <Image
              source={
                currentUserProfile?.profile_pic
                  ? { uri: currentUserProfile.profile_pic }
                  : { uri: 'https://www.prolandscapermagazine.com/wp-content/uploads/2022/05/blank-profile-photo.png' }
              }
              style={styles.userAvatar}
              cachePolicy="memory-and-disk"
            />
            <TextInput
              style={styles.input}
              placeholder={
                replyMode
                  ? `Reply to ${replyMode.username}...`
                  : "What do you think of this?"
              }
              placeholderTextColor="#999"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSubmitComment}
              disabled={!newComment.trim()}
              style={styles.sendButton}
            >
              <Ionicons
                name="send"
                size={24}
                color={newComment.trim() ? 'black' : '#ccc'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '40%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'grey',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
  replyText: {
    fontSize: 13,
    color: 'grey',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    padding: 5,
  },
  highlighted: {
    backgroundColor: 'rgba(255, 235, 59, 0.2)', // Yellow tint with transparency
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700', // Gold color
  },
});

export default CommentsBottomSheet;
