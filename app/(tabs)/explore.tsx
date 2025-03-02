import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { FIRESTORE_DB, FIREBASE_AUTH } from '/Users/ananyagorti/FlashMaster/firebaseConfig.js';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';

// -------------------------------
// Types
// -------------------------------
type Flashcard = {
  id: string;
  question: string;
  answer: string;
};

type Deck = {
  id: string;
  name: string;
};

// Define colors first
const colors = {
  primary: '#ADD8E6',      // Light Blue
  secondary: '#87CEEB',    // Sky Blue
  accent: '#FF7F50',       // Coral
  background: '#F0F8FF',   // Alice Blue
  textPrimary: '#333333',  // Dark Gray
  textSecondary: '#555555',// Gray
  buttonText: '#FFFFFF',   // White
};

// -----------------------------------------------------------
// ProgressBar Component
// -----------------------------------------------------------
const ProgressBar: React.FC<{ progress: number; total: number }> = ({ progress, total }) => {
  const percentage = total === 0 ? 0 : (progress / total) * 100;
  return (
    <View style={progressBarStyles.container}>
      <View style={[progressBarStyles.filler, { width: `${percentage}%` }]} />
      <View style={progressBarStyles.remaining} />
      <Text style={progressBarStyles.percentageText}>{`${Math.round(percentage)}%`}</Text>
    </View>
  );
};

const progressBarStyles = StyleSheet.create({
  container: {
    height: 20,
    width: '100%',
    backgroundColor: '#e0e0de',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  filler: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 10,
  },
  remaining: {
    flex: 1,
    height: '100%',
  },
  percentageText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
  },
});

// -----------------------------------------------------------
// DotsAndBoxes Component
// -----------------------------------------------------------
type DotsAndBoxesProps = {
  allowUserMove: boolean;               // Whether the user can tap lines right now
  onGameEnd: (result: string) => void;  // Callback once the game is over
  onUserTurnEnd: (userCanContinue: boolean) => void; 
  onExit: () => void;                   // Prop for exiting the game
};

function getInitialLines() {
  return {
    horizontal: Array(4).fill(null).map(() => Array(3).fill(null)),
    vertical:   Array(3).fill(null).map(() => Array(4).fill(null)),
  };
}

function getInitialBoxes() {
  // 3x3 boxes, each is null (unclaimed) or 'A'/'B'
  return Array(3).fill(null).map(() => Array(3).fill(null));
}

