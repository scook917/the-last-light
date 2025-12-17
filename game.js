// LLM Configuration for Hard AI (Ollama)
const LLM_CONFIG = {
    model: 'llama3',
    endpoint: 'http://localhost:11434/api/generate',
    enabled: true,
    temperature: 0.7,
    maxTokens: 20
};

// Game State
let gameState = {
    boardSize: 5,
    numBattles: 3,
    maxBattles: 3,
    currentPlayer: 'soul',
    soulPosition: null,
    ghoulPosition: null,
    candlePosition: null,
    soulHasCandle: false,
    candleWasPickedUp: false,
    soulShards: 0,
    ghoulShards: 0,
    maxSoulShards: 3,
    totalShards: 5,
    shardsOnBoard: [],
    diceRoll: 0,
    movesLeft: 0,
    canZigzag: false,
    moveDirection: null,
    battlesCompleted: 0,
    gameStarted: false,
    soulSpawn: null,
    ghoulSpawn: null,
    soulAttackBonus: 0,
    soulCancelSnuff: 0,
    ghoulSkipTurn: false,
    candleDropTurnsLeft: 0,
    candleDropMaxTurns: 0,
    gameMode: '2player',
    aiDifficulty: 'medium',
    playerRole: 'soul',
    aiIsThinking: false,
    isEndingTurn: false,
    lastAIPosition: null,
    aiStuckCount: 0,
    battleReady: false,
    inBattle: false,
    llmMoveCache: null
};

// Initialize game
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// LLM AI Functions
function buildLLMPrompt(aiRole) {
    const aiPos = aiRole === 'soul' ? gameState.soulPosition : gameState.ghoulPosition;
    const opponentPos = aiRole === 'soul' ? gameState.ghoulPosition : gameState.soulPosition;
    
    // Calculate distances to important objects
    let nearestShardDist = Infinity;
    let nearestShardPos = null;
    for (const shard of gameState.shardsOnBoard) {
        const dist = Math.abs(aiPos.row - shard.row) + Math.abs(aiPos.col - shard.col);
        if (dist < nearestShardDist) {
            nearestShardDist = dist;
            nearestShardPos = shard;
        }
    }
    
    const distToOpponent = Math.abs(aiPos.row - opponentPos.row) + Math.abs(aiPos.col - opponentPos.col);
    const distToCandle = gameState.candlePosition ? 
        Math.abs(aiPos.row - gameState.candlePosition.row) + Math.abs(aiPos.col - gameState.candlePosition.col) : 
        Infinity;
    
    // Build board visualization with coordinates
    let boardStr = '\nCurrent Board State (coordinates: row,col):\n';
    boardStr += '   ';
    for (let col = 0; col < gameState.boardSize; col++) {
        boardStr += col.toString().padStart(2) + ' ';
    }
    boardStr += '\n';
    
    for (let row = 0; row < gameState.boardSize; row++) {
        boardStr += row.toString().padStart(2) + ' ';
        for (let col = 0; col < gameState.boardSize; col++) {
            if (row === aiPos.row && col === aiPos.col) {
                boardStr += (aiRole === 'soul' ? '👻' : '👹') + ' ';
            } else if (row === opponentPos.row && col === opponentPos.col) {
                boardStr += (aiRole === 'soul' ? '👹' : '👻') + ' ';
            } else if (gameState.candlePosition && row === gameState.candlePosition.row && col === gameState.candlePosition.col) {
                boardStr += '🕯️ ';
            } else {
                let hasShard = false;
                for (const shard of gameState.shardsOnBoard) {
                    if (shard.row === row && shard.col === col) {
                        boardStr += '💎 ';
                        hasShard = true;
                        break;
                    }
                }
                if (!hasShard) boardStr += '⬜ ';
            }
        }
        boardStr += '\n';
    }
    
    // Build comprehensive game context
    let prompt = `=== THE LAST LIGHT - Strategic Board Game ===

GAME RULES:
- Board Size: ${gameState.boardSize}x${gameState.boardSize}
- You are: ${aiRole.toUpperCase()} ${aiRole === 'soul' ? '👻' : '👹'}
- Opponent: ${aiRole === 'soul' ? 'GHOUL 👹' : 'SOUL 👻'}

${aiRole === 'soul' ? `
YOUR WIN CONDITION (SOUL):
1. Pick up the candle 🕯️ (move onto it)
2. Collect ${gameState.maxSoulShards} soul shards 💎 for protection
3. Survive until battles run out (${gameState.numBattles} battles remain)

YOUR STRATEGY:
- ${!gameState.soulHasCandle ? 'PRIORITY: Get the candle first! Move to (' + (gameState.candlePosition ? gameState.candlePosition.row + ',' + gameState.candlePosition.col : 'center') + ')' : 'You have the candle ✓'}
- ${gameState.soulShards < gameState.maxSoulShards ? 'Collect shards for protection (need ' + (gameState.maxSoulShards - gameState.soulShards) + ' more)' : 'Shards maxed out ✓'}
- AVOID the Ghoul! Distance: ${distToOpponent} spaces
- ${gameState.ghoulShards >= 3 ? '⚠️ DANGER! Ghoul has 3+ shards and can SNUFF your candle! STAY AWAY!' : 'Ghoul needs more shards to attack'}

CURRENT STATUS:
- You have candle: ${gameState.soulHasCandle ? 'YES ✓' : 'NO ✗'}
- Your shards: ${gameState.soulShards}/${gameState.maxSoulShards}
- Ghoul shards: ${gameState.ghoulShards}/3 ${gameState.ghoulShards >= 3 ? '⚠️ CAN ATTACK!' : ''}
` : `
YOUR WIN CONDITION (GHOUL):
1. Collect 3 soul shards 💎 to unlock snuff ability
2. Get adjacent to the Soul (when they have candle)
3. Win the battle to snuff out their candle

YOUR STRATEGY:
- ${gameState.ghoulShards < 3 ? 'PRIORITY: Collect 3 shards first! (have ' + gameState.ghoulShards + '/3)' : 'Shards complete ✓ - Now hunt the Soul!'}
- ${gameState.soulHasCandle ? 'Soul has the candle - they are vulnerable!' : 'Soul doesn\'t have candle yet - wait for them to get it'}
- ${gameState.ghoulShards >= 3 && gameState.soulHasCandle ? '🎯 ATTACK! Get cardinally adjacent (up/down/left/right) to Soul to start battle!' : gameState.ghoulShards >= 3 ? 'Ready to attack once Soul has candle' : 'Cannot attack until you have 3 shards'}
- Distance to Soul: ${distToOpponent} spaces ${distToOpponent === 1 ? '(1 move away! Get adjacent to trigger battle!)' : ''}

CURRENT STATUS:
- Your shards: ${gameState.ghoulShards}/3 ${gameState.ghoulShards >= 3 ? '✓ CAN SNUFF' : '✗ Need more'}
- Soul has candle: ${gameState.soulHasCandle ? 'YES' : 'NO'}
- Soul shards: ${gameState.soulShards}/${gameState.maxSoulShards}
`}

${boardStr}

TACTICAL INFORMATION:
- Your position: (${aiPos.row}, ${aiPos.col})
- Opponent position: (${opponentPos.row}, ${opponentPos.col}) - Distance: ${distToOpponent}
${gameState.candlePosition ? `- Candle position: (${gameState.candlePosition.row}, ${gameState.candlePosition.col}) - Distance: ${distToCandle}` : ''}
${nearestShardPos ? `- Nearest shard: (${nearestShardPos.row}, ${nearestShardPos.col}) - Distance: ${nearestShardDist}` : '- No shards on board'}
- Shards on board: ${gameState.shardsOnBoard.length}
- Moves remaining this turn: ${gameState.movesLeft}

VALID MOVES FOR YOUR CURRENT POSITION:
${(() => {
    const validMoves = [];
    const maxRow = gameState.boardSize - 1;
    const maxCol = gameState.boardSize - 1;
    
    // Check each direction - CARDINAL FIRST
    if (aiPos.row > 0) validMoves.push('- up (go to row ' + (aiPos.row - 1) + ')');
    if (aiPos.row < maxRow) validMoves.push('- down (go to row ' + (aiPos.row + 1) + ')');
    if (aiPos.col > 0) validMoves.push('- left (go to col ' + (aiPos.col - 1) + ')');
    if (aiPos.col < maxCol) validMoves.push('- right (go to col ' + (aiPos.col + 1) + ')');
    
    // DIAGONAL MOVES (must use hyphen!)
    if (aiPos.row > 0 && aiPos.col > 0) validMoves.push('- up-left (diagonal to ' + (aiPos.row - 1) + ',' + (aiPos.col - 1) + ')');
    if (aiPos.row > 0 && aiPos.col < maxCol) validMoves.push('- up-right (diagonal to ' + (aiPos.row - 1) + ',' + (aiPos.col + 1) + ')');
    if (aiPos.row < maxRow && aiPos.col > 0) validMoves.push('- down-left (diagonal to ' + (aiPos.row + 1) + ',' + (aiPos.col - 1) + ')');
    if (aiPos.row < maxRow && aiPos.col < maxCol) validMoves.push('- down-right (diagonal to ' + (aiPos.row + 1) + ',' + (aiPos.col + 1) + ')');
    
    return validMoves.join('\n');
})()}

⚠️ IMPORTANT: You can ONLY move in the directions listed above.

═══════════════════════════════════════════════════════════
🎲 YOU MUST MAKE ${gameState.movesLeft} MOVE(S) THIS TURN
═══════════════════════════════════════════════════════════

⚠️⚠️⚠️ CRITICAL RULES ⚠️⚠️⚠️
1. You MUST provide EXACTLY ${gameState.movesLeft} direction(s) - NOT MORE, NOT LESS
2. Count your directions: ${Array.from({length: gameState.movesLeft}, (_, i) => i + 1).join(', ')} = ${gameState.movesLeft} total
3. Use ONLY these exact words from valid moves above
4. Diagonal moves MUST use HYPHEN: up-left, up-right, down-left, down-right
5. Cardinal moves: up, down, left, right (NO hyphens)
6. Separate each direction with a SPACE
7. NO explanations, NO reasoning, NO extra words - ONLY ${gameState.movesLeft} direction(s)

✓ CORRECT FORMAT:
${gameState.movesLeft === 1 ? 
`   down-right` : 
gameState.movesLeft === 2 ? 
`   down-right down` :
gameState.movesLeft === 3 ?
`   down-right down left` :
`   down-right down down left`}

✗ WRONG FORMAT:
${gameState.movesLeft === 1 ? 
`   down right (missing hyphen!)` : 
gameState.movesLeft === 2 ? 
`   down right, down (missing hyphen!)` :
gameState.movesLeft === 3 ?
`   down right down left (missing hyphen!)` :
`   I will move down-right (extra words!)`}

/Users/sarah/Documents/the-last-light/game.js`;
    
    return prompt;
}

