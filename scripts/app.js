// Multiplayer Hangman Game
class HangmanGame {
    constructor() {
        this.gameState = {
            status: 'lobby',
            players: {},
            word: '',
            guessedLetters: [],
            incorrectGuesses: 0,
            displayWord: [],
            currentTurn: null,
            hostId: null
        };

        this.currentPlayer = null;
        this.currentGameId = null;
        this.init();
    }

    init() {
        console.log('Hangman game initialized!');
        this.showLobby();
    }

    showLobby() {
        // Reset the game state when returning to lobby
        this.gameState = {
            status: 'lobby',
            players: {},
            word: '',
            guessedLetters: [],
            incorrectGuesses: 0,
            displayWord: [],
            currentTurn: null,
            hostId: null
        };
        
        this.currentPlayer = null;
        
        // Clear any existing content completely
        const gameContainer = document.getElementById('gameContainer');
        gameContainer.innerHTML = '';
        
        // Add a small delay to ensure the container is cleared
        setTimeout(() => {
            gameContainer.innerHTML = `
                <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-center mb-6">Welcome to Hangman!</h2>
                    <div class="space-y-4">
                        <input type="text" id="playerName" placeholder="Enter your name" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <button onclick="game.createGame()" 
                                class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 game-button">
                            Create New Game
                        </button>
                        <div class="text-center text-gray-500">or</div>
                        <input type="text" id="gameId" placeholder="Enter Game ID to join" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <button onclick="game.joinGame()" 
                                class="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 game-button">
                            Join Game
                        </button>
                    </div>
                </div>
            `;
        }, 10);
    }

