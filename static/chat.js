// Chat functionality
let socket;
let username = '';
let mediaRecorder;
let audioChunks = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Show login modal
    const modal = document.getElementById('login-modal');
    modal.style.display = 'flex';
    
    // Join button
    document.getElementById('join-btn').addEventListener('click', joinChat);
    document.getElementById('username-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinChat();
    });
    
    // Close modal button (browse without joining)
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'none';
        // Disable chat if not joined
        document.getElementById('message-input').disabled = true;
        document.getElementById('send-btn').disabled = true;
    });
});

function joinChat() {
    const input = document.getElementById('username-input');
    username = input.value.trim();
    if (!username) return;
    
    // Hide modal
    document.getElementById('login-modal').style.display = 'none';
    
    // Enable input
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('voice-btn').disabled = false;
    
    // Connect to Socket.IO
    socket = io();
    
    socket.on('connect', () => {
        document.getElementById('connection-status').textContent = 'Connected';
    });
    
    socket.on('disconnect', () => {
        document.getElementById('connection-status').textContent = 'Disconnected';
    });
    
    socket.on('chat message', (data) => {
        addMessage(data);
    });
    
    // Load previous messages
    loadMessages();
    
    // Send button
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Voice chat
    setupVoiceChat();
}

function loadMessages() {
    fetch('/api/messages')
        .then(r => r.json())
        .then(messages => {
            messages.forEach(addMessage);
        });
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text) return;
    
    const data = { username, text, time: new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'}) };
    
    // Add locally
    addMessage(data);
    
    // Save to server
    fetch('/api/messages', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    input.value = '';
}

function addMessage(data) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message';
    div.innerHTML = `<span class="username">${escapeHtml(data.username)}</span><span class="time">${data.time}</span>: ${escapeHtml(data.text)}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Voice Chat
function setupVoiceChat() {
    const voiceBtn = document.getElementById('voice-btn');
    
    voiceBtn.addEventListener('mousedown', startVoice);
    voiceBtn.addEventListener('mouseup', stopVoice);
    voiceBtn.addEventListener('mouseleave', stopVoice);
}

async function startVoice() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            // Convert to base64 and send
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                socket.emit('voice data', { audio: reader.result, username });
            };
            audioChunks = [];
        };
        
        mediaRecorder.start();
        document.getElementById('voice-status').textContent = 'Voice: Recording...';
    } catch (err) {
        console.error('Voice error:', err);
    }
}

function stopVoice() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        document.getElementById('voice-status').textContent = 'Voice: Off';
    }
}

// Handle incoming voice
if (typeof socket !== 'undefined') {
    socket.on('voice data', (data) => {
        // For now, just show notification
        // Full WebRTC audio would need more setup
    });
}
