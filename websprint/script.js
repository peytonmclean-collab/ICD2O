const boardElement = document.getElementById('board');
const resetButton = document.getElementById('reset-button');
const playerLabel = document.getElementById('current-player');
const messageElement = document.getElementById('message');
const redScoreElement = document.getElementById('red-score');
const blackScoreElement = document.getElementById('black-score');
const redKingsElement = document.getElementById('red-kings');
const blackKingsElement = document.getElementById('black-kings');
const winOverlay = document.getElementById('win-overlay');
const homeScreen = document.querySelector('.home-screen');
const gamePanel = document.querySelector('.game-panel');
const startButton = document.getElementById('start-button');
const backHomeButton = document.getElementById('back-home-button');
const tabButtons = document.querySelectorAll('.tab-btn');
const overviewPanel = document.getElementById('overview-panel');
const statsPanel = document.getElementById('stats-panel');
const redWinsElement = document.getElementById('red-wins');
const blackWinsElement = document.getElementById('black-wins');
const redLossesElement = document.getElementById('red-losses');
const blackLossesElement = document.getElementById('black-losses');
const redCapturesElement = document.getElementById('red-captures');
const blackCapturesElement = document.getElementById('black-captures');
const redKingsEarnedElement = document.getElementById('red-kings-earned');
const blackKingsEarnedElement = document.getElementById('black-kings-earned');
const redCurrentKingsElement = document.getElementById('red-current-kings');
const blackCurrentKingsElement = document.getElementById('black-current-kings');
const redCurrentCapturesElement = document.getElementById('red-current-captures');
const blackCurrentCapturesElement = document.getElementById('black-current-captures');

const STORAGE_KEY = 'checkersSprintStats';
const SIZE = 8;
let board = [];
let currentPlayer = 'red';
let selectedSquare = null;
let captureCounts = { red: 0, black: 0 };
let captureFlash = null;
let stats = {
  redWins: 0,
  blackWins: 0,
  redLosses: 0,
  blackLosses: 0,
  redCaptures: 0,
  blackCaptures: 0,
  redKingsEarned: 0,
  blackKingsEarned: 0,
};
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function setMessage(text, style = '') {
  messageElement.textContent = text;
  messageElement.className = 'message';
  if (style) messageElement.classList.add(style);
}

function loadStats() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    stats = { ...stats, ...parsed };
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function renderStats() {
  redWinsElement.textContent = stats.redWins;
  blackWinsElement.textContent = stats.blackWins;
  redLossesElement.textContent = stats.redLosses;
  blackLossesElement.textContent = stats.blackLosses;
  redCapturesElement.textContent = stats.redCaptures;
  blackCapturesElement.textContent = stats.blackCaptures;
  redKingsEarnedElement.textContent = stats.redKingsEarned;
  blackKingsEarnedElement.textContent = stats.blackKingsEarned;

  redCurrentKingsElement.textContent = board.flat().filter(cell => cell && pieceColor(cell) === 'red' && isKing(cell)).length;
  blackCurrentKingsElement.textContent = board.flat().filter(cell => cell && pieceColor(cell) === 'black' && isKing(cell)).length;
  redCurrentCapturesElement.textContent = captureCounts.red;
  blackCurrentCapturesElement.textContent = captureCounts.black;
}

function switchTab(tabId) {
  tabButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabId);
  });
  overviewPanel.classList.toggle('active', tabId === 'overview');
  statsPanel.classList.toggle('active', tabId === 'stats');
}

function showGameScreen() {
  homeScreen.classList.add('hidden');
  gamePanel.classList.remove('hidden');
  renderBoard();
  setMessage('Game started. Good luck!');
}

function showHomeScreen() {
  homeScreen.classList.remove('hidden');
  gamePanel.classList.add('hidden');
  setMessage('Pick a red piece to start.');
  renderStats();
}

function playToneAt(freq, duration, startTime, type = 'sine', volume = 0.18) {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(volume, startTime);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playCaptureSound() {
  const now = audioContext.currentTime;
  playToneAt(520, 0.08, now, 'triangle', 0.16);
  playToneAt(700, 0.1, now + 0.06, 'sine', 0.14);
}

function playWinSound() {
  const now = audioContext.currentTime;
  playToneAt(440, 0.12, now, 'sine', 0.18);
  playToneAt(660, 0.12, now + 0.14, 'sine', 0.18);
  playToneAt(880, 0.18, now + 0.28, 'triangle', 0.2);
}

function triggerCaptureFlash(row, col) {
  captureFlash = `${row}-${col}`;
  renderBoard();
  setTimeout(() => {
    captureFlash = null;
    renderBoard();
  }, 450);
}

function createBoard() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if ((row + col) % 2 === 1) {
        if (row < 3) board[row][col] = 'black';
        if (row > 4) board[row][col] = 'red';
      }
    }
  }
  captureCounts = { red: 0, black: 0 };
  captureFlash = null;
}

