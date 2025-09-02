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
function DroppableBlank({ id, content, status }) {
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
    fontWeight: 500,
    color: status === "correct" ? "green" : status === "incorrect" ? "red" : "#000",
  };

  return <span ref={setNodeRef} style={style}>{content || "_______"}</span>;
}

export default function WorksheetPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { worksheet, word_bank } = location.state || {};

  const [blanks, setBlanks] = useState([]);
  const [availableWords, setAvailableWords] = useState(word_bank || []);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!worksheet || !word_bank) {
      navigate("/"); // redirect home if no data
      return;
    }

    const blankedSentences = worksheet.map((item, i) => {
      const parts = item.sentence.split("_____").map(part => ({
        text: part,
        isChinese: /[\u4e00-\u9fff]/.test(part),
      }));
      return {
        id: `sent-${i}`,
        parts,
        blanks: Array(parts.length - 1).fill(null),
        answers: item.answer ? [item.answer] : Array(parts.length - 1).fill(null),
        status: Array(parts.length - 1).fill(null),
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

        // Remove word from any blank that has it
        prev.forEach((s) => {
          s.blanks.forEach((b, idx) => {
            if (b === active.id) s.blanks[idx] = null;
          });
        });

        newBlanks[blankIndex] = active.id;
        return { ...sent, blanks: newBlanks };
      })
    );

    setAvailableWords((prev) => prev.filter((w) => w !== active.id));
  };

  const handleCheckAnswers = () => {
    setBlanks((prev) =>
      prev.map((sent) => {
        const newStatus = sent.blanks.map((b, i) =>
          b === sent.answers[i] ? "correct" : "incorrect"
        );
        return { ...sent, status: newStatus };
      })
    );
    setChecked(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100">
      <h2 className="text-2xl font-bold mb-6">Interactive Worksheet</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-col md:flex-row gap-8 justify-center w-full">

          {/* Word Bank */}
          <div className="flex-1 p-4 border rounded-lg shadow-lg bg-white max-w-sm flex flex-col items-center">
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
                      <DroppableBlank
                        id={`${sent.id}:${i}`}
                        content={sent.blanks[i]}
                        status={sent.status[i]}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ))}
            <button
              onClick={handleCheckAnswers}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Check Answers
            </button>
            {checked && <p className="mt-2 text-gray-700">Correct answers are highlighted in green, incorrect in red.</p>}
          </div>

        </div>
      </DndContext>
    </div>
  );
}
