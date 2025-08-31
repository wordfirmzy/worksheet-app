// src/WorksheetPage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "./SortableItem"; // You'll need a small component to handle each draggable

function WorksheetPage() {
  const [worksheet, setWorksheet] = useState([]);
  const [wordBank, setWordBank] = useState([]);
  const [bilingual, setBilingual] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const html = localStorage.getItem("worksheetJSON");
    if (!html) {
      // No worksheet in storage, go back
      navigate("/");
      return;
    }

    const data = JSON.parse(html);
    setWorksheet(data.worksheet || []);
    setWordBank(data.word_bank || []);
    setBilingual(data.bilingual || false);
  }, [navigate]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const oldIndex = wordBank.findIndex((w) => w.id === active.id);
    const newIndex = wordBank.findIndex((w) => w.id === over.id);

    setWordBank((items) => arrayMove(items, oldIndex, newIndex));
  };

  const handleDrop = (sentenceIndex, word) => {
    setWorksheet((ws) =>
      ws.map((s, i) => {
        if (i !== sentenceIndex) return s;
        // Fill the first empty blank
        const blanks = [...s.blanks];
        const firstEmpty = blanks.findIndex((b) => !b.word);
        if (firstEmpty === -1) return s;
        blanks[firstEmpty].word = word.text;
        blanks[firstEmpty].correct = blanks[firstEmpty].answer === word.text;
        return { ...s, blanks };
      })
    );
  };

  if (!worksheet.length) return <div>Loading worksheet...</div>;

  return (
    <div className="worksheet-page">
      <h1>Interactive Worksheet</h1>
      {worksheet.map((sentence, idx) => (
        <div key={idx} className="sentence-block">
          {sentence.blanks.map((blank, bIdx) => (
            <span key={bIdx} className={`blank ${blank.correct === true ? "correct" : blank.correct === false ? "wrong" : ""}`}>
              {blank.word || "_____"}
            </span>
          ))}
          <span className="original-sentence">
            {bilingual ? ` (${sentence.original})` : ""}
          </span>
        </div>
      ))}

      <h2>Word Bank</h2>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={wordBank} strategy={verticalListSortingStrategy}>
          {wordBank.map((word) => (
            <SortableItem key={word.id} id={word.id} word={word.text} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default WorksheetPage;
