// ================================
// Game State
// ================================
let gameState = {
    boardSize: 8,
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
    battleReady: false,
    inBattle: false        // true while the battle modal is active

};

// ================================
// Screen Handling
// ================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Setup screen - size selection
document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});


// ================================
// A.I. Implementation
// ================================



// ================================
// Start Game
// ================================
function startGame() {
    const selectedSize = document.querySelector('.size-btn.active').dataset.size;

    switch (selectedSize) {
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

    // Initialize board
    initializeBoard();

    // Show game screen
    showScreen('game-screen');

    showToast('Game started! Soul must reach the candle in the center.');
    showToast('Soul: Roll the dice to move!');

    updateUI();
    updateBattleButtonState();
}

// ================================
// Board setup
// ================================
function initializeBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${gameState.boardSize}, 40px)`;
    board.style.gridTemplateRows = `repeat(${gameState.boardSize}, 40px)`;

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

    // Candle in center
    const center = Math.floor(gameState.boardSize / 2);
    gameState.candlePosition = { row: center, col: center };
    updateCell(center, center, '🕯️');

    // Soul top-left
    gameState.soulPosition = { row: 0, col: 0 };
    gameState.soulSpawn = { row: 0, col: 0 };
    updateCell(0, 0, '👻');

    // Ghoul bottom-right
    const ghoulRow = gameState.boardSize - 1;
    const ghoulCol = gameState.boardSize - 1;
    gameState.ghoulPosition = { row: ghoulRow, col: ghoulCol };
    gameState.ghoulSpawn = { row: ghoulRow, col: ghoulCol };
    updateCell(ghoulRow, ghoulCol, '👹');

    // Shards
    placeShards(gameState.totalShards);
}

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

function isCellOccupied(row, col) {
    if (gameState.soulPosition && gameState.soulPosition.row === row && gameState.soulPosition.col === col) return true;
    if (gameState.ghoulPosition && gameState.ghoulPosition.row === row && gameState.ghoulPosition.col === col) return true;
    if (gameState.candlePosition && gameState.candlePosition.row === row && gameState.candlePosition.col === col) return true;
    if (gameState.shardsOnBoard.some(s => s.row === row && s.col === col)) return true;
    return false;
}

function updateCell(row, col, content) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell) cell.textContent = content;
}

function getCellContent(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    return cell ? cell.textContent : '';
}

function clearCell(row, col) {
    if (gameState.candlePosition && gameState.candlePosition.row === row && gameState.candlePosition.col === col) {
        updateCell(row, col, '🕯️');
    } else if (gameState.shardsOnBoard.some(s => s.row === row && s.col === col)) {
        updateCell(row, col, '💎');
    } else {
        updateCell(row, col, '');
    }
}

function handleCellClick(row, col) {
    // not used right now – movement is via arrows
}

// ================================
// Dice & Movement
// ================================
function rollDice() {
    if (gameState.movesLeft > 0) {
        showToast('Finish your current moves first!');
        return;
    }

    if (gameState.currentPlayer === 'soul' && !gameState.soulHasCandle) {
        showToast('⚠️ Remember: Get the candle in the center first! 🕯️');
    }

    const dice = document.getElementById('dice');
    dice.classList.add('rolling');

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
        }
    }, 100);
}

// direction: 'up', 'down', 'left', 'right', 'up-left', ...
function movePlayer(direction) {
    if (gameState.movesLeft <= 0) {
        showToast('Roll the dice first!');
        return;
    }

    // Don’t move during an active battle
    if (gameState.inBattle) {
        showToast('Resolve the battle first!');
        return;
    }

    const player = gameState.currentPlayer;
    const position = player === 'soul' ? gameState.soulPosition : gameState.ghoulPosition;

    // Restrict direction changes unless canZigzag
    if (gameState.moveDirection !== null &&
        gameState.moveDirection !== direction &&
        !gameState.canZigzag) {
        showToast('Cannot change direction! You can only move in one direction per turn.');
        return;
    }

    let newRow = position.row;
    let newCol = position.col;

    switch (direction) {
        case 'up': newRow--; break;
        case 'down': newRow++; break;
        case 'left': newCol--; break;
        case 'right': newCol++; break;
        case 'up-left': newRow--; newCol--; break;
        case 'up-right': newRow--; newCol++; break;
        case 'down-left': newRow++; newCol--; break;
        case 'down-right': newRow++; newCol++; break;
    }

    // Boundaries
    if (newRow < 0 || newRow >= gameState.boardSize || newCol < 0 || newCol >= gameState.boardSize) {
        showToast('Hit a wall! You can now change direction for remaining moves.');
        gameState.moveDirection = null;
        return;
    }

    // Cannot move onto other player
    const otherPlayer = player === 'soul' ? gameState.ghoulPosition : gameState.soulPosition;
    if (otherPlayer.row === newRow && otherPlayer.col === newCol) {
        showToast('Cannot move onto another player!');
        return;
    }

    gameState.moveDirection = direction;
    const cellContent = getCellContent(newRow, newCol);

    // Ghoul cannot pick initial candle
    if (cellContent === '🕯️' && player === 'ghoul' && !gameState.candleWasPickedUp) {
        showToast('👹 Ghoul cannot move onto the candle! Soul must get it first. You can now change direction.');
        gameState.moveDirection = null;
        return;
    }

    // Move player
    clearCell(position.row, position.col);
    position.row = newRow;
    position.col = newCol;

    // Handle contents
    if (cellContent === '🕯️') {
        if (player === 'soul' && !gameState.soulHasCandle) {
            gameState.soulHasCandle = true;
            gameState.candleWasPickedUp = true;
            gameState.candlePosition = null;
            gameState.candleDropTurnsLeft = 0;
            gameState.candleDropMaxTurns = 0;
            showToast('🕯️ Soul obtained the candle! Now survive the battles!');
        } else if (player === 'ghoul' && gameState.candlePosition) {
            // Ghoul picks up dropped candle -> win
            showToast('👹 Ghoul got the dropped candle! Darkness wins!');
            gameState.movesLeft = 0;
            gameState.candlePosition = null;
            gameState.candleDropTurnsLeft = 0;
            gameState.candleDropMaxTurns = 0;
            endGame('ghoul');
            return;
        } else if (player === 'soul' && gameState.candlePosition) {
            gameState.soulHasCandle = true;
            gameState.candlePosition = null;
            gameState.candleDropTurnsLeft = 0;
            gameState.candleDropMaxTurns = 0;
            showToast('🕯️ Soul picked up the candle again!');
        }
    } else if (cellContent === '💎' && gameState.soulHasCandle) {
        collectShard(player, newRow, newCol);
    }

    updateCell(newRow, newCol, player === 'soul'
        ? (gameState.soulHasCandle ? '🕯️' : '👻')
        : '👹');

    // Spend a move
    gameState.movesLeft--;

    // Check battle readiness (only when Soul has candle and not already in/pending battle)
    if (gameState.soulHasCandle && !gameState.inBattle && !gameState.battleReady && checkForBattle()) {
        gameState.movesLeft = 0;
        gameState.moveDirection = null;
        gameState.battleReady = true;
        showToast('⚔️ Battle ready! Click "Start Battle" to resolve it.');
        updateBoard();
        updateUI();
        return; // stop movement, wait for battle
    }

    // If no moves left and no pending battle, auto end the turn
    if (gameState.movesLeft <= 0) {
        gameState.movesLeft = 0;
        gameState.moveDirection = null;
        updateBoard();
        updateUI();
        endTurn();
        return;
    }

    // Otherwise just redraw and continue same turn
    updateBoard();
    updateUI();
}


// Redraw board icons (shards, candle, players)
function updateBoard() {
    // Clear all cells
    for (let row = 0; row < gameState.boardSize; row++) {
        for (let col = 0; col < gameState.boardSize; col++) {
            updateCell(row, col, '');
        }
    }

    // Candle
    if (gameState.candlePosition) {
        updateCell(gameState.candlePosition.row, gameState.candlePosition.col, '🕯️');
    }

    // Shards
    gameState.shardsOnBoard.forEach(s => updateCell(s.row, s.col, '💎'));

    // Soul
    updateCell(
        gameState.soulPosition.row,
        gameState.soulPosition.col,
        gameState.soulHasCandle ? '🕯️' : '👻'
    );

    // Ghoul
    updateCell(gameState.ghoulPosition.row, gameState.ghoulPosition.col, '👹');
}

// ================================
// Shards & Power-ups
// ================================
function collectShard(player, row, col) {
    gameState.shardsOnBoard = gameState.shardsOnBoard.filter(s => !(s.row === row && s.col === col));

    if (player === 'soul') {
        if (gameState.soulShards < gameState.maxSoulShards) {
            gameState.soulShards++;
            showToast('💎 Soul collected a shard!');
        } else {
            showToast('💎 Soul cannot carry more shards!');
            gameState.shardsOnBoard.push({ row, col });
        }
    } else {
        gameState.ghoulShards++;
        showToast('💎 Ghoul collected a shard!');
    }

    if (gameState.boardSize === 8 && gameState.shardsOnBoard.length < 2) {
        respawnShard();
    }

    updatePowerUps();
}

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

// ================================
// Battle Button State
// ================================
function updateBattleButtonState() {
    const btn = document.getElementById('start-battle-btn');
    if (!btn) return;
    btn.disabled = !gameState.battleReady;
}

// ================================
// Battle detection & flow
// ================================
function checkForBattle() {
    const soulPos = gameState.soulPosition;
    const ghoulPos = gameState.ghoulPosition;

    const rowDiff = Math.abs(soulPos.row - ghoulPos.row);
    const colDiff = Math.abs(soulPos.col - ghoulPos.col);

    // Adjacent (not diagonal)
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
    gameState.inBattle = true;      // <-- add this line

    updateBattleButtonState();
    initiateBattle();
}

// Open battle modal and roll dice
function initiateBattle() {
    showToast('⚔️ Battle initiated!');

    const modal = document.getElementById('battle-modal');
    const powerupsDiv = document.getElementById('battle-powerups');
    const buttonsDiv = document.getElementById('battle-powerup-buttons');

    modal.classList.add('active');

    buttonsDiv.innerHTML = '';
    let hasPowerUps = false;

    if (gameState.soulShards >= 1) {
        hasPowerUps = true;
        buttonsDiv.innerHTML += `<button onclick="useBattlePowerUp('soul-reroll')">👻 Soul Re-roll (1💎)</button>`;
    }

    if (gameState.ghoulShards >= 1) {
        hasPowerUps = true;
        buttonsDiv.innerHTML += `<button onclick="useBattlePowerUp('ghoul-reroll')">👹 Ghoul Re-roll (1💎)</button>`;
    }

    powerupsDiv.style.display = hasPowerUps ? 'block' : 'none';

    // Initial rolls
    setTimeout(() => {
        const soulRoll = Math.floor(Math.random() * 6) + 1;
        const ghoulRoll = Math.floor(Math.random() * 6) + 1;

        document.getElementById('soul-roll').textContent = soulRoll;
        document.getElementById('ghoul-roll').textContent = ghoulRoll;

        setTimeout(() => {
            resolveBattle(soulRoll, ghoulRoll);
        }, 1000);
    }, 500);
}

// Re-roll power-up during battle
function useBattlePowerUp(powerType) {
    const powerupsDiv = document.getElementById('battle-powerups');
    const resultDiv = document.getElementById('battle-result');

    if (powerType === 'soul-reroll') {
        if (gameState.soulShards >= 1) {
            gameState.soulShards--;
            const newRoll = Math.floor(Math.random() * 6) + 1;
            document.getElementById('soul-roll').textContent = newRoll;
            showToast('👻 Soul used Re-roll! New roll: ' + newRoll);
            respawnShards(1);
            updateUI();
            powerupsDiv.style.display = 'none';

            const ghoulRoll = parseInt(document.getElementById('ghoul-roll').textContent);
            resultDiv.innerHTML = '';
            setTimeout(() => {
                resolveBattle(newRoll, ghoulRoll);
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

            const soulRoll = parseInt(document.getElementById('soul-roll').textContent);
            resultDiv.innerHTML = '';
            setTimeout(() => {
                resolveBattle(soulRoll, newRoll);
            }, 500);
        }
    }
}

// ================================
// Battle resolution + choices
// (UNCHANGED from your original, just pasted)
// ================================
function resolveBattle(soulRoll, ghoulRoll) {
    const resultDiv = document.getElementById('battle-result');

    if (soulRoll > ghoulRoll) {
        const attackCost = gameState.boardSize === 8 ? 2 : 3;
        const canUseAttack = (gameState.boardSize === 8 || gameState.boardSize === 10) && gameState.soulShards >= attackCost;

        if (canUseAttack) {
            resultDiv.innerHTML = `
                <div style="text-align: center;">
                    <strong>👻 Soul wins the battle!</strong><br>
                    <p style="margin: 15px 0;">⚔️ You have ${gameState.soulShards} shards.<br>Use ${attackCost} for +1 Attack bonus for next battle?</p>
                    <button id="soul-use-attack-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer;">
                        ⚔️ Use +1 Attack (${attackCost} shards)
                    </button>
                    <button id="soul-decline-attack-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #666;">
                        ❌ No Thanks
                    </button>
                </div>
            `;

            setTimeout(() => {
                document.getElementById('soul-use-attack-btn').addEventListener('click', soulUseAttackBonus);
                document.getElementById('soul-decline-attack-btn').addEventListener('click', soulDeclineAttack);
            }, 100);
            return;
        } else {
            resultDiv.innerHTML = '👻 <strong>Soul escapes!</strong><br>Both players return to spawn.';
            showToast('⚔️ Soul won the battle and escaped!');
            gameState.battlesCompleted++;
            setTimeout(() => {
                returnToSpawn();
                closeBattleModal();

                if (gameState.battlesCompleted >= gameState.maxBattles) {
                    setTimeout(() => endGame('soul'), 1000);
                } else {
                    endTurn();
                }
            }, 2000);
        }
    } else if (ghoulRoll > soulRoll) {
        const dropCandleCost = gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5);
        const canSnuff = gameState.ghoulShards >= 3;
        const canDrop = gameState.ghoulShards >= dropCandleCost;

        let ghoulOptions = '<div style="text-align: center;"><strong>👹 Ghoul wins the battle!</strong><br><p style="margin: 15px 0;">Choose your action:</p>';

        if (canSnuff) {
            ghoulOptions += `<button id="ghoul-snuff-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #d32f2f;">💀 Snuff the Candle (3 shards)</button><br>`;
        }
        if (canDrop) {
            ghoulOptions += `<button id="ghoul-drop-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer;">💥 Drop Candle (${dropCandleCost} shards)</button><br>`;
        }
        ghoulOptions += `<button id="ghoul-nothing-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #666;">❌ Do Nothing (Soul escapes)</button></div>`;

        resultDiv.innerHTML = ghoulOptions;

        setTimeout(() => {
            if (canSnuff) {
                document.getElementById('ghoul-snuff-btn').addEventListener('click', ghoulChooseSnuff);
            }
            if (canDrop) {
                document.getElementById('ghoul-drop-btn').addEventListener('click', ghoulChooseDrop);
            }
            document.getElementById('ghoul-nothing-btn').addEventListener('click', ghoulChooseNothing);
        }, 100);
        return;
    } else {
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
                setTimeout(() => resolveBattle(newSoulRoll, newGhoulRoll), 1000);
            }, 500);
        }, 1500);
        return;
    }

    if (gameState.battlesCompleted >= gameState.maxBattles) {
        setTimeout(() => {
            closeBattleModal();
            endGame('soul');
        }, 2000);
    }
}

// === Soul & Ghoul choices (unchanged logic) ===
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

        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => endGame('soul'), 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

function declineCancelSnuff() {
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '👹 <strong>Ghoul snuffs the candle!</strong><br>Darkness consumes all...';
    showToast('💀 Ghoul snuffed the candle! Game Over!');
    setTimeout(() => {
        closeBattleModal();
        endGame('ghoul');
    }, 2000);
}

function soulUseAttackBonus() {
    const attackCost = gameState.boardSize === 8 ? 2 : 3;
    gameState.soulShards -= attackCost;
    gameState.soulAttackBonus = 1;
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '⚔️ <strong>Soul gains +1 Attack!</strong><br>Both players return to spawn.';
    showToast(`⚔️ Soul used +1 Attack (${attackCost} shards)! Bonus applies to next battle.`);
    gameState.battlesCompleted++;
    respawnShards(attackCost);
    updateUI();

    setTimeout(() => {
        returnToSpawn();
        closeBattleModal();

        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => endGame('soul'), 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

function soulDeclineAttack() {
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '👻 <strong>Soul escapes!</strong><br>Both players return to spawn.';
    showToast('⚔️ Soul won the battle and escaped!');
    gameState.battlesCompleted++;

    setTimeout(() => {
        returnToSpawn();
        closeBattleModal();

        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => endGame('soul'), 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

function ghoulChooseSnuff() {
    const cancelSnuffCost = gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5);

    if (gameState.soulShards >= cancelSnuffCost) {
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

        setTimeout(() => {
            document.getElementById('use-cancel-snuff-btn').addEventListener('click', useCancelSnuff);
            document.getElementById('decline-cancel-snuff-btn').addEventListener('click', declineCancelSnuff);
        }, 100);
    } else {
        gameState.ghoulShards -= 3;
        respawnShards(3);
        const resultDiv = document.getElementById('battle-result');
        resultDiv.innerHTML = '👹 <strong>Ghoul snuffs the candle!</strong><br>Darkness consumes all...';
        showToast('💀 Ghoul snuffed the candle! Game Over!');
        updateUI();
        setTimeout(() => {
            closeBattleModal();
            endGame('ghoul');
        }, 2000);
    }
}

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

        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => endGame('soul'), 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

function ghoulChooseNothing() {
    const resultDiv = document.getElementById('battle-result');
    resultDiv.innerHTML = '👹 <strong>Ghoul does nothing!</strong><br>Soul escapes. Both return to spawn.';
    showToast('⚔️ Ghoul chose not to use any power. Soul escapes!');
    gameState.battlesCompleted++;

    setTimeout(() => {
        returnToSpawn();
        closeBattleModal();

        if (gameState.battlesCompleted >= gameState.maxBattles) {
            setTimeout(() => endGame('soul'), 1000);
        } else {
            endTurn();
        }
    }, 2000);
}

function returnToSpawn() {
    clearCell(gameState.soulPosition.row, gameState.soulPosition.col);
    clearCell(gameState.ghoulPosition.row, gameState.ghoulPosition.col);

    gameState.soulPosition = { ...gameState.soulSpawn };
    gameState.ghoulPosition = { ...gameState.ghoulSpawn };

    updateCell(gameState.soulPosition.row, gameState.soulPosition.col,
        gameState.soulHasCandle ? '🕯️' : '👻');
    updateCell(gameState.ghoulPosition.row, gameState.ghoulPosition.col, '👹');

    showToast('Players returned to their spawn points.');
}

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

// ================================
// Turn handling
// ================================
function endTurn() {
    if (gameState.battleReady) {
        showToast('Resolve the pending battle before ending the turn!');
        return;
    }

    gameState.movesLeft = 0;
    gameState.moveDirection = null;
    document.getElementById('dice').textContent = '?';

    const previousPlayer = gameState.currentPlayer;
    gameState.currentPlayer = gameState.currentPlayer === 'soul' ? 'ghoul' : 'soul';

    if (gameState.candleDropTurnsLeft > 0 && previousPlayer === 'ghoul') {
        gameState.candleDropTurnsLeft--;
        if (gameState.candleDropTurnsLeft === 0) {
            showToast('⏰ Time ran out! Nobody got the candle - TIE GAME!');
            setTimeout(() => endGame('tie'), 2000);
            return;
        } else {
            showToast(`⏰ ${gameState.candleDropTurnsLeft} full turns left to grab the candle!`);
        }
    }

    if (gameState.currentPlayer === 'ghoul' && gameState.ghoulSkipTurn) {
        gameState.ghoulSkipTurn = false;
        showToast('👹 Ghoul skips turn due to teleport!');
        gameState.currentPlayer = 'soul';
    } else {
        showToast(`Turn ended. ${gameState.currentPlayer === 'soul' ? '👻 Soul' : '👹 Ghoul'}'s turn!`);

        if (gameState.currentPlayer === 'soul' && !gameState.soulHasCandle && !gameState.candlePosition) {
            setTimeout(() => {
                showToast('⚠️ Soul: Get the candle in the center first! 🕯️');
            }, 2000);
        }
    }

    updateUI();
}

