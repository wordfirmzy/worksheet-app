import React, { useState, useEffect } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "./SortableItem";

function WorksheetPage() {
  const [worksheet, setWorksheet] = useState([]);      // sentences with blanks
  const [wordBank, setWordBank] = useState([]);        // remaining words
  const [placedWords, setPlacedWords] = useState({});  // sentenceIndex -> array of placed words
  const [feedback, setFeedback] = useState({});        // sentenceIndex -> array of correctness

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("worksheetData") || "{}");
    setWorksheet(data.worksheet || []);
    setWordBank(data.word_bank || []);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    // Only allow dropping into a blank placeholder
    const target = over.id.split("-"); // format: "s{sentenceIndex}-b{blankIndex}"
    if (target[0].startsWith("s") && target[1].startsWith("b")) {
      const sentenceIndex = parseInt(target[0].slice(1));
      const blankIndex = parseInt(target[1].slice(1));

      setPlacedWords((prev) => {
        const updated = { ...prev };
        if (!updated[sentenceIndex]) updated[sentenceIndex] = [];
        updated[sentenceIndex][blankIndex] = active.id;
        return updated;
      });

      // Remove from word bank
      setWordBank((prev) => prev.filter((w) => w !== active.id));

      // Check correctness
      const correctWord = worksheet[sentenceIndex].blanks[blankIndex];
      setFeedback((prev) => {
        const updated = { ...prev };
        if (!updated[sentenceIndex]) updated[sentenceIndex] = [];
        updated[sentenceIndex][blankIndex] = active.id === correctWord;
        return updated;
      });
    }
  };

  const renderSentence = (sentenceObj, idx) => {
    const parts = sentenceObj.parts.map((part, bIdx) => {
      if (part.isBlank) {
        const placed = placedWords[idx]?.[bIdx];
        const correct = feedback[idx]?.[bIdx];
        return (
          <span
            key={bIdx}
            id={`s${idx}-b${bIdx}`}
            className={`blank ${correct === true ? "correct" : correct === false ? "incorrect" : ""}`}
          >
            {placed || "__________"}
          </span>
        );
      } else {
        return <span key={bIdx}>{part.text}</span>;
      }
    });
    return <p key={idx}>{parts}</p>;
  };

  return (
    <div>
      <h1>Interactive Worksheet</h1>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={wordBank} strategy={verticalListSortingStrategy}>
          <div className="word-bank">
            <h3>Word Bank</h3>
            {wordBank.map((word) => (
              <SortableItem key={word} id={word} />
            ))}
          </div>
        </SortableContext>
        <div className="worksheet">
          {worksheet.map((s, idx) => renderSentence(s, idx))}
        </div>
      </DndContext>
    </div>
  );
}

export default WorksheetPage;
