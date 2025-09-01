// src/WorksheetPage.js
import React, { useState, useEffect } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./WorksheetPage.css";

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: "1px solid #ccc",
    padding: "4px 8px",
    marginBottom: "4px",
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

  useEffect(() => {
    const htmlData = JSON.parse(localStorage.getItem("worksheetHTML"));
    if (htmlData) {
      setWorksheet(htmlData.worksheet);
      setWordBank(htmlData.word_bank);
    }
  }, []);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setWordBank((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="worksheet-page">
      <h1>Interactive Worksheet</h1>
      <div className="worksheet-container">
        <div className="sentences">
          {worksheet.map((sentence, idx) => (
            <div key={idx} className="sentence">
              {sentence}
            </div>
          ))}
        </div>
        <div className="word-bank">
          <h2>Word Bank</h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={wordBank} strategy={verticalListSortingStrategy}>
              {wordBank.map((word) => (
                <SortableItem key={word} id={word}>
                  {word}
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

