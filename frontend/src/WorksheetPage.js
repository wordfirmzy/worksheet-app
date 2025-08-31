// WorksheetPage.js
import React, { useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "./SortableItem"; // we'll create this next

function WorksheetPage() {
  const [worksheet, setWorksheet] = useState([]);
  const [wordBank, setWordBank] = useState([]);
  const [bilingual, setBilingual] = useState(false);
  const [completed, setCompleted] = useState({}); // track filled blanks

  useEffect(() => {
    const stored = localStorage.getItem("worksheetHTML");
    if (stored) {
      const data = JSON.parse(stored);
      setWorksheet(data.worksheet || []);
      setWordBank(data.word_bank || []);
      setBilingual(data.bilingual || false);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWordBank((prev) => {
        const oldIndex = prev.indexOf(active.id);
        const newIndex = prev.indexOf(over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleDrop = (blankId, word) => {
    setCompleted((prev) => ({ ...prev, [blankId]: word }));
  };

  return (
    <div>
      <h1>Interactive Worksheet</h1>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div>
          <h2>Word Bank</h2>
          <SortableContext items={wordBank} strategy={verticalListSortingStrategy}>
            {wordBank.map((word) => (
              <SortableItem key={word} id={word} />
            ))}
          </SortableContext>
        </div>

        <div>
          <h2>Sentences</h2>
          {worksheet.map((sentence, sIdx) => (
            <p key={sIdx}>
              {sentence.map((token, tIdx) => {
                if (token.is_blank) {
                  const filled = completed[token.blankId] || "";
                  return (
                    <span
                      key={tIdx}
                      style={{ borderBottom: "1px solid black", padding: "0 5px", margin: "0 2px" }}
                      onClick={() => {
                        const chosenWord = window.prompt("Enter word for this blank:", filled);
                        if (chosenWord) handleDrop(token.blankId, chosenWord);
                      }}
                    >
                      {filled || "____"}
                    </span>
                  );
                } else {
                  return <span key={tIdx}>{token.text} </span>;
                }
              })}
            </p>
          ))}
        </div>
      </DndContext>
    </div>
  );
}

export default WorksheetPage;
