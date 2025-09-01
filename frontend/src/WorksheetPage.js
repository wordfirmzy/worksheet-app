// src/WorksheetPage.js
import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import "./WorksheetPage.css";

// Draggable word bank item
function Word({ id }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "6px 10px",
    margin: "4px",
    backgroundColor: "#f0f0f0",
    border: "1px solid #ccc",
    borderRadius: "6px",
    cursor: "grab",
    display: "inline-block",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {id}
    </div>
  );
}

// Droppable blank
function Blank({ id, filledWord, correctWord }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    minWidth: "100px",
    minHeight: "30px",
    margin: "2px",
    border: "2px dashed #aaa",
    borderRadius: "4px",
    backgroundColor: filledWord
      ? filledWord === correctWord
        ? "#d4edda"
        : "#f8d7da"
      : "#fff",
    textAlign: "center",
    lineHeight: "30px",
    fontWeight: "bold",
    cursor: isDragging ? "grabbing" : "pointer",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {filledWord || "____"}
    </div>
  );
}

export default function WorksheetPage({ worksheet, wordBank, bilingual, onBack }) {
  // Track which blanks have which words
  const [blanks, setBlanks] = useState(
    worksheet.flatMap((sentence, sIndex) => {
      const count = (sentence.match(/____/g) || []).length;
      return Array.from({ length: count }, (_, i) => ({
        id: `s${sIndex}_b${i}`,
        sentenceIndex: sIndex,
        correctWord: null, // we’ll update later if needed
        filledWord: null,
      }));
    })
  );

  const [availableWords, setAvailableWords] = useState(wordBank);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    // Dragging a word onto a blank
    if (availableWords.includes(active.id) && over.id.startsWith("s")) {
      setBlanks((prev) =>
        prev.map((blank) =>
          blank.id === over.id ? { ...blank, filledWord: active.id } : blank
        )
      );
      setAvailableWords((prev) => prev.filter((w) => w !== active.id));
    }

    // Dragging a word back to the bank
    if (active.id.startsWith("s") && over.id === "word-bank") {
      const draggedBlank = blanks.find((b) => b.id === active.id);
      if (draggedBlank?.filledWord) {
        setAvailableWords((prev) => [...prev, draggedBlank.filledWord]);
        setBlanks((prev) =>
          prev.map((blank) =>
            blank.id === active.id ? { ...blank, filledWord: null } : blank
          )
        );
      }
    }
  };

  // Render sentence with blanks replaced by droppables
  const renderSentence = (sentence, sIndex) => {
    let parts = sentence.split("____");
    let result = [];

    parts.forEach((part, i) => {
      result.push(<span key={`p${i}`}>{part}</span>);
      if (i < parts.length - 1) {
        const blank = blanks.find((b) => b.sentenceIndex === sIndex && b.id.includes(`b${i}`));
        result.push(
          <Blank
            key={blank.id}
            id={blank.id}
            filledWord={blank.filledWord}
            correctWord={blank.correctWord}
          />
        );
      }
    });

    return <div style={{ marginBottom: "1rem" }}>{result}</div>;
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <button onClick={onBack} style={{ marginBottom: "1rem" }}>
        ← Back
      </button>
      <h2>Drag-and-Drop Worksheet</h2>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Sentences */}
        {worksheet.map((sentence, sIndex) => (
          <div key={sIndex}>{renderSentence(sentence, sIndex)}</div>
        ))}

        {/* Word Bank */}
        <div style={{ marginTop: "2rem" }}>
          <h3>Word Bank</h3>
          <SortableContext items={availableWords} strategy={verticalListSortingStrategy}>
            <div
              id="word-bank"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                padding: "1rem",
                border: "2px solid #ccc",
                borderRadius: "8px",
                minHeight: "60px",
              }}
            >
              {availableWords.map((word) => (
                <Word key={word} id={word} />
              ))}
            </div>
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}
