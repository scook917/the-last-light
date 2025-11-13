// Game State
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
    candleDropMaxTurns: 0
};

// Initialize game
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Setup screen - size selection
document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

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
    
    // Initialize board
    initializeBoard();
    
    // Show game screen
    showScreen('game-screen');
    
    // Update UI
    updateUI();
    showToast('Game started! Soul must reach the candle in the center.');
    showToast('Soul: Roll the dice to move!');
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
        }
    }, 100);
}

// Move player
function movePlayer(direction) {
    if (gameState.movesLeft <= 0) {
        showToast('Roll the dice first!');
        return;
    }
    
    const player = gameState.currentPlayer;
    const position = player === 'soul' ? gameState.soulPosition : gameState.ghoulPosition;
    
    // Check if can change direction
    if (gameState.moveDirection !== null && gameState.moveDirection !== direction && !gameState.canZigzag) {
        showToast('Cannot change direction! You can only move in one direction per turn.');
        return;
    }
    
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
    }
    
    // Check boundaries
    if (newRow < 0 || newRow >= gameState.boardSize || newCol < 0 || newCol >= gameState.boardSize) {
        showToast('Hit a wall! You can now change direction for remaining moves.');
        // After hitting a wall, allow direction change for remaining moves
        gameState.moveDirection = null;
        return;
    }
    
    // Check if cell has other player
    const otherPlayer = player === 'soul' ? gameState.ghoulPosition : gameState.soulPosition;
    if (otherPlayer.row === newRow && otherPlayer.col === newCol) {
        showToast('Cannot move onto another player!');
        return;
    }
    
    // Move is valid
    gameState.moveDirection = direction;
    
    // Check what's on the new cell BEFORE clearing old position
    const cellContent = getCellContent(newRow, newCol);
    
    // Check if ghoul is trying to pick up initial candle
    if (cellContent === '🕯️' && player === 'ghoul' && !gameState.candleWasPickedUp) {
        showToast('👹 Ghoul cannot move onto the candle! Soul must get it first. You can now change direction.');
        // After hitting the candle, allow direction change for remaining moves (like hitting a wall)
        gameState.moveDirection = null;
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
            gameState.soulHasCandle = true;
            gameState.candleWasPickedUp = true;
            gameState.candlePosition = null;
            gameState.candleDropTurnsLeft = 0;
            gameState.candleDropMaxTurns = 0;
            showToast('🕯️ Soul obtained the candle! Now survive the battles!');
        } else if (player === 'ghoul' && gameState.candlePosition) {
            // Ghoul picks up dropped candle - wins the game
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
    
    // Check for battle (adjacent positions) - only if soul has candle
    if (gameState.soulHasCandle && checkForBattle()) {
        gameState.movesLeft = 0; // End movement when battle starts
        initiateBattle();
    } else if (gameState.movesLeft === 0) {
        // Auto-end turn when moves are exhausted
        setTimeout(() => {
            endTurn();
        }, 500);
    }
    
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
    
    // Check if need to respawn shard on small map
    if (gameState.boardSize === 8 && gameState.shardsOnBoard.length < 2) {
        respawnShard();
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

// Initiate battle
function initiateBattle() {
    showToast('⚔️ Battle initiated!');
    
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
        
        // Determine winner
        setTimeout(() => {
            resolveBattle(soulRoll, ghoulRoll);
        }, 1000);
    }, 500);
}

// Use power-up during battle (only re-rolls)
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
            
            // Recalculate battle result
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
            
            // Recalculate battle result
            const soulRoll = parseInt(document.getElementById('soul-roll').textContent);
            resultDiv.innerHTML = '';
            setTimeout(() => {
                resolveBattle(soulRoll, newRoll);
            }, 500);
        }
    }
}

// Resolve battle
function resolveBattle(soulRoll, ghoulRoll) {
    const resultDiv = document.getElementById('battle-result');
    
    if (soulRoll > ghoulRoll) {
        // Soul wins - offer +1 Attack option
        const attackCost = gameState.boardSize === 8 ? 2 : 3;
        const canUseAttack = (gameState.boardSize === 8 || gameState.boardSize === 10) && gameState.soulShards >= attackCost;
        
        if (canUseAttack) {
            // Offer Soul the choice to use +1 Attack
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
        
        // Build Ghoul's options
        let ghoulOptions = '<div style="text-align: center;"><strong>👹 Ghoul wins the battle!</strong><br><p style="margin: 15px 0;">Choose your action:</p>';
        
        if (canSnuff) {
            ghoulOptions += `<button id="ghoul-snuff-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #d32f2f;">💀 Snuff the Candle (3 shards)</button><br>`;
        }
        if (canDrop) {
            ghoulOptions += `<button id="ghoul-drop-btn" style="margin: 5px; padding: 10px 20px; font-size: 16px; cursor: pointer;">� Drop Candle (${dropCandleCost} shards)</button><br>`;
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

// Soul chooses to use +1 Attack bonus
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
        // Offer Soul the choice to use Cancel Snuff
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
}

// End turn
function endTurn() {
    gameState.movesLeft = 0;
    gameState.moveDirection = null;
    
    // Reset dice display
    document.getElementById('dice').textContent = '?';
    
    // Switch player first to determine if full turn cycle completed
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
    document.getElementById('roll-btn').disabled = gameState.movesLeft > 0;
    
    updatePowerUps();
}

// Update power-ups display
function updatePowerUps() {
    const soulPowers = document.getElementById('soul-powers');
    const ghoulPowers = document.getElementById('ghoul-powers');
    const ghoulCanSnuff = document.getElementById('ghoul-can-snuff');
    
    soulPowers.innerHTML = '<strong>Powers:</strong><br>';
    ghoulPowers.innerHTML = '<strong>Powers:</strong><br>';
    
    // Soul powers
    if (gameState.soulShards >= 1) {
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
function showPowerUpModal(player) {
    const modal = document.getElementById('powerup-modal');
    const list = document.getElementById('powerup-list');
    
    list.innerHTML = '';
    
    if (player === 'soul') {
        // Re-roll power (all maps, only outside battle)
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
        // Ghoul powers
        // Re-roll (outside battle only)
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
        
        // Teleport (outside battle only)
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
    // Check if it's the right player's turn
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
        
        switch(powerType) {
            case 'reroll':
                // Can only use after rolling (movesLeft > 0) but before moving
                if (gameState.movesLeft > 0 && gameState.diceRoll === gameState.movesLeft) {
                    showToast('💎 Soul used Re-roll!');
                    // Reset moves to allow re-roll
                    gameState.movesLeft = 0;
                    rollDice();
                    respawnShards(cost);
                } else if (gameState.movesLeft === 0) {
                    showToast('Roll the dice first before using re-roll!');
                    gameState.soulShards += cost; // Refund
                    return;
                } else {
                    showToast('Cannot re-roll after you\'ve started moving!');
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
                // Can only use after rolling (movesLeft > 0) but before moving
                if (gameState.movesLeft > 0 && gameState.diceRoll === gameState.movesLeft) {
                    showToast('💎 Ghoul used Re-roll!');
                    // Reset moves to allow re-roll
                    gameState.movesLeft = 0;
                    rollDice();
                    respawnShards(cost);
                } else if (gameState.movesLeft === 0) {
                    showToast('Roll the dice first before using re-roll!');
                    gameState.ghoulShards += cost; // Refund
                    return;
                } else {
                    showToast('Cannot re-roll after you\'ve started moving!');
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

function teleportGhoul() {
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

// Initialize on load
window.addEventListener('load', () => {
    showScreen('main-menu');
});
