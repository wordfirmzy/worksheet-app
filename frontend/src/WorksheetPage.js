import React, { useEffect, useState } from "react";

function WorksheetPage() {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("worksheetHTML");
    if (stored) setHtml(stored);
  }, []);

  return (
    <div className="worksheet-page">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export default WorksheetPage;
