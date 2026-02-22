// Games functionality
let ruffle = null;
let currentGame = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Load Ruffle
    try {
        if (window.RufflePlayer) {
            ruffle = window.RufflePlayer;
            console.log('Ruffle loaded');
        }
    } catch (e) {
        console.error('Ruffle error:', e);
    }
    
    // Load game list
    loadGameList();
    
    // Back to list button
    document.getElementById('back-to-list').addEventListener('click', () => {
        showGameList();
    });
});

function loadGameList() {
    fetch('/api/games')
        .then(r => r.json())
        .then(games => {
            renderGameList(games);
            document.getElementById('status').textContent = games.length + ' games available';
        })
        .catch(err => {
            console.error('Error loading games:', err);
            document.getElementById('game-list').innerHTML = '<p>Error loading games</p>';
            document.getElementById('status').textContent = 'Error';
        });
}

function renderGameList(games) {
    const container = document.getElementById('game-list');
    
    if (games.length === 0) {
        container.innerHTML = `
            <div class="no-games">
                <p>🎮 No games yet!</p>
                <p class="small">Ask the admin to add games to the games folder</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = games.map(game => `
        <div class="game-card" onclick="playGame('${game.filename}', '${game.type}')">
            <div class="game-icon">${game.type === 'swf' ? '⚡' : '🌐'}</div>
            <div class="game-name">${game.name}</div>
        </div>
    `).join('');
}

function playGame(filename, type) {
    currentGame = filename;
    
    // Hide list, show game
    document.getElementById('game-list').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('game-title').textContent = filename;
    
    const container = document.getElementById('game-frame');
    container.innerHTML = '';
    
    if (type === 'swf') {
        // Load Flash game with Ruffle
        if (!ruffle) {
            container.innerHTML = '<p style="color:red">Ruffle not loaded yet. Try again in a moment.</p>';
            return;
        }
        
        const player = ruffle.createPlayer();
        container.appendChild(player);
        
        // Load the SWF file
        fetch('/games/' + filename)
            .then(r => r.arrayBuffer())
            .then(data => {
                player.load(data).catch(err => {
                    container.innerHTML = '<p style="color:red">Error loading game: ' + err.message + '</p>';
                });
            })
            .catch(err => {
                container.innerHTML = '<p style="color:red">Error: ' + err.message + '</p>';
            });
    } else {
        // Load HTML game in iframe
        container.innerHTML = `<iframe src="/games/${filename}" frameborder="0" class="game-iframe"></iframe>`;
    }
    
    document.getElementById('status').textContent = 'Playing: ' + filename;
}

function showGameList() {
    document.getElementById('game-list').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('status').textContent = 'Game library';
    currentGame = null;
}
