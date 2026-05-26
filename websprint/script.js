const boardElement = document.getElementById('board');
const resetButton = document.getElementById('reset-button');
const playerLabel = document.getElementById('current-player');
const messageElement = document.getElementById('message');

const SIZE = 8;
let board = [];
let currentPlayer = 'red';
let selectedSquare = null;
let forcedCaptureMoves = [];

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
          const ring = document.createElement('span');
          ring.className = 'king-ring';
          pieceElement.appendChild(ring);
        }
        square.appendChild(pieceElement);
      }

      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add('selected');
      }

      if (forcedCaptureMoves.some(move => move.toRow === row && move.toCol === col)) {
        square.classList.add('highlight');
      }

      square.addEventListener('click', () => handleSquareClick(row, col));
      boardElement.appendChild(square);
    }
  }

  playerLabel.textContent = currentPlayer === 'red' ? 'Red' : 'Black';
}

function canMoveTo(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE && !getPiece(row, col);
}

function captureMovesForPiece(row, col, piece) {
  const directions = isKing(piece)
    ? [1, -1].flatMap(r => [1, -1].map(c => ({ dr: r, dc: c })))
    : piece === 'red'
      ? [{ dr: 1, dc: 1 }, { dr: 1, dc: -1 }]
      : [{ dr: -1, dc: 1 }, { dr: -1, dc: -1 }];

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
      ? [{ dr: 1, dc: 1 }, { dr: 1, dc: -1 }]
      : [{ dr: -1, dc: 1 }, { dr: -1, dc: -1 }];

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
  const allMoves = getAvailableMoves(currentPlayer);
  const captures = allMoves.filter(move => move.captureRow !== null);
  forcedCaptureMoves = captures.length ? captures : []; 
}

function handleSquareClick(row, col) {
  const clickedPiece = getPiece(row, col);
  if (clickedPiece && isFriendly(clickedPiece)) {
    selectedSquare = { row, col };
    updateForcedCaptures();
    const pieceMoves = getAvailableMoves(currentPlayer).filter(move => move.fromRow === row && move.fromCol === col);
    forcedCaptureMoves = pieceMoves.length ? pieceMoves : forcedCaptureMoves;
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
    setPiece(move.captureRow, move.captureCol, null);
  }

  const promotionRow = piece === 'red' ? SIZE - 1 : 0;
  if ((piece === 'red' && move.toRow === promotionRow) || (piece === 'black' && move.toRow === promotionRow)) {
    setPiece(move.toRow, move.toCol, piece.toUpperCase());
  }

  selectedSquare = null;
  messageElement.textContent = '';

  const movedPiece = getPiece(move.toRow, move.toCol);
  const nextCaptureMoves = move.captureRow !== null ? captureMovesForPiece(move.toRow, move.toCol, movedPiece) : [];
  if (nextCaptureMoves.length) {
    selectedSquare = { row: move.toRow, col: move.toCol };
    forcedCaptureMoves = nextCaptureMoves;
    renderBoard();
    messageElement.textContent = 'You can capture again with the same piece.';
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
    messageElement.textContent = `${currentPlayer === 'red' ? 'Black' : 'Red'} wins!`;
    boardElement.querySelectorAll('.square').forEach(square => square.disabled = true);
  }
}

function resetGame() {
  currentPlayer = 'red';
  selectedSquare = null;
  messageElement.textContent = 'Pick a red piece to start.';
  createBoard();
  updateForcedCaptures();
  renderBoard();
}

resetButton.addEventListener('click', resetGame);
resetGame();
