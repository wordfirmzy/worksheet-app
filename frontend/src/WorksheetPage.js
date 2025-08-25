import React, { useEffect, useState } from "react";

function WorksheetPage() {
  const [worksheet, setWorksheet] = useState(null);
  const [wordBank, setWordBank] = useState([]);

  useEffect(() => {
    const data = localStorage.getItem("worksheetData");
    if (data) {
      const parsed = JSON.parse(data);
      setWorksheet(parsed.worksheet);
      setWordBank(parsed.word_bank);
    }
  }, []);

  if (!worksheet) return <div>Loading worksheet...</div>;

  return (
    <div>
      <h1>Interactive Worksheet</h1>
      <div>
        {worksheet.map((sentence, i) => (
          <p key={i}>{sentence}</p>
        ))}
      </div>
      <h2>Word Bank</h2>
      <ul>
        {wordBank.map((word, i) => (
          <li key={i}>{word}</li>
        ))}
      </ul>
    </div>
  );
}

export default WorksheetPage;