// ================================
// UI Update & Power-ups
// ================================
function updateUI() {
    const currentPlayerEl = document.getElementById('current-player');
    let playerText = `Current Turn: ${gameState.currentPlayer === 'soul' ? '👻 Soul' : '👹 Ghoul'}`;

    if (gameState.candleDropTurnsLeft > 0) {
        playerText += ` | ⏰ CANDLE DROP: ${gameState.candleDropTurnsLeft}/${gameState.candleDropMaxTurns} turns left!`;
    }

    currentPlayerEl.textContent = playerText;
    currentPlayerEl.classList.remove('soul-turn', 'ghoul-turn');
    currentPlayerEl.classList.add(gameState.currentPlayer === 'soul' ? 'soul-turn' : 'ghoul-turn');

    const gameScreen = document.getElementById('game-screen');
    gameScreen.classList.remove('soul-turn', 'ghoul-turn');
    gameScreen.classList.add(gameState.currentPlayer === 'soul' ? 'soul-turn' : 'ghoul-turn');

    document.getElementById('battles-remaining').textContent =
        `Battles: ${gameState.battlesCompleted}/${gameState.maxBattles}`;

    document.getElementById('soul-pos').textContent =
        `(${gameState.soulPosition.row}, ${gameState.soulPosition.col})`;
    document.getElementById('soul-shards').textContent =
        `${gameState.soulShards}/${gameState.maxSoulShards}`;
    document.getElementById('soul-candle').textContent =
        gameState.soulHasCandle ? 'Yes 🕯️' : 'No';

    document.getElementById('ghoul-pos').textContent =
        `(${gameState.ghoulPosition.row}, ${gameState.ghoulPosition.col})`;
    document.getElementById('ghoul-shards').textContent = gameState.ghoulShards;

    document.getElementById('moves-left').textContent = gameState.movesLeft;

    // Zigzag unlocks after 2 shards
    const zigzagThreshold = 2;
    const currentPlayerShards = gameState.currentPlayer === 'soul'
        ? gameState.soulShards
        : gameState.ghoulShards;
    const hasZigzag = currentPlayerShards >= zigzagThreshold;

    document.getElementById('can-zigzag').textContent = hasZigzag ? 'Yes ✓' : 'No';
    gameState.canZigzag = hasZigzag;

    document.getElementById('roll-btn').disabled = gameState.movesLeft > 0;

    updatePowerUps();
    updateBattleButtonState();
}

