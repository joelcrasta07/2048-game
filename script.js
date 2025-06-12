class Game2048 {
    constructor() {
        this.grid = Array(4).fill().map(() => Array(4).fill(0));
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
        this.previousState = null;
        this.setupNewGame();
        this.setupEventListeners();
        this.loadTheme();
    }

    setupNewGame() {
        this.grid = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.won = false;
        this.moves = 0;
        this.previousState = null;
        this.addNewTile();
        this.addNewTile();
        this.updateDisplay();
        document.querySelector('.game-over-overlay').classList.remove('active');
        document.querySelector('.win-overlay').classList.remove('active');
        this.startTimer();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        // Touch controls
        this.gridContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.gridContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        
        // Buttons
        document.getElementById('new-game').addEventListener('click', () => {
            this.setupNewGame();
        });
        document.getElementById('try-again').addEventListener('click', () => {
            this.setupNewGame();
        });
        document.getElementById('keep-playing').addEventListener('click', () => {
            document.querySelector('.win-overlay').classList.remove('active');
        });
        document.getElementById('new-game-win').addEventListener('click', () => {
            this.setupNewGame();
        });
        document.getElementById('share-score').addEventListener('click', () => {
            this.shareScore();
        });
        document.getElementById('undo').addEventListener('click', () => {
            this.undo();
        });
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    loadTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
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
        this.previousState = {
            grid: JSON.parse(JSON.stringify(this.grid)),
            score: this.score,
            moves: this.moves
        };
    }

    undo() {
        if (this.previousState) {
            this.grid = JSON.parse(JSON.stringify(this.previousState.grid));
            this.score = this.previousState.score;
            this.moves = this.previousState.moves;
            this.previousState = null;
            this.updateDisplay();
        }
    }

    shareScore() {
        const text = `I scored ${this.score} points in 2048! Can you beat my score? Play at https://joelcrasta07.github.io/2048-game/`;
        if (navigator.share) {
            navigator.share({
                title: '2048 Game Score',
                text: text
            });
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert('Score copied to clipboard!');
            });
        }
    }

    handleKeyPress(event) {
        if (this.gameOver) return;

        let moved = false;
        switch(event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                moved = this.moveUp();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                moved = this.moveDown();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                moved = this.moveLeft();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                moved = this.moveRight();
                break;
            default:
                return;
        }

        if (moved) {
            this.saveState();
            this.moves++;
            this.addNewTile();
            this.updateDisplay();
            this.checkWin();
            if (this.isGameOver()) {
                this.gameOver = true;
                this.showGameOver();
            }
        }
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
        
        // Minimum swipe distance
        const minSwipeDistance = 30;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > minSwipeDistance) {
                if (dx > 0) {
                    this.moveRight();
                } else {
                    this.moveLeft();
                }
                this.addNewTile();
                this.updateDisplay();
            }
        } else {
            if (Math.abs(dy) > minSwipeDistance) {
                if (dy > 0) {
                    this.moveDown();
                } else {
                    this.moveUp();
                }
                this.addNewTile();
                this.updateDisplay();
            }
        }
        
        if (this.isGameOver()) {
            this.gameOver = true;
            this.showGameOver();
        }
    }

    checkWin() {
        if (!this.won) {
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (this.grid[i][j] === 2048) {
                        this.won = true;
                        document.querySelector('.win-overlay').classList.add('active');
                        break;
                    }
                }
            }
        }
    }

    showGameOver() {
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-time').textContent = document.getElementById('time').textContent;
        document.getElementById('final-moves').textContent = this.moves;
        document.querySelector('.game-over-overlay').classList.add('active');
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    addNewTile() {
        const emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
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
        return this.move(row => {
            const newRow = row.filter(cell => cell !== 0);
            for (let i = 0; i < newRow.length - 1; i++) {
                if (newRow[i] === newRow[i + 1]) {
                    newRow[i] *= 2;
                    this.score += newRow[i];
                    newRow.splice(i + 1, 1);
                }
            }
            while (newRow.length < 4) {
                newRow.push(0);
            }
            return newRow;
        });
    }

    moveRight() {
        return this.move(row => {
            const newRow = row.filter(cell => cell !== 0);
            for (let i = newRow.length - 1; i > 0; i--) {
                if (newRow[i] === newRow[i - 1]) {
                    newRow[i] *= 2;
                    this.score += newRow[i];
                    newRow.splice(i - 1, 1);
                    i--;
                }
            }
            while (newRow.length < 4) {
                newRow.unshift(0);
            }
            return newRow;
        });
    }

    moveUp() {
        return this.move(col => {
            const newCol = col.filter(cell => cell !== 0);
            for (let i = 0; i < newCol.length - 1; i++) {
                if (newCol[i] === newCol[i + 1]) {
                    newCol[i] *= 2;
                    this.score += newCol[i];
                    newCol.splice(i + 1, 1);
                }
            }
            while (newCol.length < 4) {
                newCol.push(0);
            }
            return newCol;
        }, true);
    }

    moveDown() {
        return this.move(col => {
            const newCol = col.filter(cell => cell !== 0);
            for (let i = newCol.length - 1; i > 0; i--) {
                if (newCol[i] === newCol[i - 1]) {
                    newCol[i] *= 2;
                    this.score += newCol[i];
                    newCol.splice(i - 1, 1);
                    i--;
                }
            }
            while (newCol.length < 4) {
                newCol.unshift(0);
            }
            return newCol;
        }, true);
    }

    move(moveFunction, isVertical = false) {
        const previousGrid = JSON.stringify(this.grid);
        
        if (isVertical) {
            for (let j = 0; j < 4; j++) {
                const column = this.grid.map(row => row[j]);
                const newColumn = moveFunction(column);
                for (let i = 0; i < 4; i++) {
                    this.grid[i][j] = newColumn[i];
                }
            }
        } else {
            for (let i = 0; i < 4; i++) {
                this.grid[i] = moveFunction([...this.grid[i]]);
            }
        }

        return previousGrid !== JSON.stringify(this.grid);
    }

    isGameOver() {
        // Check for empty cells
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] === 0) return false;
            }
        }

        // Check for possible merges
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const current = this.grid[i][j];
                if (
                    (i < 3 && current === this.grid[i + 1][j]) ||
                    (j < 3 && current === this.grid[i][j + 1])
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

        // Create background cells
        for (let i = 0; i < 16; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            this.gridContainer.appendChild(cell);
        }

        // Calculate cell size and gap
        const containerWidth = this.gridContainer.clientWidth;
        const cellSize = (containerWidth - 45) / 4; // 45px is total gap (15px * 3)

        // Create tiles
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${this.grid[i][j]}`;
                    tile.textContent = this.grid[i][j];
                    
                    // Calculate position
                    const x = j * (cellSize + 15);
                    const y = i * (cellSize + 15);
                    
                    // Set position using transform
                    tile.style.transform = `translate(${x}px, ${y}px)`;
                    
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
    }
}

// Start the game
const game = new Game2048(); 