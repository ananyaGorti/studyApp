import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Alert,
  SafeAreaView,
  ImageBackground,
  TextInput,
} from 'react-native';

// GAME DATA
const INITIAL_PLAYER = {
  name: 'Hero',
  level: 1,
  health: 100,
  maxHealth: 100,
  attack: 10,
  defense: 5,
  experience: 0,
  experienceToNextLevel: 100,
  inventory: [
    { id: 1, name: 'Health Potion', description: 'Restores 30 health', effect: { health: 30 }, quantity: 3 },
    { id: 2, name: 'Village Key', description: 'Opens the village gate', effect: { key: 'village' }, quantity: 1 },
  ],
  quests: [],
  completedQuests: [],
  currentLocation: 'village',
};

const LOCATIONS = {
  village: {
    name: 'Peaceful Village',
    description: 'Your home village. The villagers are worried about the impending disaster.',
    backgroundImage: { uri: 'https://via.placeholder.com/600x400?text=Peaceful+Village' },
    interactiveObjects: [
      { id: 1, name: 'Elder', type: 'npc', 
        dialogue: [
          'Our village faces a great threat. The ancient prophecy warns of darkness unless the Lost Star is found.',
          'You must journey through the forest, the mountains, and finally the caves to find it.',
          'Take this map, it will guide you on your quest.',
        ],
        quest: { id: 'quest1', name: 'Find the Lost Star', description: 'Journey through the lands to find the Lost Star and save your village.' },
        position: { x: 150, y: 250 },
        image: { uri: 'https://via.placeholder.com/50?text=Elder' },
      },
      { id: 2, name: 'Merchant', type: 'npc',
        dialogue: [
          'Welcome, traveler! I have potions and supplies for your journey.',
          'Would you like to see my wares?'
        ],
        shop: [
          { id: 1, name: 'Health Potion', price: 10, description: 'Restores 30 health', effect: { health: 30 } },
          { id: 2, name: 'Defense Charm', price: 25, description: 'Increases defense by 2', effect: { defense: 2 } },
        ],
        position: { x: 300, y: 200 },
        image: { uri: 'https://via.placeholder.com/50?text=Merchant' },
      },
      { id: 3, name: 'Forest Path', type: 'exit', 
        destination: 'forest',
        position: { x: 200, y: 350 },
        image: { uri: 'https://via.placeholder.com/50?text=Path' },
      },
    ],
    monsters: [],
  },
  forest: {
    name: 'Mysterious Forest',
    description: 'The trees whisper ancient secrets. Be careful of forest creatures.',
    backgroundImage: { uri: 'https://via.placeholder.com/600x400?text=Mysterious+Forest' },
    interactiveObjects: [
      { id: 1, name: 'Forest Sprite', type: 'npc',
        dialogue: [
          'The forest has grown darker lately. Something is upsetting the balance.',
          'If you help me clear the monsters, I can show you a secret path to the mountains.',
          'Clear the forest of 3 Spindle Bugs and return to me.'
        ],
        quest: { id: 'quest2', name: 'Clear the Forest', description: 'Defeat 3 Spindle Bugs in the forest.', requirement: { type: 'defeat', monster: 'Spindle Bug', count: 3 } },
        position: { x: 200, y: 200 },
        image: { uri: 'https://via.placeholder.com/50?text=Sprite' },
      },
      { id: 2, name: 'Glowing Mushroom', type: 'item',
        item: { id: 3, name: 'Healing Mushroom', description: 'Restores 15 health when used', effect: { health: 15 }, quantity: 1 },
        position: { x: 350, y: 300 },
        image: { uri: 'https://via.placeholder.com/50?text=Mushroom' },
      },
      { id: 3, name: 'Village Path', type: 'exit',
        destination: 'village',
        position: { x: 50, y: 350 },
        image: { uri: 'https://via.placeholder.com/50?text=Path' },
      },
      { id: 4, name: 'Mountain Path', type: 'exit',
        destination: 'mountains',
        locked: true,
        unlockQuest: 'quest2',
        position: { x: 450, y: 150 },
        image: { uri: 'https://via.placeholder.com/50?text=Locked+Path' },
      },
    ],
    monsters: [
      { id: 'forest1', type: 'Spindle Bug', health: 30, attack: 8, defense: 3, experience: 25, image: { uri: 'https://via.placeholder.com/50?text=Spindle+Bug' } },
      { id: 'forest2', type: 'Spindle Bug', health: 30, attack: 8, defense: 3, experience: 25, image: { uri: 'https://via.placeholder.com/50?text=Spindle+Bug' } },
      { id: 'forest3', type: 'Spindle Bug', health: 30, attack: 8, defense: 3, experience: 25, image: { uri: 'https://via.placeholder.com/50?text=Spindle+Bug' } },
    ],
  },
  mountains: {
    name: 'Misty Mountains',
    description: 'The cold mountain air fills your lungs. The caves must be nearby.',
    backgroundImage: { uri: 'https://via.placeholder.com/600x400?text=Misty+Mountains' },
    interactiveObjects: [
      { id: 1, name: 'Old Miner', type: 'npc',
        dialogue: [
          'The entrance to the caves is blocked by a rockslide.',
          'I have explosives that can clear it, but I dropped my lucky pendant in the valley.',
          'If you find it for me, I\'ll help you get into the caves.'
        ],
        quest: { id: 'quest3', name: 'The Miner\'s Pendant', description: 'Find the lucky pendant in the valley.', requirement: { type: 'item', itemName: 'Lucky Pendant', count: 1 } },
        position: { x: 150, y: 150 },
        image: { uri: 'https://via.placeholder.com/50?text=Miner' },
      },
      { id: 2, name: 'Lucky Pendant', type: 'item',
        item: { id: 4, name: 'Lucky Pendant', description: 'A miner\'s lucky charm', effect: { quest: 'quest3' }, quantity: 1 },
        position: { x: 300, y: 300 },
        image: { uri: 'https://via.placeholder.com/50?text=Pendant' },
      },
      { id: 3, name: 'Forest Path', type: 'exit',
        destination: 'forest',
        position: { x: 50, y: 350 },
        image: { uri: 'https://via.placeholder.com/50?text=Path' },
      },
      { id: 4, name: 'Cave Entrance', type: 'exit',
        destination: 'caves',
        locked: true,
        unlockQuest: 'quest3',
        position: { x: 450, y: 200 },
        image: { uri: 'https://via.placeholder.com/50?text=Locked+Cave+Entrance' },
      },
    ],
    monsters: [
      { id: 'mountain1', type: 'Rock Golem', health: 50, attack: 12, defense: 8, experience: 40, image: { uri: 'https://via.placeholder.com/50?text=Rock+Golem' } },
    ],
  },
  caves: {
    name: 'Ancient Caves',
    description: 'Dark and mysterious caves where the Lost Star is rumored to be hidden.',
    backgroundImage: { uri: 'https://via.placeholder.com/600x400?text=Ancient+Caves' },
    interactiveObjects: [
      { id: 1, name: 'Ancient Guardian', type: 'npc',
        dialogue: [
          'I am the guardian of the Lost Star.',
          'Prove your worth by solving my riddle:',
          'I am light as a feather, but the strongest person cannot hold me for more than a minute. What am I?',
        ],
        quest: { id: 'quest4', name: 'The Guardian\'s Riddle', description: 'Solve the Ancient Guardian\'s riddle.', solution: 'breath' },
        position: { x: 200, y: 200 },
        image: { uri: 'https://via.placeholder.com/50?text=Guardian' },
      },
      { id: 2, name: 'Pedestal', type: 'special',
        description: 'A stone pedestal with a star-shaped indentation.',
        action: 'endGame',
        locked: true,
        unlockQuest: 'quest4',
        position: { x: 350, y: 150 },
        image: { uri: 'https://via.placeholder.com/50?text=Pedestal' },
      },
      { id: 3, name: 'Mountain Path', type: 'exit',
        destination: 'mountains',
        position: { x: 50, y: 350 },
        image: { uri: 'https://via.placeholder.com/50?text=Path' },
      },
    ],
    monsters: [
      { id: 'cave1', type: 'Shadow Lurker', health: 60, attack: 15, defense: 6, experience: 50, image: { uri: 'https://via.placeholder.com/50?text=Shadow+Lurker' } },
    ],
  },
};

