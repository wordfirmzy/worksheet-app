import React, { useState, useEffect } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";

// -----------------
// Draggable word
// -----------------
function DraggableWord({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    padding: "4px 8px",
    margin: "4px",
    backgroundColor: "#4caf50",
    color: "#fff",
    borderRadius: "4px",
    display: "inline-block",
    cursor: "grab",
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

// -----------------
// Droppable blank
// -----------------
function DroppableBlank({ id, value, onDrop, correctWord }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const style = {
    minWidth: "80px",
    minHeight: "30px",
    margin: "0 4px",
    padding: "4px",
    border: "2px dashed #999",
    backgroundColor: isOver ? "#f0f0f0" : "#fff",
    display: "inline-block",
    verticalAlign: "middle",
    textAlign: "center",
  };

  let feedbackColor = "";
  if (value) {
    feedbackColor = value === correctWord ? "#d4edda" : "#f8d7da";
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: feedbackColor }}
      onDrop={(e) => onDrop(id, e)}
    >
      {value || "_"}
    </div>
  );
}

// -----------------
// Main component
// -----------------
export default function DragDropWorksheet({ worksheet, wordBank }) {
  // worksheet: array of sentences with blanks
  // wordBank: array of words
  const [placedWords, setPlacedWords] = useState({});
  const [activeWord, setActiveWord] = useState(null);

  useEffect(() => {
    // reset when new worksheet is loaded
    setPlacedWords({});
  }, [worksheet]);

  const handleDragStart = (event) => {
    setActiveWord(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { over } = event;
    if (over) {
      setPlacedWords((prev) => ({
        ...prev,
        [over.id]: activeWord,
      }));
    }
    setActiveWord(null);
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        <h2>Word Bank</h2>
        <div>
          {wordBank.map((word) => (
            <DraggableWord key={word} id={word}>
              {word}
            </DraggableWord>
          ))}
        </div>

        <h2>Sentences</h2>
        <div>
          {worksheet.map((sentence, si) => (
            <p key={si}>
              {sentence.words.map((word, wi) =>
                word.isBlank ? (
                  <DroppableBlank
                    key={wi}
                    id={`s${si}w${wi}`}
                    value={placedWords[`s${si}w${wi}`]}
                    onDrop={() => {}}
                    correctWord={word.correct}
                  />
                ) : (
                  <span key={wi}>{word.text} </span>
                )
              )}
            </p>
          ))}
        </div>

        <DragOverlay>
          {activeWord ? (
            <div style={{ padding: "4px 8px", backgroundColor: "#4caf50", color: "#fff" }}>
              {activeWord}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

