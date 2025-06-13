class Game2048 {
    constructor() {
        this.size = 4; // Default board size
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.gameOver = false;
        this.won = false;
        this.moves = 0;
        this.startTime = null;
        this.timer = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.gridContainer = document.querySelector('.grid-container');
        this.previousStates = [];
        this.maxUndoStates = 10;
        
        // Settings
        this.settings = {
            soundEnabled: true,
            animationsEnabled: true,
            autoSave: true,
            theme: 'light'
        };
        
        // Statistics
        this.stats = {
            totalGames: 0,
            gamesWon: 0,
            totalScore: 0,
            highestTile: 0,
            totalMoves: 0,
            totalTime: 0
        };
        
        // Achievements
        this.achievements = [
            { id: 'firstMove', name: 'First Steps', description: 'Make your first move', icon: '👶', unlocked: false },
            { id: 'reach128', name: '128 Club', description: 'Reach the 128 tile', icon: '🎯', unlocked: false },
            { id: 'reach512', name: 'Half Way There', description: 'Reach the 512 tile', icon: '🚀', unlocked: false },
            { id: 'reach1024', name: 'Almost There!', description: 'Reach the 1024 tile', icon: '⭐', unlocked: false },
            { id: 'reach2048', name: 'Winner!', description: 'Reach the 2048 tile', icon: '🏆', unlocked: false },
            { id: 'reach4096', name: 'Overachiever', description: 'Reach the 4096 tile', icon: '💎', unlocked: false },
            { id: 'speed100', name: 'Speed Demon', description: 'Win in under 100 moves', icon: '⚡', unlocked: false },
            { id: 'under5min', name: 'Quick Thinker', description: 'Win in under 5 minutes', icon: '⏱️', unlocked: false },
            { id: 'combo5', name: 'Combo Master', description: 'Merge 5+ tiles in one move', icon: '🔥', unlocked: false },
            { id: 'games10', name: 'Dedicated Player', description: 'Play 10 games', icon: '🎮', unlocked: false }
        ];
        
        this.loadData();
        this.initializeGrid();
        this.setupEventListeners();
        this.loadTheme();
        this.setupNewGame();
        this.initializeAudio();
    }

    initializeGrid() {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
    }

    loadData() {
        // Load settings
        const savedSettings = localStorage.getItem('game2048-settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        
        // Load statistics
        const savedStats = localStorage.getItem('game2048-stats');
        if (savedStats) {
            this.stats = { ...this.stats, ...JSON.parse(savedStats) };
        }
        
        // Load achievements
        const savedAchievements = localStorage.getItem('game2048-achievements');
        if (savedAchievements) {
            const saved = JSON.parse(savedAchievements);
            this.achievements = this.achievements.map(achievement => {
                const savedAchievement = saved.find(a => a.id === achievement.id);
                return savedAchievement ? { ...achievement, unlocked: savedAchievement.unlocked } : achievement;
            });
        }
        
        // Load game state if auto-save is enabled
        if (this.settings.autoSave) {
            const savedGame = localStorage.getItem('game2048-state');
            if (savedGame) {
                const gameState = JSON.parse(savedGame);
                this.size = gameState.size || 4;
                this.score = gameState.score || 0;
                this.moves = gameState.moves || 0;
                if (gameState.grid && gameState.grid.length === this.size) {
                    this.grid = gameState.grid;
                }
            }
        }
    }

    saveData() {
        localStorage.setItem('game2048-settings', JSON.stringify(this.settings));
        localStorage.setItem('game2048-stats', JSON.stringify(this.stats));
        localStorage.setItem('game2048-achievements', JSON.stringify(this.achievements));
        
        if (this.settings.autoSave) {
            const gameState = {
                size: this.size,
                grid: this.grid,
                score: this.score,
                moves: this.moves
            };
            localStorage.setItem('game2048-state', JSON.stringify(gameState));
        }
    }

    initializeAudio() {
        this.sounds = {
            move: this.createSound(440, 0.1, 'sine'),
            merge: this.createSound(880, 0.15, 'triangle'),
            win: this.createSound([523, 659, 784], 0.3, 'sine'),
            achievement: this.createSound([659, 784, 1047], 0.25, 'square')
        };
    }

    createSound(frequency, duration, type = 'sine') {
        return () => {
            if (!this.settings.soundEnabled) return;
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const frequencies = Array.isArray(frequency) ? frequency : [frequency];
            
            frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime + index * 0.1);
                oscillator.stop(audioContext.currentTime + duration + index * 0.1);
            });
        };
    }

    setBoardSize(newSize) {
        this.size = newSize;
        this.initializeGrid();
        this.gridContainer.className = `grid-container size-${this.size}`;
        this.setupNewGame();
        this.saveData();
    }

    setupNewGame() {
        this.initializeGrid();
        this.score = 0;
        this.gameOver = false;
        this.won = false;
        this.moves = 0;
        this.previousStates = [];
        this.addNewTile();
        this.addNewTile();
        this.updateDisplay();
        document.querySelector('.game-over-overlay').classList.remove('active');
        document.querySelector('.win-overlay').classList.remove('active');
        this.startTimer();
        this.saveData();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        // Touch controls
        this.gridContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.gridContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        
        // Game control buttons
        document.getElementById('new-game').addEventListener('click', () => this.setupNewGame());
        document.getElementById('try-again').addEventListener('click', () => this.setupNewGame());
        document.getElementById('keep-playing').addEventListener('click', () => {
            document.querySelector('.win-overlay').classList.remove('active');
        });
        document.getElementById('new-game-win').addEventListener('click', () => this.setupNewGame());
        document.getElementById('share-score').addEventListener('click', () => this.shareScore());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        
        // New feature buttons
        document.getElementById('settings-btn').addEventListener('click', () => this.showModal('settings'));
        document.getElementById('stats-btn').addEventListener('click', () => this.showModal('stats'));
        document.getElementById('achievements-btn').addEventListener('click', () => this.showModal('achievements'));
        
        // Board size buttons
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.setBoardSize(parseInt(e.target.dataset.size));
            });
        });
        
        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('show');
            });
        });
        
        // Settings event listeners
        document.getElementById('theme-selector').addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });
        
        document.getElementById('sound-toggle').addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
            this.saveData();
        });
        
        document.getElementById('animations-toggle').addEventListener('change', (e) => {
            this.settings.animationsEnabled = e.target.checked;
            this.saveData();
        });
        
        document.getElementById('autosave-toggle').addEventListener('change', (e) => {
            this.settings.autoSave = e.target.checked;
            this.saveData();
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    showModal(type) {
        const modal = document.getElementById(`${type}-modal`);
        if (type === 'stats') {
            this.updateStatsDisplay();
        } else if (type === 'achievements') {
            this.updateAchievementsDisplay();
        } else if (type === 'settings') {
            this.updateSettingsDisplay();
        }
        modal.classList.add('show');
    }

    updateSettingsDisplay() {
        document.getElementById('theme-selector').value = this.settings.theme;
        document.getElementById('sound-toggle').checked = this.settings.soundEnabled;
        document.getElementById('animations-toggle').checked = this.settings.animationsEnabled;
        document.getElementById('autosave-toggle').checked = this.settings.autoSave;
    }

    updateStatsDisplay() {
        document.getElementById('total-games').textContent = this.stats.totalGames;
        document.getElementById('games-won').textContent = this.stats.gamesWon;
        document.getElementById('win-rate').textContent = 
            this.stats.totalGames > 0 ? Math.round((this.stats.gamesWon / this.stats.totalGames) * 100) + '%' : '0%';
        document.getElementById('highest-tile').textContent = this.stats.highestTile;
        document.getElementById('total-score').textContent = this.stats.totalScore.toLocaleString();
        document.getElementById('avg-score').textContent = 
            this.stats.totalGames > 0 ? Math.round(this.stats.totalScore / this.stats.totalGames).toLocaleString() : '0';
    }

    updateAchievementsDisplay() {
        const container = document.getElementById('achievements-list');
        container.innerHTML = '';
        
        this.achievements.forEach(achievement => {
            const div = document.createElement('div');
            div.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            div.innerHTML = `
                <span class="achievement-icon-large">${achievement.icon}</span>
                <div class="achievement-details">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                </div>
            `;
            container.appendChild(div);
        });
    }

    loadTheme() {
        const theme = this.settings.theme || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }

    setTheme(theme) {
        this.settings.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        this.saveData();
    }

    toggleTheme() {
        const themes = ['light', 'dark', 'neon', 'retro', 'nature'];
        const currentTheme = this.settings.theme;
        const currentIndex = themes.indexOf(currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        this.setTheme(nextTheme);
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.startTime = Date.now();
        this.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('time').textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    saveState() {
        if (this.previousStates.length >= this.maxUndoStates) {
            this.previousStates.shift();
        }
        this.previousStates.push({
            grid: JSON.parse(JSON.stringify(this.grid)),
            score: this.score,
            moves: this.moves
        });
    }

    undo() {
        if (this.previousStates.length > 0) {
            const previousState = this.previousStates.pop();
            this.grid = previousState.grid;
            this.score = previousState.score;
            this.moves = previousState.moves;
            this.updateDisplay();
        }
    }

    shareScore() {
        const text = `I scored ${this.score} points in 2048! Can you beat my score?`;
        if (navigator.share) {
            navigator.share({
                title: '2048 Game Score',
                text: text
            });
        } else {
            navigator.clipboard.writeText(text).then(() => {
                this.showAchievementNotification('Score copied to clipboard!');
            });
        }
    }

    checkAchievements() {
        // Check tile-based achievements
        const maxTile = Math.max(...this.grid.flat());
        const tileAchievements = [
            { tile: 128, id: 'reach128' },
            { tile: 512, id: 'reach512' },
            { tile: 1024, id: 'reach1024' },
            { tile: 2048, id: 'reach2048' },
            { tile: 4096, id: 'reach4096' }
        ];
        
        tileAchievements.forEach(({ tile, id }) => {
            if (maxTile >= tile) {
                this.unlockAchievement(id);
            }
        });
        
        // Check move-based achievements
        if (this.moves === 1) {
            this.unlockAchievement('firstMove');
        }
        
        if (this.won && this.moves < 100) {
            this.unlockAchievement('speed100');
        }
        
        const elapsedMinutes = (Date.now() - this.startTime) / 60000;
        if (this.won && elapsedMinutes < 5) {
            this.unlockAchievement('under5min');
        }
        
        if (this.stats.totalGames >= 10) {
            this.unlockAchievement('games10');
        }
    }

    unlockAchievement(id) {
        const achievement = this.achievements.find(a => a.id === id);
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            this.showAchievementNotification(`Achievement Unlocked: ${achievement.name}!`);
            this.sounds.achievement();
            this.saveData();
        }
    }

    showAchievementNotification(text) {
        const notification = document.getElementById('achievement-notification');
        const textElement = notification.querySelector('.achievement-text');
        textElement.textContent = text;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    handleKeyPress(event) {
        if (this.gameOver) return;

        this.saveState();
        let moved = false;
        
        switch(event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                event.preventDefault();
                moved = this.moveUp();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                event.preventDefault();
                moved = this.moveDown();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                event.preventDefault();
                moved = this.moveLeft();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                event.preventDefault();
                moved = this.moveRight();
                break;
            default:
                return;
        }

        if (moved) {
            this.processMoveResult();
        } else {
            this.previousStates.pop(); // Remove the saved state if no move was made
        }
    }

    processMoveResult() {
        this.moves++;
        this.addNewTile();
        this.updateDisplay();
        this.checkAchievements();
        this.sounds.move();
        
        if (this.checkWin()) {
            this.won = true;
            this.endGame(true);
        } else if (this.isGameOver()) {
            this.gameOver = true;
            this.endGame(false);
        }
        
        this.saveData();
    }

    handleTouchStart(event) {
        if (this.gameOver) return;
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
    }

    handleTouchMove(event) {
        if (this.gameOver) return;
        event.preventDefault();

        const touchEndX = event.touches[0].clientX;
        const touchEndY = event.touches[0].clientY;
        
        const dx = touchEndX - this.touchStartX;
        const dy = touchEndY - this.touchStartY;
        
        const minSwipeDistance = 30;
        
        if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) {
            return;
        }

        this.saveState();
        let moved = false;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                moved = this.moveRight();
            } else {
                moved = this.moveLeft();
            }
        } else {
            if (dy > 0) {
                moved = this.moveDown();
            } else {
                moved = this.moveUp();
            }
        }
        
        if (moved) {
            this.processMoveResult();
        } else {
            this.previousStates.pop();
        }
    }

    checkWin() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] >= 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    endGame(won) {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        // Update statistics
        this.stats.totalGames++;
        if (won) {
            this.stats.gamesWon++;
            this.sounds.win();
        }
        this.stats.totalScore += this.score;
        this.stats.totalMoves += this.moves;
        this.stats.totalTime += Math.floor((Date.now() - this.startTime) / 1000);
        
        const maxTile = Math.max(...this.grid.flat());
        this.stats.highestTile = Math.max(this.stats.highestTile, maxTile);
        
        if (won) {
            document.querySelector('.win-overlay').classList.add('active');
        } else {
            this.showGameOver();
        }
        
        this.saveData();
    }

    showGameOver() {
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-time').textContent = document.getElementById('time').textContent;
        document.getElementById('final-moves').textContent = this.moves;
        document.querySelector('.game-over-overlay').classList.add('active');
    }

    addNewTile() {
        const emptyCells = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === 0) {
                    emptyCells.push({x: i, y: j});
                }
            }
        }
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[randomCell.x][randomCell.y] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    moveLeft() {
        return this.move((row) => {
            const newRow = row.filter(cell => cell !== 0);
            let mergeCount = 0;
            for (let i = 0; i < newRow.length - 1; i++) {
                if (newRow[i] === newRow[i + 1]) {
                    newRow[i] *= 2;
                    this.score += newRow[i];
                    newRow.splice(i + 1, 1);
                    mergeCount++;
                    if (mergeCount >= 5) {
                        this.unlockAchievement('combo5');
                    }
                }
            }
            while (newRow.length < this.size) {
                newRow.push(0);
            }
            return newRow;
        });
    }

    moveRight() {
        return this.move((row) => {
            const newRow = row.filter(cell => cell !== 0);
            let mergeCount = 0;
            for (let i = newRow.length - 1; i > 0; i--) {
                if (newRow[i] === newRow[i - 1]) {
                    newRow[i] *= 2;
                    this.score += newRow[i];
                    newRow.splice(i - 1, 1);
                    mergeCount++;
                    i--;
                    if (mergeCount >= 5) {
                        this.unlockAchievement('combo5');
                    }
                }
            }
            while (newRow.length < this.size) {
                newRow.unshift(0);
            }
            return newRow;
        });
    }

    moveUp() {
        return this.move((row) => {
            const newRow = row.filter(cell => cell !== 0);
            let mergeCount = 0;
            for (let i = 0; i < newRow.length - 1; i++) {
                if (newRow[i] === newRow[i + 1]) {
                    newRow[i] *= 2;
                    this.score += newRow[i];
                    newRow.splice(i + 1, 1);
                    mergeCount++;
                    if (mergeCount >= 5) {
                        this.unlockAchievement('combo5');
                    }
                }
            }
            while (newRow.length < this.size) {
                newRow.push(0);
            }
            return newRow;
        }, true);
    }

    moveDown() {
        return this.move((row) => {
            const newRow = row.filter(cell => cell !== 0);
            let mergeCount = 0;
            for (let i = newRow.length - 1; i > 0; i--) {
                if (newRow[i] === newRow[i - 1]) {
                    newRow[i] *= 2;
                    this.score += newRow[i];
                    newRow.splice(i - 1, 1);
                    mergeCount++;
                    i--;
                    if (mergeCount >= 5) {
                        this.unlockAchievement('combo5');
                    }
                }
            }
            while (newRow.length < this.size) {
                newRow.unshift(0);
            }
            return newRow;
        }, true);
    }

    move(moveFunction, isVertical = false) {
        const oldGrid = JSON.stringify(this.grid);
        
        if (isVertical) {
            for (let j = 0; j < this.size; j++) {
                const column = this.grid.map(row => row[j]);
                const newColumn = moveFunction(column);
                for (let i = 0; i < this.size; i++) {
                    this.grid[i][j] = newColumn[i];
                }
            }
        } else {
            for (let i = 0; i < this.size; i++) {
                this.grid[i] = moveFunction([...this.grid[i]]);
            }
        }
        
        return oldGrid !== JSON.stringify(this.grid);
    }

    isGameOver() {
        // Check for empty cells
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === 0) {
                    return false;
                }
            }
        }
        
        // Check for possible merges
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const current = this.grid[i][j];
                if (
                    (i < this.size - 1 && current === this.grid[i + 1][j]) ||
                    (j < this.size - 1 && current === this.grid[i][j + 1])
                ) {
                    return false;
                }
            }
        }
        
        return true;
    }

    updateDisplay() {
        // Clear the grid container
        this.gridContainer.innerHTML = '';
        this.gridContainer.className = `grid-container size-${this.size}`;

        // Create background cells
        for (let i = 0; i < this.size * this.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            this.gridContainer.appendChild(cell);
        }

        // Calculate cell size and gap
        const containerWidth = this.gridContainer.clientWidth;
        const totalGap = (this.size - 1) * 15;
        const cellSize = (containerWidth - 30 - totalGap) / this.size; // 30px is padding

        // Create tiles with enhanced positioning
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${this.grid[i][j]}`;
                    tile.textContent = this.grid[i][j];
                    
                    // Calculate position
                    const x = j * (cellSize + 15);
                    const y = i * (cellSize + 15);
                    
                    // Set size and position
                    tile.style.width = cellSize + 'px';
                    tile.style.height = cellSize + 'px';
                    tile.style.transform = `translate(${x}px, ${y}px)`;
                    
                    // Adjust font size based on tile size and value
                    const fontSize = this.calculateFontSize(this.grid[i][j], cellSize);
                    tile.style.fontSize = fontSize + 'px';
                    
                    // Add animation class for new tiles
                    if (this.settings.animationsEnabled) {
                        tile.classList.add('tile-new');
                    }
                    
                    this.gridContainer.appendChild(tile);
                }
            }
        }

        // Update score and stats
        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = this.moves;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
        }
        document.getElementById('best-score').textContent = this.bestScore;
        
        // Update active board size button
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size) === this.size);
        });
    }

    calculateFontSize(value, cellSize) {
        const baseSize = cellSize * 0.5;
        if (value >= 1024) return Math.max(baseSize * 0.5, 12);
        if (value >= 128) return Math.max(baseSize * 0.7, 16);
        if (value >= 8) return Math.max(baseSize * 0.85, 20);
        return Math.max(baseSize, 24);
    }
}

// Initialize the game
const game = new Game2048();

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
} 