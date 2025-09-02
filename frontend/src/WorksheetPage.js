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

// --------------------
// Draggable Word
// --------------------
function DraggableWord({ id, text }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useDraggable({ id });

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

// --------------------
// Droppable Blank
// --------------------
function DroppableBlank({ id, content, isCorrect }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const style = {
    display: "inline-block",
    minWidth: "120px",
    borderBottom: "2px solid #000",
    margin: "0 4px",
    textAlign: "center",
    backgroundColor: isOver ? "#d1ffd1" : "transparent",
    color: isCorrect === true ? "green" : isCorrect === false ? "red" : "black",
    fontWeight: isCorrect !== null ? "bold" : "normal",
  };

  return <span ref={setNodeRef} style={style}>{content || "_______"}</span>;
}

// --------------------
// Worksheet Page
// --------------------
function WorksheetPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { worksheet, word_bank } = location.state || {};

  const [blanks, setBlanks] = useState([]);
  const [availableWords, setAvailableWords] = useState(word_bank || []);
  const [showAnswers, setShowAnswers] = useState(false);

  // Initialize blanked sentences
  useEffect(() => {
    if (!worksheet || !word_bank) {
      navigate("/"); // redirect home if no data
      return;
    }

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

        // If there is already a word in this blank, return it to the bank
        if (newBlanks[blankIndex]) {
          setAvailableWords((prevWords) => [...prevWords, newBlanks[blankIndex]]);
        }

        newBlanks[blankIndex] = active.id;
        newCorrectness[blankIndex] = null; // reset correctness
        return { ...sent, blanks: newBlanks, correctness: newCorrectness };
      })
    );

    setAvailableWords((prev) => prev.filter((w) => w !== active.id));
  };

  const checkAnswers = () => {
    setBlanks((prev) =>
      prev.map((sent) => {
        const newCorrectness = sent.blanks.map(
          (val, idx) => (val ? val === sent.answers[idx] : null)
        );
        return { ...sent, correctness: newCorrectness };
      })
    );
    setShowAnswers(true);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Interactive Worksheet</h2>

      <div className="mb-4">
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
                        isCorrect={showAnswers ? sent.correctness[i] : null}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </DndContext>
      </div>

      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={checkAnswers}
      >
        Check Answers
      </button>
    </div>
  );
}

export default WorksheetPage;