async function getLLMMove(aiRole) {
    if (!LLM_CONFIG.enabled) {
        console.warn('LLM not enabled');
        return null;
    }
    
    try {
        const prompt = buildLLMPrompt(aiRole);
        
        console.log('\n🤖 ===== LLM AI THINKING =====');
        console.log('📤 PROMPT SENT TO LLAMA:');
        console.log(prompt);
        console.log('⏳ Waiting for Llama response...\n');
        
        const response = await fetch(LLM_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: LLM_CONFIG.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: LLM_CONFIG.temperature,
                    num_predict: LLM_CONFIG.maxTokens
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }
        
        const data = await response.json();
        const text = data.response || '';
        
        console.log('📥 RAW LLAMA RESPONSE:');
        console.log(`"${text}"`);
        console.log('\n🧠 AI OUTPUT:', text);
        
        // Extract moves from response - ONLY accept exact valid moves
        const movesText = text.trim().toLowerCase();
        const validDirections = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
        
        // Split by spaces and extract only valid moves
        const words = movesText.split(/\s+/);
        const moves = [];
        
        console.log('🔍 PARSING WORDS:', words);
        
        for (const word of words) {
            const cleaned = word.replace(/[^a-z-]/g, '');
            if (validDirections.includes(cleaned)) {
                moves.push(cleaned);
            }
        }
        
        console.log('🎯 EXTRACTED MOVES:', moves);
        
        if (moves.length > 0) {
            if (moves.length < gameState.movesLeft) {
                console.warn(`⚠️ AI provided ${moves.length} moves but needs ${gameState.movesLeft} moves!`);
                console.warn(`   Missing ${gameState.movesLeft - moves.length} move(s)`);
                console.log('🔄 Falling back to pathfinding AI');
                console.log('===== END LLM THINKING =====\n');
                return null;
            }
            
            // Use only the number of moves needed (in case AI provided too many)
            const finalMoves = moves.slice(0, gameState.movesLeft);
            console.log(`✅ VALID MOVES (${finalMoves.length}/${gameState.movesLeft}):`, finalMoves.map(m => m.toUpperCase()).join(' → '));
            console.log('===== END LLM THINKING =====\n');
            return finalMoves;
        } else {
            console.warn(`❌ NO VALID MOVES - could not extract directions from: "${text}"`);
            console.warn(`   AI must use hyphens for diagonals: up-left, up-right, down-left, down-right`);
            console.log('🔄 Falling back to pathfinding AI');
            console.log('===== END LLM THINKING =====\n');
            return null;
        }
    } catch (error) {
        console.error('❌ LLM ERROR:', error);
        console.log('===== END LLM THINKING =====\n');
        showToast('⚠️ Ollama not running');
        return null;
    }
}

function loadLLMConfig() {
    const saved = localStorage.getItem('llmConfig');
    if (saved) {
        const config = JSON.parse(saved);
        LLM_CONFIG.enabled = config.enabled !== undefined ? config.enabled : true;
        document.getElementById('llm-enabled').checked = LLM_CONFIG.enabled;
    }
}

function saveLLMConfig() {
    LLM_CONFIG.enabled = document.getElementById('llm-enabled').checked;
    localStorage.setItem('llmConfig', JSON.stringify({
        enabled: LLM_CONFIG.enabled
    }));
    showToast('✓ LLM settings saved');
}

async function testLLMConnection() {
    const btn = document.getElementById('test-llm-btn');
    const status = document.getElementById('llm-status');
    
    btn.disabled = true;
    btn.textContent = 'Testing...';
    status.textContent = '';
    
    try {
        const response = await fetch(LLM_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: LLM_CONFIG.model,
                prompt: 'Test',
                stream: false,
                options: { num_predict: 5 }
            })
        });
        
        if (response.ok) {
            status.textContent = '✓ Ollama connected!';
            status.style.color = '#4CAF50';
        } else {
            status.textContent = `✗ Error: ${response.status}`;
            status.style.color = '#f44336';
        }
    } catch (error) {
        status.textContent = '✗ Ollama not running';
        status.style.color = '#f44336';
    }
    
    btn.disabled = false;
    btn.textContent = 'Test Connection';
}

// Setup screen - size selection
document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// Selection functions
function selectRole(role) {
    gameState.playerRole = role;
    document.querySelectorAll('[data-role]').forEach(card => card.classList.remove('active'));
    document.querySelector(`[data-role="${role}"]`).classList.add('active');
}

