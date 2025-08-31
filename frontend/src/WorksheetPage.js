import React, { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./WorksheetPage.css";

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: "1px solid #ccc",
    padding: "4px 8px",
    margin: "4px",
    backgroundColor: "#f9f9f9",
    cursor: "grab",
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default function WorksheetPage() {
  const [worksheet, setWorksheet] = useState([]);
  const [wordBank, setWordBank] = useState([]);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const stored = localStorage.getItem("worksheetData");
    if (stored) {
      const data = JSON.parse(stored);
      setWorksheet(data.worksheet);
      setWordBank(data.word_bank);
    } else {
      window.location.href = "/";
    }
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const oldIndex = wordBank.indexOf(active.id);
    const newIndex = wordBank.indexOf(over.id);
    if (oldIndex !== newIndex) {
      setWordBank(arrayMove(wordBank, oldIndex, newIndex));
    }
  };

  return (
    <div className="worksheet-page">
      <h1>Drag-and-Drop Worksheet</h1>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={wordBank} strategy={verticalListSortingStrategy}>
          <div className="word-bank">
            <h2>Word Bank</h2>
            {wordBank.map((word) => (
              <SortableItem key={word} id={word}>
                {word}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="worksheet-sentences">
        <h2>Sentences</h2>
        {worksheet.map((sentence, idx) => (
          <p key={idx}>
            {sentence.map((token, tidx) =>
              token.blank ? <span className="blank">____</span> : token.text
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
