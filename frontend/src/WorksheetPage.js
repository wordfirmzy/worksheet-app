import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function DraggableWord({ id, text }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
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

    // Replace blanks with objects for drag-and-drop
    const blankedSentences = worksheet.map((sentence, i) => {
      const parts = sentence.split("________________________");
      return {
        id: `sent-${i}`,
        parts,
        blanks: Array(parts.length - 1).fill(null),
      };
    });
    setBlanks(blankedSentences);
  }, [worksheet, word_bank, navigate]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDrop = (wordId, sentenceId, blankIndex) => {
    setBlanks((prev) =>
      prev.map((sent) => {
        if (sent.id !== sentenceId) return sent;
        const newBlanks = [...sent.blanks];
        newBlanks[blankIndex] = wordId;
        return { ...sent, blanks: newBlanks };
      })
    );

    // Remove from available words
    setAvailableWords((prev) => prev.filter((w) => w !== wordId));
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Interactive Worksheet</h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Word Bank</h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter}>
          <SortableContext items={availableWords} strategy={verticalListSortingStrategy}>
            <div>
              {availableWords.map((word) => (
                <DraggableWord key={word} id={word} text={word} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div>
        {blanks.map((sent) => (
          <div key={sent.id} className="mb-4">
            {sent.parts.map((part, i) => (
              <React.Fragment key={i}>
                <span>{part}</span>
                {i < sent.blanks.length && (
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: "120px",
                      borderBottom: "2px solid #000",
                      margin: "0 4px",
                      textAlign: "center",
                    }}
                  >
                    {sent.blanks[i] || "_______"}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorksheetPage;