function updatePowerUps() {
    const soulPowers = document.getElementById('soul-powers');
    const ghoulPowers = document.getElementById('ghoul-powers');
    const ghoulCanSnuff = document.getElementById('ghoul-can-snuff');

    soulPowers.innerHTML = '<strong>Powers:</strong><br>';
    ghoulPowers.innerHTML = '<strong>Powers:</strong><br>';

    if (gameState.soulShards >= 1) soulPowers.innerHTML += '• Re-roll<br>';
    if ((gameState.boardSize === 8 || gameState.boardSize === 10) && gameState.soulShards >= 2)
        soulPowers.innerHTML += '• +1 Attack<br>';
    if (gameState.soulShards >= 3)
        soulPowers.innerHTML += '• Cancel Snuff<br>';
    if (soulPowers.innerHTML === '<strong>Powers:</strong><br>')
        soulPowers.innerHTML += '<em>None</em>';

    if (gameState.ghoulShards >= 1) ghoulPowers.innerHTML += '• Re-roll<br>';
    if (gameState.ghoulShards >= 2) ghoulPowers.innerHTML += '• Teleport<br>';
    if (gameState.ghoulShards >= 3) {
        ghoulPowers.innerHTML += '• Drop Candle<br>';
        ghoulPowers.innerHTML += '• <strong>Can Snuff!</strong><br>';
    }
    if (ghoulPowers.innerHTML === '<strong>Powers:</strong><br>')
        ghoulPowers.innerHTML += '<em>None</em>';

    if (ghoulCanSnuff) {
        ghoulCanSnuff.textContent = gameState.ghoulShards >= 3 ? 'Yes ⚠️' : 'No';
    }
}

