// Simple Ruffle player
let gamesLoaded = [];

document.addEventListener('DOMContentLoaded', () => {
    loadGameList();
});

function loadGameList() {
    fetch('/api/games')
        .then(r => r.json())
        .then(games => {
            gamesLoaded = games;
            renderGameList(games);
            document.getElementById('status').textContent = games.length + ' games';
        });
}

function renderGameList(games) {
    const container = document.getElementById('game-list');
    
    if (!games.length) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">No games</p>';
        return;
    }
    
    container.innerHTML = games.map(game => {
        const name = game.name.replace('.swf', '').replace(/-[a-f0-9]{8}/gi, '').replace(/-/g, ' ').trim();
        return `
            <div class="game-card" onclick="playGame('${game.filename}')">
                <div class="game-icon">⚡</div>
                <div class="game-name">${name}</div>
            </div>
        `;
    }).join('');
}

function playGame(filename) {
    const name = filename.replace('.swf', '').replace(/-[a-f0-9]{8}/gi, '').replace(/-/g, ' ').trim();
    const url = '/games/' + filename;
    
    document.getElementById('window-title').innerHTML = `
        <span>${name}</span>
        <button class="btn-small" onclick="backToList()">← Back</button>
    `;
    
    const area = document.getElementById('game-area');
    area.innerHTML = '<div id="player" style="width:100%;height:500px;background:#000;"></div>';
    
    document.getElementById('status').textContent = 'Loading ' + name + '...';
    
    // Wait for Ruffle
    const tryPlay = () => {
        const Ruffle = window.RufflePlayer;
        
        if (!Ruffle || !Ruffle.newest) {
            document.getElementById('player').innerHTML = '<p style="color:yellow;padding:20px;">Loading Ruffle...</p>';
            setTimeout(tryPlay, 500);
            return;
        }
        
        try {
            const ruffle = Ruffle.newest();
            const player = ruffle.createPlayer();
            
            const container = document.getElementById('player');
            container.innerHTML = '';
            container.appendChild(player);
            
            player.load(url).then(() => {
                document.getElementById('status').textContent = 'Playing: ' + name;
            }).catch(err => {
                document.getElementById('player').innerHTML = '<p style="color:red;padding:20px;">Error: ' + err.message + '</p>';
            });
        } catch(e) {
            document.getElementById('player').innerHTML = '<p style="color:red;padding:20px;">Error: ' + e.message + '</p>';
        }
    };
    
    tryPlay();
}

function backToList() {
    document.getElementById('window-title').innerHTML = '🎮 Click a Game to Play';
    document.getElementById('game-area').innerHTML = `
        <div id="game-list" class="game-list">
            ${gamesLoaded.map(g => {
                const name = g.name.replace('.swf', '').replace(/-[a-f0-9]{8}/gi, '').replace(/-/g, ' ').trim();
                return `<div class="game-card" onclick="playGame('${g.filename}')">
                    <div class="game-icon">⚡</div>
                    <div class="game-name">${name}</div>
                </div>`;
            }).join('')}
        </div>
    `;
    document.getElementById('status').textContent = gamesLoaded.length + ' games';
}
