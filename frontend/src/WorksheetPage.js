import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// Draggable word component
function DraggableWord({ id, text }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "0.5rem 1rem",
    margin: "0.25rem",
    border: "1px solid #555",
    borderRadius: "8px",
    backgroundColor: "#4f46e5",
    color: "white",
    cursor: "grab",
    display: "inline-block",
    fontWeight: 500,
    userSelect: "none",
  };

  return (
    <span ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {text}
    </span>
  );
}

// Droppable blank component
function DroppableBlank({ id, content, isChinese }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const style = {
    display: "inline-block",
    minWidth: "140px",
    borderBottom: "2px solid #000",
    margin: "0 4px",
    textAlign: "center",
    backgroundColor: isOver ? "#d1ffd1" : "transparent",
    padding: "0.25rem",
    borderRadius: "4px",
    fontStyle: isChinese ? "italic" : "normal",
    color: isChinese ? "#b91c1c" : "#000",
  };

  return <span ref={setNodeRef} style={style}>{content || "_______"}</span>;
}

export default function WorksheetPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { worksheet, word_bank } = location.state || {};

  const [blanks, setBlanks] = useState([]);
  const [availableWords, setAvailableWords] = useState(word_bank || []);

  useEffect(() => {
    if (!worksheet || !word_bank) {
      navigate("/"); // redirect home if no data
      return;
    }

    // Transform sentences into parts and blank placeholders
    const blankedSentences = worksheet.map((item, i) => {
      // Detect Chinese chars for styling
      const parts = item.sentence.split("_____").map(part => ({
        text: part,
        isChinese: /[\u4e00-\u9fff]/.test(part),
      }));
      return {
        id: `sent-${i}`,
        parts,
        blanks: Array(parts.length - 1).fill(null),
      };
    });
    setBlanks(blankedSentences);
  }, [worksheet, word_bank, navigate]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const [sentId, blankIndex] = over.id.split(":");
    let placed = false;

    // Check if dropping onto a blank
    setBlanks((prev) =>
      prev.map((sent) => {
        if (sent.id !== sentId) return sent;
        const newBlanks = [...sent.blanks];
        // Remove word from previous blank if it exists
        prev.forEach((s) => {
          s.blanks.forEach((b, idx) => {
            if (b === active.id) newBlanks[idx] = null;
          });
        });
        newBlanks[blankIndex] = active.id;
        placed = true;
        return { ...sent, blanks: newBlanks };
      })
    );

    // Remove from available words if placed on a blank
    if (placed) {
      setAvailableWords((prev) => prev.filter((w) => w !== active.id));
    }
  };

  return (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold mb-6">Interactive Worksheet</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-col md:flex-row gap-8 w-full justify-center">

          {/* Word Bank */}
          <div className="flex-1 p-4 border rounded-lg shadow-lg bg-white max-w-sm">
            <h3 className="font-semibold mb-2 text-center">Word Bank</h3>
            <div className="flex flex-wrap justify-center">
              {availableWords.map((word) => (
                <DraggableWord key={word} id={word} text={word} />
              ))}
            </div>
          </div>

          {/* Worksheet */}
          <div className="flex-2 p-4 border rounded-lg shadow-lg bg-white max-w-3xl">
            {blanks.map((sent) => (
              <div key={sent.id} className="mb-4 text-lg">
                {sent.parts.map((part, i) => (
                  <React.Fragment key={i}>
                    <span style={{ fontStyle: part.isChinese ? "italic" : "normal", color: part.isChinese ? "#b91c1c" : "#000" }}>
                      {part.text}
                    </span>
                    {i < sent.blanks.length && (
                      <DroppableBlank id={`${sent.id}:${i}`} content={sent.blanks[i]} isChinese={false} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>

        </div>
      </DndContext>
    </div>
  );
}
