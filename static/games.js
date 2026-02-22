// Flash Games functionality
let ruffle;
let currentPlayer = null;

// Initialize Ruffle
document.addEventListener('DOMContentLoaded', async () => {
    // Load Ruffle
    if (window.RufflePlayer) {
        ruffle = window.RufflePlayer.newest();
        console.log('Ruffle loaded');
    }
    
    // Setup drop zone
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    // Click to browse
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            loadGame(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadGame(e.target.files[0]);
        }
    });
    
    // Close game button
    document.getElementById('close-game').addEventListener('click', closeGame);
});

function loadGame(file) {
    if (!file.name.toLowerCase().endsWith('.swf')) {
        alert('Please drop a .swf file');
        return;
    }
    
    // Show game container
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('game-title').textContent = file.name;
    
    // Load game with Ruffle
    const container = document.getElementById('ruffle-container');
    container.innerHTML = '';
    
    if (ruffle) {
        const player = ruffle.createPlayer();
        container.appendChild(player);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            player.load(e.target.result);
        };
        reader.readAsArrayBuffer(file);
        currentPlayer = player;
    } else {
        container.innerHTML = '<p style="color: red;">Ruffle failed to load. Please refresh and try again.</p>';
    }
}

function closeGame() {
    document.getElementById('drop-zone').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
    
    if (currentPlayer) {
        currentPlayer = null;
    }
    
    document.getElementById('ruffle-container').innerHTML = '';
    document.getElementById('file-input').value = '';
}
