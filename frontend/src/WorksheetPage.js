// src/WorksheetPage.js
import React, { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./WorksheetPage.css";

function DraggableWord({ id, word }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "4px 8px",
    margin: "4px",
    backgroundColor: "#e0e0e0",
    borderRadius: "4px",
    cursor: "grab",
    display: "inline-block",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {word}
    </div>
  );
}

export default function WorksheetPage() {
  const [worksheet, setWorksheet] = useState([]);
  const [wordBank, setWordBank] = useState([]);
  const [bilingual, setBilingual] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const htmlData = localStorage.getItem("worksheetHTML");
    if (htmlData) {
      try {
        const parsed = JSON.parse(htmlData);
        setWorksheet(parsed.worksheet || []);
        setWordBank(parsed.word_bank || []);
        setBilingual(parsed.bilingual || false);
      } catch (err) {
        console.error("Failed to parse worksheet data:", err);
      }
    }
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const oldIndex = wordBank.indexOf(active.id);
    const newIndex = wordBank.indexOf(over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setWordBank(arrayMove(wordBank, oldIndex, newIndex));
    }
  };

  return (
    <div className="worksheet-page">
      <h1>Interactive Worksheet</h1>

      <div className="sentences">
        {worksheet.map((sentence, idx) => (
          <p key={idx} className="sentence">
            {sentence.map((token, i) =>
              token.blank ? (
                <span key={i} className="blank">______</span>
              ) : (
                <span key={i}>{token.text} </span>
              )
            )}
          </p>
        ))}
      </div>

      <h2>Word Bank</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={wordBank} strategy={rectSortingStrategy}>
          <div className="word-bank">
            {wordBank.map((word) => (
              <DraggableWord key={word} id={word} word={word} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