// ================================
// Toast & End game
// ================================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

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
    gameState.inBattle = false;   // <-- add

    updateBattleButtonState();
}

function closeWinModal() {
    document.getElementById('win-modal').classList.remove('active');
}

function quitGame() {
    if (confirm('Are you sure you want to quit? Current game progress will be lost.')) {
        gameState.gameStarted = false;
        showScreen('main-menu');
    }
}

// ================================
// Power-up Modal (unchanged logic)
// ================================
function showPowerUpModal(player) {
    const modal = document.getElementById('powerup-modal');
    const list = document.getElementById('powerup-list');

    list.innerHTML = '';

    if (player === 'soul') {
        if (gameState.soulShards >= 1) {
            list.innerHTML += `
                <div class="powerup-item">
                    <div class="powerup-info">
                        <div class="powerup-name">🎲 Re-roll</div>
                        <div class="powerup-cost">Cost: 1 shard</div>
                        <div class="powerup-description">Re-roll your dice (usable after rolling)</div>
                    </div>
                    <button class="powerup-buy-btn" onclick="buyPowerUp('soul', 'reroll', 1)">Buy</button>
                </div>
            `;
        }
    } else {
        if (gameState.ghoulShards >= 1) {
            list.innerHTML += `
                <div class="powerup-item">
                    <div class="powerup-info">
                        <div class="powerup-name">🎲 Re-roll</div>
                        <div class="powerup-cost">Cost: 1 shard</div>
                        <div class="powerup-description">Re-roll your dice (usable outside battle)</div>
                    </div>
                    <button class="powerup-buy-btn" onclick="buyPowerUp('ghoul', 'reroll', 1)">Buy</button>
                </div>
            `;
        }

        if (gameState.ghoulShards >= 2) {
            const cost = gameState.boardSize === 8 ? 2 : 3;
            const steps = gameState.boardSize === 8 ? 3 : 5;
            if (gameState.ghoulShards >= cost) {
                list.innerHTML += `
                    <div class="powerup-item">
                        <div class="powerup-info">
                            <div class="powerup-name">⚡ Teleport</div>
                            <div class="powerup-cost">Cost: ${cost} shards</div>
                            <div class="powerup-description">Move ${steps} steps closer to Soul (lose next turn)</div>
                        </div>
                        <button class="powerup-buy-btn" onclick="buyPowerUp('ghoul', 'teleport', ${cost})">Buy</button>
                    </div>
                `;
            }
        }
    }

    if (list.innerHTML === '') {
        list.innerHTML = '<p style="text-align: center; padding: 20px;">Not enough shards to buy any power-ups!</p>';
    }

    modal.classList.add('active');
}

