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

const CHINESE_RE = /[\u4e00-\u9fff]/;

// Draggable word
function DraggableWord({ id, text }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "0.5rem 1rem",
    margin: "0.25rem",
    borderRadius: "8px",
    backgroundColor: "#fef3c7",
    border: "1px solid #fbbf24",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    cursor: "grab",
    display: "inline-block",
    fontWeight: "bold",
    userSelect: "none",
  };
  return <span ref={setNodeRef} style={style} {...attributes} {...listeners}>{text}</span>;
}

// Droppable blank
function DroppableBlank({ id, content, onDrop, isCorrect, bilingual }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const style = {
    display: "inline-block",
    minWidth: "140px",
    padding: "0.25rem 0.5rem",
    margin: "0 4px",
    borderBottom: "3px solid #000",
    borderRadius: "4px",
    textAlign: "center",
    backgroundColor: isOver ? "#d1ffd1" : "#fff",
    color: isCorrect === true ? "green" : isCorrect === false ? "red" : "black",
    fontWeight: isCorrect !== null ? "bold" : "normal",
    boxShadow: isOver ? "0 0 8px rgba(0,0,0,0.2)" : "none",
  };

  return (
    <span ref={setNodeRef} style={style} onClick={() => onDrop(id, null)}>
      {content || "_______"}
    </span>
  );
}

// Sentence renderer with bilingual styling
function SentencePart({ text, bilingual }) {
  if (!bilingual) return <span>{text}</span>;

  // Split by Chinese characters
  const parts = text.split(CHINESE_RE);
  const matches = text.match(CHINESE_RE) || [];
  let rendered = [];
  let i = 0;

  for (const part of parts) {
    if (part) rendered.push(<span key={`eng-${i}`}>{part}</span>);
    if (matches[i]) rendered.push(
      <span key={`chn-${i}`} style={{ backgroundColor: "#f0f0f0", borderRadius: "4px", padding: "0 2px" }}>
        {matches[i]}
      </span>
    );
    i++;
  }

  return <>{rendered}</>;
}

// Main WorksheetPage
function WorksheetPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { worksheet, word_bank, bilingual } = location.state || {};

  const [blanks, setBlanks] = useState([]);
  const [availableWords, setAvailableWords] = useState(word_bank || []);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    if (!worksheet || !word_bank) { navigate("/"); return; }

    const blankedSentences = worksheet.map((item, i) => {
      const parts = item.sentence.split("_____");
      return {
        id: `sent-${i}`,
        parts,
        blanks: Array(parts.length - 1).fill(null),
        answers: Array(parts.length - 1).fill(item.answer),
        correctness: Array(parts.length - 1).fill(null),
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
        const newCorrectness = [...sent.correctness];

        // Return existing word to bank if replacing
        if (newBlanks[blankIndex]) setAvailableWords((prevWords) => [...prevWords, newBlanks[blankIndex]]);

        newBlanks[blankIndex] = active.id;
        newCorrectness[blankIndex] = null;
        return { ...sent, blanks: newBlanks, correctness: newCorrectness };
      })
    );

    // Remove dragged word from bank
    setAvailableWords((prev) => prev.filter((w) => w !== active.id));
  };

  const removeWordFromBlank = (blankId) => {
    const [sentId, blankIndex] = blankId.split(":");
    setBlanks((prev) =>
      prev.map((sent) => {
        if (sent.id !== sentId) return sent;
        const newBlanks = [...sent.blanks];
        const removedWord = newBlanks[blankIndex];
        if (removedWord) setAvailableWords((prev) => [...prev, removedWord]);
        newBlanks[blankIndex] = null;
        return { ...sent, blanks: newBlanks };
      })
    );
  };

  const checkAnswers = () => {
    setBlanks((prev) =>
      prev.map((sent) => {
        const newCorrectness = sent.blanks.map((val, idx) => (val ? val === sent.answers[idx] : null));
        return { ...sent, correctness: newCorrectness };
      })
    );
    setShowAnswers(true);
  };

  return (
    <div className="flex justify-center py-6">
      <div className="max-w-3xl w-full space-y-6">

        {/* Word Bank */}
        <div className="border rounded-lg p-4 shadow-md">
          <h3 className="font-semibold mb-2 text-center">Word Bank</h3>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex flex-wrap justify-center gap-2">
              {availableWords.map((word) => (
                <DraggableWord key={word} id={word} text={word} />
              ))}
            </div>
          </DndContext>
        </div>

        {/* Worksheet */}
        <div className="border rounded-lg p-4 shadow-md">
          <h3 className="font-semibold mb-2 text-center">Worksheet</h3>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              {blanks.map((sent) => (
                <div key={sent.id}>
                  {sent.parts.map((part, i) => (
                    <React.Fragment key={i}>
                      <SentencePart text={part} bilingual={bilingual} />
                      {i < sent.blanks.length && (
                        <DroppableBlank
                          id={`${sent.id}:${i}`}
                          content={sent.blanks[i]}
                          isCorrect={showAnswers ? sent.correctness[i] : null}
                          onDrop={removeWordFromBlank}
                          bilingual={bilingual}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </DndContext>

          {/* Check answers button */}
          <div className="text-center mt-6">
            <button
              className="px-6 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition"
              onClick={checkAnswers}
            >
              Check Answers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorksheetPage;
