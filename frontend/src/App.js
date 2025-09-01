// src/App.js
import React, { useState } from "react";
import WorksheetPage from "./WorksheetPage";

function App() {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState("beginner");
  const [familiarity, setFamiliarity] = useState("once");
  const [outputFormat, setOutputFormat] = useState("web");
  const [bilingual, setBilingual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [worksheetData, setWorksheetData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload a subtitle file.");
      return;
    }

    setLoading(true);
    setError("");
    setWorksheetData(null);

    const formData = new FormData();
    formData.append("subtitle_file", file);
    formData.append("level", level);
    formData.append("familiarity", familiarity);
    formData.append("output_format", outputFormat);
    formData.append("bilingual", bilingual);

    try {
      const response = await fetch("http://localhost:8000/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to generate worksheet");
      }

      if (outputFormat === "web") {
        const data = await response.json();
        setWorksheetData(data);
      } else {
        // for PDF / DOCX just trigger a download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          outputFormat === "pdf" ? "worksheet.pdf" : "worksheet.docx";
        a.click();
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (worksheetData) {
    return (
      <WorksheetPage
        worksheet={worksheetData.worksheet}
        wordBank={worksheetData.word_bank}
        bilingual={worksheetData.bilingual}
        onBack={() => setWorksheetData(null)}
      />
    );
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Worksheet Generator</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Upload subtitle file: </label>
          <input
            type="file"
            accept=".srt,.ass,.vtt,.txt"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        <div>
          <label>Level: </label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
          </select>
        </div>

        <div>
          <label>Familiarity: </label>
          <select
            value={familiarity}
            onChange={(e) => setFamiliarity(e.target.value)}
          >
            <option value="once">Once</option>
            <option value="twice">Twice</option>
            <option value="more">More</option>
          </select>
        </div>

        <div>
          <label>Output Format: </label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
          >
            <option value="web">Web</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
          </select>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={bilingual}
              onChange={(e) => setBilingual(e.target.checked)}
            />
            Bilingual mode
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}

export default App;







