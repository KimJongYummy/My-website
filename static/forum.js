// Forum functionality
let posts = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    
    // New post button
    document.getElementById('new-post-btn').addEventListener('click', () => {
        const form = document.getElementById('new-post-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
    
    // Submit post
    document.getElementById('submit-post').addEventListener('click', submitPost);
});

function loadPosts() {
    fetch('/api/forum')
        .then(r => r.json())
        .then(data => {
            posts = data;
            renderPosts();
        });
}

function renderPosts() {
    const container = document.getElementById('posts');
    container.innerHTML = '';
    
    posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        
        let repliesHtml = '';
        post.replies.forEach(reply => {
            repliesHtml += `
                <div class="reply">
                    <strong>${escapeHtml(reply.author)}</strong> 
                    <span class="time">${reply.time}</span><br>
                    ${escapeHtml(reply.content)}
                </div>
            `;
        });
        
        div.innerHTML = `
            <span class="post-category">${escapeHtml(post.category)}</span>
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
            <div class="post-meta">
                by <strong>${escapeHtml(post.author)}</strong> | ${post.time}
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-replies">
                ${repliesHtml}
                <div class="reply-form">
                    <input type="text" placeholder="Reply as..." id="reply-author-${post.id}">
                    <input type="text" placeholder="Write reply..." id="reply-content-${post.id}">
                    <button class="btn-small" onclick="submitReply(${post.id})">Reply</button>
                </div>
            </div>
        `;
        
        container.appendChild(div);
    });
}

function submitPost() {
    const category = document.getElementById('post-category').value.trim();
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const author = document.getElementById('post-author').value.trim();
    
    if (!category || !title || !content || !author) {
        alert('Please fill in all fields');
        return;
    }
    
    fetch('/api/forum', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ category, title, content, author })
    })
    .then(r => r.json())
    .then(() => {
        // Clear form
        document.getElementById('post-category').value = '';
        document.getElementById('post-title').value = '';
        document.getElementById('post-content').value = '';
        document.getElementById('post-author').value = '';
        document.getElementById('new-post-form').style.display = 'none';
        
        // Reload posts
        loadPosts();
    });
}

function submitReply(postId) {
    const authorInput = document.getElementById(`reply-author-${postId}`);
    const contentInput = document.getElementById(`reply-content-${postId}`);
    
    const author = authorInput.value.trim();
    const content = contentInput.value.trim();
    
    if (!author || !content) {
        alert('Please fill in both fields');
        return;
    }
    
    fetch('/api/forum/reply', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ post_id: postId, author, content })
    })
    .then(r => r.json())
    .then(() => {
        loadPosts();
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
