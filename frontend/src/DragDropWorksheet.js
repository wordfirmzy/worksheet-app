// frontend/src/DragDropWorksheet.js
import React, { useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

// Draggable word component
function DraggableWord({ word }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: word });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    display: "inline-block",
    padding: "4px 8px",
    margin: "2px",
    border: "1px solid #333",
    borderRadius: "4px",
    cursor: "grab",
    backgroundColor: "#f0f0f0",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {word}
    </div>
  );
}

// Droppable blank component
function Blank({ id, placedWord }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <span
      ref={setNodeRef}
      style={{
        display: "inline-block",
        minWidth: "60px",
        borderBottom: "2px solid #333",
        margin: "0 4px",
        textAlign: "center",
        padding: "0 4px",
      }}
    >
      {placedWord || "____"}
    </span>
  );
}

// Main DragDropWorksheet component
export default function DragDropWorksheet({ worksheet, wordBank }) {
  // state: { blankId: word }
  const [placedWords, setPlacedWords] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over) {
      setPlacedWords((prev) => ({ ...prev, [over.id]: active.id }));
    }
  };

  // Render sentences, replacing blanks with Blank components
  const renderedSentences = worksheet.map((sentence, si) => {
    return (
      <p key={si}>
        {sentence.map((token, ti) => {
          if (token.blankId) {
            return (
              <Blank
                key={token.blankId}
                id={token.blankId}
                placedWord={placedWords[token.blankId]}
              />
            );
          }
          return <span key={ti}> {token.text} </span>;
        })}
      </p>
    );
  });

  return (
    <div>
      <h2>Drag and Drop Worksheet</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div>
          {renderedSentences}
        </div>

        <h3>Word Bank</h3>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {wordBank.map((word) => (
            <DraggableWord key={word} word={word} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}