const DotsAndBoxes: React.FC<DotsAndBoxesProps> = ({
  allowUserMove,
  onGameEnd,
  onUserTurnEnd,
  onExit,
}) => {
  const [currentPlayer, setCurrentPlayer] = useState<'A' | 'B'>('A'); // A=human, B=AI
  const [lines, setLines] = useState(getInitialLines());
  const [boxes, setBoxes] = useState(getInitialBoxes());
  const [gameEnded, setGameEnded] = useState(false); // track game completion

  const isGameOver = boxes.flat().every((b) => b !== null);
  const scoreA = boxes.flat().filter((b) => b === 'A').length;
  const scoreB = boxes.flat().filter((b) => b === 'B').length;

  // Reset board and game state
  const resetGame = () => {
    setLines(getInitialLines());
    setBoxes(getInitialBoxes());
    setCurrentPlayer('A');
    setGameEnded(false);
  };

  // Check if newly-drawn lines complete any boxes
  const checkAndClaimBoxes = (
    updatedLines: typeof lines,
    drawingPlayer: 'A' | 'B'
  ) => {
    let claimedAnyBox = false;
    const newBoxes = boxes.map((row) => [...row]);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (newBoxes[r][c] === null) {
          const top = updatedLines.horizontal[r][c] !== null;
          const bottom = updatedLines.horizontal[r + 1][c] !== null;
          const left = updatedLines.vertical[r][c] !== null;
          const right = updatedLines.vertical[r][c + 1] !== null;

          if (top && bottom && left && right) {
            newBoxes[r][c] = drawingPlayer;
            claimedAnyBox = true;
          }
        }
      }
    }

    if (claimedAnyBox) {
      setBoxes(newBoxes);
    }
    return claimedAnyBox;
  };

  // Handle user moves for horizontal lines
  const handleHorizontalLinePress = (row: number, col: number) => {
    if (!allowUserMove || currentPlayer !== 'A' || gameEnded) return;
    if (lines.horizontal[row][col] !== null) return;

    const updatedLines = {
      horizontal: lines.horizontal.map((rowData, rIndex) =>
        rIndex === row
          ? rowData.map((val, cIndex) => (cIndex === col ? 'A' : val))
          : [...rowData]
      ),
      vertical: lines.vertical.map((v) => [...v]),
    };

    setLines(updatedLines);

    const claimedAnyBox = checkAndClaimBoxes(updatedLines, 'A');
    if (!claimedAnyBox) {
      setCurrentPlayer('B');
      onUserTurnEnd(false);
    }
  };

  // Handle user moves for vertical lines
  const handleVerticalLinePress = (row: number, col: number) => {
    if (!allowUserMove || currentPlayer !== 'A' || gameEnded) return;
    if (lines.vertical[row][col] !== null) return;

    const updatedLines = {
      horizontal: lines.horizontal.map((h) => [...h]),
      vertical: lines.vertical.map((rowData, rIndex) =>
        rIndex === row
          ? rowData.map((val, cIndex) => (cIndex === col ? 'A' : val))
          : [...rowData]
      ),
    };

    setLines(updatedLines);

    const claimedAnyBox = checkAndClaimBoxes(updatedLines, 'A');
    if (!claimedAnyBox) {
      setCurrentPlayer('B');
      onUserTurnEnd(false);
    }
  };

  // AI move
  const aiMove = () => {
    if (gameEnded || isGameOver || currentPlayer !== 'B') return;
    const availableEdges: { type: 'horizontal' | 'vertical'; row: number; col: number; }[] = [];

    lines.horizontal.forEach((rowData, r) => {
      rowData.forEach((owner, c) => {
        if (owner === null) {
          availableEdges.push({ type: 'horizontal', row: r, col: c });
        }
      });
    });
    lines.vertical.forEach((rowData, r) => {
      rowData.forEach((owner, c) => {
        if (owner === null) {
          availableEdges.push({ type: 'vertical', row: r, col: c });
        }
      });
    });

    if (availableEdges.length === 0) return;
    const choice = availableEdges[Math.floor(Math.random() * availableEdges.length)];

    const updatedLines = {
      horizontal: lines.horizontal.map((rd) => [...rd]),
      vertical: lines.vertical.map((rd) => [...rd]),
    };

    if (choice.type === 'horizontal') {
      updatedLines.horizontal[choice.row][choice.col] = 'B';
    } else {
      updatedLines.vertical[choice.row][choice.col] = 'B';
    }

    setLines(updatedLines);

    const claimedAnyBox = checkAndClaimBoxes(updatedLines, 'B');
    if (claimedAnyBox && !isGameOver) {
      setTimeout(aiMove, 300);
    } else {
      setCurrentPlayer('A');
    }
  };

  useEffect(() => {
    if (currentPlayer === 'B' && !isGameOver && !gameEnded) {
      const timer = setTimeout(aiMove, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, isGameOver, gameEnded]);

  // Handle game completion
  useEffect(() => {
    if (isGameOver && !gameEnded) {
      setGameEnded(true);
      let result: string;
      if (scoreA > scoreB) {
        result = 'You Win!';
      } else if (scoreB > scoreA) {
        result = 'AI Wins!';
      } else {
        result = 'Tie!';
      }
      onGameEnd(result);
    }
  }, [isGameOver, scoreA, scoreB, gameEnded, onGameEnd]);

  // Render the Dots & Boxes board
  const renderBoard = () => {
    const rowsRendered = [];
    for (let r = 0; r < 4; r++) {
      const dotRow = [];
      for (let c = 0; c < 3; c++) {
        dotRow.push(<View key={`dot-${r}-${c}`} style={dotsStyles.dot} />);
        const hOwner = lines.horizontal[r][c];
        dotRow.push(
          <TouchableOpacity
            key={`h-line-${r}-${c}`}
            style={[
              dotsStyles.horizontalLine,
              hOwner === 'A'
                ? { backgroundColor: colors.primary }
                : hOwner === 'B'
                ? { backgroundColor: colors.accent }
                : {},
            ]}
            onPress={() => handleHorizontalLinePress(r, c)}
          >
            <Text> </Text>
          </TouchableOpacity>
        );
      }
      dotRow.push(<View key={`dot-${r}-last`} style={dotsStyles.dot} />);
      rowsRendered.push(
        <View key={`row-dots-${r}`} style={dotsStyles.row}>
          {dotRow}
        </View>
      );

      if (r < 3) {
        const middleRow = [];
        for (let c = 0; c < 4; c++) {
          const vOwner = lines.vertical[r][c];
          middleRow.push(
            <TouchableOpacity
              key={`v-line-${r}-${c}`}
              style={[
                dotsStyles.verticalLine,
                vOwner === 'A'
                  ? { backgroundColor: colors.primary }
                  : vOwner === 'B'
                  ? { backgroundColor: colors.accent }
                  : {},
              ]}
              onPress={() => handleVerticalLinePress(r, c)}
            >
              <Text> </Text>
            </TouchableOpacity>
          );
          if (c < 3) {
            const boxOwner = boxes[r][c];
            const boxStyle = {
              backgroundColor:
                boxOwner === 'A'
                  ? 'rgba(0,123,255,0.3)' // Light Blue with opacity
                  : boxOwner === 'B'
                  ? 'rgba(220,53,69,0.3)' // Light Red with opacity
                  : 'transparent',
            };
            middleRow.push(
              <View key={`box-${r}-${c}`} style={[dotsStyles.box, boxStyle]} />
            );
          }
        }
        rowsRendered.push(
          <View key={`row-vertical-${r}`} style={dotsStyles.row}>
            {middleRow}
          </View>
        );
      }
    }
    return rowsRendered;
  };

  return (
    <View style={dotsStyles.container}>
      <View style={dotsStyles.headerRow}>
        <Text style={dotsStyles.title}>3x3 Dots and Boxes</Text>
        <TouchableOpacity
          style={dotsStyles.exitButton}
          onPress={() => onExit()}
          accessibilityLabel="Exit Game and return to main menu"
        >
          <Text style={dotsStyles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {!isGameOver ? (
        <Text style={dotsStyles.info}>
          Current Player: {currentPlayer === 'A' ? 'You (Blue)' : 'AI (Red)'}
        </Text>
      ) : (
        <Text style={dotsStyles.info}>Game Over!</Text>
      )}

      <View style={dotsStyles.boardContainer}>{renderBoard()}</View>

      <View style={dotsStyles.scoreContainer}>
        <Text style={dotsStyles.score}>
          Player A (Blue): {scoreA} | Player B (Red): {scoreB}
        </Text>
      </View>
    </View>
  );
};

// -----------------------------------------------------------
// Main App Component
// -----------------------------------------------------------
export default function BlockBlast() {
  const [screen, setScreen] = useState<'home' | 'createDeck' | 'flashcard'>('home');
  const auth = FIREBASE_AUTH;

  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  // Flashcard gameplay:
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcard, setCurrentFlashcard] = useState<Flashcard | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [allowUserMove, setAllowUserMove] = useState<boolean>(false);
  const [isFetchingFlashcards, setIsFetchingFlashcards] = useState<boolean>(false);

  // Additional State Variables for New Features
  const [totalFlashcards, setTotalFlashcards] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);

  // Deck creation
  const [newDeckName, setNewDeckName] = useState<string>('');
  const [newFlashcards, setNewFlashcards] = useState<Flashcard[]>([]);
  const [tempQuestion, setTempQuestion] = useState<string>('');
  const [tempAnswer, setTempAnswer] = useState<string>('');
  const [isSavingDeck, setIsSavingDeck] = useState<boolean>(false);

  // Key to reset DotsAndBoxes component
  const [dotsAndBoxesKey, setDotsAndBoxesKey] = useState<number>(0);

  // Collapsible "How to Play" for the home screen
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  // -------------------------------
  // Listen for auth changes
  // -------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, [auth]);

  // -------------------------------
  // Fetch decks from Firestore if user is logged in
  // -------------------------------
  useEffect(() => {
    if (!user) {
      setDecks([]);
      return;
    }
    const decksRef = collection(FIRESTORE_DB, 'users', user.uid, 'decks');
    const q = query(decksRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedDecks: Deck[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedDecks.push({
          id: docSnap.id,
          name: data.name ?? 'Untitled Deck',
        });
      });
      setDecks(loadedDecks);
    });

    return () => unsubscribe();
  }, [user]);

  // If not logged in, show "Please log in!"
  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loginText}>Please log in to access the games!</Text>
      </View>
    );
  }

  // ===============================
  // Navigation Functions
  // ===============================
  const goHome = () => setScreen('home');

  const createNewDeckScreen = () => {
    setNewDeckName('');
    setNewFlashcards([]);
    setTempQuestion('');
    setTempAnswer('');
    setScreen('createDeck');
  };

  // Start the “flashcard + game” screen
  const startFlashcardGame = (deck: Deck) => {
    setSelectedDeck(deck);
    fetchFlashcards(deck.id);
    setCorrectAnswers(0); // Reset correct answers
    setScreen('flashcard');
  };

  // -------------------------------
  // Deck Creation: Save to Firestore
  // -------------------------------
  const saveNewDeckToFirestore = async () => {
    if (!newDeckName.trim()) {
      Alert.alert('Error', 'Please enter a deck name.');
      return;
    }
    if (newFlashcards.length === 0) {
      Alert.alert('Error', 'Please add at least one flashcard.');
      return;
    }
    try {
      setIsSavingDeck(true);
      const deckData = {
        name: newDeckName.trim(),
        createdAt: Timestamp.now(),
      };
      const deckRef = await addDoc(collection(FIRESTORE_DB, 'users', user.uid, 'decks'), deckData);

      // Now, add flashcards to the 'flashcards' subcollection
      const flashcardsRef = collection(FIRESTORE_DB, 'users', user.uid, 'decks', deckRef.id, 'flashcards');
      for (const flashcard of newFlashcards) {
        await addDoc(flashcardsRef, {
          question: flashcard.question,
          answer: flashcard.answer,
          createdAt: Timestamp.now(),
        });
      }

      Alert.alert('Success', 'New deck and flashcards saved to Firestore!');
      goHome();
    } catch (error) {
      console.log('Error saving deck to Firestore:', error);
      Alert.alert('Error', 'Could not save deck to Firestore.');
    } finally {
      setIsSavingDeck(false);
    }
  };

  // -------------------------------
  // Fetch Flashcards from Subcollection
  // -------------------------------
  const fetchFlashcards = (deckId: string) => {
    setIsFetchingFlashcards(true);
    const flashcardsRef = collection(FIRESTORE_DB, 'users', user.uid, 'decks', deckId, 'flashcards');
    const q = query(flashcardsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedCards: Flashcard[] = [];
      snapshot.forEach((doc) => {
        loadedCards.push({ id: doc.id, ...doc.data() } as Flashcard);
      });
      setFlashcards(loadedCards);
      setTotalFlashcards(loadedCards.length); // Set total flashcards
      if (loadedCards.length > 0) {
        setCurrentFlashcardIndex(0);
        setCurrentFlashcard(loadedCards[0]); // Start with the first flashcard
      } else {
        setCurrentFlashcard(null);
      }
      setIsFetchingFlashcards(false);
    });

    // Cleanup subscription on unmount or deck change
    return () => unsubscribe();
  };

  // -------------------------------
  // FLASHCARD HELPERS
  // -------------------------------
  function checkFlashcardAnswer() {
    if (!currentFlashcard) return;

    const correct =
      userAnswer.trim().toLowerCase() ===
      currentFlashcard.answer.trim().toLowerCase();

    if (correct) {
      setCorrectAnswers((prev) => prev + 1); // Increment correct answers
      Alert.alert('Correct!', "You got the question right—moving to the next flashcard.", [
        {
          text: 'OK',
          onPress: () => {
            advanceToNextFlashcard();
          },
        },
      ]);
    } else {
      Alert.alert('Incorrect!', 'Please try answering again.');
      setAllowUserMove(false);
    }
    setUserAnswer('');
  }

  // Advance to the next flashcard
  const advanceToNextFlashcard = () => {
    if (currentFlashcardIndex + 1 < flashcards.length) {
      const nextIndex = currentFlashcardIndex + 1;
      setCurrentFlashcardIndex(nextIndex);
      setCurrentFlashcard(flashcards[nextIndex]);
      setAllowUserMove(true); // Allow user to make a move in the game
    } else {
      // Reset to first card (or you could handle "end of deck" differently)
      setCurrentFlashcardIndex(0);
      setCurrentFlashcard(flashcards[0]);
      setCorrectAnswers(0);
      setAllowUserMove(true);
    }
  };

  // Restart the deck
  const restartDeck = () => {
    setCurrentFlashcardIndex(0);
    setCorrectAnswers(0);
    setUserAnswer('');
    setAllowUserMove(true);
    setDotsAndBoxesKey((prev) => prev + 1); // Reset DotsAndBoxes
    if (selectedDeck) {
      fetchFlashcards(selectedDeck.id);
      setCurrentFlashcard(flashcards[0] || null);
    }
  };

  // -------------------------------
  // Once the DotsAndBoxes game ends
  // -------------------------------
  function handleGameEnd(result: string) {
    if (result === 'Exited the game.') {
      // Navigate back to Home screen
      setScreen('home');
    } else if (result === 'You Win!') {
      Alert.alert('Congrats!', 'You won the game!', [
        { text: 'Continue', onPress: () => setDotsAndBoxesKey((prev) => prev + 1) },
      ]);
    } else {
      // e.g. AI Wins or Tie
      Alert.alert('Game Over', result, [{ text: 'OK', onPress: () => setScreen('home') }]);
    }
  }

  // Called by DotsAndBoxes whenever the user's turn ends (they didn't claim a box)
  function handleUserTurnEnd(userCanContinue: boolean) {
    if (!userCanContinue) {
      // If user didn't claim a box => user turn is done
      setAllowUserMove(false);
    }
  }

  // Exit from game back to Home
  const goHomeFunction = () => {
    setScreen('home');
  };

  // -------------------------------
  // HOME SCREEN
  // -------------------------------
  const renderHomeScreen = () => (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>My Flashcard Decks</Text>
        <Text style={styles.subtitle}>Click to play Dots and Boxes!</Text>
        
        {/* Collapsible "How to Play" */}
        <TouchableOpacity
          onPress={() => setShowInstructions(!showInstructions)}
          style={styles.howToPlayButton}
        >
          <Text style={styles.howToPlayButtonText}>How to Play</Text>
        </TouchableOpacity>

        {showInstructions && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Dots and Boxes is played on a grid of dots. 
              On your turn, tap to draw a line between two adjacent dots (horizontal or vertical). 
              If you complete the fourth side of a box, you claim that box and take another turn. 
              The AI will do the same. The player with the most boxes at the end wins!
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={decks}
        keyExtractor={(deck) => deck.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deckItem}
            onPress={() => startFlashcardGame(item)}
          >
            <Text style={styles.deckItemText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.subtitle}>No decks available. Create one!</Text>
        }
      />

      <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity style={styles.button} onPress={createNewDeckScreen}>
          <Text style={styles.buttonText}>Create Deck</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // -------------------------------
  // CREATE DECK SCREEN
  // -------------------------------
  const renderCreateDeckScreen = () => {
    const addFlashcardToTempList = () => {
      if (!tempQuestion?.trim() || !tempAnswer?.trim()) {
        Alert.alert('Error', 'Please enter both question and answer.');
        return;
      }
      setNewFlashcards((prev) => [
        ...prev,
        { question: tempQuestion.trim(), answer: tempAnswer.trim(), id: '' },
      ]);
      setTempQuestion('');
      setTempAnswer('');
    };

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Create a New Deck</Text>
        <TextInput
          style={styles.input}
          placeholder="Deck Name"
          value={newDeckName}
          onChangeText={setNewDeckName}
        />

        <Text style={styles.subtitle}>Add Flashcards</Text>
        <TextInput
          style={styles.input}
          placeholder="Question"
          value={tempQuestion}
          onChangeText={setTempQuestion}
        />
        <TextInput
          style={styles.input}
          placeholder="Answer"
          value={tempAnswer}
          onChangeText={setTempAnswer}
        />

        <TouchableOpacity style={styles.button} onPress={addFlashcardToTempList}>
          <Text style={styles.buttonText}>Add Flashcard</Text>
        </TouchableOpacity>

        <FlatList
          style={styles.flashcardsList}
          data={newFlashcards}
          keyExtractor={(_, index) => String(index)}
          renderItem={({ item, index }) => (
            <View style={styles.flashcardItem}>
              <Text style={styles.question}>Q{index + 1}: {item.question}</Text>
              <Text style={styles.answer}>A: {item.answer}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.subtitle}>No flashcards added yet.</Text>
          }
        />

        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          <TouchableOpacity
            style={[styles.button, { marginRight: 10 }]}
            onPress={saveNewDeckToFirestore}
            disabled={isSavingDeck}
          >
            <Text style={styles.buttonText}>
              {isSavingDeck ? 'Saving...' : 'Save Deck'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.secondary }]}
            onPress={goHome}
            disabled={isSavingDeck}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // -------------------------------
  // FLASHCARD SCREEN
  // -------------------------------
  const renderFlashcardScreen = () => {
    if (!selectedDeck) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>No deck selected</Text>
          <TouchableOpacity style={styles.button} onPress={goHome}>
            <Text style={styles.buttonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Deck: {selectedDeck.name}</Text>

        {/* Progress Meter */}
        <Text style={styles.subtitle}>
          Progress: {currentFlashcardIndex} / {totalFlashcards}
        </Text>
        <ProgressBar progress={currentFlashcardIndex} total={totalFlashcards} />

        {isFetchingFlashcards ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : currentFlashcard ? (
          <>
            <Text style={styles.subtitle}>Question: {currentFlashcard.question}</Text>
            <View style={styles.answerContainer}>
              <TextInput
                style={styles.answerInput}
                placeholder="Your Answer"
                value={userAnswer}
                onChangeText={setUserAnswer}
              />
              <TouchableOpacity style={styles.checkButton} onPress={checkFlashcardAnswer}>
                <Text style={styles.buttonText}>Check</Text>
              </TouchableOpacity>
            </View>

            {/* Dots and Boxes */}
            <DotsAndBoxes
              key={dotsAndBoxesKey}
              allowUserMove={allowUserMove}
              onGameEnd={handleGameEnd}
              onUserTurnEnd={handleUserTurnEnd}
              onExit={goHomeFunction}
            />
          </>
        ) : (
          <Text style={styles.subtitle}>No flashcards in this deck.</Text>
        )}
      </ScrollView>
    );
  };

  // ===============================
  // MAIN RENDER SWITCH
  // ===============================
  let content: JSX.Element;
  switch (screen) {
    case 'home':
      content = renderHomeScreen();
      break;
    case 'createDeck':
      content = renderCreateDeckScreen();
      break;
    case 'flashcard':
      content = renderFlashcardScreen();
      break;
    default:
      content = renderHomeScreen();
  }

  return <View style={styles.appContainer}>{content}</View>;
}