    async createGame() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('Please enter your name!');
            return;
        }
        
        // Generate a simple game ID
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Set up the current player using Firebase Auth UID
        const user = (window.firebase && window.firebase.auth) ? firebase.auth().currentUser : null;
        if (!user) {
            alert('Not signed in yet. Please refresh and try again.');
            return;
        }
        this.currentPlayer = {
            id: user.uid,
            name: playerName,
            isHost: true
        };
        this.currentGameId = gameId;
        
        // Create the game in Firebase
        await this.createGameInFirebase(gameId, playerName);
    }

    async joinGame() {
        const playerName = document.getElementById('playerName').value.trim();
        const gameId = document.getElementById('gameId').value.trim();
        
        if (!playerName || !gameId) {
            alert('Please enter both your name and game ID!');
            return;
        }
        
        const user = (window.firebase && window.firebase.auth) ? firebase.auth().currentUser : null;
        if (!user) {
            alert('Not signed in yet. Please refresh and try again.');
            return;
        }

        this.currentPlayer = { id: user.uid, name: playerName, isHost: false };
        this.currentGameId = gameId;

        try {
            const gameRef = db.collection('games').doc(gameId);
            const docSnap = await gameRef.get();
            if (!docSnap.exists) {
                alert('Game not found. Check the Game ID.');
                return;
            }
            // Add/merge this player into players map
            await gameRef.set({
                players: {
                    [user.uid]: { name: playerName, score: 0, isHost: false }
                }
            }, { merge: true });

            console.log(`Joined game ${gameId} as ${playerName}`);
            // Track game join
            if (window.va) window.va('track', 'Game Joined', { gameId });
            this.listenToGameChanges(gameId);
        } catch (err) {
            console.error('Failed to join game:', err);
            alert('Failed to join game. Please try again.');
        }
    }

    showWaitingRoom(gameId) {
        const gameContainer = document.getElementById('gameContainer');
        const playersHtml = Object.entries(this.gameState.players || {}).map(([uid, p]) => {
            const hostBadge = uid === this.gameState.hostId ? ' (Host)' : '';
            return `
                <div class="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span>${p.name}${hostBadge}</span>
                    <span class="text-green-600">●</span>
                </div>
            `;
        }).join('');

        const user = (window.firebase && window.firebase.auth) ? firebase.auth().currentUser : null;
        const isHost = user && user.uid === this.gameState.hostId;

        gameContainer.innerHTML = `
            <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                <h2 class="text-2xl font-bold text-center mb-6">Waiting Room</h2>
                <div class="text-center mb-6">
                    <p class="text-lg text-gray-700 mb-2">Game ID: <span class="font-mono font-bold text-blue-600">${gameId}</span></p>
                    <p class="text-sm text-gray-500">Share this ID with other players to join</p>
                </div>
                
                <div class="mb-6">
                    <h3 class="text-lg font-semibold mb-3">Players:</h3>
                    <div id="playersList" class="space-y-2">${playersHtml}</div>
                </div>
                
                <div class="text-center">
                    ${isHost ? `
                        <button onclick="game.startGame()" 
                                class="bg-green-500 text-white py-2 px-6 rounded-md hover:bg-green-600 game-button">
                            Start Game
                        </button>
                    ` : `
                        <p class="text-gray-600">Waiting for the host to start…</p>
                    `}
                </div>
            </div>
        `;
    }

    startGame() {
        const user = (window.firebase && window.firebase.auth) ? firebase.auth().currentUser : null;
        if (!user || user.uid !== this.gameState.hostId) {
            alert('Only the host can start the game.');
            return;
        }
        const gameContainer = document.getElementById('gameContainer');
        gameContainer.innerHTML = `
            <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                <h2 class="text-2xl font-bold text-center mb-6">Set the Word</h2>
                <div class="text-center mb-6">
                    <p class="text-lg text-gray-700 mb-4">Enter the word or phrase for players to guess:</p>
                    <input type="text" id="secretWord" placeholder="Enter word here" 
                           class="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg">
                </div>
                
                <div class="text-center">
                    <button onclick="game.beginGame()" 
                            class="bg-blue-500 text-white py-2 px-6 rounded-md hover:bg-blue-600 game-button">
                        Start Guessing
                    </button>
                </div>
            </div>
        `;
    }

    async beginGame() {
        const secretWord = document.getElementById('secretWord').value.trim().toUpperCase();
        
        if (!secretWord) {
            alert('Please enter a word!');
            return;
        }
        
        // Validate that the word contains only letters and spaces
        const isValidWord = /^[A-Z\s]+$/.test(secretWord);
        
        if (!isValidWord) {
            alert('Please enter only letters and spaces! Numbers and special characters are not allowed.');
            return;
        }
        const gameId = this.currentGameId;
        const user = (window.firebase && window.firebase.auth) ? firebase.auth().currentUser : null;
        if (!user || !gameId) {
            alert('Missing game or user context.');
            return;
        }
        // Only host can set the word
        if (user.uid !== this.gameState.hostId) {
            alert('Only the host can start the game.');
            return;
        }

        const displayArray = secretWord.split('').map(letter => letter === ' ' ? ' ' : '_');
        const firstTurn = this.gameState.hostId;

        try {
            await db.collection('games').doc(gameId).update({
                status: 'in-progress',
                word: secretWord,
                displayWord: displayArray,
                currentTurn: firstTurn,
                guessedLetters: [],
                incorrectGuesses: 0
            });
            console.log('Game started with word:', secretWord);
            // Track game start
            if (window.va) window.va('track', 'Game Started', { gameId, wordLength: secretWord.length });
        } catch (err) {
            console.error('Failed to start game:', err);
            alert('Failed to start game.');
        }
    }

    showGameBoard() {
        const gameContainer = document.getElementById('gameContainer');
        gameContainer.innerHTML = `
            <div class="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
                <h2 class="text-2xl font-bold text-center mb-6">Hangman Game</h2>
                
                <div class="flex flex-col lg:flex-row gap-8">
                    <!-- Left side: Hangman Drawing -->
                    <div class="flex-1 flex justify-center">
                        <div class="w-80 h-80">
                            ${this.generateHangmanDrawing()}
                        </div>
                    </div>
                    
                    <!-- Right side: Game Info -->
                    <div class="flex-1">
                        <!-- Game Status -->
                        <div class="text-center mb-6">
                            <p class="text-lg text-gray-700">Incorrect Guesses: <span class="font-bold text-red-600">${this.gameState.incorrectGuesses}</span> / 6</p>
                            <p class="text-lg text-gray-700">Current Turn: <span class="font-bold text-blue-600">${this.gameState.players[this.gameState.currentTurn]?.name || 'Unknown'}</span></p>
                        </div>
                        
                        <!-- Word Display -->
                        <div class="text-center mb-8">
                            <div class="text-4xl font-mono font-bold text-gray-800 tracking-wider">
                                ${this.gameState.displayWord.join(' ')}
                            </div>
                        </div>
                        
                        <!-- Letter Grid -->
                        <div class="grid grid-cols-7 gap-2 max-w-md mx-auto mb-6">
                            ${this.generateLetterButtons()}
                        </div>
                        
                        <!-- Game Info -->
                        <div class="text-center text-sm text-gray-600">
                            <p>Guessed Letters: ${this.gameState.guessedLetters.join(', ') || 'None'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateHangmanDrawing() {
        const incorrectGuesses = this.gameState.incorrectGuesses || 0;
        
        return `
            <svg viewBox="0 0 300 300" class="w-full h-full">
                <!-- Gallows (always visible) -->
                <line x1="50" y1="250" x2="150" y2="250" class="hangman-drawing" />
                <line x1="100" y1="250" x2="100" y2="50" class="hangman-drawing" />
                <line x1="100" y1="50" x2="200" y2="50" class="hangman-drawing" />
                <line x1="200" y1="50" x2="200" y2="80" class="hangman-drawing" />
                
                <!-- Hangman parts (progressive) -->
                ${incorrectGuesses >= 1 ? '<circle cx="200" cy="100" r="20" class="hangman-drawing" />' : ''}
                ${incorrectGuesses >= 2 ? '<line x1="200" y1="120" x2="200" y2="180" class="hangman-drawing" />' : ''}
                ${incorrectGuesses >= 3 ? '<line x1="200" y1="140" x2="180" y2="160" class="hangman-drawing" />' : ''}
                ${incorrectGuesses >= 4 ? '<line x1="200" y1="140" x2="220" y2="160" class="hangman-drawing" />' : ''}
                ${incorrectGuesses >= 5 ? '<line x1="200" y1="180" x2="180" y2="220" class="hangman-drawing" />' : ''}
                ${incorrectGuesses >= 6 ? '<line x1="200" y1="180" x2="220" y2="220" class="hangman-drawing" />' : ''}
            </svg>
        `;
    }

    generateLetterButtons() {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const user = (window.firebase && window.firebase.auth) ? firebase.auth().currentUser : null;
        const isMyTurn = user && this.gameState.currentTurn === user.uid;
        return alphabet.split('').map(letter => {
            const isGuessed = this.gameState.guessedLetters.includes(letter);
            const isInWord = this.gameState.word.includes(letter);
            
            let buttonClass = 'letter-button bg-gray-200 text-gray-700 hover:bg-gray-300';
            if (isGuessed) {
                if (isInWord) {
                    buttonClass = 'letter-button bg-green-500 text-white cursor-not-allowed';
                } else {
                    buttonClass = 'letter-button bg-red-500 text-white cursor-not-allowed';
                }
            }
            
            return `
                <button onclick="game.guessLetter('${letter}')" 
                        class="${buttonClass} rounded-md font-bold" 
                        ${isGuessed || !isMyTurn ? 'disabled' : ''}>
                    ${letter}
                </button>
            `;
        }).join('');
    }

    async guessLetter(letter) {
        const gameId = this.currentGameId;
        const user = (window.firebase && window.firebase.auth) ? firebase.auth().currentUser : null;
        if (!user || !gameId) return;

        // Only act on your turn
        if (this.gameState.currentTurn !== user.uid) return;
        if (this.gameState.guessedLetters.includes(letter)) return;

        const gameRef = db.collection('games').doc(gameId);
        try {
            await db.runTransaction(async (tx) => {
                const doc = await tx.get(gameRef);
                if (!doc.exists) throw new Error('Game missing');
                const data = doc.data();
                if (data.currentTurn !== user.uid) throw new Error('Not your turn');
                if ((data.guessedLetters || []).includes(letter)) return;

                const guessedLetters = [...(data.guessedLetters || []), letter];
                let displayWord = [...(data.displayWord || [])];
                const word = data.word || '';
                let incorrectGuesses = data.incorrectGuesses || 0;

                if (word.includes(letter)) {
                    for (let i = 0; i < word.length; i++) {
                        if (word[i] === letter) displayWord[i] = letter;
                    }
                } else {
                    incorrectGuesses += 1;
                }

                // Determine next turn
                const playerIds = Object.keys(data.players || {});
                const currentIndex = Math.max(0, playerIds.indexOf(data.currentTurn));
                const nextIndex = (currentIndex + 1) % Math.max(1, playerIds.length);
                const nextTurn = playerIds[nextIndex] || data.currentTurn;

                // Determine status
                const hasUnderscore = displayWord.includes('_');
                const status = (!hasUnderscore) ? 'complete' : (incorrectGuesses >= 6 ? 'complete' : data.status);

                tx.update(gameRef, {
                    guessedLetters,
                    displayWord,
                    incorrectGuesses,
                    currentTurn: status === 'complete' ? data.currentTurn : nextTurn,
                    status
                });

                // Track game events
                if (window.va) {
                    if (status === 'complete') {
                        if (!hasUnderscore) {
                            window.va('track', 'Game Won', { gameId, incorrectGuesses });
                        } else {
                            window.va('track', 'Game Lost', { gameId, incorrectGuesses });
                        }
                    } else {
                        window.va('track', 'Letter Guessed', { 
                            gameId, 
                            letter, 
                            isCorrect: word.includes(letter),
                            incorrectGuesses 
                        });
                    }
                }
            });
        } catch (err) {
            console.error('Guess failed:', err);
        }
    }

    updateDisplayWord(letter) {
        // Find all positions where this letter appears in the word
        for (let i = 0; i < this.gameState.word.length; i++) {
            if (this.gameState.word[i] === letter) {
                this.gameState.displayWord[i] = letter;
            }
        }
    }

    updateGameDisplay() {
        // Update the word display
        const wordDisplay = document.querySelector('.text-4xl');
        if (wordDisplay) {
            wordDisplay.textContent = this.gameState.displayWord.join(' ');
        }
        
        // Update incorrect guesses counter
        const incorrectDisplay = document.querySelector('.text-red-600');
        if (incorrectDisplay) {
            incorrectDisplay.textContent = this.gameState.incorrectGuesses;
        }
        
        // Update guessed letters display
        const guessedDisplay = document.querySelector('.text-sm.text-gray-600 p');
        if (guessedDisplay) {
            guessedDisplay.textContent = `Guessed Letters: ${this.gameState.guessedLetters.join(', ') || 'None'}`;
        }
        
        // Update hangman drawing
        const hangmanContainer = document.querySelector('.w-80.h-80');
        if (hangmanContainer) {
            hangmanContainer.innerHTML = this.generateHangmanDrawing();
        }
        
        // Update letter buttons
        const letterButtons = document.querySelectorAll('.letter-button');
        letterButtons.forEach(button => {
            const letter = button.textContent.trim();
            const isGuessed = this.gameState.guessedLetters.includes(letter);
            const isInWord = this.gameState.word.includes(letter);
            
            if (isGuessed) {
                button.disabled = true;
                if (isInWord) {
                    button.className = 'letter-button bg-green-500 text-white cursor-not-allowed rounded-md font-bold';
                } else {
                    button.className = 'letter-button bg-red-500 text-white cursor-not-allowed rounded-md font-bold';
                }
            }
        });
    }

    checkGameEnd() {
        // Check for win condition - no underscores left
        const hasUnderscores = this.gameState.displayWord.includes('_');
        
        if (!hasUnderscores) {
            this.gameState.status = 'complete';
            this.showGameResult('win');
            return;
        }
        
        // Check for lose condition - 6 incorrect guesses
        if (this.gameState.incorrectGuesses >= 6) {
            this.gameState.status = 'complete';
            this.showGameResult('lose');
            return;
        }
    }

    showGameResult(result) {
        const gameContainer = document.getElementById('gameContainer');
        
        if (result === 'win') {
            gameContainer.innerHTML = `
                <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-3xl font-bold text-center mb-6 text-green-600">🎉 You Win! 🎉</h2>
                    <div class="text-center mb-6">
                        <p class="text-xl text-gray-700 mb-4">The word was: <span class="font-bold text-blue-600">${this.gameState.word}</span></p>
                        <p class="text-lg text-gray-600">Great job guessing all the letters!</p>
                    </div>
                    <div class="text-center">
                        <button onclick="game.showLobby()" 
                                class="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 game-button">
                            Play Again
                        </button>
                    </div>
                </div>
            `;
        } else if (result === 'lose') {
            gameContainer.innerHTML = `
                <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-3xl font-bold text-center mb-6 text-red-600"> Game Over 💀</h2>
                    <div class="text-center mb-6">
                        <p class="text-xl text-gray-700 mb-4">The word was: <span class="font-bold text-blue-600">${this.gameState.word}</span></p>
                        <p class="text-lg text-gray-600">Better luck next time!</p>
                    </div>
                    <div class="text-center">
                        <button onclick="game.showLobby()" 
                                class="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 game-button">
                            Play Again
                        </button>
                    </div>
                </div>
            `;
        }
    }

    async createGameInFirebase(gameId, playerName) {
        const gameData = {
            gameId: gameId,
            hostId: this.currentPlayer.id,
            hostName: playerName,
            status: 'lobby',
            players: {
                [this.currentPlayer.id]: {
                    name: playerName,
                    score: 0,
                    isHost: true
                }
            },
            word: '',
            guessedLetters: [],
            incorrectGuesses: 0,
            displayWord: [],
            currentTurn: null
        };
        
        try {
            await db.collection('games').doc(gameId).set(gameData);
            console.log('Game created in Firebase:', gameId);
            // Track game creation
            if (window.va) window.va('track', 'Game Created', { gameId });
            this.listenToGameChanges(gameId);
        } catch (error) {
            console.error('Error creating game:', error);
            console.error('Error details:', error.message);
            alert('Failed to create game. Please try again.');
        }
    }

    listenToGameChanges(gameId) {
        db.collection('games').doc(gameId).onSnapshot((doc) => {
            if (doc.exists) {
                const gameData = doc.data();
                this.gameState = gameData
                console.log('Game state updated from Firebase:', gameData);
                this.updateGameDisplayFromFirebase();
            } else {
                console.log('Game document does not exist');
            }
        })
    }

    updateGameDisplayFromFirebase() {
        if (this.gameState.status === 'lobby') {
            this.showWaitingRoom(this.gameState.gameId);
        } else if (this.gameState.status === 'in-progress') {
            this.showGameBoard();
        } else if (this.gameState.status === 'complete') {
            const hasUnderscores = this.gameState.displayWord.includes('_');
            if (hasUnderscores) {
                this.showGameResult('lose');
            } else {
                this.showGameResult('win');
            }
        }
    }
}

// Initialize the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new HangmanGame();
});