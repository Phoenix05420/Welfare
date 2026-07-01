import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
from logger import logger

class DocumentEncryptor:
    """
    Handles encryption and decryption of documents using AES-256-GCM.
    AES-GCM provides both confidentiality and data authenticity (authenticated encryption).
    """
    
    def __init__(self, key: bytes = None):
        """
        Initializes the encryptor with a 256-bit (32 bytes) key.
        If no key is provided, it tries to load 'ENCRYPTION_KEY' from the environment,
        or generates a new random key (for development purposes).
        """
        if key is None:
            env_key = os.getenv("ENCRYPTION_KEY")
            if env_key:
                # Assuming the environment key is hex-encoded
                self.key = bytes.fromhex(env_key)
            else:
                # Generate a random 256-bit key
                logger.warning("No ENCRYPTION_KEY found in environment. Generating a new random key.")
                self.key = AESGCM.generate_key(bit_length=256)
        else:
            self.key = key
            
        if len(self.key) != 32:
            raise ValueError(f"AES-256 requires a 32-byte key, got {len(self.key)} bytes.")
            
        self.aesgcm = AESGCM(self.key)

    def encrypt_document(self, document_data: bytes, associated_data: bytes = None) -> bytes:
        """
        Encrypts the document data using AES-256-GCM.
        Returns the concatenated nonce (12 bytes) and ciphertext.
        """
        # Generate a unique 96-bit (12 bytes) nonce for each encryption
        nonce = os.urandom(12)
        
        # Encrypt the data
        # AESGCM automatically appends the 16-byte authentication tag to the ciphertext
        ciphertext = self.aesgcm.encrypt(nonce, document_data, associated_data)
        
        # Prepend the nonce to the ciphertext so it can be used for decryption
        return nonce + ciphertext

    def decrypt_document(self, encrypted_data: bytes, associated_data: bytes = None) -> bytes:
        """
        Decrypts the document data using AES-256-GCM.
        Expects the first 12 bytes of encrypted_data to be the nonce.
        """
        if len(encrypted_data) < 28: # 12 bytes nonce + 16 bytes tag + at least 0 bytes data
            raise ValueError("Encrypted data is too short")
            
        nonce = encrypted_data[:12]
        ciphertext = encrypted_data[12:]
        
        try:
            decrypted_data = self.aesgcm.decrypt(nonce, ciphertext, associated_data)
            return decrypted_data
        except InvalidTag:
            logger.error("Decryption failed: Invalid authentication tag (data may be tampered or wrong key)")
            raise ValueError("Authentication failed. Document is corrupted or wrong encryption key.")

    def get_key_hex(self) -> str:
        """Returns the hex representation of the current key. Useful for storing in .env."""
        return self.key.hex()

# Example usage singleton
# encryptor = DocumentEncryptor()
