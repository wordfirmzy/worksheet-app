import React, { useState, useEffect } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "./SortableItem"; // small component for draggable word

function WorksheetPage() {
  const [worksheet, setWorksheet] = useState([]);
  const [wordBank, setWordBank] = useState([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("worksheetData") || "{}");
    setWorksheet(data.worksheet || []);
    setWordBank(data.word_bank || []);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWordBank((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div>
      <h1>Drag-and-Drop Worksheet</h1>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={wordBank} strategy={verticalListSortingStrategy}>
          <div className="word-bank">
            {wordBank.map((word) => (
              <SortableItem key={word} id={word} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="worksheet">
        {worksheet.map((sentence, idx) => (
          <p key={idx}>{sentence}</p>
        ))}
      </div>
    </div>
  );
}

export default WorksheetPage;
