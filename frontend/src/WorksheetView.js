import React from "react";
import { useLocation, Link } from "react-router-dom";

function WorksheetView() {
  const location = useLocation();
  const data = location.state?.data;

  if (!data) {
    return (
      <div>
        <p>No worksheet data found.</p>
        <Link to="/">Go back</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Interactive Worksheet</h1>
      {data.sentences && data.sentences.map((item, idx) => (
        <div key={idx} style={{ marginBottom: "15px" }}>
          <p><b>Sentence:</b> {item.sentence}</p>
          {item.translation && <p><i>Translation:</i> {item.translation}</p>}
          {item.vocab && item.vocab.length > 0 && (
            <ul>
              {item.vocab.map((word, i) => <li key={i}>{word}</li>)}
            </ul>
          )}
        </div>
      ))}
      <Link to="/">← Back to Generator</Link>
    </div>
  );
}

export default WorksheetView;
