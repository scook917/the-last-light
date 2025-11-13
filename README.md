# 🕯️ The Last Light

A spooky yet cute browser-based board game where a soul must escape a haunted manor with a candle before an evil spirit extinguishes it forever!

## 🎮 Game Overview

A soul finds a candle in the haunted manor. Make your way through before an evil spirit tries to blow it away, trapping you forever!

## 👥 Players

- **👻 Soul** - The Lighted Candle Bearer
- **👹 Ghoul** - The Evil Spirit

## 🎯 Objective

- **Soul:** Reach the candle in the center, then survive all soul battles to escape!
- **Ghoul:** Collect 3 soul shards and snuff out the candle in battle to trap the soul forever!

## 🎲 How to Play

### Starting the Game

1. Choose your map size (Small, Medium, or Large)
2. Players start in opposite corners
3. Soul must first reach the candle 🕯️ in the center of the board

### Game Modes

- **Small Manor:** 8×8 board, 3 battles, 5 shards (Soul can hold 3)
- **Medium Manor:** 10×10 board, 5 battles, 7 shards (Soul can hold 4)  
- **Large Manor:** 14×14 board, 10 battles, 10 shards (Soul can hold 5)

### Movement Rules

- Roll the dice (1-6) to determine how many spaces you can move
- Move horizontally OR vertically only
- Cannot zigzag until you complete 3 battles
- Can end turn early without using all moves
- If you hit a wall, you can change direction for remaining moves
- Cannot move onto another player's space

### Soul Battles ⚔️

Battles occur when players are adjacent (not diagonal):
- Both players roll dice - highest wins
- Ties result in re-rolls
- **Soul wins:** Escapes! Both return to spawn
- **Ghoul wins with 3+ shards:** Snuffs candle - Ghoul wins!
- **Ghoul wins without 3 shards:** Soul escapes, both return to spawn

### 💎 Soul Shard Power-Ups

All power-ups must be purchased before use. Only re-roll can be used outside of battle.

#### 👻 Soul Powers
- **1 shard:** Re-roll dice (Small map only, usable outside battle)
- **2-3 shards:** +1 Attack - Remove 1 shard from Ghoul (in battle)
- **3-5 shards:** Cancel Snuff - Prevent one candle snuff (in battle)

#### 👹 Ghoul Powers
- **1 shard:** Re-roll dice (usable outside battle)
- **2-3 shards:** Teleport 3-5 steps closer to Soul (lose next turn)
- **3+ shards:** Make Soul drop candle (race to pick it up!)
- **3+ shards:** Can snuff candle in battle!

**Note:** Shards respawn on the map after being used for power-ups.

### Special Rules

- After 3 battles, players can zigzag (change direction during a turn)
- Soul can only carry limited shards (3/4/5 based on map size)
- Ghoul can carry unlimited shards
- Small map: A new shard spawns if only 2 shards remain on board
- If Soul drops the candle, both players race to pick it up
- If Ghoul reaches the dropped candle with 3+ shards, Ghoul wins

## 🏆 Win Conditions

- **Soul wins:** Survives all battles (3/5/10 depending on map size)
- **Ghoul wins:** Snuffs the candle with 3+ shards in battle OR reaches dropped candle first with 3+ shards
- **Draw:** Candle is dropped and neither player picks it up (rare)

## 🎨 Features

- **Main Menu** with Start Game, Settings, Instructions, and About
- **Three difficulty levels** with different board sizes
- **Complete instructions** built into the game
- **Cute haunted house aesthetic** with spooky purple/orange color scheme
- **Interactive board** with emoji pieces
- **Power-up system** for strategic gameplay
- **Battle animations** and notifications
- **User-friendly interface** with clear feedback

## 🚀 How to Run

Simply open `index.html` in any modern web browser. No installation or server required!

```bash
open index.html
```

## 📁 Project Structure

```
the-last-light/
├── index.html      # Main HTML file with all screens
├── styles.css      # Complete styling with spooky theme
├── game.js         # Game logic and mechanics
└── README.md       # This file
```

## 🎮 Controls

- **Roll Dice Button:** Roll to determine moves
- **Arrow Buttons:** Move your player (↑ ↓ ← →)
- **End Turn Button:** End your turn early
- **Buy Power-Up Button:** Purchase power-ups with shards
- **Quit Button:** Return to main menu

## 🔮 Future Enhancements (Settings)

- AI Difficulty Levels
- Sound Effects
- Background Music  
- Theme Customization
- Turn Timer
- Multiplayer Online Mode

## 📝 Credits

Game Design: Strategic board game of light vs. darkness
Theme: Cute spooky haunted manor aesthetic
Technology: HTML5, CSS3, Vanilla JavaScript

---

**Enjoy your escape from the haunted manor... if you can! 🕯️👻👹**
