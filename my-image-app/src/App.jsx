import React, { useState } from "react";

// Safe API URL resolution
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [image, setImage] = useState(null);
  const [password, setPassword] = useState("");
  const [encryptedData, setEncryptedData] = useState(null);

  // ---------------- ENCRYPT ----------------

  const handleEncrypt = async () => {
    if (!image) {
      alert("Please select an image.");
      return;
    }

    if (!password) {
      alert("Please enter password.");
      return;
    }

    const formData = new FormData();
    // backend expects the file field to be named "file"
    formData.append("file", image);
    formData.append("password", password);

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
        setEncryptedData(parsed);
        alert("Encrypted JSON loaded successfully.");
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };

    reader.readAsText(file);
  };

  // ---------------- DECRYPT ----------------

  const handleDecrypt = async () => {
    if (!encryptedData) {
      alert("Upload encrypted JSON first.");
      return;
    }

    if (!password) {
      alert("Enter password.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/decrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...encryptedData,
          password: password,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || "Decryption failed");
        return;
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "decrypted_image";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      alert("Decryption successful.");
    } catch (error) {
      console.error(error);
      alert("Decryption error");
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Classified Images</h1>

      <hr />

      <h2>Encrypt Image</h2>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={handleEncrypt}>Encrypt</button>

      <hr />

      <h2>Decrypt Image</h2>

      <input
        type="file"
        accept=".json"
        onChange={handleEncryptedUpload}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={handleDecrypt}>Decrypt</button>
    </div>
  );
}

export default App;