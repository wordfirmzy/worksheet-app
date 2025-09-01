import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import WorksheetPage from "./WorksheetPage";
import "./App.css";

function AppForm() {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState("beginner");
  const [familiarity, setFamiliarity] = useState("once");
  const [outputFormat, setOutputFormat] = useState("pdf");
  const [bilingual, setBilingual] = useState(false);
  const [debug, setDebug] = useState(false);
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a subtitle file.");
      return;
    }

    const formData = new FormData();
    formData.append("subtitle_file", file);
    formData.append("level", level);
    formData.append("familiarity", familiarity);
    formData.append("output_format", outputFormat);
    formData.append("bilingual", bilingual);
    formData.append("debug", debug);

    setStatus("Generating worksheet...");

    try {
      const response = await fetch(
        "https://worksheet-backend.onrender.com/generate", // replace with your backend URL
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      if (outputFormat === "web") {
        const data = await response.json();
        navigate("/worksheet", { state: { worksheet: data.worksheet, word_bank: data.word_bank } });
      } else {
        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition");
        let filename = "worksheet";
        if (contentDisposition && contentDisposition.includes("filename=")) {
          filename = contentDisposition.split("filename=")[1].replace(/['"]/g, "").trim();
        } else {
          filename += `.${outputFormat}`;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }

      setStatus("Worksheet generated.");
    } catch (err) {
      console.error("Error generating worksheet:", err);
      setStatus("Error generating worksheet. See console for details.");
    }
  };

  return (
    <div className="App">
      <h1>Subtitle Worksheet Generator</h1>
      <form onSubmit={handleGenerate}>
        <div>
          <label>Subtitle file:</label>
          <input
            type="file"
            accept=".srt,.ass,.txt"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </div>
        <div>
          <label>Level:</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
          </select>
        </div>
        <div>
          <label>Familiarity:</label>
          <select value={familiarity} onChange={(e) => setFamiliarity(e.target.value)}>
            <option value="once">Once</option>
            <option value="twice">Twice</option>
            <option value="more">More than twice</option>
          </select>
        </div>
        <div>
          <label>Output format:</label>
          <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="web">Web</option>
          </select>
        </div>
        <div>
          <label>
            <input type="checkbox" checked={bilingual} onChange={(e) => setBilingual(e.target.checked)} />
            Bilingual
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
            Debug
          </label>
        </div>
        <button type="submit">Generate Worksheet</button>
      </form>
      <p>{status}</p>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppForm />} />
        <Route path="/worksheet" element={<WorksheetPage />} />
      </Routes>
    </Router>
  );
}
