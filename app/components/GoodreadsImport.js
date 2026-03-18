import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Linking, Switch, Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import axios from 'axios';
import { ref, push, set } from 'firebase/database';
import { database } from '../../firebaseConfig';

// ─── CSV parser (handles RFC 4180 quoted fields) ────────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseGoodreadsCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const idx = name => headers.indexOf(name);

  const titleIdx = idx('Title');
  const authorIdx = idx('Author');
  const ratingIdx = idx('My Rating');
  const isbn13Idx = idx('ISBN13');
  const isbnIdx = idx('ISBN');
  const avgRatingIdx = idx('Average Rating');
  const bookIdIdx = idx('Book Id');
  const reviewIdx = idx('My Review');

  const books = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const title = fields[titleIdx]?.trim();
    const author = fields[authorIdx]?.trim();
    if (!title) continue;

    const myRating = parseInt(fields[ratingIdx] || '0', 10);
    const avgRating = parseFloat(fields[avgRatingIdx] || '0');
    const isbn13 = fields[isbn13Idx]?.replace(/[^0-9X]/gi, '') || '';
    const isbn = fields[isbnIdx]?.replace(/[^0-9X]/gi, '') || '';
    const goodreadsId = fields[bookIdIdx]?.trim() || String(i);
    const review = reviewIdx >= 0 ? (fields[reviewIdx]?.trim() || '') : '';

    let bucket;
    if (myRating >= 4) bucket = 'like';
    else if (myRating === 3) bucket = 'neutral';
    else if (myRating >= 1) bucket = 'dislike';
    else bucket = 'later';

    books.push({ title, author, review, myRating, avgRating, isbn13, isbn, goodreadsId, bucket, image: null });
  }

  // Sort by myRating desc, then avgRating desc
  books.sort((a, b) => b.myRating - a.myRating || b.avgRating - a.avgRating);
  return books;
}

// ─── Flat-list helpers for combined drag-across-buckets reorder ──────────────
const BUCKET_SECTIONS = [
  { key: 'like',    title: 'Liked (4–5 ★)',   color: '#4CAF50' },
  { key: 'neutral', title: 'Neutral (3 ★)',    color: '#FF9800' },
  { key: 'dislike', title: 'Disliked (1–2 ★)', color: '#f44336' },
  { key: 'later',   title: 'Later (unrated)',   color: '#aaa' },
];

function buildFlatData(liked, neutral, disliked, later) {
  const bucketMap = { like: liked, neutral: neutral, dislike: disliked, later: later };
  const result = [];
  for (const sec of BUCKET_SECTIONS) {
    const books = bucketMap[sec.key];
    // Always show rated-bucket headers so users can drag books into empty buckets
    if (sec.key === 'later' && books.length === 0) continue;
    result.push({ type: 'header', id: `h_${sec.key}`, bucket: sec.key, title: sec.title, color: sec.color });
    for (const book of books) {
      result.push({ type: 'book', id: `book_${book.goodreadsId}`, ...book });
    }
  }
  return result;
}

function reconstructFromFlat(data) {
  const buckets = { like: [], neutral: [], dislike: [], later: [] };
  let currentBucket = 'like';
  for (const item of data) {
    if (item.type === 'header') {
      currentBucket = item.bucket;
    } else {
      const { type, id, ...book } = item;
      buckets[currentBucket].push({ ...book, bucket: currentBucket });
    }
  }
  return buckets;
}