function getPiece(row, col) {
  return board[row]?.[col] || null;
}

function setPiece(row, col, value) {
  board[row][col] = value;
}

function isFriendly(piece) {
  return piece === currentPlayer || piece === currentPlayer.toUpperCase();
}

function isOpponent(piece) {
  if (!piece) return false;
  return piece.toLowerCase() !== currentPlayer.toLowerCase();
}

function isKing(piece) {
  return piece && piece === piece.toUpperCase();
}

function pieceColor(piece) {
  if (!piece) return null;
  return piece.toLowerCase();
}

function renderBoard() {
  boardElement.innerHTML = '';
  const validDestinations = selectedSquare
    ? getAvailableMoves(currentPlayer)
        .filter(move => move.fromRow === selectedSquare.row && move.fromCol === selectedSquare.col)
        .map(move => `${move.toRow}-${move.toCol}`)
    : [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const square = document.createElement('button');
      square.type = 'button';
      square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
      square.dataset.row = row;
      square.dataset.col = col;

      const piece = getPiece(row, col);
      if (piece) {
        const pieceElement = document.createElement('div');
        pieceElement.className = `piece ${pieceColor(piece)}`;
        if (isKing(piece)) {
          pieceElement.classList.add('king');
          const ring = document.createElement('span');
          ring.className = 'king-ring';
          pieceElement.appendChild(ring);
        }
        square.appendChild(pieceElement);
      }

      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add('selected');
      }

      if (captureFlash === `${row}-${col}`) {
        square.classList.add('capture-flash');
      }

      if (validDestinations.includes(`${row}-${col}`)) {
        square.classList.add('highlight');
      }

      square.addEventListener('click', () => handleSquareClick(row, col));
      boardElement.appendChild(square);
    }
  }

  const redKings = board.flat().filter(cell => cell && pieceColor(cell) === 'red' && isKing(cell)).length;
  const blackKings = board.flat().filter(cell => cell && pieceColor(cell) === 'black' && isKing(cell)).length;

  redScoreElement.textContent = captureCounts.red;
  blackScoreElement.textContent = captureCounts.black;
  redKingsElement.textContent = redKings;
  blackKingsElement.textContent = blackKings;
  playerLabel.textContent = currentPlayer === 'red' ? 'Red' : 'Black';
}

function canMoveTo(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE && !getPiece(row, col);
}

function captureMovesForPiece(row, col, piece) {
  const directions = isKing(piece)
    ? [1, -1].flatMap(r => [1, -1].map(c => ({ dr: r, dc: c })))
    : piece === 'red'
      ? [{ dr: -1, dc: 1 }, { dr: -1, dc: -1 }]
      : [{ dr: 1, dc: 1 }, { dr: 1, dc: -1 }];

  return directions.reduce((moves, { dr, dc }) => {
    const midRow = row + dr;
    const midCol = col + dc;
    const landingRow = row + dr * 2;
    const landingCol = col + dc * 2;
    const midPiece = getPiece(midRow, midCol);
    if (isOpponent(midPiece) && canMoveTo(landingRow, landingCol)) {
      moves.push({ fromRow: row, fromCol: col, toRow: landingRow, toCol: landingCol, captureRow: midRow, captureCol: midCol });
    }
    return moves;
  }, []);
}

function normalMovesForPiece(row, col, piece) {
  const directions = isKing(piece)
    ? [1, -1].flatMap(r => [1, -1].map(c => ({ dr: r, dc: c })))
    : piece === 'red'
      ? [{ dr: -1, dc: 1 }, { dr: -1, dc: -1 }]
      : [{ dr: 1, dc: 1 }, { dr: 1, dc: -1 }];

  return directions.reduce((moves, { dr, dc }) => {
    const newRow = row + dr;
    const newCol = col + dc;
    if (canMoveTo(newRow, newCol)) {
      moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol, captureRow: null, captureCol: null });
    }
    return moves;
  }, []);
}

function getAvailableMoves(player) {
  const moves = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = getPiece(row, col);
      if (!piece || pieceColor(piece) !== player) continue;
      moves.push(...captureMovesForPiece(row, col, piece));
      if (!moves.some(move => move.fromRow === row && move.fromCol === col && move.captureRow !== null)) {
        moves.push(...normalMovesForPiece(row, col, piece));
      }
    }
  }
  return moves;
}

