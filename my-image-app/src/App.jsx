import React, { useState } from "react";
import "./App.css"; // optional custom CSS for flowchart background

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [encryptPassword, setEncryptPassword] = useState("");
  const [decryptPassword, setDecryptPassword] = useState("");
  const [encryptedData, setEncryptedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [decryptedPreview, setDecryptedPreview] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  const handleEncrypt = async () => {
    if (loading) return;
    if (!image || !encryptPassword) return setStatusMsg("Select image and password");

    setLoading(true);
    setStatusMsg("Encrypting...");

    const formData = new FormData();
    formData.append("file", image);
    formData.append("password", encryptPassword);

    try {
      const res = await fetch(`${API_URL}/encrypt`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        setStatusMsg(err.error || "Encryption failed");
        return;
      }
      const data = await res.json();
      setEncryptedData(data);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "encrypted_image.json";
      a.click();
      URL.revokeObjectURL(url);

      setStatusMsg("Encryption successful! JSON downloaded.");
    } catch (err) {
      console.error(err);
      setStatusMsg("Encryption error");
    } finally {
      setLoading(false);
    }
  };

  const handleEncryptedUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const keys = ["salt", "nonce", "ciphertext", "mime_type"];
        if (!keys.every(k => k in parsed)) return setStatusMsg("Invalid JSON");
        setEncryptedData(parsed);
        setDecryptedPreview(null);
        setStatusMsg("Encrypted JSON loaded!");
      } catch {
        setStatusMsg("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleDecrypt = async () => {
    if (loading || !encryptedData || !decryptPassword) return setStatusMsg("Upload JSON & password");

    setLoading(true);
    setStatusMsg("Decrypting...");

    const payload = { ...encryptedData, password: decryptPassword };

    try {
      const res = await fetch(`${API_URL}/decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setStatusMsg(err.error || "Decryption failed");
        return;
      }

      const blob = await res.blob();
      const ext = encryptedData.mime_type.split("/")[1] || "png";
      const url = URL.createObjectURL(blob);
      setDecryptedPreview(url);

      const a = document.createElement("a");
      a.href = url;
      a.download = `decrypted_image.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      setStatusMsg("Decryption successful!");
    } catch (err) {
      console.error(err);
      setStatusMsg("Decryption error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-100 via-blue-50 to-pink-50 flex flex-col items-center p-8 relative">
      {/* Flowchart background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center items-center text-9xl font-mono text-gray-300 select-none">
        🔒🔑📄➡️🖼️
      </div>

      <h1 className="text-4xl font-bold mb-8 z-10">Classified Images</h1>

      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mb-8 z-10">
        <h2 className="text-2xl font-semibold mb-4">Encrypt Image</h2>
        <input type="file" accept="image/*" onChange={e => { 
          const f = e.target.files[0]; 
          setImage(f); 
          setImagePreview(f ? URL.createObjectURL(f) : null); 
        }} disabled={loading} />
        {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 rounded-lg" />}
        <input type="password" placeholder="Password" value={encryptPassword} onChange={e => setEncryptPassword(e.target.value)} disabled={loading} className="mt-2 p-2 rounded border w-full" />
        <button onClick={handleEncrypt} disabled={loading} className="mt-4 w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:opacity-90 transition">
          {loading ? "Encrypting..." : "Encrypt"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md z-10">
        <h2 className="text-2xl font-semibold mb-4">Decrypt Image</h2>
        <input type="file" accept=".json" onChange={handleEncryptedUpload} disabled={loading} />
        <input type="password" placeholder="Password" value={decryptPassword} onChange={e => setDecryptPassword(e.target.value)} disabled={loading} className="mt-2 p-2 rounded border w-full" />
        <button onClick={handleDecrypt} disabled={loading} className="mt-4 w-full py-2 bg-gradient-to-r from-blue-500 to-green-400 text-white font-bold rounded-lg hover:opacity-90 transition">
          {loading ? "Decrypting..." : "Decrypt"}
        </button>

        {decryptedPreview && <div className="mt-4">
          <h3 className="font-semibold">Decrypted Preview:</h3>
          <img src={decryptedPreview} alt="Decrypted" className="rounded-lg" />
        </div>}
      </div>

      {statusMsg && <div className="mt-4 text-lg font-medium z-10">{statusMsg}</div>}
    </div>
  );
}

export default App;