function selectMode(mode) {
    gameState.gameMode = mode;
    document.querySelectorAll('[data-mode]').forEach(card => card.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    
    // Show/hide AI difficulty
    document.getElementById('ai-difficulty').style.display = mode === 'ai' ? 'block' : 'none';
}

function selectDifficulty(difficulty) {
    gameState.aiDifficulty = difficulty;
    document.querySelectorAll('[data-difficulty]').forEach(card => card.classList.remove('active'));
    document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('active');
}

// Start game
function startGame() {
    // Get selected size
    const selectedSize = document.querySelector('.size-btn.active').dataset.size;
    
    switch(selectedSize) {
        case 'small':
            gameState.boardSize = 8;
            gameState.maxBattles = 3;
            gameState.totalShards = 5;
            gameState.maxSoulShards = 3;
            break;
        case 'medium':
            gameState.boardSize = 10;
            gameState.maxBattles = 5;
            gameState.totalShards = 7;
            gameState.maxSoulShards = 4;
            break;
        case 'large':
            gameState.boardSize = 14;
            gameState.maxBattles = 10;
            gameState.totalShards = 10;
            gameState.maxSoulShards = 5;
            break;
    }
    
    // Reset game state
    gameState.currentPlayer = 'soul';
    gameState.soulHasCandle = false;
    gameState.candleWasPickedUp = false;
    gameState.soulShards = 0;
    gameState.ghoulShards = 0;
    gameState.diceRoll = 0;
    gameState.movesLeft = 0;
    gameState.canZigzag = false;
    gameState.moveDirection = null;
    gameState.battlesCompleted = 0;
    gameState.gameStarted = true;
    gameState.shardsOnBoard = [];
    gameState.soulAttackBonus = 0;
    gameState.soulCancelSnuff = 0;
    gameState.ghoulSkipTurn = false;
    gameState.candleDropTurnsLeft = 0;
    gameState.candleDropMaxTurns = 0;
    gameState.battleReady = false;
    gameState.inBattle = false;
    gameState.aiIsThinking = false;
    
    // Initialize board
    initializeBoard();
    
    // Show game screen
    showScreen('game-screen');
    
    // Update UI
    updateUI();
    updateBattleButtonState();
    showToast('Game started! Soul must reach the candle in the center.');
    
    // If AI is Soul and player is Ghoul, AI goes first
    if (gameState.gameMode === 'ai' && gameState.playerRole === 'ghoul') {
        setTimeout(() => {
            showToast('AI Soul is rolling...');
            setTimeout(() => rollDice(), 800);
        }, 1500);
    } else {
        showToast('Soul: Roll the dice to move!');
    }
}

// Initialize board
function initializeBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${gameState.boardSize}, 40px)`;
    board.style.gridTemplateRows = `repeat(${gameState.boardSize}, 40px)`;
    
    // Create cells
    for (let row = 0; row < gameState.boardSize; row++) {
        for (let col = 0; col < gameState.boardSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => handleCellClick(row, col));
            board.appendChild(cell);
        }
    }
    
    // Place candle in center
    const center = Math.floor(gameState.boardSize / 2);
    gameState.candlePosition = { row: center, col: center };
    updateCell(center, center, '🕯️');
    
    // Place Soul at top-left corner
    gameState.soulPosition = { row: 0, col: 0 };
    gameState.soulSpawn = { row: 0, col: 0 };
    updateCell(0, 0, '👻');
    
    // Place Ghoul at bottom-right corner
    const ghoulRow = gameState.boardSize - 1;
    const ghoulCol = gameState.boardSize - 1;
    gameState.ghoulPosition = { row: ghoulRow, col: ghoulCol };
    gameState.ghoulSpawn = { row: ghoulRow, col: ghoulCol };
    updateCell(ghoulRow, ghoulCol, '👹');
    
    // Place shards randomly
    placeShards(gameState.totalShards);
}

// Place shards on board
function placeShards(count) {
    for (let i = 0; i < count; i++) {
        let row, col;
        do {
            row = Math.floor(Math.random() * gameState.boardSize);
            col = Math.floor(Math.random() * gameState.boardSize);
        } while (isCellOccupied(row, col));
        
        gameState.shardsOnBoard.push({ row, col });
        updateCell(row, col, '💎');
    }
}

// Check if cell is occupied
function isCellOccupied(row, col) {
    if (gameState.soulPosition && gameState.soulPosition.row === row && gameState.soulPosition.col === col) return true;
    if (gameState.ghoulPosition && gameState.ghoulPosition.row === row && gameState.ghoulPosition.col === col) return true;
    if (gameState.candlePosition && gameState.candlePosition.row === row && gameState.candlePosition.col === col) return true;
    if (gameState.shardsOnBoard.some(s => s.row === row && s.col === col)) return true;
    return false;
}

// Update cell content
function updateCell(row, col, content) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.textContent = content;
    }
}

// Get cell content
function getCellContent(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    return cell ? cell.textContent : '';
}

// Clear cell
function clearCell(row, col) {
    // Check if there's a dropped candle at this position
    if (gameState.candlePosition && gameState.candlePosition.row === row && gameState.candlePosition.col === col) {
        updateCell(row, col, '🕯️');
    } else if (gameState.shardsOnBoard.some(s => s.row === row && s.col === col)) {
        // Check if there's a shard at this position
        updateCell(row, col, '💎');
    } else {
        updateCell(row, col, '');
    }
}

// Handle cell click (for movement)
function handleCellClick(row, col) {
    // This could be used for alternative movement if needed
}

// Roll dice
function rollDice() {
    if (gameState.movesLeft > 0) {
        showToast('Finish your current moves first!');
        return;
    }
    
    // Remind Soul to get the candle
    if (gameState.currentPlayer === 'soul' && !gameState.soulHasCandle) {
        showToast('⚠️ Remember: Get the candle in the center first! 🕯️');
    }
    
    const dice = document.getElementById('dice');
    dice.classList.add('rolling');
    
    // Animate dice roll
    let rolls = 0;
    const rollInterval = setInterval(() => {
        dice.textContent = Math.floor(Math.random() * 6) + 1;
        rolls++;
        
        if (rolls >= 10) {
            clearInterval(rollInterval);
            gameState.diceRoll = Math.floor(Math.random() * 6) + 1;
            dice.textContent = gameState.diceRoll;
            dice.classList.remove('rolling');
            
            gameState.movesLeft = gameState.diceRoll;
            gameState.moveDirection = null;
            
            showToast(`${gameState.currentPlayer === 'soul' ? '👻 Soul' : '👹 Ghoul'} rolled a ${gameState.diceRoll}!`);
            updateUI();
            
            // If AI's turn, start making moves
            if (isAITurn()) {
                gameState.aiIsThinking = true;
                updateUI();
                setTimeout(() => makeAIMove(), 800);
            }
        }
    }, 100);
}

// Move player
function movePlayer(direction) {
    if (gameState.movesLeft <= 0) {
        showToast('Roll the dice first!');
        return;
    }
    
    // Don't move during an active battle
    if (gameState.inBattle) {
        showToast('Resolve the battle first!');
        return;
    }
    
    const player = gameState.currentPlayer;
    const position = player === 'soul' ? gameState.soulPosition : gameState.ghoulPosition;
    
    // Calculate new position
    let newRow = position.row;
    let newCol = position.col;
    
    switch(direction) {
        case 'up':
            newRow--;
            break;
        case 'down':
            newRow++;
            break;
        case 'left':
            newCol--;
            break;
        case 'right':
            newCol++;
            break;
        case 'up-left':
            newRow--;
            newCol--;
            break;
        case 'up-right':
            newRow--;
            newCol++;
            break;
        case 'down-left':
            newRow++;
            newCol--;
            break;
        case 'down-right':
            newRow++;
            newCol++;
            break;
    }
    
    // Check boundaries
    if (newRow < 0 || newRow >= gameState.boardSize || newCol < 0 || newCol >= gameState.boardSize) {
        showToast('Hit a wall!');
        return;
    }
    
    // Check if cell has other player
    const otherPlayer = player === 'soul' ? gameState.ghoulPosition : gameState.soulPosition;
    if (otherPlayer.row === newRow && otherPlayer.col === newCol) {
        showToast('Cannot move onto another player!');
        return;
    }
    
    // Check what's on the new cell BEFORE clearing old position
    const cellContent = getCellContent(newRow, newCol);
    
    // Check if ghoul is trying to pick up INITIAL candle (at game start, before soul picks it up)
    // candleWasPickedUp = false means it's the initial candle, not a dropped one
    if (cellContent === '🕯️' && player === 'ghoul' && !gameState.candleWasPickedUp) {
        showToast('👹 Ghoul cannot move onto the candle! Soul must get it first.');
        return;
    }
    
    // Clear old position
    clearCell(position.row, position.col);
    
    // Update position
    position.row = newRow;
    position.col = newCol;
    
    // Handle cell contents
    if (cellContent === '🕯️') {
        if (player === 'soul' && !gameState.soulHasCandle) {
            // Soul picks up initial candle
            gameState.soulHasCandle = true;
            gameState.candleWasPickedUp = true;
            gameState.candlePosition = null;
            gameState.candleDropTurnsLeft = 0;
            gameState.candleDropMaxTurns = 0;
            showToast('🕯️ Soul obtained the candle! Now survive the battles!');
        } else if (player === 'ghoul' && gameState.candlePosition) {
            // Ghoul picks up dropped candle - WINS THE GAME!
            showToast('👹 Ghoul got the dropped candle! Darkness wins!');
            gameState.movesLeft = 0;
            gameState.candlePosition = null;
            gameState.candleDropTurnsLeft = 0;
            gameState.candleDropMaxTurns = 0;
            endGame('ghoul');
            return;
        } else if (player === 'soul' && gameState.candlePosition) {
            // Soul picks up dropped candle
            gameState.soulHasCandle = true;
            gameState.candlePosition = null;
            gameState.candleDropTurnsLeft = 0;
            gameState.candleDropMaxTurns = 0;
            showToast('🕯️ Soul picked up the candle again!');
        }
    } else if (cellContent === '💎' && gameState.soulHasCandle) {
        // Only collect shards if soul has candle
        collectShard(player, newRow, newCol);
    }
    
    // Place player on new cell
    updateCell(newRow, newCol, player === 'soul' ? (gameState.soulHasCandle ? '🕯️' : '👻') : '👹');
    
    // Update moves
    gameState.movesLeft--;
    
    // Check battle readiness (only when Soul has candle and not already in/pending battle)
    if (gameState.soulHasCandle && !gameState.inBattle && !gameState.battleReady && checkForBattle()) {
        gameState.movesLeft = 0;
        gameState.moveDirection = null;
        gameState.battleReady = true;
        showToast('⚔️ Battle ready! Click "Start Battle" to resolve it.');
        updateUI();
        updateBattleButtonState();
        return; // stop movement, wait for battle
    }
    
    // If no moves left and no pending battle, auto end the turn
    if (gameState.movesLeft <= 0) {
        gameState.movesLeft = 0;
        gameState.moveDirection = null;
        updateUI();
        endTurn();
        return;
    }
    
    // Otherwise just redraw and continue same turn
    updateUI();
}

// Collect shard
function collectShard(player, row, col) {
    // Remove shard from board
    gameState.shardsOnBoard = gameState.shardsOnBoard.filter(s => !(s.row === row && s.col === col));
    
    if (player === 'soul') {
        if (gameState.soulShards < gameState.maxSoulShards) {
            gameState.soulShards++;
            showToast('💎 Soul collected a shard!');
        } else {
            showToast('💎 Soul cannot carry more shards!');
            // Put shard back
            gameState.shardsOnBoard.push({ row, col });
        }
    } else {
        gameState.ghoulShards++;
        showToast('💎 Ghoul collected a shard!');
    }
    
    // Check if need to respawn shard when below 2 shards
    if (gameState.shardsOnBoard.length < 2) {
        respawnShard();
        console.log('💎 Auto-respawned shard (only ' + (gameState.shardsOnBoard.length - 1) + ' remaining)');
    }
    
    updatePowerUps();
}

// Respawn shard
function respawnShard() {
    let row, col;
    do {
        row = Math.floor(Math.random() * gameState.boardSize);
        col = Math.floor(Math.random() * gameState.boardSize);
    } while (isCellOccupied(row, col));
    
    gameState.shardsOnBoard.push({ row, col });
    updateCell(row, col, '💎');
    showToast('💎 A new shard appeared on the board!');
}

// Check for battle (adjacent cells)
function checkForBattle() {
    const soulPos = gameState.soulPosition;
    const ghoulPos = gameState.ghoulPosition;
    
    const rowDiff = Math.abs(soulPos.row - ghoulPos.row);
    const colDiff = Math.abs(soulPos.col - ghoulPos.col);
    
    // Adjacent if one space away (not diagonal)
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

// Called by the "Start Battle" button
function startBattle() {
    if (!gameState.soulHasCandle) {
        showToast('Battle only happens once Soul has the candle.');
        return;
    }

    if (!checkForBattle()) {
        showToast('No battle available – players are not adjacent.');
        gameState.battleReady = false;
        updateBattleButtonState();
        updateUI();
        return;
    }

    gameState.battleReady = false;
    gameState.inBattle = true;

    updateBattleButtonState();
    initiateBattle();
}

// Initiate battle
function initiateBattle() {
    showToast('⚔️ Battle initiated!');
    
    // Reset re-roll usage for this battle
    gameState.battleRerollUsed = false;
    
    const modal = document.getElementById('battle-modal');
    const powerupsDiv = document.getElementById('battle-powerups');
    const buttonsDiv = document.getElementById('battle-powerup-buttons');
    
    modal.classList.add('active');
    
    // Show only re-roll power-ups before rolling
    buttonsDiv.innerHTML = '';
    let hasPowerUps = false;
    
    // Soul re-roll (if has 1+ shards)
    if (gameState.soulShards >= 1) {
        hasPowerUps = true;
        buttonsDiv.innerHTML += `<button onclick="useBattlePowerUp('soul-reroll')">👻 Soul Re-roll (1💎)</button>`;
    }
    
    // Ghoul re-roll (if has 1+ shards)
    if (gameState.ghoulShards >= 1) {
        hasPowerUps = true;
        buttonsDiv.innerHTML += `<button onclick="useBattlePowerUp('ghoul-reroll')">👹 Ghoul Re-roll (1💎)</button>`;
    }
    
    if (hasPowerUps) {
        powerupsDiv.style.display = 'block';
    } else {
        powerupsDiv.style.display = 'none';
    }
    
    // Roll dice for both players
    setTimeout(() => {
        const soulRoll = Math.floor(Math.random() * 6) + 1;
        const ghoulRoll = Math.floor(Math.random() * 6) + 1;
        
        document.getElementById('soul-roll').textContent = soulRoll;
        document.getElementById('ghoul-roll').textContent = ghoulRoll;
        
        // Show continue button for human players to decide on re-roll
        setTimeout(() => {
            const resultDiv = document.getElementById('battle-result');
            
            // Check if it's a human player's turn to decide
            const isHumanBattle = gameState.gameMode === 'vs' || 
                                 (gameState.gameMode === 'ai' && 
                                  ((gameState.playerRole === 'soul' && soulRoll < ghoulRoll) || 
                                   (gameState.playerRole === 'ghoul' && ghoulRoll < soulRoll)));
            
            if (isHumanBattle) {
                // Human player - show continue button
                resultDiv.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <p style="margin-bottom: 15px;">Use a re-roll power-up above, or click Continue to resolve the battle.</p>
                        <button id="battle-continue-btn" class="action-btn primary-btn" style="font-size: 16px; padding: 10px 30px;">
                            ▶️ Continue to Battle Result
                        </button>
                    </div>
                `;
                
                // Add event listener for continue button
                setTimeout(() => {
                    document.getElementById('battle-continue-btn').addEventListener('click', () => {
                        resultDiv.innerHTML = '';
                        checkAIBattleReroll(soulRoll, ghoulRoll);
                    });
                }, 100);
            } else {
                // AI's turn or no human involved - auto-resolve after delay
                setTimeout(() => {
                    checkAIBattleReroll(soulRoll, ghoulRoll);
                }, 1500);
            }
        }, 500);
    }, 500);
}

// Use power-up during battle (only re-rolls)
function useBattlePowerUp(powerType) {
    const powerupsDiv = document.getElementById('battle-powerups');
    const resultDiv = document.getElementById('battle-result');
    
    // Remove continue button when re-roll is used
    const existingButton = resultDiv.querySelector('button');
    if (existingButton) {
        existingButton.remove();
    }
    
    if (powerType === 'soul-reroll') {
        if (gameState.soulShards >= 1) {
            gameState.soulShards--;
            const newRoll = Math.floor(Math.random() * 6) + 1;
            document.getElementById('soul-roll').textContent = newRoll;
            showToast('👻 Soul used Re-roll! New roll: ' + newRoll);
            respawnShards(1);
            updateUI();
            powerupsDiv.style.display = 'none';
            
            // Recalculate battle result
            const ghoulRoll = parseInt(document.getElementById('ghoul-roll').textContent);
            resultDiv.innerHTML = '';
            setTimeout(() => {
                checkAIBattleReroll(newRoll, ghoulRoll);
            }, 500);
        }
    } else if (powerType === 'ghoul-reroll') {
        if (gameState.ghoulShards >= 1) {
            gameState.ghoulShards--;
            const newRoll = Math.floor(Math.random() * 6) + 1;
            document.getElementById('ghoul-roll').textContent = newRoll;
            showToast('👹 Ghoul used Re-roll! New roll: ' + newRoll);
            respawnShards(1);
            updateUI();
            powerupsDiv.style.display = 'none';
            
            // Recalculate battle result
            const soulRoll = parseInt(document.getElementById('soul-roll').textContent);
            resultDiv.innerHTML = '';
            setTimeout(() => {
                checkAIBattleReroll(soulRoll, newRoll);
            }, 500);
        }
    }
}

// Resolve battle
function checkAIBattleReroll(soulRoll, ghoulRoll) {
    // Only allow one re-roll per battle
    if (gameState.battleRerollUsed) {
        resolveBattle(soulRoll, ghoulRoll);
        return;
    }
    
    // Check if AI Ghoul should re-roll after losing
    if (gameState.gameMode === 'ai' && gameState.playerRole === 'soul') {
        // AI is the Ghoul
        if (ghoulRoll < soulRoll && gameState.ghoulShards > 3) {
            // Ghoul lost and has MORE than 3 shards (needs spare after re-roll)
            console.log(`🎲 AI Ghoul considering re-roll (has ${gameState.ghoulShards} shards)`);
            gameState.battleRerollUsed = true;
            setTimeout(() => {
                useBattlePowerUp('ghoul-reroll');
            }, 800);
            return; // Don't resolve yet, re-roll will trigger new resolution
        }
    }
    
    // Check if AI Soul should re-roll after losing
    if (gameState.gameMode === 'ai' && gameState.playerRole === 'ghoul') {
        // AI is the Soul
        if (soulRoll < ghoulRoll && gameState.soulShards > 3) {
            // Soul lost and has MORE than 3 shards (needs spare after re-roll)
            console.log(`🎲 AI Soul considering re-roll (has ${gameState.soulShards} shards)`);
            gameState.battleRerollUsed = true;
            setTimeout(() => {
                useBattlePowerUp('soul-reroll');
            }, 800);
            return; // Don't resolve yet, re-roll will trigger new resolution
        }
    }
    
    // No re-roll, proceed with battle resolution
    resolveBattle(soulRoll, ghoulRoll);
}

