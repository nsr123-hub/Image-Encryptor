from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import base64
from crypto_utils import derive_key, encrypt_data, decrypt_data

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return jsonify({"status": "Backend running"})


@app.route('/encrypt', methods=['POST'])
def encrypt_image():
    # Validate required inputs
    if 'file' not in request.files or 'password' not in request.form:
        return jsonify(error='Missing file or password'), 400

    image_file = request.files['file']
    password = request.form['password']

    # Validate image type
    if not image_file.mimetype.startswith("image/"):
        return jsonify(error="Only image files allowed"), 400

    mime_type = image_file.mimetype
    data = image_file.read()

    # Derive key (new salt generated)
    key, salt = derive_key(password.encode('utf-8'))

    # Encrypt
    ciphertext, nonce = encrypt_data(data, key)

    # Return Base64 encoded values
    return jsonify(
        salt=base64.b64encode(salt).decode(),
        nonce=base64.b64encode(nonce).decode(),
        ciphertext=base64.b64encode(ciphertext).decode(),
        mime_type=mime_type
    )


@app.route('/decrypt', methods=['POST'])
def decrypt_image():
    data = request.get_json()

    required = ['salt', 'nonce', 'ciphertext', 'password', 'mime_type']
    if not data or not all(k in data for k in required):
        return jsonify(error='Missing data'), 400

    try:
        salt = base64.b64decode(data['salt'])
        nonce = base64.b64decode(data['nonce'])
        ciphertext = base64.b64decode(data['ciphertext'])
        password = data['password']
        mime_type = data['mime_type']
    except Exception:
        return jsonify(error="Invalid Base64 data"), 400

    # Derive same key
    key, _ = derive_key(password.encode('utf-8'), salt)

    try:
        plaintext = decrypt_data(ciphertext, key, nonce)
    except Exception:
        return jsonify(
            error="Decryption failed. Wrong password or corrupted data."
        ), 400

    return Response(plaintext, mimetype=mime_type)


if __name__ == "__main__":
    app.run(debug=True)