// Main Game Component
const QuestForTheLostStar = () => {
  const [player, setPlayer] = useState(INITIAL_PLAYER);
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [gameState, setGameState] = useState({
    currentScreen: 'title', // title, map, dialogue, combat, inventory, shop, levelUp, ending
    currentLocation: 'village',
    currentDialogue: null,
    currentShop: null,
    currentCombat: null,
    currentModal: null,
    questProgress: {},
    monsterDefeated: {},
  });

  // Start the game
  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'map',
    }));
  };

  // Handle interactions with objects on the map
  const handleInteraction = (object) => {
    // NPC interaction
    if (object.type === 'npc') {
      setGameState(prev => ({
        ...prev,
        currentScreen: 'dialogue',
        currentDialogue: {
          character: object,
          dialogueIndex: 0,
        },
      }));
      
      // Add quest if NPC has one and player doesn't have it yet
      if (object.quest && !player.quests.find(q => q.id === object.quest.id) && 
          !player.completedQuests.includes(object.quest.id)) {
        setPlayer(prev => ({
          ...prev,
          quests: [...prev.quests, object.quest],
        }));
      }
    } 
    
    // Item pickup
    else if (object.type === 'item') {
      const newInventory = [...player.inventory];
      const existingItem = newInventory.find(item => item.name === object.item.name);
      
      if (existingItem) {
        existingItem.quantity += object.item.quantity;
      } else {
        newInventory.push(object.item);
      }
      
      setPlayer(prev => ({
        ...prev,
        inventory: newInventory,
      }));
      
      Alert.alert(
        'Item Found!',
        `You found: ${object.item.name}\n${object.item.description}`
      );
      
      // Remove the item from the map
      const currentLocation = { ...LOCATIONS[gameState.currentLocation] };
      currentLocation.interactiveObjects = currentLocation.interactiveObjects.filter(
        obj => obj.id !== object.id
      );
      
      // Update the location
      LOCATIONS[gameState.currentLocation] = currentLocation;
    } 
    
    // Location exits
    else if (object.type === 'exit') {
      if (object.locked) {
        if (player.completedQuests.includes(object.unlockQuest)) {
          // Path is now unlocked
          setGameState(prev => ({
            ...prev,
            currentLocation: object.destination,
          }));
        } else {
          Alert.alert(
            'Path Locked',
            'You need to complete a quest to unlock this path.'
          );
        }
      } else {
        setGameState(prev => ({
          ...prev,
          currentLocation: object.destination,
        }));
      }
    } 
    
    // Special objects
    else if (object.type === 'special') {
      if (object.action === 'endGame' && !object.locked) {
        setGameState(prev => ({
          ...prev,
          currentScreen: 'ending',
        }));
      } else if (object.locked) {
        if (player.completedQuests.includes(object.unlockQuest)) {
          // Object is now unlocked
          setGameState(prev => ({
            ...prev,
            currentScreen: 'ending',
          }));
        } else {
          Alert.alert(
            'Not Yet',
            'You need to complete a quest before you can interact with this.'
          );
        }
      }
    }
  };

  // Handle combat with monsters
  const encounterMonster = (monster) => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'combat',
      currentCombat: {
        monster: { ...monster, currentHealth: monster.health },
        playerTurn: true,
        logs: [`You encountered a ${monster.type}!`],
      },
    }));
  };

  // Combat actions
  const handleCombatAction = (action) => {
    const combat = { ...gameState.currentCombat };
    let playerStatus = { ...player };
    let monsterStatus = { ...combat.monster };
    
    // Player's turn
    if (combat.playerTurn) {
      if (action === 'attack') {
        // Calculate damage
        const damage = Math.max(Math.floor(playerStatus.attack * (Math.random() * 0.5 + 0.75) - monsterStatus.defense / 2), 1);
        monsterStatus.currentHealth = Math.max(0, monsterStatus.currentHealth - damage);
        combat.logs.push(`You attacked for ${damage} damage!`);
        
        // Check if monster is defeated
        if (monsterStatus.currentHealth <= 0) {
          combat.logs.push(`You defeated the ${monsterStatus.type}!`);
          combat.logs.push(`You gained ${monsterStatus.experience} experience!`);
          
          // Update experience and check for level up
          playerStatus.experience += monsterStatus.experience;
          
          // Mark monster as defeated for quest tracking
          const defeatedMonsters = { ...gameState.monsterDefeated };
          defeatedMonsters[monsterStatus.type] = (defeatedMonsters[monsterStatus.type] || 0) + 1;
          
          // Check quest completion
          const updatedQuests = [];
          const completedQuests = [...playerStatus.completedQuests];
          
          playerStatus.quests.forEach(quest => {
            if (quest.requirement && quest.requirement.type === 'defeat') {
              if (quest.requirement.monster === monsterStatus.type) {
                const totalDefeated = defeatedMonsters[monsterStatus.type] || 0;
                
                if (totalDefeated >= quest.requirement.count) {
                  completedQuests.push(quest.id);
                  Alert.alert('Quest Completed!', `You've completed: ${quest.name}`);
                } else {
                  updatedQuests.push(quest);
                }
              } else {
                updatedQuests.push(quest);
              }
            } else {
              updatedQuests.push(quest);
            }
          });
          
          playerStatus.quests = updatedQuests;
          playerStatus.completedQuests = completedQuests;
          
          // Check for level up
          if (playerStatus.experience >= playerStatus.experienceToNextLevel) {
            setGameState(prev => ({
              ...prev,
              currentScreen: 'levelUp',
              currentCombat: null,
              monsterDefeated: defeatedMonsters,
            }));
            
            setPlayer(playerStatus);
            return;
          }
          
          // Return to map
          setGameState(prev => ({
            ...prev,
            currentScreen: 'map',
            currentCombat: null,
            monsterDefeated: defeatedMonsters,
          }));
          
          // Remove the defeated monster
          const location = { ...LOCATIONS[gameState.currentLocation] };
          location.monsters = location.monsters.filter(m => m.id !== monsterStatus.id);
          LOCATIONS[gameState.currentLocation] = location;
          
          setPlayer(playerStatus);
          return;
        }
      } else if (action === 'defend') {
        // Increase defense temporarily for this turn
        playerStatus.tempDefenseBoost = Math.floor(playerStatus.defense * 0.5);
        combat.logs.push('You defend, increasing your defense temporarily.');
      } else if (action === 'useItem') {
        setGameState(prev => ({
          ...prev,
          currentModal: 'inventory',
        }));
        return;
      }
      
      // Monster's turn
      combat.playerTurn = false;
      combat.monster = monsterStatus;
      
      setGameState(prev => ({
        ...prev,
        currentCombat: combat,
      }));
      
      setPlayer(playerStatus);
      
      // Schedule monster's turn
      setTimeout(() => {
        handleMonsterTurn();
      }, 1000);
    }
  };

  // Monster's turn in combat
  const handleMonsterTurn = () => {
    const combat = { ...gameState.currentCombat };
    let playerStatus = { ...player };
    const monster = combat.monster;
    
    // Calculate monster damage considering player's defense
    const effectiveDefense = playerStatus.defense + (playerStatus.tempDefenseBoost || 0);
    const damage = Math.max(Math.floor(monster.attack * (Math.random() * 0.3 + 0.85) - effectiveDefense / 2), 1);
    
    playerStatus.health = Math.max(0, playerStatus.health - damage);
    combat.logs.push(`${monster.type} attacks for ${damage} damage!`);
    
    // Remove temporary defense boost
    delete playerStatus.tempDefenseBoost;
    
    // Check if player is defeated
    if (playerStatus.health <= 0) {
      combat.logs.push('You were defeated!');
      
      // Player loses but doesn't game over
      setTimeout(() => {
        Alert.alert(
          'Defeated',
          'You were defeated, but don\'t worry! You\'ve been revived at the village with half health.',
          [
            { 
              text: 'Continue', 
              onPress: () => {
                playerStatus.health = Math.floor(playerStatus.maxHealth / 2);
                setPlayer(playerStatus);
                
                setGameState(prev => ({
                  ...prev,
                  currentScreen: 'map',
                  currentCombat: null,
                  currentLocation: 'village',
                }));
              }
            }
          ]
        );
      }, 1500);
    } else {
      // Continue battle - player's turn again
      combat.playerTurn = true;
      
      setGameState(prev => ({
        ...prev,
        currentCombat: combat,
      }));
      
      setPlayer(playerStatus);
    }
  };

  // Handle level up choices
  const handleLevelUp = (stat) => {
    const newPlayer = { ...player };
    newPlayer.level += 1;
    newPlayer.experienceToNextLevel = Math.floor(newPlayer.experienceToNextLevel * 1.5);
    
    if (stat === 'health') {
      newPlayer.maxHealth += 20;
      newPlayer.health = newPlayer.maxHealth; // Fully heal on level up
    } else if (stat === 'attack') {
      newPlayer.attack += 3;
    } else if (stat === 'defense') {
      newPlayer.defense += 2;
    }
    
    setPlayer(newPlayer);
    setGameState(prev => ({
      ...prev,
      currentScreen: 'map',
    }));
  };

  // Use an item from inventory
  const useItem = (item, index) => {
    const newPlayer = { ...player };
    const itemToUse = newPlayer.inventory[index];
    
    if (itemToUse && itemToUse.quantity > 0) {
      // Apply item effects
      if (itemToUse.effect.health) {
        newPlayer.health = Math.min(newPlayer.health + itemToUse.effect.health, newPlayer.maxHealth);
      }
      
      if (itemToUse.effect.attack) {
        newPlayer.attack += itemToUse.effect.attack;
      }
      
      if (itemToUse.effect.defense) {
        newPlayer.defense += itemToUse.effect.defense;
      }
      
      // Handle quest items
      if (itemToUse.effect.quest) {
        const questId = itemToUse.effect.quest;
        const questIndex = newPlayer.quests.findIndex(q => q.id === questId);
        
        if (questIndex !== -1) {
          const quest = newPlayer.quests[questIndex];
          
          if (quest.requirement && 
              quest.requirement.type === 'item' && 
              quest.requirement.itemName === itemToUse.name) {
            
            // Complete the quest
            newPlayer.completedQuests.push(questId);
            newPlayer.quests.splice(questIndex, 1);
            
            Alert.alert('Quest Completed!', `You've completed: ${quest.name}`);
          }
        }
      }
      
      // Reduce quantity
      itemToUse.quantity -= 1;
      
      // Remove item if quantity is 0
      if (itemToUse.quantity <= 0) {
        newPlayer.inventory.splice(index, 1);
      }
      
      setPlayer(newPlayer);
      
      // Close inventory if we were in combat
      if (gameState.currentScreen === 'combat') {
        setGameState(prev => ({
          ...prev,
          currentModal: null,
        }));
      }
    }
  };

  // Continue dialogue
  const continueDialogue = () => {
    const dialogue = { ...gameState.currentDialogue };
    dialogue.dialogueIndex += 1;
    
    // Check if dialogue is finished
    if (dialogue.dialogueIndex >= dialogue.character.dialogue.length) {
      // If character has a shop, open it
      if (dialogue.character.shop) {
        setGameState(prev => ({
          ...prev,
          currentScreen: 'shop',
          currentDialogue: null,
          currentShop: dialogue.character.shop,
        }));
      } 
      // If character has a riddle
      else if (dialogue.character.quest && dialogue.character.quest.solution) {
        setGameState(prev => ({
          ...prev,
          currentModal: 'riddle',
          currentDialogue: null,
          currentRiddle: dialogue.character.quest,
        }));
      }
      // Otherwise return to map
      else {
        setGameState(prev => ({
          ...prev,
          currentScreen: 'map',
          currentDialogue: null,
        }));
      }
    } else {
      setGameState(prev => ({
        ...prev,
        currentDialogue: dialogue,
      }));
    }
  };

  // Answer riddle
  const answerRiddle = (answer) => {
    if (answer.toLowerCase() === gameState.currentRiddle.solution) {
      // Complete the quest
      const newPlayer = { ...player };
      const questIndex = newPlayer.quests.findIndex(q => q.id === gameState.currentRiddle.id);
      
      if (questIndex !== -1) {
        newPlayer.completedQuests.push(gameState.currentRiddle.id);
        newPlayer.quests.splice(questIndex, 1);
      }
      
      setPlayer(newPlayer);
      
      Alert.alert(
        'Correct!',
        'You solved the riddle!',
        [
          { 
            text: 'Continue', 
            onPress: () => {
              setGameState(prev => ({
                ...prev,
                currentModal: null,
                currentRiddle: null,
                currentScreen: 'map',
              }));
              setRiddleAnswer('');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Incorrect',
        'That is not the right answer. Try again.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Keep the riddle modal open
            }
          }
        ]
      );
    }
  };

  // Buy item from shop
  const buyItem = (item) => {
    // Calculate player's money (for simplicity, just use XP as currency)
    const money = player.experience;
    
    if (money >= item.price) {
      const newPlayer = { ...player };
      newPlayer.experience -= item.price;
      
      // Add item to inventory
      const existingItem = newPlayer.inventory.find(i => i.name === item.name);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        newPlayer.inventory.push({
          ...item,
          quantity: 1,
        });
      }
      
      setPlayer(newPlayer);
      
      Alert.alert(
        'Purchase Successful',
        `You bought a ${item.name}!`
      );
    } else {
      Alert.alert(
        'Not Enough Money',
        'You don\'t have enough XP to buy this item.'
      );
    }
  };

  // Render different screens based on game state
  const renderScreen = () => {
    switch (gameState.currentScreen) {
      case 'title':
        return (
          <ImageBackground 
            source={{ uri: 'https://via.placeholder.com/600x400?text=Title+Screen' }} 
            style={styles.fullScreen}
          >
            <View style={styles.titleContainer}>
              <Text style={styles.gameTitle}>Quest for the Lost Star</Text>
              <TouchableOpacity style={styles.startButton} onPress={startGame}>
                <Text style={styles.startButtonText}>Start Adventure</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        );
        
      case 'map':
        const location = LOCATIONS[gameState.currentLocation];
        return (
          <ImageBackground 
            source={location.backgroundImage} 
            style={styles.fullScreen}
          >
            <View style={styles.mapContainer}>
              <View style={styles.header}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationDescription}>{location.description}</Text>
              </View>
              
              {/* Player stats */}
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>Level: {player.level}</Text>
                <Text style={styles.statsText}>HP: {player.health}/{player.maxHealth}</Text>
                <Text style={styles.statsText}>XP: {player.experience}/{player.experienceToNextLevel}</Text>
              </View>
              
              {/* Interactive objects */}
              {location.interactiveObjects.map(object => (
                <TouchableOpacity
                  key={object.id}
                  style={[styles.interactiveObject, { left: object.position.x, top: object.position.y }]}
                  onPress={() => handleInteraction(object)}
                >
                  <Image source={object.image} style={styles.objectImage} />
                  <Text style={styles.objectName}>{object.name}</Text>
                </TouchableOpacity>
              ))}
              
              {/* Monsters */}
              {location.monsters.map(monster => (
                <TouchableOpacity
                  key={monster.id}
                  style={[styles.monster, { left: 200 + Math.random() * 150, top: 150 + Math.random() * 150 }]}
                  onPress={() => encounterMonster(monster)}
                >
                  <Image source={monster.image} style={styles.monsterImage} />
                  <Text style={styles.monsterName}>{monster.type}</Text>
                </TouchableOpacity>
              ))}
              
              {/* Menu buttons */}
              <View style={styles.menuContainer}>
                <TouchableOpacity 
                  style={styles.menuButton}
                  onPress={() => setGameState(prev => ({ ...prev, currentModal: 'inventory' }))}
                >
                  <Text style={styles.menuButtonText}>Inventory</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuButton}
                  onPress={() => setGameState(prev => ({ ...prev, currentModal: 'quests' }))}
                >
                  <Text style={styles.menuButtonText}>Quests</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        );
        
      case 'dialogue':
        const dialogue = gameState.currentDialogue;
        return (
          <View style={styles.dialogueContainer}>
            <View style={styles.dialogueBox}>
              <Text style={styles.dialogueName}>{dialogue.character.name}</Text>
              <Text style={styles.dialogueText}>
                {dialogue.character.dialogue[dialogue.dialogueIndex]}
              </Text>
              <TouchableOpacity style={styles.dialogueButton} onPress={continueDialogue}>
                <Text style={styles.dialogueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 'combat':
        const combat = gameState.currentCombat;
        return (
          <View style={styles.combatContainer}>
            {/* Monster */}
            <View style={styles.monsterCombatContainer}>
              <Image source={combat.monster.image} style={styles.combatMonsterImage} />
              <Text style={styles.combatMonsterName}>{combat.monster.type}</Text>
              <View style={styles.healthBarContainer}>
                <View 
                  style={[
                    styles.healthBar, 
                    { width: `${(combat.monster.currentHealth / combat.monster.health) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.healthText}>
                {combat.monster.currentHealth}/{combat.monster.health}
              </Text>
            </View>
            
            {/* Player stats */}
            <View style={styles.playerCombatContainer}>
              <Text style={styles.combatPlayerName}>{player.name}</Text>
              <View style={styles.healthBarContainer}>
                <View 
                  style={[
                    styles.healthBar, 
                    { width: `${(player.health / player.maxHealth) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.healthText}>
                {player.health}/{player.maxHealth}
              </Text>
            </View>
            
            {/* Combat log */}
            <ScrollView style={styles.combatLog}>
              {combat.logs.map((log, index) => (
                <Text key={index} style={styles.combatLogText}>{log}</Text>
              ))}
            </ScrollView>
            
            {/* Combat actions */}
            {combat.playerTurn && (
              <View style={styles.combatActions}>
                <TouchableOpacity 
                  style={styles.combatButton}
                  onPress={() => handleCombatAction('attack')}
                >
                  <Text style={styles.combatButtonText}>Attack</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.combatButton}
                  onPress={() => handleCombatAction('defend')}
                >
                  <Text style={styles.combatButtonText}>Defend</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.combatButton}
                  onPress={() => handleCombatAction('useItem')}
                >
                  <Text style={styles.combatButtonText}>Use Item</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
        
      case 'shop':
        return (
          <View style={styles.shopContainer}>
            <Text style={styles.shopTitle}>Shop</Text>
            <Text style={styles.shopMoney}>Your XP: {player.experience}</Text>
            
            <ScrollView style={styles.shopItems}>
              {gameState.currentShop.map((item, index) => (
                <View key={index} style={styles.shopItem}>
                  <View style={styles.shopItemInfo}>
                    <Text style={styles.shopItemName}>{item.name}</Text>
                    <Text style={styles.shopItemDesc}>{item.description}</Text>
                  </View>
                  <View style={styles.shopItemActions}>
                    <Text style={styles.shopItemPrice}>{item.price} XP</Text>
                    <TouchableOpacity 
                      style={styles.shopBuyButton}
                      onPress={() => buyItem(item)}
                    >
                      <Text style={styles.shopBuyText}>Buy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setGameState(prev => ({ ...prev, currentScreen: 'map', currentShop: null }))}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'levelUp':
        return (
          <View style={styles.levelUpContainer}>
            <Text style={styles.levelUpTitle}>Level Up!</Text>
            <Text style={styles.levelUpText}>
              You are now level {player.level + 1}. Choose a stat to increase:
            </Text>
            
            <TouchableOpacity 
              style={styles.levelUpButton}
              onPress={() => handleLevelUp('health')}
            >
              <Text style={styles.levelUpButtonText}>Health +20</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.levelUpButton}
              onPress={() => handleLevelUp('attack')}
            >
              <Text style={styles.levelUpButtonText}>Attack +3</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.levelUpButton}
              onPress={() => handleLevelUp('defense')}
            >
              <Text style={styles.levelUpButtonText}>Defense +2</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'ending':
        return (
          <ImageBackground 
            source={{ uri: 'https://via.placeholder.com/600x400?text=Ending+Screen' }} 
            style={styles.fullScreen}
          >
            <View style={styles.endingContainer}>
              <Text style={styles.endingTitle}>Congratulations!</Text>
              <Text style={styles.endingText}>
                You have found the Lost Star and saved your village from disaster!
              </Text>
              <Text style={styles.endingStats}>
                Final Level: {player.level}{'\n'}
                Quests Completed: {player.completedQuests.length}
              </Text>
              
              <TouchableOpacity 
                style={styles.restartButton}
                onPress={() => {
                  setPlayer(INITIAL_PLAYER);
                  setGameState({
                    currentScreen: 'title',
                    currentLocation: 'village',
                    currentDialogue: null,
                    currentShop: null,
                    currentCombat: null,
                    currentModal: null,
                    questProgress: {},
                    monsterDefeated: {},
                  });
                }}
              >
                <Text style={styles.restartButtonText}>Start New Game</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        );
        
      default:
        return <View />;
    }
  };

  // Render modals
  const renderModal = () => {
    switch (gameState.currentModal) {
      case 'inventory':
        return (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Inventory</Text>
                
                <ScrollView style={styles.inventoryItems}>
                  {player.inventory.length === 0 ? (
                    <Text style={styles.emptyText}>Your inventory is empty.</Text>
                  ) : (
                    player.inventory.map((item, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.inventoryItem}
                        onPress={() => useItem(item, index)}
                      >
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name} x{item.quantity}</Text>
                          <Text style={styles.itemDesc}>{item.description}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.useButton}
                          onPress={() => useItem(item, index)}
                        >
                          <Text style={styles.useButtonText}>Use</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setGameState(prev => ({ ...prev, currentModal: null }))}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
        
      case 'quests':
        return (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Quests</Text>
                
                <ScrollView style={styles.questsList}>
                  <View>
                    <Text style={styles.questsSubtitle}>Active Quests</Text>
                    {player.quests.length === 0 ? (
                      <Text style={styles.emptyText}>No active quests.</Text>
                    ) : (
                      player.quests.map((quest, index) => (
                        <TouchableOpacity 
                          key={index} 
                          style={styles.questItem}
                          onPress={() => Alert.alert(quest.name, quest.description)}
                        >
                          <Text style={styles.questName}>{quest.name}</Text>
                          <Text style={styles.questDesc}>{quest.description}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                  
                  <View style={styles.questsSection}>
                    <Text style={styles.questsSubtitle}>Completed Quests</Text>
                    {player.completedQuests.length === 0 ? (
                      <Text style={styles.emptyText}>No completed quests.</Text>
                    ) : (
                      player.completedQuests.map((questId, index) => {
                        // Find the completed quest details
                        let questName = questId;
                        let questDesc = "";
                        
                        Object.values(LOCATIONS).forEach(location => {
                          location.interactiveObjects.forEach(obj => {
                            if (obj.quest && obj.quest.id === questId) {
                              questName = obj.quest.name;
                              questDesc = obj.quest.description;
                            }
                          });
                        });
                        
                        return (
                          <View key={index} style={styles.questItem}>
                            <Text style={styles.questName}>{questName}</Text>
                            <Text style={styles.questDesc}>{questDesc}</Text>
                            <Text style={styles.questCompleted}>Completed</Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                </ScrollView>
                
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setGameState(prev => ({ ...prev, currentModal: null }))}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
        
      case 'riddle':
        return (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Riddle</Text>
                
                <Text style={styles.riddleText}>
                  {gameState.currentRiddle.description}{'\n\n'}
                  {gameState.currentRiddle.solution ? 
                    "I am light as a feather, but the strongest person cannot hold me for more than a minute. What am I?" : 
                    "No riddle found."}
                </Text>
                
                <View style={styles.riddleInputContainer}>
                  <TextInput
                    style={styles.riddleInput}
                    placeholder="Enter your answer"
                    placeholderTextColor="#ccc"
                    onChangeText={(text) => setRiddleAnswer(text)}
                    value={riddleAnswer}
                    onSubmitEditing={(event) => answerRiddle(event.nativeEvent.text)}
                  />
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={() => answerRiddle(riddleAnswer)}
                  >
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
        
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderScreen()}
      {gameState.currentModal ? renderModal() : null}
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreen: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  
  // Title Screen
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gameTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 50,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  startButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Map Screen
  mapContainer: {
    flex: 1,
    padding: 10,
  },
  header: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  locationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  locationDescription: {
    fontSize: 14,
    color: '#ddd',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  statsText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  interactiveObject: {
    position: 'absolute',
    alignItems: 'center',
  },
  objectImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  objectName: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  monster: {
    position: 'absolute',
    alignItems: 'center',
  },
  monsterImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  monsterName: {
    color: '#f00',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  menuButton: {
    backgroundColor: '#4e9af1',
    padding: 10,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  menuButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Dialogue Screen
  dialogueContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  dialogueBox: {
    backgroundColor: 'rgba(50,50,80,0.9)',
    borderRadius: 10,
    padding: 15,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  dialogueName: {
    color: '#ffcc00',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
  dialogueText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  dialogueButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#4e9af1',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  dialogueButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Combat Screen
  combatContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
  },
  monsterCombatContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  combatMonsterImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  combatMonsterName: {
    color: '#f00',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 5,
  },
  playerCombatContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  combatPlayerName: {
    color: '#4e9af1',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 5,
  },
  healthBarContainer: {
    width: 200,
    height: 20,
    backgroundColor: '#444',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  },
  healthBar: {
    height: '100%',
    backgroundColor: '#2ecc71',
  },
  healthText: {
    color: '#fff',
  },
  combatLog: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  combatLogText: {
    color: '#ddd',
    marginBottom: 5,
  },
  combatActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  combatButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  combatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Inventory Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  },
  inventoryItems: {
    maxHeight: 300,
  },
  inventoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itemDesc: {
    color: '#bbb',
    fontSize: 12,
  },
  useButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  useButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#666',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Quest Modal
  questsList: {
    maxHeight: 300,
  },
  questsSubtitle: {
    color: '#ffcc00',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
    marginTop: 5,
  },
  questsSection: {
    marginTop: 20,
  },
  questItem: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  questName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  questDesc: {
    color: '#bbb',
    fontSize: 12,
    marginBottom: 5,
  },
  questCompleted: {
    color: '#2ecc71',
    fontWeight: 'bold',
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  
  // Shop Screen
  shopContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 20,
  },
  shopTitle: {
    color: '#ffcc00',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  shopMoney: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  shopItems: {
    flex: 1,
    marginBottom: 20,
  },
  shopItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  shopItemInfo: {
    flex: 1,
  },
  shopItemName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  shopItemDesc: {
    color: '#bbb',
    fontSize: 12,
  },
  shopItemActions: {
    alignItems: 'flex-end',
  },
  shopItemPrice: {
    color: '#ffcc00',
    marginBottom: 5,
  },
  shopBuyButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  shopBuyText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Level Up Screen
  levelUpContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 20,
  },
  levelUpTitle: {
    color: '#ffcc00',
    fontWeight: 'bold',
    fontSize: 30,
    marginBottom: 20,
    textAlign: 'center',
  },
  levelUpText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
  },
  levelUpButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginBottom: 15,
    width: 200,
    alignItems: 'center',
  },
  levelUpButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Riddle Modal
  riddleText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  riddleInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  riddleInput: {
    flex: 1,
    backgroundColor: '#444',
    color: '#fff',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Ending Screen
  endingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  endingTitle: {
    color: '#ffcc00',
    fontWeight: 'bold',
    fontSize: 36,
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  endingText: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  endingStats: {
    color: '#ddd',
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  restartButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default QuestForTheLostStar;