function resolveBattle(soulRoll, ghoulRoll) {
    const resultDiv = document.getElementById('battle-result');
    
    if (soulRoll > ghoulRoll) {
        // Soul wins - offer +1 Attack option
        const attackCost = gameState.boardSize === 8 ? 2 : 3;
        const canUseAttack = (gameState.boardSize === 8 || gameState.boardSize === 10) && gameState.soulShards >= attackCost;
        
        if (canUseAttack) {
            // Check if Soul is AI
            if (gameState.gameMode === 'ai' && gameState.playerRole === 'ghoul') {
                // AI Soul decides whether to use attack bonus
                resultDiv.innerHTML = '<strong>👻 Soul wins the battle!</strong><br>AI Soul is deciding...';
                
                setTimeout(() => {
                    // Easy AI: never use attack
                    // Medium AI: 50% chance
                    // Hard AI: 70% chance
                    const shouldUseAttack = (gameState.aiDifficulty === 'hard' && Math.random() < 0.7) ||
                                           (gameState.aiDifficulty === 'medium' && Math.random() < 0.5);
                    
                    if (shouldUseAttack) {
                        soulUseAttackBonus();
                    } else {
                        soulDeclineAttack();
                    }
                }, 1500);
                return;
            }
            
            // Human Soul - offer the choice to attack
            resultDiv.innerHTML = `
                <div style="text-align: center;">
                    <strong>👻 Soul wins the battle!</strong><br>
                    <p style="margin: 15px 0;">⚔️ You have ${gameState.soulShards} shards.<br>Attack Ghoul to remove 1 shard? (Costs ${attackCost} shards)</p>
                    <button id="soul-use-attack-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer;">
                        ⚔️ Attack Ghoul (${attackCost} shards)
                    </button>
                    <button id="soul-decline-attack-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #666;">
                        ❌ Don't Attack
                    </button>
                </div>
            `;
            
            // Add event listeners
            setTimeout(() => {
                document.getElementById('soul-use-attack-btn').addEventListener('click', () => soulUseAttackBonus());
                document.getElementById('soul-decline-attack-btn').addEventListener('click', () => soulDeclineAttack());
            }, 100);
            return; // Wait for Soul's choice
        } else {
            // Soul wins but can't afford attack bonus
            resultDiv.innerHTML = '👻 <strong>Soul escapes!</strong><br>Both players return to spawn.';
            showToast('⚔️ Soul won the battle and escaped!');
            gameState.battlesCompleted++;
            setTimeout(() => {
                returnToSpawn();
                closeBattleModal();
                
                // Check if soul survived all battles
                if (gameState.battlesCompleted >= gameState.maxBattles) {
                    setTimeout(() => {
                        endGame('soul');
                    }, 1000);
                } else {
                    endTurn();
                }
            }, 2000);
        }
    } else if (ghoulRoll > soulRoll) {
        // Ghoul wins - offer choice
        const dropCandleCost = gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5);
        const canSnuff = gameState.ghoulShards >= 3;
        const canDrop = gameState.ghoulShards >= dropCandleCost;
        
        // Check if Ghoul is AI
        if (gameState.gameMode === 'ai' && gameState.playerRole === 'soul') {
            // AI Ghoul decides what to do
            resultDiv.innerHTML = '<strong>👹 Ghoul wins the battle!</strong><br>AI Ghoul is deciding...';
            
            setTimeout(() => {
                // Strategic decision: Snuff vs Drop
                // Check if soul can cancel the snuff (needs 3 shards)
                const soulCanCancelSnuff = gameState.soulShards >= 3;
                
                if (canSnuff && !soulCanCancelSnuff) {
                    // Soul can't cancel - ALWAYS snuff (instant win!)
                    ghoulChooseSnuff();
                    return;
                } else if (canDrop && soulCanCancelSnuff) {
                    // Soul can cancel snuff - better to drop candle instead
                    // This forces a chase scenario which is better than wasting shards
                    ghoulChooseDrop();
                    return;
                } else if (canSnuff) {
                    // Soul can cancel but we can't afford drop - try snuff anyway
                    // Hard/Medium: Always try, Easy: 50% chance
                    const shouldTrySnuff = gameState.aiDifficulty !== 'easy' || Math.random() < 0.5;
                    if (shouldTrySnuff) {
                        ghoulChooseSnuff();
                        return;
                    }
                }
                
                // Can't do anything useful or Easy AI chose not to
                ghoulChooseNothing();
            }, 1500);
            return;
        }
        
        // Human Ghoul - build options UI
        let ghoulOptions = '<div style="text-align: center;"><strong>👹 Ghoul wins the battle!</strong><br><p style="margin: 15px 0;">Choose your action:</p>';
        
        if (canSnuff) {
            ghoulOptions += `<button id="ghoul-snuff-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #d32f2f;">💀 Snuff the Candle (3 shards)</button><br>`;
        }
        if (canDrop) {
            ghoulOptions += `<button id="ghoul-drop-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer;">💥 Drop Candle (${dropCandleCost} shards)</button><br>`;
        }
        ghoulOptions += `<button id="ghoul-nothing-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #666;">❌ Do Nothing (Soul escapes)</button></div>`;
        
        resultDiv.innerHTML = ghoulOptions;
        
        // Add event listeners for Ghoul's choices
        setTimeout(() => {
            if (canSnuff) {
                document.getElementById('ghoul-snuff-btn').addEventListener('click', () => ghoulChooseSnuff());
            }
            if (canDrop) {
                document.getElementById('ghoul-drop-btn').addEventListener('click', () => ghoulChooseDrop());
            }
            document.getElementById('ghoul-nothing-btn').addEventListener('click', () => ghoulChooseNothing());
        }, 100);
        return; // Wait for Ghoul's choice
    } else {
        // Tie - re-roll
        resultDiv.innerHTML = '⚖️ <strong>Tie!</strong><br>Rolling again...';
        showToast('⚔️ Battle tied! Re-rolling...');
        setTimeout(() => {
            document.getElementById('soul-roll').textContent = '?';
            document.getElementById('ghoul-roll').textContent = '?';
            resultDiv.innerHTML = '';
            setTimeout(() => {
                const newSoulRoll = Math.floor(Math.random() * 6) + 1;
                const newGhoulRoll = Math.floor(Math.random() * 6) + 1;
                document.getElementById('soul-roll').textContent = newSoulRoll;
                document.getElementById('ghoul-roll').textContent = newGhoulRoll;
                setTimeout(() => {
                    resolveBattle(newSoulRoll, newGhoulRoll);
                }, 1000);
            }, 500);
        }, 1500);
        return;
    }
    
    // Check if soul survived all battles
    if (gameState.battlesCompleted >= gameState.maxBattles) {
        setTimeout(() => {
            closeBattleModal();
            endGame('soul');
        }, 2000);
    }
}

