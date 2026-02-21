import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def derive_key(password: bytes, salt: bytes = None, iterations: int = 100000):
    """
    Derives a 256-bit AES key from the given password using PBKDF2.
    
    If salt is not provided, a new secure random 16-byte salt is generated.
    Returns (key, salt).
    """
    if salt is None:
        salt = os.urandom(16)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256-bit key
        salt=salt,
        iterations=iterations,
    )

    key = kdf.derive(password)
    return key, salt


def encrypt_data(plaintext: bytes, key: bytes):
    """
    Encrypts plaintext using AES-GCM.
    Returns (ciphertext, nonce).
    """
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # Recommended size for GCM
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return ciphertext, nonce


def decrypt_data(ciphertext: bytes, key: bytes, nonce: bytes):
    """
    Decrypts AES-GCM ciphertext.
    Raises exception if authentication fails.
    """
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext