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
    padding: "0.25rem 0.5rem",
    margin: "0.25rem",
    border: "1px solid #333",
    borderRadius: "4px",
    backgroundColor: "#f0f0f0",
    cursor: "grab",
    display: "inline-block",
  };

  return (
    <span ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {text}
    </span>
  );
}

// Droppable blank component
function DroppableBlank({ id, content }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const style = {
    display: "inline-block",
    minWidth: "120px",
    borderBottom: "2px solid #000",
    margin: "0 4px",
    textAlign: "center",
    backgroundColor: isOver ? "#d1ffd1" : "transparent",
  };

  return <span ref={setNodeRef} style={style}>{content || "_______"}</span>;
}

function WorksheetPage() {
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
      const parts = item.sentence.split("_____"); // align with backend blank
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
    setBlanks((prev) =>
      prev.map((sent) => {
        if (sent.id !== sentId) return sent;
        const newBlanks = [...sent.blanks];
        newBlanks[blankIndex] = active.id;
        return { ...sent, blanks: newBlanks };
      })
    );

    setAvailableWords((prev) => prev.filter((w) => w !== active.id));
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Interactive Worksheet</h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Word Bank</h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div>
            {availableWords.map((word) => (
              <DraggableWord key={word} id={word} text={word} />
            ))}
          </div>

          <div className="mt-6">
            {blanks.map((sent) => (
              <div key={sent.id} className="mb-4">
                {sent.parts.map((part, i) => (
                  <React.Fragment key={i}>
                    <span>{part}</span>
                    {i < sent.blanks.length && (
                      <DroppableBlank
                        id={`${sent.id}:${i}`}
                        content={sent.blanks[i]}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
}

export default WorksheetPage;
