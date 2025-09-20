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
        this.isAdmin = false; // Track admin status
        this.init();
        this.createCustomAlert();
    }

    init() {
        console.log('Hangman game initialized!');
        this.showLobby();
        this.updateAuthStatus();
        
        // Start periodic cleanup of empty lobbies
        this.startPeriodicCleanup();
        
        // Add keyboard shortcut for admin access (Ctrl+Shift+A)
        this.setupAdminShortcut();
    }

    async updateAuthStatus() {
        const authStatusElement = document.getElementById('authStatus');
        if (!authStatusElement) return;
        
        try {
            const user = await this.waitForAuth();
            if (user) {
                authStatusElement.innerHTML = `
                    <div class="text-green-600">
                        ✅ Authenticated as: ${user.uid.substring(0, 8)}...
                    </div>
                `;
            } else {
                authStatusElement.innerHTML = `
                    <div class="text-red-600">
                        ❌ Authentication failed - Please refresh the page
                    </div>
                `;
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
            authStatusElement.innerHTML = `
                <div class="text-red-600">
                    ❌ Authentication error - Check console for details
                </div>
            `;
        }
    }

    async waitForAuth() {
        return new Promise((resolve) => {
            const auth = firebase.auth();
            
            console.log('Checking authentication status...');
            console.log('Current user:', auth.currentUser);
            console.log('Auth state:', auth.currentUser ? 'authenticated' : 'not authenticated');
            
            // If already authenticated, return immediately
            if (auth.currentUser) {
                console.log('User already authenticated:', auth.currentUser.uid);
                resolve(auth.currentUser);
                return;
            }
            
            // Wait for auth state to change
            const unsubscribe = auth.onAuthStateChanged((user) => {
                console.log('Auth state changed:', user ? 'authenticated' : 'not authenticated');
                if (user) {
                    console.log('User authenticated:', user.uid);
                }
                unsubscribe();
                resolve(user);
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                console.log('Authentication timeout');
                unsubscribe();
                resolve(null);
            }, 10000);
        });
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return `${diffInSeconds} seconds ago`;
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    showLobby() {
        // Clean up any active listeners
        if (this.gamesListener) {
            this.gamesListener();
            this.gamesListener = null;
        }
        this.gamesBrowserTracked = false;
        
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
                        <div class="text-center text-gray-500">or</div>
                        <button onclick="game.showGameBrowser()" 
                                class="w-full bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600 game-button">
                            Browse Available Games
                        </button>
                    </div>
                </div>
            `;
        }, 10);
    }

    async createGame() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            this.customAlert('Please enter your name!', 'error');
            return;
        }
        
        // Show loading state
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Creating game...';
        button.disabled = true;
        
        try {
            // Wait for authentication to complete
            const user = await this.waitForAuth();
            if (!user) {
                this.customAlert('Authentication failed. Please refresh and try again.', 'error');
                return;
            }
            
            // Generate a simple game ID
            const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            this.currentPlayer = {
                id: user.uid,
                name: playerName,
                isHost: true
            };
            this.currentGameId = gameId;
            
            // Create the game in Firebase
            await this.createGameInFirebase(gameId, playerName);
        } catch (error) {
            console.error('Error in createGame:', error);
            this.customAlert('Failed to create game. Please try again.', 'error');
        } finally {
            // Restore button state
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async joinGame() {
        const playerName = document.getElementById('playerName').value.trim();
        const gameId = document.getElementById('gameId').value.trim();
        
        if (!playerName || !gameId) {
            this.customAlert('Please enter both your name and game ID!', 'error');
            return;
        }
        
        // Show loading state
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Joining game...';
        button.disabled = true;
        
        try {
            await this.joinGameById(gameId, playerName);
        } catch (error) {
            console.error('Error in joinGame:', error);
            this.customAlert('Failed to join game. Please try again.', 'error');
        } finally {
            // Restore button state
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async joinGameById(gameId, playerName) {
        // Wait for authentication to complete
        const user = await this.waitForAuth();
        if (!user) {
            this.customAlert('Authentication failed. Please refresh and try again.', 'error');
            return;
        }

        console.log('User authenticated:', user.uid);
        console.log('Attempting to join game:', gameId);

        this.currentPlayer = { id: user.uid, name: playerName, isHost: false };
        this.currentGameId = gameId;

        try {
            const gameRef = db.collection('games').doc(gameId);
            const docSnap = await gameRef.get();
            if (!docSnap.exists) {
                this.customAlert('Game not found. Check the Game ID.');
                return;
            }
            
            // Check if game is still in lobby status
            const gameData = docSnap.data();
            if (gameData.status !== 'lobby') {
                this.customAlert('This game is no longer accepting new players.');
                return;
            }
            
            // Add/merge this player into players map
            await gameRef.update({
                [`players.${user.uid}`]: { name: playerName, score: 0, isHost: false },
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Joined game ${gameId} as ${playerName}`);
            // Track game join
            if (window.va) window.va('track', 'Game Joined', { gameId });
            this.listenToGameChanges(gameId);
        } catch (err) {
            console.error('Failed to join game:', err);
            console.error('Error details:', err.message);
            console.error('Error code:', err.code);
            
            let errorMessage = 'Failed to join game. Please try again.';
            if (err.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check your authentication.';
            } else if (err.code === 'unavailable') {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (err.code === 'unauthenticated') {
                errorMessage = 'Authentication required. Please refresh the page.';
            } else if (err.code === 'not-found') {
                errorMessage = 'Game not found. Please check the Game ID.';
            }
            
            this.customAlert(errorMessage);
        }
    }

    async showGameBrowser() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            this.customAlert('Please enter your name first!', 'error');
            return;
        }

        // Wait for authentication to complete
        const user = await this.waitForAuth();
        if (!user) {
            this.customAlert('Authentication failed. Please refresh and try again.', 'error');
            return;
        }

        const gameContainer = document.getElementById('gameContainer');
        gameContainer.innerHTML = `
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Available Games</h2>
                    <button onclick="game.showLobby()" 
                            class="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 game-button">
                        ← Back to Lobby
                    </button>
                </div>
                
                <div id="gamesList" class="space-y-4">
                    <div class="text-center text-gray-500">Loading games...</div>
                </div>
            </div>
        `;

        // Fetch and display available games
        await this.loadAvailableGames(playerName);
    }

    async loadAvailableGames(playerName) {
        try {
            // First, clean up any stale games
            await this.cleanupStaleGames();
            
            // Set up real-time listener for games in lobby
            this.gamesListener = db.collection('games')
                .where('status', '==', 'lobby')
                .orderBy('hostName')
                .limit(20)
                .onSnapshot((snapshot) => {
                    this.updateGamesList(snapshot, playerName);
                }, (error) => {
                    console.error('Error listening to games:', error);
                    console.error('Error details:', error.message);
                    console.error('Error code:', error.code);
                    
                    let errorMessage = 'Failed to load games. Please try again.';
                    if (error.code === 'permission-denied') {
                        errorMessage = 'Permission denied. Please check your authentication.';
                    } else if (error.code === 'unavailable') {
                        errorMessage = 'Service temporarily unavailable. Please try again later.';
                    } else if (error.code === 'unauthenticated') {
                        errorMessage = 'Authentication required. Please refresh the page.';
                    }
                    
                    document.getElementById('gamesList').innerHTML = `
                        <div class="text-center text-red-500 py-8">
                            <p>${errorMessage}</p>
                            <button onclick="game.showLobby()" 
                                    class="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 game-button mt-4">
                                Back to Lobby
                            </button>
                        </div>
                    `;
                });

        } catch (error) {
            console.error('Error setting up games listener:', error);
            console.error('Error details:', error.message);
            console.error('Error code:', error.code);
            
            let errorMessage = 'Failed to load games. Please try again.';
            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check your authentication.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (error.code === 'unauthenticated') {
                errorMessage = 'Authentication required. Please refresh the page.';
            }
            
            document.getElementById('gamesList').innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <p>${errorMessage}</p>
                    <button onclick="game.showLobby()" 
                            class="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 game-button mt-4">
                        Back to Lobby
                    </button>
                </div>
            `;
        }
    }

    async cleanupStaleGames() {
        try {
            // Find games that are either completed or haven't been active for 30 minutes
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            
            // Clean up completed games
            const completedGames = await db.collection('games')
                .where('status', '==', 'complete')
                .get();
            
            const completedBatch = db.batch();
            completedGames.docs.forEach(doc => {
                completedBatch.delete(doc.ref);
            });
            
            if (!completedGames.empty) {
                await completedBatch.commit();
                console.log(`Cleaned up ${completedGames.size} completed games`);
            }
            
            // Clean up stale lobby games (older than 30 minutes or no recent activity)
            const staleGames = await db.collection('games')
                .where('status', '==', 'lobby')
                .get();
            
            const staleBatch = db.batch();
            let staleCount = 0;
            
            staleGames.docs.forEach(doc => {
                const gameData = doc.data();
                const createdAt = gameData.createdAt?.toDate();
                const lastActivity = gameData.lastActivity?.toDate();
                
                // Delete if created more than 30 minutes ago OR no activity in last 30 minutes
                const isStale = (createdAt && createdAt < thirtyMinutesAgo) || 
                               (lastActivity && lastActivity < thirtyMinutesAgo) ||
                               (!lastActivity && createdAt && createdAt < thirtyMinutesAgo);
                
                if (isStale) {
                    staleBatch.delete(doc.ref);
                    staleCount++;
                }
            });
            
            if (staleCount > 0) {
                await staleBatch.commit();
                console.log(`Cleaned up ${staleCount} stale games`);
            }
            
        } catch (error) {
            console.error('Error cleaning up stale games:', error);
        }
    }

    updateGamesList(snapshot, playerName) {
        const gamesList = document.getElementById('gamesList');
        
        if (snapshot.empty) {
            gamesList.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <p class="text-lg mb-4">No games available right now.</p>
                    <button onclick="game.showLobby()" 
                            class="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 game-button">
                        Create a New Game
                    </button>
                </div>
            `;
            return;
        }

        // Filter out idle games (older than 30 minutes or no recent activity)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const activeGames = snapshot.docs.filter(doc => {
            const gameData = doc.data();
            const createdAt = gameData.createdAt?.toDate();
            const lastActivity = gameData.lastActivity?.toDate();
            
            // Keep games that are recent or have recent activity
            return (createdAt && createdAt > thirtyMinutesAgo) || 
                   (lastActivity && lastActivity > thirtyMinutesAgo);
        });

        if (activeGames.length === 0) {
            gamesList.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <p class="text-lg mb-4">No active games available right now.</p>
                    <button onclick="game.showLobby()" 
                            class="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 game-button">
                        Create a New Game
                    </button>
                </div>
            `;
            return;
        }

        const gamesHtml = activeGames.map(doc => {
            const gameData = doc.data();
            const gameId = doc.id;
            const playerCount = Object.keys(gameData.players || {}).length;
            const hostName = gameData.hostName || 'Unknown';
            
            // Calculate time since creation for display
            const createdAt = gameData.createdAt?.toDate();
            const timeAgo = createdAt ? this.getTimeAgo(createdAt) : 'Unknown';
            
            return `
                <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                    <div class="flex-1">
                        <div class="flex items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg">Game ${gameId}</h3>
                                <p class="text-gray-600">Host: ${hostName}</p>
                                <p class="text-xs text-gray-400">Created ${timeAgo}</p>
                            </div>
                            <div class="text-sm text-gray-500">
                                <p>Players: ${playerCount}</p>
                                <p>Status: Waiting for players</p>
                            </div>
                        </div>
                    </div>
                    <button onclick="game.joinGameById('${gameId}', '${playerName}')" 
                            class="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 game-button">
                        Join Game
                    </button>
                </div>
            `;
        }).join('');

        gamesList.innerHTML = gamesHtml;

        // Track game browser usage (only on first load)
        if (window.va && !this.gamesBrowserTracked) {
            window.va('track', 'Game Browser Viewed', { gameCount: activeGames.length });
            this.gamesBrowserTracked = true;
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
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Waiting Room</h2>
                    <button onclick="game.leaveGame()" 
                            class="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 game-button">
                        ← Back to Lobby
                    </button>
                </div>
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

    async startGame() {
        // Wait for authentication to complete
        const user = await this.waitForAuth();
        if (!user || user.uid !== this.gameState.hostId) {
            this.customAlert('Only the host can start the game.');
            return;
        }
        const gameContainer = document.getElementById('gameContainer');
        gameContainer.innerHTML = `
            <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Set the Word</h2>
                    <button onclick="game.leaveGame()" 
                            class="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 game-button">
                        ← Back to Lobby
                    </button>
                </div>
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
            this.customAlert('Please enter a word!');
            return;
        }
        
        // Validate that the word contains only letters and spaces
        const isValidWord = /^[A-Z\s]+$/.test(secretWord);
        
        if (!isValidWord) {
            this.customAlert('Please enter only letters and spaces! Numbers and special characters are not allowed.');
            return;
        }
        
        const gameId = this.currentGameId;
        
        // Wait for authentication to complete
        const user = await this.waitForAuth();
        if (!user || !gameId) {
            this.customAlert('Authentication failed or missing game context.');
            return;
        }
        
        // Only host can set the word
        if (user.uid !== this.gameState.hostId) {
            this.customAlert('Only the host can start the game.');
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
                incorrectGuesses: 0,
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Game started with word:', secretWord);
            // Track game start
            if (window.va) window.va('track', 'Game Started', { gameId, wordLength: secretWord.length });
        } catch (err) {
            console.error('Failed to start game:', err);
            console.error('Error details:', err.message);
            console.error('Error code:', err.code);
            
            let errorMessage = 'Failed to start game. Please try again.';
            if (err.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check your authentication.';
            } else if (err.code === 'unavailable') {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (err.code === 'unauthenticated') {
                errorMessage = 'Authentication required. Please refresh the page.';
            }
            
            this.customAlert(errorMessage);
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
                    name: playerName, // Only display name, no personal info
                    score: 0,
                    isHost: true
                }
            },
            word: '',
            guessedLetters: [],
            incorrectGuesses: 0,
            displayWord: [],
            currentTurn: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
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
            console.error('Error code:', error.code);
            
            let errorMessage = 'Failed to create game. Please try again.';
            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check your authentication.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (error.code === 'unauthenticated') {
                errorMessage = 'Authentication required. Please refresh the page.';
            }
            
            this.customAlert(errorMessage);
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
            
            // Auto-cleanup completed games after 30 seconds
            setTimeout(() => {
                this.cleanupCompletedGame();
            }, 30000);
        }
    }

    async cleanupCompletedGame() {
        if (!this.currentGameId) return;
        
        try {
            await db.collection('games').doc(this.currentGameId).delete();
            console.log('Cleaned up completed game:', this.currentGameId);
        } catch (error) {
            console.error('Failed to cleanup game:', error);
        }
    }

    async showAdminPanel() {
        // Check if user is already authenticated as admin
        if (!this.isAdmin) {
            const password = prompt('Enter admin password:');
            if (!password) {
                return; // User cancelled
            }
            
            // Simple password check - you can change this password
            const adminPassword = 'himalayasMomoManager29'; // CHANGE THIS PASSWORD!
            
            if (password !== adminPassword) {
                this.customAlert('Incorrect password. Access denied.', 'error');
                return;
            }
            
            // Set admin status for this session
            this.isAdmin = true;
            console.log('Admin access granted');
        }
        
        const gameContainer = document.getElementById('gameContainer');
        gameContainer.innerHTML = `
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-red-600">Admin Panel</h2>
                        <p class="text-sm text-green-600">✅ Admin Access Granted</p>
                    </div>
                    <div class="space-x-2">
                        <button onclick="game.logoutAdmin()" 
                                class="bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 game-button">
                            Logout Admin
                        </button>
                        <button onclick="game.showLobby()" 
                                class="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 game-button">
                            Back to Lobby
                        </button>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-red-800 mb-2">Danger Zone</h3>
                        <p class="text-red-600 mb-4">These actions will permanently delete data from the database.</p>
                        
                        <div class="space-y-3">
                            <button onclick="game.deleteAllGames()" 
                                    class="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 game-button">
                                Delete All Games
                            </button>
                            
                            <button onclick="game.deleteCompletedGames()" 
                                    class="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 game-button">
                                Delete Completed Games Only
                            </button>
                            
                        <button onclick="game.deleteStaleGames()" 
                                class="bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 game-button">
                            Delete Stale Games (30+ min old)
                        </button>
                        
                        <button onclick="game.testFirebasePermissions()" 
                                class="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 game-button">
                            Test Firebase Permissions
                        </button>
                        
                        <button onclick="game.cleanupEmptyLobbies()" 
                                class="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 game-button">
                            Clean Empty Lobbies Now
                        </button>
                    </div>
                </div>
                    
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-blue-800 mb-2">Database Statistics</h3>
                        <div id="dbStats" class="text-gray-600">
                            <p>Loading database statistics...</p>
                        </div>
                        <button onclick="game.loadDatabaseStats()" 
                                class="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 game-button mt-2">
                            Refresh Stats
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Load initial stats
        this.loadDatabaseStats();
    }

    async loadDatabaseStats() {
        const statsElement = document.getElementById('dbStats');
        if (!statsElement) return;
        
        statsElement.innerHTML = '<p>Loading database statistics...</p>';
        
        try {
            // Get all games
            const allGames = await db.collection('games').get();
            const completedGames = allGames.docs.filter(doc => doc.data().status === 'complete');
            const lobbyGames = allGames.docs.filter(doc => doc.data().status === 'lobby');
            const inProgressGames = allGames.docs.filter(doc => doc.data().status === 'in-progress');
            
            // Count stale games
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const staleGames = allGames.docs.filter(doc => {
                const gameData = doc.data();
                const createdAt = gameData.createdAt?.toDate();
                const lastActivity = gameData.lastActivity?.toDate();
                
                return (createdAt && createdAt < thirtyMinutesAgo) || 
                       (lastActivity && lastActivity < thirtyMinutesAgo);
            });
            
            statsElement.innerHTML = `
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p><strong>Total Games:</strong> ${allGames.size}</p>
                        <p><strong>Completed:</strong> ${completedGames.length}</p>
                        <p><strong>In Lobby:</strong> ${lobbyGames.length}</p>
                    </div>
                    <div>
                        <p><strong>In Progress:</strong> ${inProgressGames.length}</p>
                        <p><strong>Stale Games:</strong> ${staleGames.length}</p>
                        <p><strong>Last Updated:</strong> ${new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading database stats:', error);
            statsElement.innerHTML = '<p class="text-red-600">Error loading statistics</p>';
        }
    }

    async deleteAllGames() {
        const confirmed = await this.customConfirm('Are you sure you want to delete ALL games? This action cannot be undone!', 'Delete All Games');
        if (!confirmed) {
            return;
        }
        
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Deleting all games...';
        button.disabled = true;
        
        try {
            const allGames = await db.collection('games').get();
            const batch = db.batch();
            
            allGames.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            if (!allGames.empty) {
                await batch.commit();
                this.customAlert(`Successfully deleted ${allGames.size} games from the database.`, 'success');
                console.log(`Deleted ${allGames.size} games from database`);
            } else {
                this.customAlert('No games found to delete.', 'info');
            }
            
            // Refresh stats
            this.loadDatabaseStats();
        } catch (error) {
            console.error('Error deleting all games:', error);
            this.customAlert('Failed to delete games. Please try again.', 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async deleteCompletedGames() {
        if (!confirm('Are you sure you want to delete all completed games?')) {
            return;
        }
        
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Deleting completed games...';
        button.disabled = true;
        
        try {
            const completedGames = await db.collection('games')
                .where('status', '==', 'complete')
                .get();
            
            const batch = db.batch();
            completedGames.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            if (!completedGames.empty) {
                await batch.commit();
                this.customAlert(`Successfully deleted ${completedGames.size} completed games.`);
                console.log(`Deleted ${completedGames.size} completed games`);
            } else {
                this.customAlert('No completed games found to delete.');
            }
            
            // Refresh stats
            this.loadDatabaseStats();
        } catch (error) {
            console.error('Error deleting completed games:', error);
            this.customAlert('Failed to delete completed games. Please try again.');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async deleteStaleGames() {
        if (!confirm('Are you sure you want to delete all stale games (older than 30 minutes)?')) {
            return;
        }
        
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Deleting stale games...';
        button.disabled = true;
        
        try {
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const allGames = await db.collection('games').get();
            
            const staleGames = allGames.docs.filter(doc => {
                const gameData = doc.data();
                const createdAt = gameData.createdAt?.toDate();
                const lastActivity = gameData.lastActivity?.toDate();
                
                return (createdAt && createdAt < thirtyMinutesAgo) || 
                       (lastActivity && lastActivity < thirtyMinutesAgo);
            });
            
            const batch = db.batch();
            staleGames.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            if (staleGames.length > 0) {
                await batch.commit();
                this.customAlert(`Successfully deleted ${staleGames.length} stale games.`);
                console.log(`Deleted ${staleGames.length} stale games`);
            } else {
                this.customAlert('No stale games found to delete.');
            }
            
            // Refresh stats
            this.loadDatabaseStats();
        } catch (error) {
            console.error('Error deleting stale games:', error);
            this.customAlert('Failed to delete stale games. Please try again.');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async testFirebasePermissions() {
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Testing permissions...';
        button.disabled = true;
        
        try {
            console.log('=== FIREBASE PERMISSION TEST ===');
            
            // Test 1: Check authentication
            const user = await this.waitForAuth();
            console.log('Test 1 - Authentication:', user ? `✅ User: ${user.uid}` : '❌ No user');
            
            if (!user) {
                this.customAlert('❌ Authentication failed. Please refresh the page and try again.');
                return;
            }
            
            // Test 2: Try to read games collection
            console.log('Test 2 - Reading games collection...');
            try {
                const gamesSnapshot = await db.collection('games').limit(1).get();
                console.log('Test 2 - Read games:', `✅ Success - Found ${gamesSnapshot.size} games`);
            } catch (error) {
                console.log('Test 2 - Read games:', `❌ Failed - ${error.code}: ${error.message}`);
            }
            
            // Test 3: Try to create a test document
            console.log('Test 3 - Creating test document...');
            try {
                const testDocRef = db.collection('games').doc('test-permission');
                await testDocRef.set({
                    test: true,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    userId: user.uid
                });
                console.log('Test 3 - Create document:', '✅ Success');
                
                // Clean up test document
                await testDocRef.delete();
                console.log('Test 3 - Cleanup:', '✅ Success');
            } catch (error) {
                console.log('Test 3 - Create document:', `❌ Failed - ${error.code}: ${error.message}`);
            }
            
            // Test 4: Try to update an existing document
            console.log('Test 4 - Updating document...');
            try {
                const testDocRef = db.collection('games').doc('test-update');
                await testDocRef.set({ test: true, userId: user.uid });
                await testDocRef.update({ updated: true });
                console.log('Test 4 - Update document:', '✅ Success');
                
                // Clean up
                await testDocRef.delete();
            } catch (error) {
                console.log('Test 4 - Update document:', `❌ Failed - ${error.code}: ${error.message}`);
            }
            
            this.customAlert('Permission test completed! Check the browser console for detailed results.', 'success');
            
        } catch (error) {
            console.error('Permission test failed:', error);
            this.customAlert('Permission test failed. Check the browser console for details.', 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    logoutAdmin() {
        this.isAdmin = false;
        console.log('Admin logged out');
        this.showLobby();
    }

    async leaveGame() {
        if (!this.currentGameId) {
            this.showLobby();
            return;
        }

        try {
            const user = await this.waitForAuth();
            if (user) {
                const gameRef = db.collection('games').doc(this.currentGameId);
                
                // Get current game data to check if it will be empty
                const gameDoc = await gameRef.get();
                if (gameDoc.exists) {
                    const gameData = gameDoc.data();
                    const currentPlayers = gameData.players || {};
                    
                    // Remove player from the game
                    await gameRef.update({
                        [`players.${user.uid}`]: firebase.firestore.FieldValue.delete(),
                        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Check if lobby will be empty after removing this player
                    const remainingPlayers = Object.keys(currentPlayers).filter(uid => uid !== user.uid);
                    
                    if (remainingPlayers.length === 0) {
                        // Delete the empty game
                        await gameRef.delete();
                        console.log('Deleted empty lobby:', this.currentGameId);
                    } else {
                        console.log('Left game:', this.currentGameId, 'Remaining players:', remainingPlayers.length);
                    }
                }
            }
        } catch (error) {
            console.error('Error leaving game:', error);
        } finally {
            // Clean up local state
            this.currentGameId = null;
            this.currentPlayer = null;
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
            
            // Return to lobby
            this.showLobby();
        }
    }

    startPeriodicCleanup() {
        // Run cleanup every 2 minutes
        setInterval(() => {
            this.cleanupEmptyLobbies();
        }, 120000); // 2 minutes
        
        // Also run cleanup when the page becomes visible (user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.cleanupEmptyLobbies();
            }
        });
    }

    async cleanupEmptyLobbies() {
        try {
            console.log('Running cleanup of empty lobbies...');
            
            // Get all lobby games
            const lobbyGames = await db.collection('games')
                .where('status', '==', 'lobby')
                .get();
            
            const batch = db.batch();
            let deletedCount = 0;
            
            lobbyGames.docs.forEach(doc => {
                const gameData = doc.data();
                const players = gameData.players || {};
                
                // If no players, mark for deletion
                if (Object.keys(players).length === 0) {
                    batch.delete(doc.ref);
                    deletedCount++;
                }
            });
            
            if (deletedCount > 0) {
                await batch.commit();
                console.log(`Cleaned up ${deletedCount} empty lobbies`);
                
                // Show user-friendly message if called from admin panel
                if (event && event.target) {
                    this.customAlert(`Cleaned up ${deletedCount} empty lobbies!`, 'success');
                    // Refresh stats
                    this.loadDatabaseStats();
                }
            } else {
                console.log('No empty lobbies found');
                
                // Show user-friendly message if called from admin panel
                if (event && event.target) {
                    this.customAlert('No empty lobbies found - database is clean!', 'success');
                }
            }
            
        } catch (error) {
            console.error('Error during cleanup:', error);
            
            // Show error message if called from admin panel
            if (event && event.target) {
                this.customAlert('Error cleaning up empty lobbies. Check console for details.', 'error');
            }
        }
    }

    createCustomAlert() {
        // Create custom alert modal
        const alertHTML = `
            <div id="customAlert" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95 opacity-0" id="alertModal">
                    <div class="p-6">
                        <div class="flex items-center mb-4">
                            <div id="alertIcon" class="mr-3 text-2xl">⚠️</div>
                            <h3 id="alertTitle" class="text-lg font-semibold text-gray-900">Alert</h3>
                        </div>
                        <p id="alertMessage" class="text-gray-600 mb-6">This is a custom alert message.</p>
                        <div class="flex justify-end space-x-3">
                            <button id="alertCancel" class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors hidden">
                                Cancel
                            </button>
                            <button id="alertConfirm" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body if not already there
        if (!document.getElementById('customAlert')) {
            document.body.insertAdjacentHTML('beforeend', alertHTML);
        }
    }

    showCustomAlert(message, title = 'Alert', type = 'info', showCancel = false) {
        return new Promise((resolve) => {
            const alertModal = document.getElementById('customAlert');
            const modalContent = document.getElementById('alertModal');
            const alertIcon = document.getElementById('alertIcon');
            const alertTitle = document.getElementById('alertTitle');
            const alertMessage = document.getElementById('alertMessage');
            const alertCancel = document.getElementById('alertCancel');
            const alertConfirm = document.getElementById('alertConfirm');

            // Set content
            alertTitle.textContent = title;
            alertMessage.textContent = message;

            // Set icon and colors based on type
            switch (type) {
                case 'success':
                    alertIcon.textContent = '✅';
                    alertConfirm.className = 'px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors';
                    break;
                case 'error':
                    alertIcon.textContent = '❌';
                    alertConfirm.className = 'px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors';
                    break;
                case 'warning':
                    alertIcon.textContent = '⚠️';
                    alertConfirm.className = 'px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors';
                    break;
                case 'info':
                default:
                    alertIcon.textContent = 'ℹ️';
                    alertConfirm.className = 'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors';
                    break;
            }

            // Show/hide cancel button
            if (showCancel) {
                alertCancel.classList.remove('hidden');
                alertCancel.textContent = 'Cancel';
            } else {
                alertCancel.classList.add('hidden');
            }

            // Show modal with animation
            alertModal.classList.remove('hidden');
            setTimeout(() => {
                modalContent.classList.remove('scale-95', 'opacity-0');
                modalContent.classList.add('scale-100', 'opacity-100');
            }, 10);

            // Event handlers
            const handleConfirm = () => {
                hideAlert();
                resolve(true);
            };

            const handleCancel = () => {
                hideAlert();
                resolve(false);
            };

            const hideAlert = () => {
                modalContent.classList.remove('scale-100', 'opacity-100');
                modalContent.classList.add('scale-95', 'opacity-0');
                setTimeout(() => {
                    alertModal.classList.add('hidden');
                }, 300);
            };

            // Remove old event listeners
            alertConfirm.replaceWith(alertConfirm.cloneNode(true));
            alertCancel.replaceWith(alertCancel.cloneNode(true));

            // Add new event listeners
            document.getElementById('alertConfirm').addEventListener('click', handleConfirm);
            document.getElementById('alertCancel').addEventListener('click', handleCancel);

            // Close on backdrop click
            alertModal.addEventListener('click', (e) => {
                if (e.target === alertModal) {
                    handleCancel();
                }
            });

            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    // Custom alert function that replaces window.alert
    customAlert(message, type = 'info') {
        return this.showCustomAlert(message, 'Alert', type, false);
    }

    // Custom confirm function that replaces window.confirm
    customConfirm(message, title = 'Confirm') {
        return this.showCustomAlert(message, title, 'warning', true);
    }

    setupAdminShortcut() {
        // Add keyboard shortcut for admin access (Ctrl+Shift+A)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.showAdminPanel();
            }
        });
    }
}

// Initialize the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new HangmanGame();
});