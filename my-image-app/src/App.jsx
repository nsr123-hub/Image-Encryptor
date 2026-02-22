import React, { useState } from "react";

// Safe API URL resolution
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [encryptPassword, setEncryptPassword] = useState("");
  const [decryptPassword, setDecryptPassword] = useState("");
  const [encryptedData, setEncryptedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [decryptedPreview, setDecryptedPreview] = useState(null);

  // ---------------- ENCRYPT ----------------
  const handleEncrypt = async () => {
    if (loading) return;

    if (!image) {
      alert("Please select an image.");
      return;
    }
    if (!encryptPassword) {
      alert("Please enter password for encryption.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", image);
    formData.append("password", encryptPassword);

    try {
      const response = await fetch(`${API_URL}/encrypt`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || "Encryption failed");
        return;
      }

      const data = await response.json();
      setEncryptedData(data);

      // Download encrypted JSON automatically
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "encrypted_image.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      alert("Encryption successful. JSON downloaded.");
    } catch (error) {
      console.error(error);
      alert("Encryption error");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- UPLOAD ENCRYPTED JSON ----------------
  const handleEncryptedUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        // Validate required keys
        const requiredKeys = ["salt", "nonce", "ciphertext", "mime_type"];
        const missing = requiredKeys.filter((k) => !(k in parsed));
        if (missing.length > 0) {
          alert("Invalid JSON file. Missing: " + missing.join(", "));
          return;
        }

        setEncryptedData(parsed);
        setDecryptedPreview(null); // reset previous preview
        alert("Encrypted JSON loaded successfully.");
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // ---------------- DECRYPT ----------------
  const handleDecrypt = async () => {
    if (loading) return;

    if (!encryptedData) {
      alert("Upload encrypted JSON first.");
      return;
    }
    if (!decryptPassword) {
      alert("Enter password for decryption.");
      return;
    }

    const payload = {
      salt: encryptedData.salt,
      nonce: encryptedData.nonce,
      ciphertext: encryptedData.ciphertext,
      mime_type: encryptedData.mime_type,
      password: decryptPassword,
    };

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || "Decryption failed");
        return;
      }

      const blob = await response.blob();
      const extension = encryptedData.mime_type.split("/")[1] || "png";
      const url = URL.createObjectURL(blob);

      // Show preview
      setDecryptedPreview(url);

      // Download automatically
      const a = document.createElement("a");
      a.href = url;
      a.download = `decrypted_image.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      alert("Decryption successful.");
    } catch (error) {
      console.error(error);
      alert("Decryption error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial", maxWidth: "600px", margin: "auto" }}>
      <h1>Classified Images</h1>

      <hr />

      <h2>Encrypt Image</h2>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files[0];
          setImage(file);
          if (file) setImagePreview(URL.createObjectURL(file));
        }}
        disabled={loading}
      />
      {imagePreview && (
        <div style={{ marginTop: "10px" }}>
          <img src={imagePreview} alt="Preview" style={{ maxWidth: "100%" }} />
        </div>
      )}
      <br />
      <input
        type="password"
        placeholder="Enter password"
        value={encryptPassword}
        onChange={(e) => setEncryptPassword(e.target.value)}
        disabled={loading}
      />
      <br />
      <br />
      <button onClick={handleEncrypt} disabled={loading}>
        {loading ? "Encrypting..." : "Encrypt"}
      </button>

      <hr />

      <h2>Decrypt Image</h2>
      <input
        type="file"
        accept=".json"
        onChange={handleEncryptedUpload}
        disabled={loading}
      />
      <br />
      <br />
      <input
        type="password"
        placeholder="Enter password"
        value={decryptPassword}
        onChange={(e) => setDecryptPassword(e.target.value)}
        disabled={loading}
      />
      <br />
      <br />
      <button onClick={handleDecrypt} disabled={loading}>
        {loading ? "Decrypting..." : "Decrypt"}
      </button>

      {decryptedPreview && (
        <div style={{ marginTop: "10px" }}>
          <h3>Decrypted Preview:</h3>
          <img src={decryptedPreview} alt="Decrypted" style={{ maxWidth: "100%" }} />
        </div>
      )}

      {loading && <p>Processing… please wait</p>}
    </div>
  );
}

export default App;