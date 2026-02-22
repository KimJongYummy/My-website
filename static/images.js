// Image sharing functionality
let socket;
let username = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Show login modal
    const modal = document.getElementById('login-modal');
    modal.style.display = 'flex';
    
    // Join button
    document.getElementById('join-btn').addEventListener('click', joinImageShare);
    document.getElementById('username-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinImageShare();
    });
    
    // Close modal button
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'none';
    });
    
    // Setup file upload
    setupFileUpload();
});

function joinImageShare() {
    const input = document.getElementById('username-input');
    username = input.value.trim();
    if (!username) return;
    
    // Hide modal
    document.getElementById('login-modal').style.display = 'none';
    
    // Connect to Socket.IO
    socket = io();
    
    socket.on('connect', () => {
        document.getElementById('connection-status').textContent = 'Connected';
    });
    
    socket.on('disconnect', () => {
        document.getElementById('connection-status').textContent = 'Disconnected';
    });
    
    // Listen for new images
    socket.on('new_image', (data) => {
        addImageToGallery(data, false);
    });
    
    // Load previous images
    loadImages();
}

function setupFileUpload() {
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
            uploadImage(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadImage(e.target.files[0]);
        }
    });
}

function uploadImage(file) {
    if (!username) {
        alert('Please join first!');
        return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please use JPG, PNG, GIF, WebP, or BMP.');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Maximum size is 10MB.');
        return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('image', file);
    formData.append('username', username);
    
    // Upload
    fetch('/api/images', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            // Add to gallery immediately
            addImageToGallery({
                filename: data.filename,
                username: username,
                time: new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})
            }, true);
        }
    })
    .catch(err => {
        console.error('Upload error:', err);
        alert('Upload failed');
    });
}

function loadImages() {
    fetch('/api/images')
        .then(r => r.json())
        .then(images => {
            const container = document.getElementById('images-grid');
            container.innerHTML = '';
            
            if (images.length === 0) {
                container.innerHTML = `
                    <div class="empty-gallery">
                        <p>No images shared yet.</p>
                        <p class="small">Be the first to share!</p>
                    </div>
                `;
                return;
            }
            
            images.forEach(img => addImageToGallery(img, false));
            document.getElementById('image-count').textContent = images.length + ' images';
        });
}

function addImageToGallery(imgData, isNew) {
    const container = document.getElementById('images-grid');
    
    // Remove empty message if exists
    const empty = container.querySelector('.empty-gallery');
    if (empty) {
        empty.remove();
    }
    
    const div = document.createElement('div');
    div.className = 'image-card';
    div.innerHTML = `
        <img src="/uploads/${imgData.filename}" alt="Shared image" loading="lazy">
        <div class="image-info">
            <span class="image-user">${escapeHtml(imgData.username)}</span>
            <span class="image-time">${imgData.time}</span>
        </div>
    `;
    
    // Add to beginning if new, end otherwise
    if (isNew) {
        container.insertBefore(div, container.firstChild);
    } else {
        container.appendChild(div);
    }
    
    // Update count
    const count = container.querySelectorAll('.image-card').length;
    document.getElementById('image-count').textContent = count + ' images';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
