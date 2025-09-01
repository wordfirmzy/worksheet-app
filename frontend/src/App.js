import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import WorksheetPage from "./WorksheetPage"; // make sure this file exists

function Home() {
  const [numWords, setNumWords] = useState(10);
  const [bilingualMode, setBilingualMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        "https://worksheet-backend.onrender.com/generate", // Render backend URL
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ num_words: numWords, bilingual_mode: bilingualMode }),
        }
      );

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();

      // Navigate to worksheet page with state
      navigate("/worksheet", { state: { worksheet: data.worksheet, word_bank: data.word_bank } });
    } catch (error) {
      console.error("Error generating worksheet:", error);
      alert("Error generating worksheet. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4">Worksheet Generator</h1>

      <label className="mb-2">
        Number of words:
        <input
          type="number"
          value={numWords}
          onChange={(e) => setNumWords(parseInt(e.target.value, 10))}
          className="ml-2 border rounded px-2 py-1"
        />
      </label>

      <label className="mb-4">
        <input
          type="checkbox"
          checked={bilingualMode}
          onChange={(e) => setBilingualMode(e.target.checked)}
          className="mr-2"
        />
        Bilingual mode
      </label>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? "Generating..." : "Generate Worksheet"}
      </button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/worksheet" element={<WorksheetPage />} />
      </Routes>
    </Router>
  );
}

export default App;