// Soul chooses to use Cancel Snuff power-up
function useCancelSnuff() {
    const cancelSnuffCost = gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5);
    gameState.soulShards -= cancelSnuffCost;
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '🛡️ <strong>Soul cancels snuff!</strong><br>Both players return to spawn.';
    showToast(`🛡️ Soul used Cancel Snuff (${cancelSnuffCost} shards)! Both return to spawn.`);
    gameState.battlesCompleted++;
    respawnShards(cancelSnuffCost);
    updateUI();
    
    setTimeout(() => {
        returnToSpawn();
        closeBattleModal();
        
        // Check if soul survived all battles
        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => {
                endGame('soul');
            }, 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

// Soul declines to use Cancel Snuff - Game Over
function declineCancelSnuff() {
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '👹 <strong>Ghoul snuffs the candle!</strong><br>Darkness consumes all...';
    showToast('💀 Ghoul snuffed the candle! Game Over!');
    setTimeout(() => {
        closeBattleModal();
        endGame('ghoul');
    }, 2000);
}

// Soul chooses to attack the Ghoul
function soulUseAttackBonus() {
    const attackCost = gameState.boardSize === 8 ? 2 : 3;
    gameState.soulShards -= attackCost;
    
    // Remove 1 shard from Ghoul and respawn it
    if (gameState.ghoulShards > 0) {
        gameState.ghoulShards -= 1;
        respawnShards(1);
    }
    
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '⚔️ <strong>Soul attacks the Ghoul!</strong><br>Ghoul loses 1 shard. Both players return to spawn.';
    showToast(`⚔️ Soul attacked the Ghoul (${attackCost} shards)! Ghoul loses 1 shard.`);
    gameState.battlesCompleted++;
    respawnShards(attackCost);
    updateUI();
    
    setTimeout(() => {
        returnToSpawn();
        closeBattleModal();
        
        // Check if soul survived all battles
        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => {
                endGame('soul');
            }, 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

// Soul declines to use +1 Attack
function soulDeclineAttack() {
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '👻 <strong>Soul escapes!</strong><br>Both players return to spawn.';
    showToast('⚔️ Soul won the battle and escaped!');
    gameState.battlesCompleted++;
    
    setTimeout(() => {
        returnToSpawn();
        closeBattleModal();
        
        // Check if soul survived all battles
        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => {
                endGame('soul');
            }, 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

// Ghoul chooses to snuff the candle
function ghoulChooseSnuff() {
    const cancelSnuffCost = gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5);
    
    // Check if Soul can afford to cancel
    if (gameState.soulShards >= cancelSnuffCost) {
        // Check if Soul is AI
        if (gameState.gameMode === 'ai' && gameState.playerRole === 'ghoul') {
            // AI Soul decides whether to use Cancel Snuff
            const shouldUse = gameState.aiDifficulty === 'hard' || 
                            (gameState.aiDifficulty === 'medium' && Math.random() < 0.8) ||
                            (gameState.aiDifficulty === 'easy' && Math.random() < 0.5);
            
            const resultDiv = document.getElementById('battle-result');
            resultDiv.innerHTML = `<strong>👹 Ghoul tries to snuff the candle!</strong><br>AI Soul is deciding...`;
            
            setTimeout(() => {
                if (shouldUse) {
                    useCancelSnuff();
                } else {
                    declineCancelSnuff();
                }
            }, 1500);
            return;
        }
        
        // Human Soul - offer the choice
        const resultDiv = document.getElementById('battle-result');
        resultDiv.innerHTML = `
            <div style="text-align: center;">
                <strong>👹 Ghoul tries to snuff the candle!</strong><br>
                <p style="margin: 15px 0;">🛡️ Soul, you have ${gameState.soulShards} shards.<br>Use ${cancelSnuffCost} to cancel the snuff and survive?</p>
                <button id="use-cancel-snuff-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer;">
                    🛡️ Use Cancel Snuff (${cancelSnuffCost} shards)
                </button>
                <button id="decline-cancel-snuff-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #666;">
                    ❌ Don't Use (Game Over)
                </button>
            </div>
        `;
        
        // Add event listeners for Soul's response
        setTimeout(() => {
            document.getElementById('use-cancel-snuff-btn').addEventListener('click', useCancelSnuff);
            document.getElementById('decline-cancel-snuff-btn').addEventListener('click', declineCancelSnuff);
        }, 100);
    } else {
        // Soul can't afford to cancel - Ghoul wins
        const resultDiv = document.getElementById('battle-result');
        resultDiv.innerHTML = '👹 <strong>Ghoul snuffs the candle!</strong><br>Darkness consumes all...';
        showToast('💀 Ghoul snuffed the candle! Game Over!');
        setTimeout(() => {
            closeBattleModal();
            endGame('ghoul');
        }, 2000);
    }
}

// Ghoul chooses to drop the candle
function ghoulChooseDrop() {
    const dropCandleCost = gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5);
    gameState.ghoulShards -= dropCandleCost;
    dropCandle();
    respawnShards(dropCandleCost);
    gameState.battlesCompleted++;
    
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '💥 <strong>Ghoul makes Soul drop the candle!</strong><br>Both players return to spawn. Race to get it!';
    showToast(`💥 Ghoul used Drop Candle (${dropCandleCost} shards)! Race to pick it up!`);
    updateUI();
    
    setTimeout(() => {
        returnToSpawn();
        closeBattleModal();
        
        // Check if this was the final battle
        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => {
                endGame('soul');
            }, 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

// Ghoul chooses to do nothing
function ghoulChooseNothing() {
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '👹 <strong>Ghoul does nothing!</strong><br>Soul escapes. Both return to spawn.';
    showToast('⚔️ Ghoul chose not to use any power. Soul escapes!');
    gameState.battlesCompleted++;
    
    setTimeout(() => {
        returnToSpawn();
        closeBattleModal();
        
        // Check if soul survived all battles
        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => {
                endGame('soul');
            }, 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

// Return players to spawn
function returnToSpawn() {
    // Clear current positions
    clearCell(gameState.soulPosition.row, gameState.soulPosition.col);
    clearCell(gameState.ghoulPosition.row, gameState.ghoulPosition.col);
    
    // Reset positions
    gameState.soulPosition = { ...gameState.soulSpawn };
    gameState.ghoulPosition = { ...gameState.ghoulSpawn };
    
    // Update board
    updateCell(gameState.soulPosition.row, gameState.soulPosition.col, gameState.soulHasCandle ? '🕯️' : '👻');
    updateCell(gameState.ghoulPosition.row, gameState.ghoulPosition.col, '👹');
    
    showToast('Players returned to their spawn points.');
}

// Close battle modal
function closeBattleModal() {
    document.getElementById('battle-modal').classList.remove('active');
    document.getElementById('soul-roll').textContent = '?';
    document.getElementById('ghoul-roll').textContent = '?';
    document.getElementById('battle-result').innerHTML = '';
    document.getElementById('battle-powerups').style.display = 'none';
    
    // Reset battle flags
    gameState.inBattle = false;
    gameState.battleReady = false;
    updateBattleButtonState();
}

// End turn
function endTurn() {
    if (gameState.battleReady) {
        showToast('Resolve the pending battle before ending the turn!');
        return;
    }
    
    // Prevent multiple simultaneous endTurn calls
    if (gameState.isEndingTurn) {
        return;
    }
    
    gameState.isEndingTurn = true;
    gameState.movesLeft = 0;
    gameState.moveDirection = null;
    gameState.aiIsThinking = false;
    
    // Reset dice display
    document.getElementById('dice').textContent = '?';
    
    // Switch player
    const previousPlayer = gameState.currentPlayer;
    gameState.currentPlayer = gameState.currentPlayer === 'soul' ? 'ghoul' : 'soul';
    
    // Check dropped candle timer only after Ghoul's turn (meaning both players moved)
    if (gameState.candleDropTurnsLeft > 0 && previousPlayer === 'ghoul') {
        gameState.candleDropTurnsLeft--;
        if (gameState.candleDropTurnsLeft === 0) {
            // Time ran out - game ends in tie
            showToast('⏰ Time ran out! Nobody got the candle - TIE GAME!');
            setTimeout(() => {
                endGame('tie');
            }, 2000);
            return;
        } else {
            showToast(`⏰ ${gameState.candleDropTurnsLeft} full turns left to grab the candle!`);
        }
    }
    
    // Check if ghoul should skip turn
    if (gameState.currentPlayer === 'ghoul' && gameState.ghoulSkipTurn) {
        gameState.ghoulSkipTurn = false;
        showToast('👹 Ghoul skips turn due to teleport!');
        gameState.currentPlayer = 'soul';
    } else {
        showToast(`Turn ended. ${gameState.currentPlayer === 'soul' ? '👻 Soul' : '👹 Ghoul'}'s turn!`);
        
        // Remind Soul to get the candle if they don't have it
        if (gameState.currentPlayer === 'soul' && !gameState.soulHasCandle && !gameState.candlePosition) {
            setTimeout(() => {
                showToast('⚠️ Soul: Get the candle in the center first! 🕯️');
            }, 2000);
        }
    }
    
    updateUI();
    
    // Release the endTurn lock
    gameState.isEndingTurn = false;
    
    // If AI's turn, trigger roll
    if (isAITurn()) {
        setTimeout(() => rollDice(), 1500);
    }
}

// Update UI
function updateUI() {
    // Update current player
    const currentPlayerEl = document.getElementById('current-player');
    let playerText = `Player: ${gameState.currentPlayer === 'soul' ? '👻 Soul' : '👹 Ghoul'}`;
    
    // Add candle drop timer if active
    if (gameState.candleDropTurnsLeft > 0) {
        playerText += ` | ⏰ CANDLE DROP: ${gameState.candleDropTurnsLeft}/${gameState.candleDropMaxTurns} turns left!`;
    }
    
    currentPlayerEl.textContent = playerText;
    
    // Update current player visual indicator
    currentPlayerEl.classList.remove('soul-turn', 'ghoul-turn');
    currentPlayerEl.classList.add(gameState.currentPlayer === 'soul' ? 'soul-turn' : 'ghoul-turn');
    
    // Update game screen background
    const gameScreen = document.getElementById('game-screen');
    gameScreen.classList.remove('soul-turn', 'ghoul-turn');
    gameScreen.classList.add(gameState.currentPlayer === 'soul' ? 'soul-turn' : 'ghoul-turn');
    
    // Update battles
    document.getElementById('battles-remaining').textContent = 
        `Battles: ${gameState.battlesCompleted}/${gameState.maxBattles}`;
    
    // Update Soul stats
    document.getElementById('soul-pos').textContent = 
        `(${gameState.soulPosition.row}, ${gameState.soulPosition.col})`;
    document.getElementById('soul-shards').textContent = 
        `${gameState.soulShards}/${gameState.maxSoulShards}`;
    document.getElementById('soul-candle').textContent = 
        gameState.soulHasCandle ? 'Yes 🕯️' : 'No';
    
    // Update Ghoul stats
    document.getElementById('ghoul-pos').textContent = 
        `(${gameState.ghoulPosition.row}, ${gameState.ghoulPosition.col})`;
    document.getElementById('ghoul-shards').textContent = 
        gameState.ghoulShards;
    
    // Update moves
    document.getElementById('moves-left').textContent = gameState.movesLeft;
    
    // Check zigzag based on current player's shards
    const zigzagThreshold = gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5);
    const currentPlayerShards = gameState.currentPlayer === 'soul' ? gameState.soulShards : gameState.ghoulShards;
    const hasZigzag = currentPlayerShards >= zigzagThreshold;
    
    document.getElementById('can-zigzag').textContent = hasZigzag ? 'Yes ✓' : 'No';
    
    // Update zigzag ability
    gameState.canZigzag = hasZigzag;
    
    // Enable/disable roll button
    const rollBtn = document.getElementById('roll-btn');
    const aiTurn = isAITurn();
    rollBtn.disabled = gameState.movesLeft > 0 || aiTurn || gameState.aiIsThinking;
    
    // Gray out button during AI turn
    if (aiTurn || gameState.aiIsThinking) {
        rollBtn.style.opacity = '0.4';
        rollBtn.style.cursor = 'not-allowed';
    } else {
        rollBtn.style.opacity = '1';
        rollBtn.style.cursor = 'pointer';
    }
    
    updatePowerUps();
    updateBattleButtonState();
}

// Update power-ups display
function updatePowerUps() {
    const soulPowers = document.getElementById('soul-powers');
    const ghoulPowers = document.getElementById('ghoul-powers');
    const ghoulCanSnuff = document.getElementById('ghoul-can-snuff');
    
    soulPowers.innerHTML = '<strong>Powers:</strong><br>';
    ghoulPowers.innerHTML = '<strong>Powers:</strong><br>';
    
    // Soul powers
    if (gameState.boardSize === 8 && gameState.soulShards >= 1) {
        soulPowers.innerHTML += '• Re-roll<br>';
    }
    if ((gameState.boardSize === 8 || gameState.boardSize === 10) && gameState.soulShards >= 2) {
        soulPowers.innerHTML += '• +1 Attack<br>';
    }
    if ((gameState.boardSize === 8 && gameState.soulShards >= 3) || 
        (gameState.boardSize === 10 && gameState.soulShards >= 3) ||
        (gameState.boardSize === 14 && gameState.soulShards >= 3)) {
        soulPowers.innerHTML += '• Cancel Snuff<br>';
    }
    if (soulPowers.innerHTML === '<strong>Powers:</strong><br>') {
        soulPowers.innerHTML += '<em>None</em>';
    }
    
    // Ghoul powers
    if (gameState.ghoulShards >= 1) {
        ghoulPowers.innerHTML += '• Re-roll<br>';
    }
    if (gameState.ghoulShards >= 2) {
        ghoulPowers.innerHTML += '• Teleport<br>';
    }
    if (gameState.ghoulShards >= 3) {
        ghoulPowers.innerHTML += '• Drop Candle<br>';
        ghoulPowers.innerHTML += '• <strong>Can Snuff!</strong><br>';
    }
    if (ghoulPowers.innerHTML === '<strong>Powers:</strong><br>') {
        ghoulPowers.innerHTML += '<em>None</em>';
    }
    
    // Update can snuff indicator
    if (ghoulCanSnuff) {
        ghoulCanSnuff.textContent = gameState.ghoulShards >= 3 ? 'Yes ⚠️' : 'No';
    }
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// End game
function endGame(winner) {
    const modal = document.getElementById('win-modal');
    const title = document.getElementById('win-title');
    const message = document.getElementById('win-message');
    
    if (winner === 'soul') {
        title.textContent = '👻 Soul Escapes!';
        message.textContent = 'The soul survived all battles and escaped the haunted manor with the light intact!';
    } else if (winner === 'tie') {
        title.textContent = '⚖️ Stalemate!';
        message.textContent = 'Time ran out and neither player got the candle. The game ends in a tie!';
    } else {
        title.textContent = '👹 Darkness Prevails!';
        message.textContent = 'The ghoul snuffed out the candle, trapping the soul in the manor forever...';
    }
    
    modal.classList.add('active');
    gameState.gameStarted = false;
    gameState.battleReady = false;
    gameState.inBattle = false;
    updateBattleButtonState();
}

// Close win modal
function closeWinModal() {
    document.getElementById('win-modal').classList.remove('active');
}

// Quit game
function quitGame() {
    if (confirm('Are you sure you want to quit? Current game progress will be lost.')) {
        gameState.gameStarted = false;
        showScreen('main-menu');
    }
}

// Power-up modal functions
function showObjectiveModal(player) {
    const modal = document.getElementById('objective-modal');
    const title = document.getElementById('objective-title');
    const list = document.getElementById('objective-content');
    
    list.innerHTML = '';
    
    if (player === 'soul') {
        title.textContent = '👻 Soul Objective';
        list.innerHTML = `
            <div style="padding: 20px; text-align: left; line-height: 1.8;">
                <h3 style="margin-top: 0; color: #64B5F6;">Primary Goal:</h3>
                <p>🕯️ <strong>Retrieve the candle</strong> from the center of the manor and survive ${gameState.maxBattles} battles with the Ghoul.</p>
                
                <h3 style="margin-top: 20px; color: #64B5F6;">How to Win:</h3>
                <ul style="margin: 10px 0;">
                    <li>Get the candle from the center (can't collect shards without it)</li>
                    <li>Collect shards (💎) to use battle powers</li>
                    <li>Survive all ${gameState.maxBattles} battles OR survive until turn limit</li>
                    <li>If you drop the candle in battle, race to pick it back up!</li>
                </ul>
                
                <h3 style="margin-top: 20px; color: #64B5F6;">Battle Powers:</h3>
                <ul style="margin: 10px 0;">
                    <li><strong>Re-roll (1 shard):</strong> Re-roll your battle dice during a battle</li>
                    <li><strong>Attack (${gameState.boardSize === 8 ? 2 : 3} shards):</strong> Remove 1 shard from Ghoul if you win</li>
                    <li><strong>Cancel Snuff (3 shards):</strong> Prevent Ghoul from snuffing your candle</li>
                </ul>
                
                <h3 style="margin-top: 20px; color: #64B5F6;">Tips:</h3>
                <ul style="margin: 10px 0;">
                    <li>Keep at least 3 shards to cancel a Ghoul snuff attempt!</li>
                    <li>Avoid the Ghoul when possible - battles are risky</li>
                    <li>You can only trigger battles from cardinal directions (up/down/left/right)</li>
                </ul>
            </div>
        `;
    } else {
        title.textContent = '👹 Ghoul Objective';
        list.innerHTML = `
            <div style="padding: 20px; text-align: left; line-height: 1.8;">
                <h3 style="margin-top: 0; color: #EF5350;">Primary Goal:</h3>
                <p>💀 <strong>Prevent the Soul from escaping</strong> by snuffing their candle or making them drop it.</p>
                
                <h3 style="margin-top: 20px; color: #EF5350;">How to Win:</h3>
                <ul style="margin: 10px 0;">
                    <li>Collect 3 shards minimum (needed to snuff the candle in battle)</li>
                    <li>Catch the Soul and win battles</li>
                    <li>Snuff their candle (3 shards) OR make them drop it (${gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5)} shards)</li>
                    <li>If candle is dropped, grab it first to win instantly!</li>
                </ul>
                
                <h3 style="margin-top: 20px; color: #EF5350;">Battle Powers:</h3>
                <ul style="margin: 10px 0;">
                    <li><strong>Re-roll (1 shard):</strong> Re-roll your battle dice during a battle</li>
                    <li><strong>Snuff Candle (3 shards):</strong> Instant win if you win the battle!</li>
                    <li><strong>Drop Candle (${gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5)} shards):</strong> Force Soul to drop candle - race to get it!</li>
                </ul>
                
                <h3 style="margin-top: 20px; color: #EF5350;">Tips:</h3>
                <ul style="margin: 10px 0;">
                    <li>Get 3 shards before chasing - you need them to snuff!</li>
                    <li>Only drop if Soul has 3+ shards (they can cancel snuff)</li>
                    <li>You can only trigger battles from cardinal directions (up/down/left/right)</li>
                    <li>Collect extra shards while chasing for more options</li>
                </ul>
            </div>
        `;
    }
    
    modal.classList.add('active');
}

// Keep old function name for backwards compatibility if needed
function showPowerUpModal(player) {
    showObjectiveModal(player);
}

function closeObjectiveModal() {
    document.getElementById('objective-modal').classList.remove('active');
}

function closePowerUpModal() {
    document.getElementById('powerup-modal').classList.remove('active');
}

function buyPowerUp(player, powerType, cost) {
    if (player === 'soul') {
        if (gameState.soulShards < cost) {
            showToast('Not enough shards!');
            return;
        }
        
        gameState.soulShards -= cost;
        
        switch(powerType) {
            case 'reroll':
                if (gameState.movesLeft === 0) {
                    showToast('💎 Soul used Re-roll!');
                    rollDice();
                    respawnShards(cost);
                } else {
                    showToast('Can only use re-roll when you have no moves left!');
                    gameState.soulShards += cost; // Refund
                    return;
                }
                break;
        }
    } else {
        if (gameState.ghoulShards < cost) {
            showToast('Not enough shards!');
            return;
        }
        
        gameState.ghoulShards -= cost;
        
        switch(powerType) {
            case 'reroll':
                if (gameState.movesLeft === 0) {
                    showToast('💎 Ghoul used Re-roll!');
                    rollDice();
                    respawnShards(cost);
                } else {
                    showToast('Can only use re-roll when you have no moves left!');
                    gameState.ghoulShards += cost; // Refund
                    return;
                }
                break;
            case 'teleport':
                teleportGhoul();
                showToast('💎 Ghoul teleported! Losing next turn...');
                gameState.ghoulSkipTurn = true;
                respawnShards(cost);
                break;
        }
    }
    
    updateUI();
    closePowerUpModal();
}

function respawnShards(count) {
    for (let i = 0; i < count; i++) {
        let row, col;
        do {
            row = Math.floor(Math.random() * gameState.boardSize);
            col = Math.floor(Math.random() * gameState.boardSize);
        } while (isCellOccupied(row, col));

        gameState.shardsOnBoard.push({ row, col });
        updateCell(row, col, '💎');
    }
    if (count > 0) {
        showToast(`💎 ${count} shard${count > 1 ? 's' : ''} respawned on the board!`);
    }
}

// Update battle button state
function updateBattleButtonState() {
    const btn = document.getElementById('start-battle-btn');
    if (!btn) return;
    btn.disabled = !gameState.battleReady;
}function teleportGhoul() {
    const soulPos = gameState.soulPosition;
    const ghoulPos = gameState.ghoulPosition;
    
    const steps = gameState.boardSize === 8 ? 3 : 5;
    
    // Calculate direction to soul
    const rowDiff = soulPos.row - ghoulPos.row;
    const colDiff = soulPos.col - ghoulPos.col;
    
    // Clear old position
    clearCell(ghoulPos.row, ghoulPos.col);
    
    // Move closer to soul
    let stepsUsed = 0;
    while (stepsUsed < steps) {
        let moved = false;
        
        if (Math.abs(rowDiff) > Math.abs(colDiff)) {
            // Move vertically
            if (rowDiff > 0 && ghoulPos.row < gameState.boardSize - 1) {
                ghoulPos.row++;
                moved = true;
            } else if (rowDiff < 0 && ghoulPos.row > 0) {
                ghoulPos.row--;
                moved = true;
            }
        } else {
            // Move horizontally
            if (colDiff > 0 && ghoulPos.col < gameState.boardSize - 1) {
                ghoulPos.col++;
                moved = true;
            } else if (colDiff < 0 && ghoulPos.col > 0) {
                ghoulPos.col--;
                moved = true;
            }
        }
        
        if (!moved) break;
        
        // Check if reached soul
        if (ghoulPos.row === soulPos.row && ghoulPos.col === soulPos.col) {
            ghoulPos.row = soulPos.row;
            ghoulPos.col = soulPos.col;
            break;
        }
        
        stepsUsed++;
    }
    
    // Update ghoul position
    const cellContent = getCellContent(ghoulPos.row, ghoulPos.col);
    if (cellContent === '💎') {
        collectShard('ghoul', ghoulPos.row, ghoulPos.col);
    }
    
    updateCell(ghoulPos.row, ghoulPos.col, '👹');
}

function dropCandle() {
    // Soul drops the candle - spawn at center or far from both players
    gameState.soulHasCandle = false;
    
    // Try to spawn at center first
    const center = Math.floor(gameState.boardSize / 2);
    const centerEmpty = getCellContent(center, center) === '';
    
    if (centerEmpty) {
        // Spawn at center
        gameState.candlePosition = { row: center, col: center };
    } else {
        // Find position far from both players
        let maxDist = 0;
        let bestPos = { row: center, col: center };
        
        for (let row = 0; row < gameState.boardSize; row++) {
            for (let col = 0; col < gameState.boardSize; col++) {
                // Skip occupied cells
                if ((row === gameState.soulPosition.row && col === gameState.soulPosition.col) ||
                    (row === gameState.ghoulPosition.row && col === gameState.ghoulPosition.col)) {
                    continue;
                }
                
                // Calculate minimum distance to both players
                const soulDist = Math.abs(row - gameState.soulPosition.row) + Math.abs(col - gameState.soulPosition.col);
                const ghoulDist = Math.abs(row - gameState.ghoulPosition.row) + Math.abs(col - gameState.ghoulPosition.col);
                const minDist = Math.min(soulDist, ghoulDist);
                
                if (minDist > maxDist) {
                    maxDist = minDist;
                    bestPos = { row, col };
                }
            }
        }
        
        gameState.candlePosition = bestPos;
    }
    
    // Set turn limit based on board size
    gameState.candleDropMaxTurns = gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5);
    gameState.candleDropTurnsLeft = gameState.candleDropMaxTurns;
    
    showToast(`💥 Candle dropped! ${gameState.candleDropTurnsLeft} turns to grab it or TIE!`);
    
    // Display candle at new position
    updateCell(gameState.candlePosition.row, gameState.candlePosition.col, '�️');
    
    // Update soul position (remove candle visual)
    updateCell(gameState.soulPosition.row, gameState.soulPosition.col, '👻');
}

// AI Functions
function isAITurn() {
    if (gameState.gameMode !== 'ai') return false;
    const aiRole = gameState.playerRole === 'soul' ? 'ghoul' : 'soul';
    return gameState.currentPlayer === aiRole;
}

async function makeAIMove() {
    // Don't continue if AI stopped thinking (turn ended)
    if (!gameState.aiIsThinking) {
        return;
    }
    
    if (gameState.movesLeft <= 0) {
        // Done moving, end turn
        gameState.aiIsThinking = false;
        gameState.lastAIPosition = null;
        gameState.aiStuckCount = 0;
        gameState.llmMoveCache = null;
        setTimeout(() => endTurn(), 500);
        return;
    }
    
    // Check if AI is stuck (hasn't moved for 2+ attempts)
    const aiRole = gameState.playerRole === 'soul' ? 'ghoul' : 'soul';
    const aiPos = aiRole === 'soul' ? gameState.soulPosition : gameState.ghoulPosition;
    
    if (gameState.lastAIPosition && 
        gameState.lastAIPosition.row === aiPos.row && 
        gameState.lastAIPosition.col === aiPos.col) {
        gameState.aiStuckCount++;
    } else {
        gameState.aiStuckCount = 0;
    }
    
    // Get direction to move (may be async for LLM)
    let direction = getAIDirection();
    
    // If hard difficulty and LLM enabled, get LLM moves
    if (direction === 'llm-pending') {
        // Check if we have cached moves from LLM
        if (!gameState.llmMoveCache || gameState.llmMoveCache.length === 0) {
            // Ask LLM for all moves at once
            const moves = await getLLMMove(aiRole);
            
            // If LLM failed, fall back to pathfinding
            if (!moves || moves.length === 0) {
                direction = getAIDirection(true); // Force non-LLM
            } else {
                // Store moves in cache and use first one
                gameState.llmMoveCache = moves;
                direction = gameState.llmMoveCache.shift();
            }
        } else {
            // Use next move from cache
            direction = gameState.llmMoveCache.shift();
        }
    }
    
    // Check if AI (ghoul) is about to move onto dropped candle - prioritize this over battle!
    let movingToDroppedCandle = false;
    
    if (aiRole === 'ghoul' && gameState.candlePosition && direction) {
        // Check if the next move will be onto the dropped candle
        const nextPos = { row: aiPos.row, col: aiPos.col };
        switch(direction) {
            case 'up': nextPos.row--; break;
            case 'down': nextPos.row++; break;
            case 'left': nextPos.col--; break;
            case 'right': nextPos.col++; break;
            case 'up-left': nextPos.row--; nextPos.col--; break;
            case 'up-right': nextPos.row--; nextPos.col++; break;
            case 'down-left': nextPos.row++; nextPos.col--; break;
            case 'down-right': nextPos.row++; nextPos.col++; break;
        }
        if (nextPos.row === gameState.candlePosition.row && 
            nextPos.col === gameState.candlePosition.col) {
            movingToDroppedCandle = true;
        }
    }
    
    // Check if battle is ready (AI moved next to opponent)
    // BUT don't start battle if ghoul is about to pick up dropped candle (instant win)
    if (!movingToDroppedCandle && gameState.battleReady && gameState.soulHasCandle && checkForBattle()) {
        gameState.aiIsThinking = false;
        gameState.lastAIPosition = null;
        gameState.aiStuckCount = 0;
        // Trigger battle after a short delay
        setTimeout(() => startBattle(), 800);
        return;
    }
    
    if (direction) {
        const posBeforeMove = { row: aiPos.row, col: aiPos.col };
        gameState.lastAIPosition = { row: aiPos.row, col: aiPos.col };
        
        movePlayer(direction);
        
        // Check if move was successful by seeing if position changed
        const aiPosAfter = aiRole === 'soul' ? gameState.soulPosition : gameState.ghoulPosition;
        const moveSucceeded = (aiPosAfter.row !== posBeforeMove.row || aiPosAfter.col !== posBeforeMove.col);
        
        if (!moveSucceeded) {
            // Move was blocked! Try a different direction
            console.log(`⚠ Move ${direction} was blocked, trying alternative...`);
            gameState.aiStuckCount++;
            
            // Get all valid directions and try a different one
            const allDirs = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
            const validDirs = allDirs.filter(dir => dir !== direction && canMoveInDirection(posBeforeMove, dir));
            
            if (validDirs.length > 0) {
                // Try a random alternative direction
                const altDirection = validDirs[Math.floor(Math.random() * validDirs.length)];
                console.log(`  Trying alternative direction: ${altDirection}`);
                movePlayer(altDirection);
            } else {
                console.log(`  No alternative directions available`);
                gameState.movesLeft = 0; // Give up this turn
            }
        }
        
        // Continue after a delay
        setTimeout(() => makeAIMove(), 600);
    } else {
        // No valid move, end turn
        gameState.movesLeft = 0;
        gameState.aiIsThinking = false;
        gameState.lastAIPosition = null;
        gameState.aiStuckCount = 0;
        setTimeout(() => endTurn(), 500);
    }
}

// Monte Carlo Tree Search Node
class MCTSNode {
    constructor(state, parent = null, move = null) {
        this.state = state; // Game state snapshot
        this.parent = parent;
        this.move = move; // The move that led to this node
        this.children = [];
        this.visits = 0;
        this.wins = 0;
        this.untriedMoves = this.getValidMoves();
    }
    
    getValidMoves() {
        const moves = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
        const validMoves = moves.filter(move => this.isValidMove(move));
        
        // Debug: log filtered moves if opponent is blocking
        if (validMoves.length < moves.length && this.state.opponentPos) {
            const invalidMoves = moves.filter(move => !this.isValidMove(move));
            // Only log once at root level to avoid spam
            if (!this.parent && invalidMoves.length > 0) {
                console.log(`   Filtered out ${invalidMoves.length} invalid moves (would hit opponent/wall)`);
            }
        }
        
        return validMoves;
    }
    
    isValidMove(direction) {
        const pos = this.state.aiPos;
        let newRow = pos.row;
        let newCol = pos.col;
        
        switch(direction) {
            case 'up': newRow--; break;
            case 'down': newRow++; break;
            case 'left': newCol--; break;
            case 'right': newCol++; break;
            case 'up-left': newRow--; newCol--; break;
            case 'up-right': newRow--; newCol++; break;
            case 'down-left': newRow++; newCol--; break;
            case 'down-right': newRow++; newCol++; break;
        }
        
        // Check board boundaries
        if (newRow < 0 || newRow >= this.state.boardSize || 
            newCol < 0 || newCol >= this.state.boardSize) {
            return false;
        }
        
        // Check if moving onto opponent's position (NOT ALLOWED!)
        if (this.state.opponentPos && 
            newRow === this.state.opponentPos.row && 
            newCol === this.state.opponentPos.col) {
            return false;
        }
        
        return true;
    }
    
    UCB1(explorationConstant = 1.41) {
        if (this.visits === 0) return Infinity;
        return (this.wins / this.visits) + 
               explorationConstant * Math.sqrt(Math.log(this.parent.visits) / this.visits);
    }
    
    selectChild() {
        return this.children.reduce((best, child) => 
            child.UCB1() > best.UCB1() ? child : best
        );
    }
    
    expand() {
        if (this.untriedMoves.length === 0) return null;
        const move = this.untriedMoves.pop();
        const newState = this.simulateMove(move);
        const child = new MCTSNode(newState, this, move);
        this.children.push(child);
        return child;
    }
    
    simulateMove(direction) {
        const newState = { ...this.state };
        const pos = { ...newState.aiPos };
        
        switch(direction) {
            case 'up': pos.row--; break;
            case 'down': pos.row++; break;
            case 'left': pos.col--; break;
            case 'right': pos.col++; break;
            case 'up-left': pos.row--; pos.col--; break;
            case 'up-right': pos.row--; pos.col++; break;
            case 'down-left': pos.row++; pos.col--; break;
            case 'down-right': pos.row++; pos.col++; break;
        }
        
        newState.aiPos = pos;
        return newState;
    }
    
    simulate() {
        // Role-aware simulation: evaluate position quality based on AI role
        const dist = Math.abs(this.state.aiPos.row - this.state.targetPos.row) + 
                     Math.abs(this.state.aiPos.col - this.state.targetPos.col);
        
        let score = 1 / (1 + dist); // Base score: closer to target is better
        
        // Role-specific bonuses
        if (this.state.aiRole === 'ghoul') {
            // Ghoul AI: strategic shard collection and soul hunting
            const distToSoul = Math.abs(this.state.aiPos.row - this.state.opponentPos.row) + 
                              Math.abs(this.state.aiPos.col - this.state.opponentPos.col);
            
            // Check if adjacent on cardinal direction (can trigger battle)
            const rowDiff = Math.abs(this.state.aiPos.row - this.state.opponentPos.row);
            const colDiff = Math.abs(this.state.aiPos.col - this.state.opponentPos.col);
            const isCardinalAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
            const isDiagonalAdjacent = (rowDiff === 1 && colDiff === 1);
            
            // Priority 1: Need 3 shards minimum to snuff candle
            if (this.state.ghoulShards < 3) {
                // Boost score for going after shards when we need them
                if (this.state.targetIsShard) {
                    score *= 1.5; // Prioritize shard collection
                    
                    // Check if soul is also near this shard (competition)
                    const soulDistToTarget = Math.abs(this.state.opponentPos.row - this.state.targetPos.row) + 
                                            Math.abs(this.state.opponentPos.col - this.state.targetPos.col);
                    if (soulDistToTarget <= 2 && soulDistToTarget < dist) {
                        // Soul is closer to shard - might lose it
                        score *= 0.7;
                    }
                }
                
                // Penalty for chasing soul when we don't have enough shards yet
                if (!this.state.targetIsShard && distToSoul < 3) {
                    score -= 0.3;
                }
            } else {
                // Have 3+ shards - now hunting mode
                // BIG bonus for being adjacent on cardinal direction (can trigger battle!)
                if (isCardinalAdjacent) {
                    score += 0.8; // Huge bonus - battle can start!
                } else if (isDiagonalAdjacent) {
                    // Diagonal adjacent is NOT good enough for battle
                    score += 0.1; // Small bonus but not as good
                } else if (distToSoul === 2) {
                    score += 0.3; // Moderate bonus for being close
                }
                
                // Bonus for cutting off soul's escape routes
                if (distToSoul <= 3) {
                    score += 0.2;
                }
            }
        } else {
            // Soul AI: survival and smart shard collection
            const distToGhoul = Math.abs(this.state.aiPos.row - this.state.opponentPos.row) + 
                               Math.abs(this.state.aiPos.col - this.state.opponentPos.col);
            
            // Check if adjacent on cardinal direction (battle can be triggered!)
            const rowDiff = Math.abs(this.state.aiPos.row - this.state.opponentPos.row);
            const colDiff = Math.abs(this.state.aiPos.col - this.state.opponentPos.col);
            const isCardinalAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
            const isDiagonalAdjacent = (rowDiff === 1 && colDiff === 1);
            
            // Check if soul already has 3+ shards
            const hasEnoughShards = this.state.soulShards >= 3;
            
            if (this.state.targetIsShard && !hasEnoughShards) {
                // Evaluating a shard target
                const ghoulDistToTarget = Math.abs(this.state.opponentPos.row - this.state.targetPos.row) + 
                                         Math.abs(this.state.opponentPos.col - this.state.targetPos.col);
                
                // Don't go for shard if ghoul is much closer (will get there first)
                if (ghoulDistToTarget < dist - 1) {
                    score *= 0.4; // Heavy penalty - ghoul will get it first
                }
                
                // Don't go for shard if ghoul is nearby (dangerous)
                if (distToGhoul <= 2) {
                    score *= 0.3; // Very risky to collect shard near ghoul
                }
                
                // Bonus for being closer to shard than ghoul
                if (dist < ghoulDistToTarget) {
                    score *= 1.3;
                }
            }
            
            // If already has 3+ shards, deprioritize collecting more
            if (hasEnoughShards && this.state.targetIsShard) {
                score *= 0.5; // Lower priority for additional shards
            }
            
            // Survival bonuses - cardinal adjacency is MUCH worse than diagonal
            if (isCardinalAdjacent) {
                // CARDINAL adjacent - battle can trigger! Very dangerous!
                score -= 0.7; // Huge penalty
                if (this.state.ghoulShards >= 3) {
                    score -= 0.4; // Even worse if ghoul can snuff
                }
            } else if (isDiagonalAdjacent) {
                // Diagonal adjacent - safer since battle can't trigger
                score -= 0.2; // Small penalty but not terrible
            } else if (distToGhoul >= 5) {
                score += 0.4; // Safe distance
            } else if (distToGhoul >= 3) {
                score += 0.2; // Moderate distance
            } else if (distToGhoul === 2) {
                score -= 0.3; // Getting close
            }
            
            // Extra penalty if ghoul has 3+ shards and is in cardinal attack range
            if (this.state.ghoulShards >= 3 && distToGhoul <= 2 && !isDiagonalAdjacent) {
                score -= 0.2; // Very dangerous
            }
        }
        
        return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
    }
    
    backpropagate(result) {
        this.visits++;
        this.wins += result;
        if (this.parent) {
            this.parent.backpropagate(result);
        }
    }
}

function runMCTS(aiPos, targetPos, aiRole, targetIsShard = false, iterations = 100) {
    const opponentPos = aiRole === 'soul' ? gameState.ghoulPosition : gameState.soulPosition;
    
    const initialState = {
        aiPos: { ...aiPos },
        targetPos: { ...targetPos },
        opponentPos: { ...opponentPos },
        boardSize: gameState.boardSize,
        aiRole: aiRole,
        ghoulShards: gameState.ghoulShards,
        soulShards: gameState.soulShards,
        targetIsShard: targetIsShard
    };
    
    const root = new MCTSNode(initialState);
    
    for (let i = 0; i < iterations; i++) {
        let node = root;
        
        // Selection
        while (node.untriedMoves.length === 0 && node.children.length > 0) {
            node = node.selectChild();
        }
        
        // Expansion
        if (node.untriedMoves.length > 0) {
            node = node.expand();
        }
        
        // Simulation
        const result = node.simulate();
        
        // Backpropagation
        node.backpropagate(result);
    }
    
    // Return best move
    if (root.children.length === 0) return null;
    const bestChild = root.children.reduce((best, child) => 
        child.visits > best.visits ? child : best
    );
    
    // Debug output
    console.log(`  MCTS Stats: ${root.children.length} moves evaluated`);
    console.log(`  Best move: ${bestChild.move} (${bestChild.visits} visits, ${(bestChild.wins/bestChild.visits*100).toFixed(1)}% win rate)`);
    
    return bestChild.move;
}

function getAIDirection(forceFallback = false) {
    const aiRole = gameState.playerRole === 'soul' ? 'ghoul' : 'soul';
    const aiPos = aiRole === 'soul' ? gameState.soulPosition : gameState.ghoulPosition;
    
    // Hard difficulty with LLM enabled - signal async needed
    if (!forceFallback && gameState.aiDifficulty === 'hard' && LLM_CONFIG.enabled) {
        return 'llm-pending';
    }
    
    // AI can always change direction - choose best direction to target
    let targetPos;
    let targetIsShard = false;
    
    if (aiRole === 'soul') {
        // Soul AI: Check if should prioritize collecting shards (for harder difficulties)
        const shouldCollectShards = (gameState.aiDifficulty === 'hard' || 
                                     (gameState.aiDifficulty === 'medium' && Math.random() < 0.6)) &&
                                     gameState.soulShards < gameState.maxSoulShards;
        
        // Find nearest shard if AI wants to collect and hasn't maxed out
        let nearestShard = null;
        let nearestShardDist = Infinity;
        
        if (shouldCollectShards && gameState.shardsOnBoard.length > 0) {
            for (const shard of gameState.shardsOnBoard) {
                const dist = Math.abs(aiPos.row - shard.row) + Math.abs(aiPos.col - shard.col);
                if (dist < nearestShardDist) {
                    nearestShardDist = dist;
                    nearestShard = shard;
                }
            }
        }
        
        // Prioritize targets based on situation
        if (!gameState.soulHasCandle && gameState.candlePosition) {
            // Candle exists (dropped or initial) - highest priority!
            targetPos = gameState.candlePosition;
            targetIsShard = false;
        } else if (!gameState.soulHasCandle) {
            // Don't have candle yet - go to center where it spawns
            const center = Math.floor(gameState.boardSize / 2);
            targetPos = { row: center, col: center };
            targetIsShard = false;
        } else if (nearestShard && gameState.soulShards < gameState.maxSoulShards) {
            // Has candle - collect shards if available and not maxed out
            targetPos = nearestShard;
            targetIsShard = true;
        } else {
            // Has candle and max shards (or no shards available) - just evade ghoul
            // Pick a random corner far from ghoul
            const corners = [
                { row: 0, col: 0 },
                { row: 0, col: gameState.boardSize - 1 },
                { row: gameState.boardSize - 1, col: 0 },
                { row: gameState.boardSize - 1, col: gameState.boardSize - 1 }
            ];
            
            // Find corner furthest from ghoul
            const ghoulPos = gameState.ghoulPosition;
            let furthestCorner = corners[0];
            let maxDist = 0;
            
            for (const corner of corners) {
                const dist = Math.abs(corner.row - ghoulPos.row) + Math.abs(corner.col - ghoulPos.col);
                if (dist > maxDist) {
                    maxDist = dist;
                    furthestCorner = corner;
                }
            }
            
            targetPos = furthestCorner;
            targetIsShard = false;
        }
    } else {
        // Ghoul AI: Prioritize getting 3 shards first, then chase Soul
        const needsShards = gameState.ghoulShards < 3;
        
        // Find nearest shard
        let nearestShard = null;
        let nearestShardDist = Infinity;
        
        if (gameState.shardsOnBoard.length > 0) {
            for (const shard of gameState.shardsOnBoard) {
                const dist = Math.abs(aiPos.row - shard.row) + Math.abs(aiPos.col - shard.col);
                if (dist < nearestShardDist) {
                    nearestShardDist = dist;
                    nearestShard = shard;
                }
            }
        }
        
        // Ghoul priorities:
        // 1. Dropped candle from battle (ONLY if it was dropped, NOT the initial candle!)
        // 2. Collect 3 shards first (need them to snuff candle in battle)
        // 3. Chase soul once has 3+ shards
        // 4. Opportunistically grab nearby shards along the way (even if has 3+)
        const atSamePosition = aiPos.row === gameState.soulPosition.row && 
                               aiPos.col === gameState.soulPosition.col;
        
        const distToSoul = Math.abs(aiPos.row - gameState.soulPosition.row) + 
                          Math.abs(aiPos.col - gameState.soulPosition.col);
        
        // Only target candle if it's DROPPED (candleWasPickedUp = true), not initial candle
        if (gameState.candlePosition && gameState.candleWasPickedUp) {
            // Dropped candle exists (from battle) - always go for it to WIN!
            targetPos = gameState.candlePosition;
            targetIsShard = false;
        } else if (needsShards && nearestShard) {
            // Need 3 shards minimum - prioritize collecting them
            targetPos = nearestShard;
            targetIsShard = true;
        } else if (nearestShard && nearestShardDist <= 2 && distToSoul > nearestShardDist) {
            // Has 3+ shards but there's a shard very close by (≤2 spaces) that's closer than soul
            // Grab it opportunistically on the way
            targetPos = nearestShard;
            targetIsShard = true;
        } else if (atSamePosition) {
            // At same position as soul (e.g., after respawn) - move toward center to spread out
            const center = Math.floor(gameState.boardSize / 2);
            targetPos = { row: center, col: center };
            targetIsShard = false;
        } else {
            // Has 3+ shards - now chase soul
            targetPos = gameState.soulPosition;
            targetIsShard = false;
            
            // BUT: if soul is at the initial candle position, don't path through it
            // Path around it instead
            if (gameState.candlePosition && !gameState.candleWasPickedUp &&
                targetPos.row === gameState.candlePosition.row && 
                targetPos.col === gameState.candlePosition.col) {
                // Soul is at initial candle - path to adjacent position instead
                const adjacentPositions = [
                    { row: targetPos.row - 1, col: targetPos.col },     // up
                    { row: targetPos.row + 1, col: targetPos.col },     // down
                    { row: targetPos.row, col: targetPos.col - 1 },     // left
                    { row: targetPos.row, col: targetPos.col + 1 },     // right
                ];
                
                // Pick closest adjacent position
                let closestAdj = adjacentPositions[0];
                let minDist = Infinity;
                for (const adj of adjacentPositions) {
                    if (adj.row >= 0 && adj.row < gameState.boardSize && 
                        adj.col >= 0 && adj.col < gameState.boardSize) {
                        const dist = Math.abs(aiPos.row - adj.row) + Math.abs(aiPos.col - adj.col);
                        if (dist < minDist) {
                            minDist = dist;
                            closestAdj = adj;
                        }
                    }
                }
                targetPos = closestAdj;
            }
        }
    }
    
    // Use MCTS for medium difficulty
    if (gameState.aiDifficulty === 'medium') {
        const opponentPos = aiRole === 'soul' ? gameState.ghoulPosition : gameState.soulPosition;
        console.log(`🧠 ${aiRole.toUpperCase()} AI using Monte Carlo Tree Search...`);
        console.log(`   AI at (${aiPos.row}, ${aiPos.col})`);
        console.log(`   Target: ${targetIsShard ? 'Shard' : 'Position'} at (${targetPos.row}, ${targetPos.col})`);
        console.log(`   Opponent at (${opponentPos.row}, ${opponentPos.col})`);
        console.log(`   ${aiRole === 'soul' ? 'Soul' : 'Ghoul'} shards: ${aiRole === 'soul' ? gameState.soulShards : gameState.ghoulShards}`);
        const mctsMove = runMCTS(aiPos, targetPos, aiRole, targetIsShard, 100);
        if (mctsMove && canMoveInDirection(aiPos, mctsMove)) {
            console.log(`✓ MCTS chose move: ${mctsMove}`);
            return mctsMove;
        }
        console.log('⚠ MCTS failed, using fallback pathfinding');
    }
    
    return calculateBestDirection(aiPos, targetPos);
}

function canMoveInDirection(pos, direction) {
    let newRow = pos.row;
    let newCol = pos.col;
    
    switch(direction) {
        case 'up': newRow--; break;
        case 'down': newRow++; break;
        case 'left': newCol--; break;
        case 'right': newCol++; break;
        case 'up-left': newRow--; newCol--; break;
        case 'up-right': newRow--; newCol++; break;
        case 'down-left': newRow++; newCol--; break;
        case 'down-right': newRow++; newCol++; break;
    }
    
    // Check bounds
    if (newRow < 0 || newRow >= gameState.boardSize || newCol < 0 || newCol >= gameState.boardSize) {
        return false;
    }
    
    return true;
}

function calculateBestDirection(from, to) {
    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;
    
    const directions = [];
    
    // Add cardinal and diagonal directions
    if (rowDiff < 0 && colDiff === 0) directions.push({ dir: 'up', dist: Math.abs(rowDiff) });
    if (rowDiff > 0 && colDiff === 0) directions.push({ dir: 'down', dist: Math.abs(rowDiff) });
    if (colDiff < 0 && rowDiff === 0) directions.push({ dir: 'left', dist: Math.abs(colDiff) });
    if (colDiff > 0 && rowDiff === 0) directions.push({ dir: 'right', dist: Math.abs(colDiff) });
    
    // Add diagonal directions when both row and col differ
    if (rowDiff < 0 && colDiff < 0) directions.push({ dir: 'up-left', dist: Math.abs(rowDiff) + Math.abs(colDiff) });
    if (rowDiff < 0 && colDiff > 0) directions.push({ dir: 'up-right', dist: Math.abs(rowDiff) + Math.abs(colDiff) });
    if (rowDiff > 0 && colDiff < 0) directions.push({ dir: 'down-left', dist: Math.abs(rowDiff) + Math.abs(colDiff) });
    if (rowDiff > 0 && colDiff > 0) directions.push({ dir: 'down-right', dist: Math.abs(rowDiff) + Math.abs(colDiff) });
    
    // If AI is stuck (hit wall repeatedly), pick any valid direction
    if (gameState.aiStuckCount >= 2) {
        const allDirs = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
        const validDirs = allDirs.filter(dir => canMoveInDirection(from, dir));
        if (validDirs.length === 0) return null;
        gameState.aiStuckCount = 0; // Reset after finding alternative
        return validDirs[Math.floor(Math.random() * validDirs.length)];
    }
    
    // If already at target or no directions, pick any valid direction
    if (directions.length === 0) {
        const allDirs = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
        const validDirs = allDirs.filter(dir => canMoveInDirection(from, dir));
        if (validDirs.length === 0) return null;
        return validDirs[Math.floor(Math.random() * validDirs.length)];
    }
    
    // Filter out directions that would hit walls
    const validDirections = directions.filter(d => canMoveInDirection(from, d.dir));
    if (validDirections.length === 0) {
        // All preferred directions blocked - pick any valid one
        const allDirs = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
        const validDirs = allDirs.filter(dir => canMoveInDirection(from, dir));
        if (validDirs.length === 0) return null;
        return validDirs[Math.floor(Math.random() * validDirs.length)];
    }
    
    // Apply difficulty
    if (gameState.aiDifficulty === 'easy') {
        // Heuristic: always move toward target (no randomness)
        // Simple rule-based AI that follows basic strategy
        validDirections.sort((a, b) => a.dist - b.dist);
        return validDirections[0].dir;
    } else if (gameState.aiDifficulty === 'medium') {
        // 50% optimal
        if (Math.random() < 0.5) {
            return validDirections[Math.floor(Math.random() * validDirections.length)].dir;
        }
    }
    
    // Hard or fallback: always optimal
    validDirections.sort((a, b) => a.dist - b.dist);
    return validDirections[0].dir;
}

// Initialize on load
window.addEventListener('load', () => {
    showScreen('main-menu');
});
