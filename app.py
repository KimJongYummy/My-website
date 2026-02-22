from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
import json
import os
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['SECRET_KEY'] = 'secret!'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['GAMES_FOLDER'] = 'games'
socketio = SocketIO(app, async_mode='eventlet')

# Create directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['GAMES_FOLDER'], exist_ok=True)

# Data files
MESSAGES_FILE = 'messages.json'
FORUM_FILE = 'forum.json'
IMAGES_FILE = 'images.json'

# Initialize data files if they don't exist
if not os.path.exists(MESSAGES_FILE):
    with open(MESSAGES_FILE, 'w') as f:
        json.dump([], f)

if not os.path.exists(FORUM_FILE):
    with open(FORUM_FILE, 'w') as f:
        json.dump([], f)

if not os.path.exists(IMAGES_FILE):
    with open(IMAGES_FILE, 'w') as f:
        json.dump([], f)

# Allowed extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/voice')
def voice():
    return render_template('voice.html')

@app.route('/images')
def images():
    return render_template('images.html')

@app.route('/forum')
def forum():
    with open(FORUM_FILE, 'r') as f:
        posts = json.load(f)
    return render_template('forum.html', posts=posts)

@app.route('/games')
def games():
    return render_template('games.html')

# Serve uploaded images
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Serve games
@app.route('/games/<filename>')
def game_file(filename):
    # Set correct MIME type for SWF files
    if filename.endswith('.swf'):
        return send_from_directory(app.config['GAMES_FOLDER'], filename, mimetype='application/x-shockwave-flash')
    return send_from_directory(app.config['GAMES_FOLDER'], filename)

# API: Get list of games
@app.route('/api/games')
def get_games():
    games_folder = app.config['GAMES_FOLDER']
    games = []
    
    if os.path.exists(games_folder):
        for file in os.listdir(games_folder):
            if file.endswith(('.swf', '.html', '.htm')):
                games.append({
                    'name': file,
                    'filename': file,
                    'type': 'swf' if file.endswith('.swf') else 'html'
                })
    
    return jsonify(games)

# API: Get messages
@app.route('/api/messages')
def get_messages():
    with open(MESSAGES_FILE, 'r') as f:
        messages = json.load(f)
    return jsonify(messages[-100:])

# API: Save message
@app.route('/api/messages', methods=['POST'])
def save_message():
    data = request.json
    with open(MESSAGES_FILE, 'r') as f:
        messages = json.load(f)
    
    message = {
        'username': data['username'],
        'text': data['text'],
        'time': datetime.now().strftime('%H:%M')
    }
    messages.append(message)
    
    with open(MESSAGES_FILE, 'w') as f:
        json.dump(messages[-500:], f)
    
    return jsonify({'status': 'ok'})

# API: Get images
@app.route('/api/images')
def get_images():
    with open(IMAGES_FILE, 'r') as f:
        images = json.load(f)
    return jsonify(images[-50:])

# API: Upload image
@app.route('/api/images', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    username = request.form.get('username', 'Anonymous')
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{timestamp}_{secure_filename(file.filename)}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Save to images.json
        with open(IMAGES_FILE, 'r') as f:
            images = json.load(f)
        
        image_data = {
            'filename': filename,
            'username': username,
            'time': datetime.now().strftime('%H:%M'),
            'format': ext
        }
        images.append(image_data)
        
        with open(IMAGES_FILE, 'w') as f:
            json.dump(images[-100:], f)
        
        # Notify via socket
        socketio.emit('new_image', image_data)
        
        return jsonify({'status': 'ok', 'filename': filename})
    
    return jsonify({'error': 'Invalid file type'}), 400

# API: Forum posts
@app.route('/api/forum', methods=['GET', 'POST'])
def forum_api():
    with open(FORUM_FILE, 'r') as f:
        posts = json.load(f)
    
    if request.method == 'POST':
        data = request.json
        post = {
            'id': len(posts) + 1,
            'category': data['category'],
            'title': data['title'],
            'content': data['content'],
            'author': data['author'],
            'time': datetime.now().strftime('%Y-%m-%d %H:%M'),
            'replies': []
        }
        posts.insert(0, post)
        with open(FORUM_FILE, 'w') as f:
            json.dump(posts, f)
    
    return jsonify(posts)

# API: Add reply
@app.route('/api/forum/reply', methods=['POST'])
def add_reply():
    data = request.json
    with open(FORUM_FILE, 'r') as f:
        posts = json.load(f)
    
    for post in posts:
        if post['id'] == data['post_id']:
            reply = {
                'author': data['author'],
                'content': data['content'],
                'time': datetime.now().strftime('%Y-%m-%d %H:%M')
            }
            post['replies'].append(reply)
            break
    
    with open(FORUM_FILE, 'w') as f:
        json.dump(posts, f)
    
    return jsonify({'status': 'ok'})

# Socket.IO events
@socketio.on('chat message')
def handle_message(data):
    emit('chat message', data, broadcast=True)

# Voice chat socket events
voice_users = {}

@socketio.on('voice join')
def handle_voice_join(data):
    voice_users[request.sid] = data
    emit('voice user joined', data, broadcast=True)

@socketio.on('voice leave')
def handle_voice_leave():
    if request.sid in voice_users:
        data = voice_users[request.sid]
        del voice_users[request.sid]
        emit('voice user left', data, broadcast=True)

@socketio.on('voice mute')
def handle_voice_mute(data):
    if request.sid in voice_users:
        voice_users[request.sid]['muted'] = data['muted']
        emit('voice user muted', {'username': voice_users[request.sid]['username'], 'muted': data['muted']}, broadcast=True)

@socketio.on('voice deafen')
def handle_voice_deafen(data):
    if request.sid in voice_users:
        voice_users[request.sid]['deafened'] = data['deafened']
        emit('voice user deafened', {'username': voice_users[request.sid]['username'], 'deafened': data['deafened']}, broadcast=True)

@socketio.on('voice switch channel')
def handle_voice_channel(data):
    if request.sid in voice_users:
        voice_users[request.sid]['channel'] = data['channel']

@socketio.on('voice audio')
def handle_voice_audio(data):
    emit('voice audio', data, broadcast=True, include_self=False)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
