import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  FlatList,
  Share,
  KeyboardAvoidingView,
  ScrollView, // Import ScrollView
} from 'react-native';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  User,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

import { FIREBASE_AUTH, FIRESTORE_DB } from '../../firebaseConfig'; // Adjust path if needed

// -------------------------------
// Color Palette
// -------------------------------
const colors = {
  primary: '#ADD8E6',       // Light Blue
  secondary: '#87CEEB',     // Sky Blue
  accent: '#FF7F50',        // Coral
  background: '#F0F8FF',    // Alice Blue
  textPrimary: '#333333',   // Dark Gray
  textSecondary: '#555555', // Gray
  buttonText: '#FFFFFF',    // White
  inputBackground: '#FFFFFF',
  inputBorder: '#ADD8E6',   // Light Blue Border
  deckItemBackground: '#E0F7FA', // Light Aqua
  flashcardBackground: '#E4F1F9', // Very Light Blue
  tempFlashcardBackground: '#E0F7FA', // Light Aqua
};

export default function BlockBlastScreen() {
  const auth = FIREBASE_AUTH;

  // ------------------------------
  // Auth State
  // ------------------------------
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ------------------------------
  // Deck / Flashcards State
  // ------------------------------
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [selectedDeckName, setSelectedDeckName] = useState('');
  const [flashcards, setFlashcards] = useState<any[]>([]);

  // Creating flashcards for an existing deck
  const [newFlashcardQuestion, setNewFlashcardQuestion] = useState('');
  const [newFlashcardAnswer, setNewFlashcardAnswer] = useState('');

  // ------------------------------
  // Creating a New Deck + Flashcards in One Go
  // ------------------------------
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [tempQuestion, setTempQuestion] = useState('');
  const [tempAnswer, setTempAnswer] = useState('');
  const [newFlashcards, setNewFlashcards] = useState<any[]>([]);

  // ------------------------------
  // Listen for Auth changes
  // ------------------------------

  const handleShareDeck = async () => {
    if (!flashcards || flashcards.length === 0) {
      Alert.alert('No Flashcards', 'There are no flashcards in this deck to share!');
      return;
    }

    let message = `Check out my deck: "${selectedDeckName}"\n\n`;
    message += flashcards
      .map((fc, i) => `Flashcard #${i + 1}\nQ: ${fc.question}\nA: ${fc.answer}\n`)
      .join('\n');

    try {
      await Share.share({ message });
    } catch (error) {
      console.log('Error sharing deck:', error);
      Alert.alert('Error', 'Failed to share the deck. Please try again later.');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, [auth]);

  // ------------------------------
  // Login / Signup
  // ------------------------------
  const signIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Input Required', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Input Required', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      Alert.alert('Success!', 'Account created. Check your email if verification is enabled.');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // Logout / Delete Account
  // ------------------------------
  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error: any) {
      Alert.alert('Error Signing Out', error.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    Alert.alert(
      'Delete Account?',
      'Are you sure you want to permanently delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user);
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
            } catch (error: any) {
              Alert.alert('Error', error.message);
              console.log(error);
            }
          },
        },
      ]
    );
  };

  // ------------------------------
  // Fetch Decks
  // ------------------------------
  useEffect(() => {
    if (!user) {
      setDecks([]);
      return;
    }
    const decksRef = collection(FIRESTORE_DB, 'users', user.uid, 'decks');
    const q = query(decksRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedDecks: any[] = [];
      snapshot.forEach((doc) => {
        loadedDecks.push({ id: doc.id, ...doc.data() });
      });
      setDecks(loadedDecks);
    });

    return () => unsubscribe();
  }, [user]);

  // ------------------------------
  // Fetch flashcards if a deck is selected
  // ------------------------------
  useEffect(() => {
    if (!user || !selectedDeckId) {
      setFlashcards([]);
      return;
    }

    const flashcardsRef = collection(
      FIRESTORE_DB,
      'users',
      user.uid,
      'decks',
      selectedDeckId,
      'flashcards'
    );
    const q = query(flashcardsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedCards: any[] = [];
      snapshot.forEach((doc) => {
        loadedCards.push({ id: doc.id, ...doc.data() });
      });
      setFlashcards(loadedCards);
    });

    return () => unsubscribe();
  }, [user, selectedDeckId]);

  // ------------------------------
  // Deck Navigation
  // ------------------------------
  const selectDeck = (deckId: string, deckName: string) => {
    setSelectedDeckId(deckId);
    setSelectedDeckName(deckName);
  };

  const exitDeckView = () => {
    setSelectedDeckId(null);
    setSelectedDeckName('');
    setFlashcards([]);
    setNewFlashcardQuestion('');
    setNewFlashcardAnswer('');
  };

  // ------------------------------
  // Add Flashcard to Existing Deck
  // ------------------------------
  const handleCreateFlashcard = async () => {
    if (!user || !selectedDeckId) return;
    if (!newFlashcardQuestion.trim() || !newFlashcardAnswer.trim()) {
      Alert.alert('Input Required', 'Please enter both question and answer.');
      return;
    }

    try {
      const flashcardsRef = collection(
        FIRESTORE_DB,
        'users',
        user.uid,
        'decks',
        selectedDeckId,
        'flashcards'
      );
      await addDoc(flashcardsRef, {
        question: newFlashcardQuestion.trim(),
        answer: newFlashcardAnswer.trim(),
        createdAt: new Date(),
      });
      setNewFlashcardQuestion('');
      setNewFlashcardAnswer('');
      Alert.alert('Success', 'Flashcard added successfully.');
    } catch (error) {
      console.log('Error creating flashcard:', error);
      Alert.alert('Error', 'Failed to add flashcard. Please try again.');
    }
  };

  // ------------------------------
  // Create a New Deck + Flashcards
  // ------------------------------
  const startCreateDeck = () => {
    setCreatingDeck(true);
    setNewDeckName('');
    setTempQuestion('');
    setTempAnswer('');
    setNewFlashcards([]);
  };

  const handleAddTempFlashcard = () => {
    if (!tempQuestion.trim() || !tempAnswer.trim()) {
      Alert.alert('Input Required', 'Please enter both question and answer.');
      return;
    }

    setNewFlashcards((prev) => [
      ...prev,
      { question: tempQuestion.trim(), answer: tempAnswer.trim() },
    ]);
    setTempQuestion('');
    setTempAnswer('');
  };

  const handleSaveNewDeck = async () => {
    if (!user) return;
    if (!newDeckName.trim()) {
      Alert.alert('Deck Name Required', 'Please provide a title for the deck.');
      return;
    }
    if (newFlashcards.length === 0) {
      Alert.alert('Flashcards Required', 'Please add at least one flashcard.');
      return;
    }

    try {
      // 1. Create the deck doc
      const decksRef = collection(FIRESTORE_DB, 'users', user.uid, 'decks');
      const deckDoc = await addDoc(decksRef, {
        name: newDeckName.trim(),
        createdAt: new Date(),
      });

      // 2. Add each flashcard to the new deck
      const flashcardsPromises = newFlashcards.map((fc) =>
        addDoc(
          collection(FIRESTORE_DB, 'users', user.uid, 'decks', deckDoc.id, 'flashcards'),
          {
            question: fc.question,
            answer: fc.answer,
            createdAt: new Date(),
          }
        )
      );

      await Promise.all(flashcardsPromises);

      setCreatingDeck(false);
      Alert.alert('Deck Created!', 'Your deck and flashcards have been saved.');
    } catch (error) {
      console.log('Error creating deck with flashcards:', error);
      Alert.alert('Error', 'Failed to create deck. Please try again.');
    }
  };

  const handleExitCreateDeck = () => {
    setCreatingDeck(false);
    setNewDeckName('');
    setTempQuestion('');
    setTempAnswer('');
    setNewFlashcards([]);
  };

  // -----------------------------------
  // If user is NOT logged in => show login form
  // -----------------------------------
  if (!user) {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView style={styles.loginFormWrapper} behavior="padding">
          <Text style={styles.loginTitle}>Welcome to Flashmaster!</Text>
          <TextInput
            value={email}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            onChangeText={(text) => setEmail(text)}
          />
          <TextInput
            secureTextEntry={true}
            value={password}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            onChangeText={(text) => setPassword(text)}
          />

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={signIn}>
                <Text style={styles.buttonText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={signUp}>
                <Text style={styles.buttonText}>Create Account</Text>
              </TouchableOpacity>
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    );
  }

  // -----------------------------------
  // If user IS logged in => Main App Interface
  // -----------------------------------
  return (
    <View style={styles.loggedInContainer}>
      {/* ---------- DECK LIST (top) --------- */}
      {!selectedDeckId && !creatingDeck && (
        <>
          <Text style={styles.sectionTitle}>My Decks</Text>
          {decks.length === 0 ? (
            <Text style={styles.noDecksText}>No decks yet. Create one!</Text>
          ) : (
            <FlatList
              data={decks}
              keyExtractor={(item) => item.id}
              style={styles.deckList} // Scrollable deck list
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.deckItem}
                  onPress={() => selectDeck(item.id, item.name)}
                >
                  <Text style={styles.deckItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {/* ---------- DECK SELECTED => Show existing flashcards + add new ---------- */}
      {selectedDeckId && !creatingDeck && (
        <View style={styles.deckSection}>
          <Text style={styles.sectionTitle}>Deck: {selectedDeckName}</Text>

          {/* Flashcards List */}
          <FlatList
            data={flashcards}
            keyExtractor={(item) => item.id}
            style={styles.flashcardsList} // Scrollable flashcards list
            renderItem={({ item }) => (
              <View style={styles.flashcardItem}>
                <Text style={styles.question}>Q: {item.question}</Text>
                <Text style={styles.answer}>A: {item.answer}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.noFlashcardsText}>No flashcards yet.</Text>}
          />

          {/* Create new flashcard */}
          <TextInput
            style={styles.input}
            placeholder="Flashcard Question"
            placeholderTextColor={colors.textSecondary}
            value={newFlashcardQuestion}
            onChangeText={setNewFlashcardQuestion}
          />
          <TextInput
            style={styles.input}
            placeholder="Flashcard Answer"
            placeholderTextColor={colors.textSecondary}
            value={newFlashcardAnswer}
            onChangeText={setNewFlashcardAnswer}
          />
          <TouchableOpacity style={styles.button} onPress={handleCreateFlashcard}>
            <Text style={styles.buttonText}>Add Flashcard</Text>
          </TouchableOpacity>

          {/* Share Deck */}
          <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={handleShareDeck}>
            <Text style={styles.buttonText}>Share This Deck</Text>
          </TouchableOpacity>

          {/* Exit Deck View */}
          <TouchableOpacity style={[styles.button, styles.exitButton]} onPress={exitDeckView}>
            <Text style={styles.buttonText}>Exit Deck</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---------- CREATE DECK FORM ---------- */}
      {creatingDeck && (
        <KeyboardAvoidingView style={styles.createDeckSection} behavior="padding">
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionTitle}>Create a New Deck</Text>

            {/* Deck Title */}
            <TextInput
              style={styles.input}
              placeholder="Enter Deck Title"
              placeholderTextColor={colors.textSecondary}
              value={newDeckName}
              onChangeText={setNewDeckName}
            />

            {/* Add flashcards in memory */}
            <Text style={styles.subSectionTitle}>Add a Flashcard</Text>
            <TextInput
              style={styles.input}
              placeholder="Question"
              placeholderTextColor={colors.textSecondary}
              value={tempQuestion}
              onChangeText={setTempQuestion}
            />
            <TextInput
              style={styles.input}
              placeholder="Answer"
              placeholderTextColor={colors.textSecondary}
              value={tempAnswer}
              onChangeText={setTempAnswer}
            />
            <TouchableOpacity style={styles.button} onPress={handleAddTempFlashcard}>
              <Text style={styles.buttonText}>Add Flashcard</Text>
            </TouchableOpacity>

            {/* List of new flashcards */}
            {newFlashcards.length > 0 && (
              <View style={styles.newFlashcardsContainer}>
                <Text style={styles.subSectionTitle}>Flashcards to be Added:</Text>
                {newFlashcards.map((fc, idx) => (
                  <View key={idx} style={styles.tempFlashcardPreview}>
                    <Text style={styles.question}>Q: {fc.question}</Text>
                    <Text style={styles.answer}>A: {fc.answer}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Save / Exit buttons */}
            <TouchableOpacity style={styles.button} onPress={handleSaveNewDeck}>
              <Text style={styles.buttonText}>Save Deck</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleExitCreateDeck}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ---------- BOTTOM BUTTONS (only if not viewing/creating deck) ---------- */}
      {!selectedDeckId && !creatingDeck && (
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity style={styles.button} onPress={startCreateDeck}>
            <Text style={styles.buttonText}>Create Deck</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteAccount}>
            <Text style={styles.buttonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Spacer */}
      <View style={{ height: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  // ----- Logged out -----
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loginFormWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 30,
  },

  // ----- Logged in -----
  loggedInContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50, // Increased from 20 to 50 to move everything down
    paddingHorizontal: 16,
  },
  input: {
    marginVertical: 8,
    height: 50,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.inputBackground,
    fontSize: 16,
    color: colors.textPrimary,
  },

  // Sections
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10, // Added marginTop
    marginBottom: 20, // Increased from 12 to 20
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: colors.textPrimary,
  },
  noDecksText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  noFlashcardsText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },

  // Deck list
  deckList: {
    maxHeight: 260,
    marginTop: 10, // Added marginTop
    marginBottom: 30, // Increased from 20 to 30
    backgroundColor: '#a5cef0',
    borderRadius: 20,
    padding: 10
  },
  deckItem: {
    padding: 16,
    marginVertical: 6,
    backgroundColor: colors.deckItemBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  deckItemText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  // Deck detail
  deckSection: {
    flex: 1,
  },
  flashcardsList: {
    maxHeight: 250, // Adjust as needed
    marginBottom: 12,
  },
  flashcardItem: {
    padding: 12,
    backgroundColor: colors.flashcardBackground,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  answer: {
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 4,
    color: colors.accent,
  },

  // Create deck form
  createDeckSection: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20, // Ensure there's space at the bottom
  },
  tempFlashcardPreview: {
    backgroundColor: colors.tempFlashcardBackground,
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  newFlashcardsContainer: {
    marginTop: 16,
  },

  // Buttons
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  shareButton: {
    backgroundColor: colors.accent,
  },
  exitButton: {
    backgroundColor: '#FF6347', // Tomato Red for Exit
  },
  cancelButton: {
    backgroundColor: '#FF6347', // Tomato Red for Cancel
  },
  logoutButton: {
    backgroundColor: '#FFA07A', // Light Salmon for Logout
  },
  deleteButton: {
    backgroundColor: '#DC143C', // Crimson for Delete Account
  },

  // Bottom Buttons
  bottomButtonsContainer: {
    marginTop: 20, // Adjusted for better spacing
  },
});