// -------------------------------
// Styles
// -------------------------------
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: colors.background,
  },
  loginText: {
    fontSize: 18,
    color: colors.textSecondary,
  },

  // Header area
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
  },
  howToPlayButton: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.secondary,
    borderRadius: 8,
  },
  howToPlayButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContainer: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  instructionsText: {
    fontSize: 16,
    color: colors.textPrimary,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10, // space between title & subtitle
    marginTop: 10,
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  
  // General inputs / buttons
  input: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    flex: 1,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },

  // Bottom Buttons
  bottomButtonsContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },

  // Flashcard creation list
  flashcardsList: {
    maxHeight: 250,
    marginBottom: 20,
  },
  flashcardItem: {
    backgroundColor: '#E0F7FA',
    padding: 15,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  answer: {
    fontSize: 16,
    color: colors.accent,
  },

  // Flashcard answering
  answerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  answerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    color: colors.textPrimary,
  },
  checkButton: {
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Deck items
  deckItem: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deckItemText: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});

// -----------------------------------------------------------
// DotsAndBoxes Styles
// -----------------------------------------------------------
const dotsStyles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingBottom: 20,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  exitButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  exitButtonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
  },
  boardContainer: {
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  info: {
    marginTop: 8,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    marginHorizontal: 5,
  },
  horizontalLine: {
    width: 40,
    height: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 5,
    borderRadius: 4,
  },
  verticalLine: {
    width: 8,
    height: 40,
    backgroundColor: '#FFFFFF',
    marginVertical: 5,
    borderRadius: 4,
  },
  box: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: colors.primary,
    marginHorizontal: 2,
  },
  scoreContainer: {
    marginTop: 15,
  },
  score: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
