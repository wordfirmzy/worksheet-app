import React, { useEffect, useState } from "react";
import { DndContext, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import "./WorksheetPage.css";

function WorksheetPage() {
  const [worksheet, setWorksheet] = useState([]);
  const [wordBank, setWordBank] = useState([]);
  const [bilingual, setBilingual] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("worksheetData"));
    if (data) {
      setWorksheet(data.worksheet);
      setWordBank(data.word_bank);
      setBilingual(data.bilingual);
    }
  }, []);

  const sensors = useSensors(useSensor(PointerSensor));

  // TODO: Implement drag-and-drop logic per sentence blanks
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    // Simplified example: swap positions in wordBank
    const oldIndex = wordBank.indexOf(active.id);
    const newIndex = wordBank.indexOf(over.id);
    setWordBank(arrayMove(wordBank, oldIndex, newIndex));
  };

  return (
    <div className="worksheet-page">
      <h1>Interactive Worksheet</h1>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="sentences">
          {worksheet.map((sentence, idx) => (
            <p key={idx} dangerouslySetInnerHTML={{ __html: sentence }}></p>
          ))}
        </div>
        <div className="word-bank">
          <h2>Word Bank</h2>
          <ul>
            {wordBank.map((word) => (
              <li key={word} id={word}>
                {word}
              </li>
            ))}
          </ul>
        </div>
      </DndContext>
    </div>
  );
}

export default WorksheetPage;