function updateForcedCaptures() {
  // No mandatory capture enforcement: any legal move is allowed.
}

function handleSquareClick(row, col) {
  const clickedPiece = getPiece(row, col);
  if (clickedPiece && isFriendly(clickedPiece)) {
    const allMoves = getAvailableMoves(currentPlayer);
    const pieceMoves = allMoves.filter(move => move.fromRow === row && move.fromCol === col);

    if (pieceMoves.length === 0) {
      selectedSquare = null;
      messageElement.textContent = 'That piece cannot move. Choose another piece.';
      renderBoard();
      return;
    }

    selectedSquare = { row, col };
    messageElement.textContent = 'Click a highlighted square to move.';
    renderBoard();
    return;
  }

  if (!selectedSquare) return;

  const move = getAvailableMoves(currentPlayer).find(m => m.fromRow === selectedSquare.row && m.fromCol === selectedSquare.col && m.toRow === row && m.toCol === col);
  if (!move) {
    messageElement.textContent = 'Choose a valid move for the selected piece.';
    return;
  }

  applyMove(move);
}

function applyMove(move) {
  const piece = getPiece(move.fromRow, move.fromCol);
  setPiece(move.fromRow, move.fromCol, null);
  setPiece(move.toRow, move.toCol, piece);

  if (move.captureRow !== null) {
    const capturedPiece = getPiece(move.captureRow, move.captureCol);
    if (capturedPiece) {
      captureCounts[currentPlayer] += 1;
      playCaptureSound();
      triggerCaptureFlash(move.captureRow, move.captureCol);
      setMessage(`${currentPlayer === 'red' ? 'Red' : 'Black'} captured a piece!`, currentPlayer);
    }
    setPiece(move.captureRow, move.captureCol, null);
  } else {
    setMessage('Nice move!');
  }

  const promotionRow = piece === 'red' ? 0 : SIZE - 1;
  if ((piece === 'red' && move.toRow === promotionRow) || (piece === 'black' && move.toRow === promotionRow)) {
    setPiece(move.toRow, move.toCol, piece.toUpperCase());
    stats[`${currentPlayer}KingsEarned`] += 1;
    saveStats();
    setMessage(`${currentPlayer === 'red' ? 'Red' : 'Black'} crowned a king!`, currentPlayer);
  }

  selectedSquare = null;

  const movedPiece = getPiece(move.toRow, move.toCol);
  const nextCaptureMoves = move.captureRow !== null ? captureMovesForPiece(move.toRow, move.toCol, movedPiece) : [];
  if (nextCaptureMoves.length) {
    selectedSquare = { row: move.toRow, col: move.toCol };
    renderBoard();
    if (move.captureRow !== null) {
      setMessage('Chain capture available! Take it now.', currentPlayer);
    }
    return;
  }

  currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
  selectedSquare = null;
  updateForcedCaptures();
  renderBoard();
  checkGameOver();
}

function checkGameOver() {
  const opponent = currentPlayer;
  const opponentMoves = getAvailableMoves(opponent);
  const opponentPieces = board.flat().filter(cell => cell && pieceColor(cell) === opponent);
  if (!opponentPieces.length || opponentMoves.length === 0) {
    const winner = currentPlayer === 'red' ? 'Black' : 'Red';
    if (winner === 'Red') {
      stats.redWins += 1;
      stats.blackLosses += 1;
    } else {
      stats.blackWins += 1;
      stats.redLosses += 1;
    }
    stats.redCaptures += captureCounts.red;
    stats.blackCaptures += captureCounts.black;
    saveStats();
    renderStats();
    setGameOver(winner);
  }
}

function setGameOver(winner) {
  const openSquares = boardElement.querySelectorAll('.square');
  openSquares.forEach(square => square.disabled = true);
  winOverlay.textContent = `${winner} Wins!`;
  winOverlay.classList.add('visible');
  setMessage(`${winner} has taken the board!`, 'win');
  playWinSound();
}

function resetGame() {
  currentPlayer = 'red';
  selectedSquare = null;
  winOverlay.classList.remove('visible');
  setMessage('Pick a red piece to start.');
  createBoard();
  updateForcedCaptures();
  renderBoard();
  renderStats();
}

startButton.addEventListener('click', () => {
  resetGame();
  showGameScreen();
});

backHomeButton.addEventListener('click', showHomeScreen);

resetButton.addEventListener('click', resetGame);

tabButtons.forEach(button => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

loadStats();
renderStats();
showHomeScreen();
