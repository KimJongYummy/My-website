// Voice Chat functionality
let socket;
let username = '';
let isMuted = false;
let isDeafened = false;
let isTalking = false;
let mediaStream = null;
let audioContext = null;
let pttKey = 'Space';
let muteKey = 'M';
let currentChannel = 'general';
let voiceUsers = {}; // {username: {muted, deafened}}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Show login modal
    const modal = document.getElementById('login-modal');
    modal.style.display = 'flex';
    
    // Join button
    document.getElementById('join-btn').addEventListener('click', joinVoice);
    document.getElementById('username-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinVoice();
    });
    
    // Close modal button (browse without joining)
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'none';
    });
    
    // Setup hotkey listeners
    setupHotkeys();
    
    // Channel switching
    document.querySelectorAll('.channel').forEach(ch => {
        ch.addEventListener('click', () => {
            const channel = ch.dataset.channel;
            switchChannel(channel);
        });
    });
    
    // Control buttons
    document.getElementById('mute-btn').addEventListener('click', toggleMute);
    document.getElementById('deafen-btn').addEventListener('click', toggleDeafen);
    document.getElementById('leave-btn').addEventListener('click', leaveVoice);
    document.getElementById('settings-btn').addEventListener('click', toggleSettings);
});

function joinVoice() {
    const input = document.getElementById('username-input');
    username = input.value.trim();
    if (!username) return;
    
    // Hide modal
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('your-name').textContent = username;
    
    // Connect to Socket.IO
    socket = io();
    
    socket.on('connect', () => {
        document.getElementById('voice-status').textContent = 'Connected';
        document.getElementById('connection-status').textContent = 'Connected';
        
        // Join the channel
        socket.emit('voice join', { 
            username, 
            channel: currentChannel,
            muted: isMuted,
            deafened: isDeafened
        });
    });
    
    socket.on('disconnect', () => {
        document.getElementById('voice-status').textContent = 'Disconnected';
    });
    
    // Voice events
    socket.on('voice user joined', (data) => {
        voiceUsers[data.username] = data;
        renderVoiceUsers();
    });
    
    socket.on('voice user left', (data) => {
        delete voiceUsers[data.username];
        renderVoiceUsers();
    });
    
    socket.on('voice user muted', (data) => {
        if (voiceUsers[data.username]) {
            voiceUsers[data.username].muted = data.muted;
            renderVoiceUsers();
        }
    });
    
    socket.on('voice user deafened', (data) => {
        if (voiceUsers[data.username]) {
            voiceUsers[data.username].deafened = data.deafened;
            renderVoiceUsers();
        }
    });
    
    socket.on('voice audio', (data) => {
        // Play incoming audio (simplified - real implementation would use WebRTC)
        playIncomingAudio(data);
    });
    
    // Setup local audio
    setupLocalAudio();
}

function setupLocalAudio() {
    // Get microphone
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaStream = stream;
            
            // Setup audio context for processing
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            
            // Connect to destination (for local monitoring if needed)
            source.connect(audioContext.destination);
            
            // Setup Push to Talk
            setupPTT(stream);
        })
        .catch(err => {
            console.error('Mic error:', err);
            document.getElementById('voice-status').textContent = 'Mic access denied';
        });
}

function setupPTT(stream) {
    // PTT - send audio only when key is held
    const audioTrack = stream.getAudioTracks()[0];
    
    document.addEventListener('keydown', (e) => {
        if (e.code === pttKey && !isTalking && !isMuted) {
            audioTrack.enabled = true;
            isTalking = true;
            document.getElementById('mic-status').textContent = '🎤 Talking...';
            document.getElementById('mic-status').classList.add('talking');
        }
        if (e.code === muteKey) {
            toggleMute();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code === pttKey && isTalking) {
            audioTrack.enabled = false;
            isTalking = false;
            document.getElementById('mic-status').textContent = isMuted ? '🔇 Muted' : '🎤 Mic On';
            document.getElementById('mic-status').classList.remove('talking');
        }
    });
}

function setupHotkeys() {
    // PTT key
    document.getElementById('ptt-key').addEventListener('click', function() {
        this.value = 'Press any key...';
        const handler = (e) => {
            pttKey = e.code;
            this.value = e.code;
            document.removeEventListener('keydown', handler);
        };
        document.addEventListener('keydown', handler);
    });
    
    // Mute key
    document.getElementById('mute-key').addEventListener('click', function() {
        this.value = 'Press any key...';
        const handler = (e) => {
            muteKey = e.code;
            this.value = e.code;
            document.removeEventListener('keydown', handler);
        };
        document.addEventListener('keydown', handler);
    });
}

function toggleMute() {
    isMuted = !isMuted;
    
    // Disable/enable mic
    if (mediaStream) {
        mediaStream.getAudioTracks()[0].enabled = !isMuted;
    }
    
    // Update UI
    document.getElementById('mute-icon').textContent = isMuted ? '🔇' : '🎤';
    document.getElementById('mute-text').textContent = isMuted ? 'Unmute' : 'Mute';
    document.getElementById('mic-status').textContent = isMuted ? '🔇 Muted' : '🎤 Mic On';
    
    // Notify server
    socket.emit('voice mute', { muted: isMuted });
}

function toggleDeafen() {
    isDeafened = !isDeafened;
    
    // Disable/enable all audio
    if (audioContext) {
        audioContext.suspend();
    }
    
    // Update UI
    document.getElementById('deafen-icon').textContent = isDeafened ? '🔇' : '🔊';
    document.getElementById('deafen-text').textContent = isDeafened ? 'Undeafen' : 'Deafen';
    document.getElementById('voice-status').textContent = isDeafened ? '🔇 Deafened' : 'Connected';
    
    // Notify server
    socket.emit('voice deafen', { deafened: isDeafened });
}

function switchChannel(channel) {
    currentChannel = channel;
    
    // Update UI
    document.querySelectorAll('.channel').forEach(ch => {
        ch.classList.toggle('active', ch.dataset.channel === channel);
    });
    document.getElementById('current-channel').textContent = 
        document.querySelector(`.channel[data-channel="${channel}"] .channel-icon`).textContent + 
        ' ' + channel.charAt(0).toUpperCase() + channel.slice(1);
    document.getElementById('channel-status').textContent = 'Channel: ' + channel;
    
    // Tell server
    if (socket && socket.connected) {
        socket.emit('voice switch channel', { channel });
    }
}

function leaveVoice() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    if (audioContext) {
        audioContext.close();
    }
    if (socket) {
        socket.emit('voice leave');
    }
    
    // Reset UI
    document.getElementById('login-modal').style.display = 'flex';
    voiceUsers = {};
    renderVoiceUsers();
}

function toggleSettings() {
    const settings = document.querySelector('.hotkey-settings');
    settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
}

function renderVoiceUsers() {
    const container = document.getElementById('voice-users');
    
    const users = Object.keys(voiceUsers);
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="voice-empty">
                <p>No one in this channel yet.</p>
                <p class="small">Join to start talking!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = users.map(u => {
        const user = voiceUsers[u];
        return `
            <div class="voice-user ${user.username === username ? 'you' : ''}">
                <div class="user-avatar">
                    ${user.muted ? '🔇' : '🎤'}
                </div>
                <div class="user-info">
                    <div class="user-name">${escapeHtml(user.username)} ${user.username === username ? '(You)' : ''}</div>
                    <div class="user-state">
                        ${user.muted ? '🔇 Muted' : '🎤 Speaking'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function playIncomingAudio(data) {
    // Simplified - real implementation would use WebRTC peer connections
    // This is placeholder for demonstration
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
