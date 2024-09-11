const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = 3000;
const games = new Map();

// Обслуживание статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/game/:id', (req, res) => {
    const gameId = req.params.id;
    if (games.has(gameId)) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
});

app.get('/create-game', (req, res) => {
    const gameId = uuidv4();
    games.set(gameId, { 
        players: [], 
        board: ['', '', '', '', '', '', '', '', ''], 
        currentPlayer: 'X',
        winner: null
    });
    res.json({ gameId });
});

wss.on('connection', (ws, req) => {
    const gameId = req.url.split('/')[2];
    const game = games.get(gameId);

    if (!game || game.players.length >= 2) {
        ws.close();
        return;
    }

    const player = game.players.length === 0 ? 'X' : 'O';
    game.players.push({ ws, player });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'move') {
            if (game.currentPlayer === player && game.board[data.index] === '') {
                game.board[data.index] = player;
                if (checkWin(game.board, player)) {
                    game.winner = player;
                } else if (game.board.every(cell => cell !== '')) {
                    game.winner = 'draw';
                } else {
                    game.currentPlayer = player === 'X' ? 'O' : 'X';
                }
                broadcastGameState(game);
            }
        } else if (data.type === 'reset') {
            game.board = ['', '', '', '', '', '', '', '', ''];
            game.currentPlayer = 'X';
            game.winner = null;
            broadcastGameState(game);
        }
    });

    ws.on('close', () => {
        game.players = game.players.filter(p => p.ws !== ws);
        if (game.players.length === 0) {
            games.delete(gameId);
        } else {
            broadcastGameState(game);
        }
    });

    broadcastGameState(game);
});

function checkWin(board, player) {
    const winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // горизонтали
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // вертикали
        [0, 4, 8], [2, 4, 6] // диагонали
    ];

    return winConditions.some(condition => 
        condition.every(index => board[index] === player)
    );
}

function broadcastGameState(game) {
    const gameState = {
        board: game.board,
        currentPlayer: game.currentPlayer,
        players: game.players.length,
        winner: game.winner
    };
    game.players.forEach(player => {
        player.ws.send(JSON.stringify(gameState));
    });
}

server.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});