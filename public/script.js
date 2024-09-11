const board = document.getElementById('board');
const status = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const createGameBtn = document.getElementById('createGameBtn');
const gameLink = document.getElementById('gameLink');

let gameId = null;
let ws = null;

createGameBtn.addEventListener('click', createGame);
resetBtn.addEventListener('click', resetGame);

function createGame() {
    fetch('/create-game')
        .then(response => response.json())
        .then(data => {
            gameId = data.gameId;
            const url = `${window.location.origin}/game/${gameId}`;
            gameLink.innerHTML = `Ссылка на игру: <a href="${url}" target="_blank">${url}</a>`;
            connectToGame();
        });
}

function connectToGame() {
    if (!gameId) {
        gameId = window.location.pathname.split('/')[2];
    }

    ws = new WebSocket(`ws://${window.location.host}/game/${gameId}`);

    ws.onmessage = (event) => {
        const gameState = JSON.parse(event.data);
        updateBoard(gameState.board);
        updateStatus(gameState);
    };

    ws.onclose = () => {
        status.textContent = 'Соединение потеряно. Обновите страницу.';
    };
}

function updateBoard(gameBoard) {
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.textContent = gameBoard[i];
        cell.addEventListener('click', () => makeMove(i));
        board.appendChild(cell);
    }
}

function updateStatus(gameState) {
    if (gameState.winner) {
        if (gameState.winner === 'draw') {
            status.textContent = 'Ничья!';
        } else {
            status.textContent = `Игрок ${gameState.winner} победил!`;
        }
        resetBtn.style.display = 'block';
    } else if (gameState.players < 2) {
        status.textContent = 'Ожидание второго игрока...';
        resetBtn.style.display = 'none';
    } else {
        status.textContent = `Ход игрока: ${gameState.currentPlayer}`;
        resetBtn.style.display = 'none';
    }
}

function makeMove(index) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'move', index }));
    }
}

function resetGame() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'reset' }));
    }
}

// Проверяем, является ли текущий URL игровой ссылкой
if (window.location.pathname.startsWith('/game/')) {
    gameId = window.location.pathname.split('/')[2];
    connectToGame();
    createGameBtn.style.display = 'none';
} else {
    createGameBtn.style.display = 'block';
}