function closePowerUpModal() {
    document.getElementById('powerup-modal').classList.remove('active');
}

function buyPowerUp(player, powerType, cost) {
    if (player !== gameState.currentPlayer) {
        showToast('Not your turn!');
        return;
    }

    if (player === 'soul') {
        if (gameState.soulShards < cost) {
            showToast('Not enough shards!');
            return;
        }

        gameState.soulShards -= cost;

        switch (powerType) {
            case 'reroll':
                if (gameState.movesLeft > 0 && gameState.diceRoll === gameState.movesLeft) {
                    showToast('💎 Soul used Re-roll!');
                    gameState.movesLeft = 0;
                    rollDice();
                    respawnShards(cost);
                } else if (gameState.movesLeft === 0) {
                    showToast('Roll the dice first before using re-roll!');
                    gameState.soulShards += cost;
                    return;
                } else {
                    showToast('Cannot re-roll after you\'ve started moving!');
                    gameState.soulShards += cost;
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

        switch (powerType) {
            case 'reroll':
                if (gameState.movesLeft > 0 && gameState.diceRoll === gameState.movesLeft) {
                    showToast('💎 Ghoul used Re-roll!');
                    gameState.movesLeft = 0;
                    rollDice();
                    respawnShards(cost);
                } else if (gameState.movesLeft === 0) {
                    showToast('Roll the dice first before using re-roll!');
                    gameState.ghoulShards += cost;
                    return;
                } else {
                    showToast('Cannot re-roll after you\'ve started moving!');
                    gameState.ghoulShards += cost;
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

    gameState.battleReady = false;
    updateBattleButtonState();
    updateUI();
    closePowerUpModal();
}

// ================================
// Teleport & Candle Drop (unchanged)
// ================================
function teleportGhoul() {
    const soulPos = gameState.soulPosition;
    const ghoulPos = gameState.ghoulPosition;

    const steps = gameState.boardSize === 8 ? 3 : 5;

    const rowDiff = soulPos.row - ghoulPos.row;
    const colDiff = soulPos.col - ghoulPos.col;

    clearCell(ghoulPos.row, ghoulPos.col);

    let stepsUsed = 0;
    while (stepsUsed < steps) {
        let moved = false;

        if (Math.abs(rowDiff) > Math.abs(colDiff)) {
            if (rowDiff > 0 && ghoulPos.row < gameState.boardSize - 1) {
                ghoulPos.row++;
                moved = true;
            } else if (rowDiff < 0 && ghoulPos.row > 0) {
                ghoulPos.row--;
                moved = true;
            }
        } else {
            if (colDiff > 0 && ghoulPos.col < gameState.boardSize - 1) {
                ghoulPos.col++;
                moved = true;
            } else if (colDiff < 0 && ghoulPos.col > 0) {
                ghoulPos.col--;
                moved = true;
            }
        }

        if (!moved) break;

        if (ghoulPos.row === soulPos.row && ghoulPos.col === soulPos.col) {
            break;
        }

        stepsUsed++;
    }

    const cellContent = getCellContent(ghoulPos.row, ghoulPos.col);
    if (cellContent === '💎') {
        collectShard('ghoul', ghoulPos.row, ghoulPos.col);
    }

    updateCell(ghoulPos.row, ghoulPos.col, '👹');
}

function dropCandle() {
    gameState.soulHasCandle = false;

    const center = Math.floor(gameState.boardSize / 2);
    const centerEmpty = getCellContent(center, center) === '';

    if (centerEmpty) {
        gameState.candlePosition = { row: center, col: center };
    } else {
        let maxDist = 0;
        let bestPos = { row: center, col: center };

        for (let row = 0; row < gameState.boardSize; row++) {
            for (let col = 0; col < gameState.boardSize; col++) {
                if ((row === gameState.soulPosition.row && col === gameState.soulPosition.col) ||
                    (row === gameState.ghoulPosition.row && col === gameState.ghoulPosition.col)) continue;

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

    gameState.candleDropMaxTurns = gameState.boardSize === 8 ? 3 : (gameState.boardSize === 10 ? 4 : 5);
    gameState.candleDropTurnsLeft = gameState.candleDropMaxTurns;

    showToast(`💥 Candle dropped! ${gameState.candleDropTurnsLeft} turns to grab it or TIE!`);

    updateCell(gameState.candlePosition.row, gameState.candlePosition.col, '🕯️');
    updateCell(gameState.soulPosition.row, gameState.soulPosition.col, '👻');
}

// ================================
// Init
// ================================
window.addEventListener('load', () => {
    showScreen('main-menu');
});