// ─── Score calculation (mirrors addElementAndRecalculate in Add.js) ──────────
function calculateScores(booksByBucket) {
  const minMaxMap = { like: [10.0, 6.7], neutral: [6.6, 3.3], dislike: [3.2, 0.0] };
  const result = [];

  for (const [bucketName, range] of Object.entries(minMaxMap)) {
    const arr = booksByBucket[bucketName] || [];
    const n = arr.length;
    if (n === 0) continue;
    const isLike = bucketName === 'like' ? 0 : 1;
    const step = (range[0] - range[1]) / (n + isLike);
    arr.forEach((book, i) => {
      result.push({ ...book, score: parseFloat((range[0] - step * (i + isLike)).toFixed(2)) });
    });
  }

  for (const book of (booksByBucket.later || [])) {
    result.push({ ...book, score: -1 });
  }

  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────
const GoodreadsImport = ({ onBackPress, userKey }) => {
  const [importStep, setImportStep] = useState('instructions');
  const [parsedBooks, setParsedBooks] = useState([]);
  const [includeUnrated, setIncludeUnrated] = useState(false);
  const [categoryName, setCategoryName] = useState('Books');
  const [fetchingCovers, setFetchingCovers] = useState(false);

  // Per-bucket ordered lists for the reorder step
  const [likedBooks, setLikedBooks] = useState([]);
  const [neutralBooks, setNeutralBooks] = useState([]);
  const [dislikedBooks, setDislikedBooks] = useState([]);
  const [laterBooks, setLaterBooks] = useState([]);
  const [flatData, setFlatData] = useState([]);

  // ── Step 1: pick & parse CSV ─────────────────────────────────────────────
  const pickAndParseCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const text = await FileSystem.readAsStringAsync(uri);
      const books = parseGoodreadsCSV(text);

      if (books.length === 0) {
        alert('No books found in the CSV. Make sure you exported from Goodreads.');
        return;
      }

      setParsedBooks(books);
      setImportStep('reviewing');
    } catch (err) {
      console.error('CSV pick error:', err);
      alert('Could not read the file. Please try again.');
    }
  };

  // ── Step 2: proceed to reorder, fetching covers first ───────────────────
  const fetchCover = async (book) => {
    const isbn = book.isbn13 || book.isbn;

    // 1. Open Library by ISBN (very comprehensive, no API key)
    if (isbn) {
      try {
        const olUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
        const check = await axios.head(`${olUrl}?default=false`);
        if (check.status === 200) return olUrl;
      } catch {}
    }

    // 2. Google Books by ISBN
    if (isbn) {
      try {
        const res = await axios.get(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
        );
        const thumb = res.data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
        if (thumb) return thumb.replace('http://', 'https://');
      } catch {}
    }

    // 3. Google Books title+author search (catches books with no ISBN in CSV)
    try {
      const q = encodeURIComponent(`intitle:${book.title} inauthor:${book.author}`);
      const res = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`
      );
      const thumb = res.data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
      if (thumb) return thumb.replace('http://', 'https://');
    } catch {}

    return null;
  };

  const proceedToReorder = async () => {
    setFetchingCovers(true);

    const rated = parsedBooks.filter(b => b.myRating > 0);
    const unrated = includeUnrated ? parsedBooks.filter(b => b.myRating === 0) : [];
    const allBooks = [...rated, ...unrated];

    // Fetch covers in batches of 5
    const withCovers = [...allBooks];
    const batchSize = 5;
    for (let i = 0; i < withCovers.length; i += batchSize) {
      await Promise.all(withCovers.slice(i, i + batchSize).map(async (book, batchIdx) => {
        const img = await fetchCover(book);
        if (img) {
          withCovers[i + batchIdx] = { ...book, image: img };
        }
      }));
      if (i + batchSize < withCovers.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const liked    = withCovers.filter(b => b.bucket === 'like');
    const neutral  = withCovers.filter(b => b.bucket === 'neutral');
    const disliked = withCovers.filter(b => b.bucket === 'dislike');
    const later    = withCovers.filter(b => b.bucket === 'later');

    setLikedBooks(liked);
    setNeutralBooks(neutral);
    setDislikedBooks(disliked);
    setLaterBooks(later);
    setFlatData(buildFlatData(liked, neutral, disliked, later));

    setFetchingCovers(false);
    setImportStep('reorder');
  };

  // ── Step 3: save to Firebase ─────────────────────────────────────────────
  const bulkSaveToFirebase = async () => {
    setImportStep('saving');
    try {
      const booksByBucket = {
        like: likedBooks,
        neutral: neutralBooks,
        dislike: dislikedBooks,
        later: laterBooks,
      };
      const scoredBooks = calculateScores(booksByBucket);
      const totalBooks = scoredBooks.length;

      const coverBook = likedBooks.find(b => b.image) || neutralBooks.find(b => b.image);

      const catRef = push(ref(database, 'categories'));
      await set(catRef, {
        category_name: categoryName,
        category_type: 'Books',
        user_id: userKey,
        num_items: totalBooks,
        latest_add: Date.now(),
        imageUri: coverBook?.image || '',
        presetImage: false,
        user_set_image: false,
        list_num: 0,
        category_description: '',
      });

      for (const book of scoredBooks) {
        const description = book.review ? `${book.author}\n\n${book.review}` : book.author;
        const itemRef = push(ref(database, 'items'));
        await set(itemRef, {
          bucket: book.bucket,
          score: book.score,
          content: book.title,
          description,
          image: book.image || '',
          images: book.image ? [book.image] : [],
          category_id: catRef.key,
          category_name: categoryName,
          user_id: userKey,
          timestamp: Date.now(),
          id: 'Books' + book.goodreadsId,
          isbn: book.isbn13 || book.isbn || '',
          custom: book.review ? true : false,
          trackUri: null,
          artist: null,
          content_description: `${book.title} ${book.author}`,
        });
      }

      setImportStep('done');
    } catch (err) {
      console.error('Import save error:', err);
      alert('Error saving to database. Please try again.');
      setImportStep('reorder');
    }
  };

  // ── Counts ────────────────────────────────────────────────────────────────
  const ratedCount = parsedBooks.filter(b => b.myRating > 0).length;
  const likedCount = parsedBooks.filter(b => b.bucket === 'like').length;
  const neutralCount = parsedBooks.filter(b => b.bucket === 'neutral').length;
  const dislikedCount = parsedBooks.filter(b => b.bucket === 'dislike').length;
  const unratedCount = parsedBooks.filter(b => b.myRating === 0).length;
  const totalImporting = ratedCount + (includeUnrated ? unratedCount : 0);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (importStep === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBackPress} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import from Goodreads</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>How to export your Goodreads library:</Text>

          {[
            'Go to goodreads.com and sign in',
            'Click "My Books" in the top navigation',
            'Scroll down to find "Import and Export"',
            'Click "Export Library" and wait for the file to download',
            'Come back here and tap "Select CSV File" below',
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => Linking.openURL('https://www.goodreads.com/review/import')}
          >
            <MaterialIcons name="open-in-new" size={18} color="#333" />
            <Text style={styles.secondaryBtnText}>Open Goodreads Export Page</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={pickAndParseCSV}>
            <Ionicons name="document-attach" size={20} color="white" />
            <Text style={styles.primaryBtnText}>Select CSV File</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (importStep === 'reviewing') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setImportStep('instructions')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Import</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.foundText}>Found {parsedBooks.length} books in your library</Text>

          <View style={styles.bucketSummary}>
            <BucketChip color="#4CAF50" label={`${likedCount} Liked`} sub="4–5 ★" />
            <BucketChip color="#FF9800" label={`${neutralCount} Neutral`} sub="3 ★" />
            <BucketChip color="#f44336" label={`${dislikedCount} Disliked`} sub="1–2 ★" />
          </View>

          {unratedCount > 0 && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Include {unratedCount} unrated books (add to Later)</Text>
              <Switch value={includeUnrated} onValueChange={setIncludeUnrated} />
            </View>
          )}

          <Text style={styles.label}>Category name</Text>
          <TextInput
            style={styles.textInput}
            value={categoryName}
            onChangeText={setCategoryName}
            placeholder="e.g. Books, My Reading List"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.importingCount}>
            Importing {totalImporting} book{totalImporting !== 1 ? 's' : ''}
          </Text>

          {fetchingCovers ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="black" />
              <Text style={styles.loadingText}>Fetching book covers…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, totalImporting === 0 && styles.disabledBtn]}
              onPress={proceedToReorder}
              disabled={totalImporting === 0}
            >
              <Text style={styles.primaryBtnText}>Next: Arrange Books →</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  if (importStep === 'reorder') {
    const totalCount = likedBooks.length + neutralBooks.length + dislikedBooks.length + laterBooks.length;

    const handleDragEnd = ({ data }) => {
      const buckets = reconstructFromFlat(data);
      setLikedBooks(buckets.like);
      setNeutralBooks(buckets.neutral);
      setDislikedBooks(buckets.dislike);
      setLaterBooks(buckets.later);
      setFlatData(buildFlatData(buckets.like, buckets.neutral, buckets.dislike, buckets.later));
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setImportStep('reviewing')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arrange Books</Text>
        </View>

        <Text style={styles.reorderHint}>Hold ≡ and drag to reorder or move between categories.</Text>

        <DraggableFlatList
          data={flatData}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item, drag, isActive }) => {
            if (item.type === 'header') {
              return (
                <View style={[styles.sectionHeader, { borderLeftColor: item.color }]}>
                  <Text style={[styles.sectionHeaderText, { color: item.color }]}>{item.title}</Text>
                </View>
              );
            }
            return (
              <ScaleDecorator>
                <View style={[styles.bookRow, isActive && styles.bookRowActive]}>
                  <BookRowContent book={item} />
                  <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
                    <Ionicons name="reorder-three" size={24} color="#bbb" />
                  </TouchableOpacity>
                </View>
              </ScaleDecorator>
            );
          }}
        />

        <View style={styles.importBtnContainer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={bulkSaveToFirebase}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.primaryBtnText}>Import {totalCount} Books</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (importStep === 'saving') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="black" />
        <Text style={styles.savingText}>Importing your books…</Text>
      </View>
    );
  }

  if (importStep === 'done') {
    const total = likedBooks.length + neutralBooks.length + dislikedBooks.length + laterBooks.length;
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
        <Text style={styles.doneTitle}>Import complete!</Text>
        <Text style={styles.doneSubtitle}>{total} books added to "{categoryName}"</Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 32 }]} onPress={onBackPress}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

// ─── Sub-components ──────────────────────────────────────────────────────────
const BucketChip = ({ color, label, sub }) => (
  <View style={[styles.bucketChip, { borderColor: color }]}>
    <Text style={[styles.bucketChipLabel, { color }]}>{label}</Text>
    <Text style={styles.bucketChipSub}>{sub}</Text>
  </View>
);



const BookRowContent = ({ book }) => (
  <>
    {book.image ? (
      <Image source={{ uri: book.image }} style={styles.bookCover} />
    ) : (
      <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
        <Ionicons name="book-outline" size={24} color="#aaa" />
      </View>
    )}
    <View style={styles.bookInfo}>
      <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
      {book.myRating > 0 && (
        <Text style={styles.bookRating}>{'★'.repeat(book.myRating)}{'☆'.repeat(5 - book.myRating)}</Text>
      )}
    </View>
  </>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: 'black',
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1,
  },
  stepNumText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  stepText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row', backgroundColor: 'black', paddingVertical: 14,
    paddingHorizontal: 24, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', marginTop: 20, gap: 8,
  },
  primaryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { backgroundColor: '#aaa' },
  secondaryBtn: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: '#333', paddingVertical: 12,
    paddingHorizontal: 20, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', marginTop: 20, gap: 8,
  },
  secondaryBtnText: { color: '#333', fontWeight: '600', fontSize: 15 },
  foundText: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  bucketSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  bucketChip: {
    flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 10,
    alignItems: 'center', marginHorizontal: 4,
  },
  bucketChipLabel: { fontWeight: 'bold', fontSize: 13 },
  bucketChipSub: { color: '#888', fontSize: 11, marginTop: 2 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f5f5f5', padding: 14, borderRadius: 10, marginBottom: 16,
  },
  toggleLabel: { flex: 1, fontSize: 14, color: '#333', marginRight: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  textInput: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
  },
  importingCount: { fontSize: 14, color: '#666', marginTop: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
  loadingText: { color: '#555', fontSize: 14 },
  reorderHint: { fontSize: 13, color: '#888', paddingHorizontal: 16, paddingVertical: 8 },
  sectionHeader: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fafafa',
    borderLeftWidth: 4, borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '700' },
  bookRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  bookRowActive: { backgroundColor: '#f5f5f5', opacity: 0.9 },
  bookCover: { width: 44, height: 60, borderRadius: 4, backgroundColor: '#f0f0f0' },
  bookCoverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  bookInfo: { flex: 1, marginLeft: 12 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  bookAuthor: { fontSize: 12, color: '#666', marginTop: 2 },
  bookRating: { fontSize: 12, color: '#F5A623', marginTop: 2 },
  dragHandle: { marginLeft: 8, padding: 8 },
  importBtnContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: 16,
    borderTopWidth: 0.5, borderTopColor: '#eee',
  },
  savingText: { marginTop: 16, fontSize: 16, color: '#555' },
  doneTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  doneSubtitle: { fontSize: 15, color: '#555', marginTop: 8, textAlign: 'center' },
});

export default GoodreadsImport;
