"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Direction = "across" | "down";
type Cell = { row: number; col: number };
type Clue = {
  number: number;
  direction: Direction;
  answer: string;
  clue: string;
  cells: Cell[];
};

const solution = [
  ["C", "R", "E", "M", "E"],
  ["H", "I", "#", "A", "N"],
  ["A", "G", "E", "N", "T"],
  ["O", "H", "#", "O", "R"],
  ["S", "T", "O", "R", "Y"],
];

const initialGrid = solution.map((row) =>
  row.map((cell) => (cell === "#" ? "#" : "")),
);

const span = (
  direction: Direction,
  number: number,
  answer: string,
  clue: string,
  row: number,
  col: number,
): Clue => ({
  direction,
  number,
  answer,
  clue,
  cells: [...answer].map((_, index) => ({
    row: row + (direction === "down" ? index : 0),
    col: col + (direction === "across" ? index : 0),
  })),
});

const clues: Clue[] = [
  span("across", 1, "CREME", "___ de la crème: the very best", 0, 0),
  span("across", 5, "HI", "A chatbot’s friendly opener", 1, 0),
  span("across", 6, "AN", "Article before “algorithm”", 1, 3),
  span("across", 7, "AGENT", "AI that plans and acts toward a goal", 2, 0),
  span("across", 8, "OH", "Reaction to a surprisingly human reply", 3, 0),
  span("across", 9, "OR", "Logic operator paired with AND", 3, 3),
  span("across", 10, "STORY", "What a creative model might spin", 4, 0),
  span("down", 1, "CHAOS", "State a vague prompt can leave things in", 0, 0),
  span("down", 2, "RIGHT", "Direction the cursor moves after a letter", 0, 1),
  span("down", 3, "MANOR", "Grand house — or a convincing AI backdrop", 0, 3),
  span("down", 4, "ENTRY", "One item in a dataset or form", 0, 4),
];

const cellNumbers: Record<string, number> = {
  "0-0": 1,
  "0-1": 2,
  "0-3": 3,
  "0-4": 4,
  "1-0": 5,
  "1-3": 6,
  "2-0": 7,
  "3-0": 8,
  "3-3": 9,
  "4-0": 10,
};

const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const storageKey = "neural-mini-progress";

const keyFor = ({ row, col }: Cell) => `${row}-${col}`;

export default function Home() {
  const [grid, setGrid] = useState(initialGrid);
  const [selected, setSelected] = useState<Cell>({ row: 0, col: 0 });
  const [direction, setDirection] = useState<Direction>("across");
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set());
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [toast, setToast] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[][];
        if (parsed.length === 5 && parsed.every((row) => row.length === 5)) {
          setGrid(parsed);
        }
      }
    } catch {
      // A fresh puzzle is a perfectly good fallback.
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(grid));
    } catch {
      // Progress saving is an optional enhancement.
    }
  }, [grid]);

  const clueList = useMemo(
    () => clues.filter((clue) => clue.direction === direction),
    [direction],
  );

  const currentClue = useMemo(() => {
    const inDirection = clues.find(
      (clue) =>
        clue.direction === direction &&
        clue.cells.some(
          (cell) => cell.row === selected.row && cell.col === selected.col,
        ),
    );
    return (
      inDirection ??
      clues.find((clue) =>
        clue.cells.some(
          (cell) => cell.row === selected.row && cell.col === selected.col,
        ),
      ) ??
      clues[0]
    );
  }, [direction, selected]);

  const activeKeys = useMemo(
    () => new Set(currentClue.cells.map((cell) => keyFor(cell))),
    [currentClue],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }, []);

  useEffect(() => {
    const solved = solution.every((row, rowIndex) =>
      row.every(
        (answer, colIndex) =>
          answer === "#" || grid[rowIndex][colIndex] === answer,
      ),
    );
    if (solved && !complete) {
      setRunning(false);
      window.setTimeout(() => setComplete(true), 180);
    }
  }, [complete, grid]);

  const moveWithinClue = useCallback(
    (offset: number, clear = false) => {
      const index = currentClue.cells.findIndex(
        (cell) => cell.row === selected.row && cell.col === selected.col,
      );
      const nextIndex = Math.min(
        currentClue.cells.length - 1,
        Math.max(0, index + offset),
      );
      const next = currentClue.cells[nextIndex];
      setSelected(next);
      if (clear) {
        setGrid((previous) => {
          const updated = previous.map((row) => [...row]);
          updated[next.row][next.col] = "";
          return updated;
        });
      }
    },
    [currentClue, selected],
  );

  const enterLetter = useCallback(
    (letter: string) => {
      const normalized = letter.toUpperCase();
      if (!/^[A-Z]$/.test(normalized)) return;
      setWrongCells((previous) => {
        const next = new Set(previous);
        next.delete(keyFor(selected));
        return next;
      });
      setGrid((previous) => {
        const updated = previous.map((row) => [...row]);
        updated[selected.row][selected.col] = normalized;
        return updated;
      });
      moveWithinClue(1);
    },
    [moveWithinClue, selected],
  );

  const backspace = useCallback(() => {
    if (grid[selected.row][selected.col]) {
      setGrid((previous) => {
        const updated = previous.map((row) => [...row]);
        updated[selected.row][selected.col] = "";
        return updated;
      });
      setWrongCells((previous) => {
        const next = new Set(previous);
        next.delete(keyFor(selected));
        return next;
      });
    } else {
      moveWithinClue(-1, true);
    }
  }, [grid, moveWithinClue, selected]);

  const moveSpatially = useCallback(
    (rowDelta: number, colDelta: number) => {
      let row = selected.row + rowDelta;
      let col = selected.col + colDelta;
      while (row >= 0 && row < 5 && col >= 0 && col < 5) {
        if (solution[row][col] !== "#") {
          setSelected({ row, col });
          setDirection(rowDelta === 0 ? "across" : "down");
          return;
        }
        row += rowDelta;
        col += colDelta;
      }
    },
    [selected],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (complete) return;
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        enterLetter(event.key);
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        backspace();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSpatially(0, -1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSpatially(0, 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSpatially(-1, 0);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSpatially(1, 0);
      } else if (event.key === " ") {
        event.preventDefault();
        setDirection((value) => (value === "across" ? "down" : "across"));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [backspace, complete, enterLetter, moveSpatially]);

  const selectCell = (row: number, col: number) => {
    if (solution[row][col] === "#") return;
    if (selected.row === row && selected.col === col) {
      const hasOtherDirection = clues.some(
        (clue) =>
          clue.direction !== direction &&
          clue.cells.some((cell) => cell.row === row && cell.col === col),
      );
      if (hasOtherDirection) {
        setDirection((value) => (value === "across" ? "down" : "across"));
      }
    } else {
      const supportsDirection = clues.some(
        (clue) =>
          clue.direction === direction &&
          clue.cells.some((cell) => cell.row === row && cell.col === col),
      );
      if (!supportsDirection) {
        setDirection((value) => (value === "across" ? "down" : "across"));
      }
      setSelected({ row, col });
    }
  };

  const changeClue = (offset: number) => {
    const index = clueList.findIndex(
      (clue) => clue.number === currentClue.number,
    );
    const next = clueList[(index + offset + clueList.length) % clueList.length];
    setSelected(next.cells[0]);
  };

  const checkPuzzle = () => {
    const wrong = new Set<string>();
    let entered = 0;
    grid.forEach((row, rowIndex) =>
      row.forEach((cell, colIndex) => {
        if (cell && cell !== "#") entered += 1;
        if (
          cell &&
          cell !== "#" &&
          cell !== solution[rowIndex][colIndex]
        ) {
          wrong.add(`${rowIndex}-${colIndex}`);
        }
      }),
    );
    setWrongCells(wrong);
    if (!entered) showToast("Add a few letters first");
    else if (wrong.size) showToast(`${wrong.size} letter${wrong.size > 1 ? "s" : ""} to rethink`);
    else showToast("Looking sharp so far");
  };

  const revealLetter = () => {
    const key = keyFor(selected);
    setGrid((previous) => {
      const updated = previous.map((row) => [...row]);
      updated[selected.row][selected.col] = solution[selected.row][selected.col];
      return updated;
    });
    setWrongCells((previous) => {
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
    setRevealedCells((previous) => new Set(previous).add(key));
    showToast("One letter revealed");
  };

  const resetPuzzle = () => {
    if (!window.confirm("Clear the whole puzzle and restart the timer?")) return;
    setGrid(initialGrid);
    setWrongCells(new Set());
    setRevealedCells(new Set());
    setSelected({ row: 0, col: 0 });
    setDirection("across");
    setElapsed(0);
    setRunning(true);
    setComplete(false);
    localStorage.removeItem(storageKey);
  };

  const formattedTime = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="game-card" aria-label="Neural Mini AI crossword">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>
              <strong>NEURAL</strong>
              <em>MINI</em>
            </span>
          </div>
          <div className="puzzle-meta">
            <span>AI EDITION · 001</span>
            <time aria-label={`Elapsed time ${formattedTime}`}>{formattedTime}</time>
          </div>
        </header>

        <div className="toolbar" aria-label="Puzzle tools">
          <p>
            <span>Tuesday</span>
            Tiny grid. Big intelligence.
          </p>
          <div>
            <button type="button" onClick={checkPuzzle} aria-label="Check puzzle">
              <b>✓</b>
              Check
            </button>
            <button type="button" onClick={revealLetter} aria-label="Reveal letter">
              <b>✦</b>
              Hint
            </button>
            <button type="button" onClick={resetPuzzle} aria-label="Reset puzzle">
              <b>↺</b>
              Reset
            </button>
          </div>
        </div>

        <div className="game-area">
          <div
            className="crossword-grid"
            role="grid"
            aria-label="5 by 5 crossword grid"
          >
            {solution.map((row, rowIndex) =>
              row.map((answer, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                if (answer === "#") {
                  return <span className="block" key={key} aria-hidden="true" />;
                }
                const isSelected =
                  selected.row === rowIndex && selected.col === colIndex;
                const cellClass = [
                  "cell",
                  activeKeys.has(key) ? "in-word" : "",
                  isSelected ? "selected" : "",
                  wrongCells.has(key) ? "wrong" : "",
                  revealedCells.has(key) ? "revealed" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    type="button"
                    role="gridcell"
                    aria-label={`${cellNumbers[key] ? `Clue ${cellNumbers[key]}, ` : ""}${grid[rowIndex][colIndex] || "empty"}`}
                    aria-selected={isSelected}
                    className={cellClass}
                    key={key}
                    onClick={() => selectCell(rowIndex, colIndex)}
                  >
                    {cellNumbers[key] && (
                      <span className="cell-number">{cellNumbers[key]}</span>
                    )}
                    <span className="letter">{grid[rowIndex][colIndex]}</span>
                    {revealedCells.has(key) && (
                      <span className="reveal-dot" aria-label="Revealed letter" />
                    )}
                  </button>
                );
              }),
            )}
          </div>

          <aside className="side-panel">
            <div className="direction-tabs" role="tablist" aria-label="Clue direction">
              {(["across", "down"] as Direction[]).map((tab) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={direction === tab}
                  className={direction === tab ? "active" : ""}
                  key={tab}
                  onClick={() => {
                    setDirection(tab);
                    const matching = clues.find(
                      (clue) =>
                        clue.direction === tab &&
                        clue.cells.some(
                          (cell) =>
                            cell.row === selected.row &&
                            cell.col === selected.col,
                        ),
                    );
                    if (!matching) {
                      const first = clues.find((clue) => clue.direction === tab);
                      if (first) setSelected(first.cells[0]);
                    }
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="clue-list">
              {clueList.map((clue) => (
                <button
                  type="button"
                  key={`${clue.direction}-${clue.number}`}
                  className={
                    clue.number === currentClue.number ? "current" : ""
                  }
                  onClick={() => setSelected(clue.cells[0])}
                >
                  <span>{clue.number}</span>
                  {clue.clue}
                </button>
              ))}
            </div>
          </aside>
        </div>

        <div className="clue-tray" aria-live="polite">
          <button
            type="button"
            onClick={() => changeClue(-1)}
            aria-label="Previous clue"
          >
            ‹
          </button>
          <p>
            <span>
              {currentClue.number} {currentClue.direction}
            </span>
            {currentClue.clue}
          </p>
          <button
            type="button"
            onClick={() => changeClue(1)}
            aria-label="Next clue"
          >
            ›
          </button>
        </div>

        <div className="keyboard" aria-label="On-screen keyboard">
          {keyboardRows.map((row, rowIndex) => (
            <div className="keyboard-row" key={row}>
              {rowIndex === 2 && <span className="key-spacer" />}
              {[...row].map((letter) => (
                <button
                  type="button"
                  key={letter}
                  onClick={() => enterLetter(letter)}
                  aria-label={`Enter ${letter}`}
                >
                  {letter}
                </button>
              ))}
              {rowIndex === 2 && (
                <button
                  type="button"
                  className="backspace"
                  onClick={backspace}
                  aria-label="Backspace"
                >
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>

        <footer>
          <span>NEURAL MINI</span>
          <p>Made for curious humans.</p>
          <span>5 × 5</span>
        </footer>
      </section>

      {toast && <div className="toast" role="status">{toast}</div>}

      {complete && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="completion-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-title"
          >
            <div className="success-orbit" aria-hidden="true">
              <span>✦</span>
            </div>
            <p className="eyebrow">MODEL BEHAVIOR: IMPRESSIVE</p>
            <h1 id="completion-title">You cracked it.</h1>
            <p>
              Human intuition: <strong>still undefeated.</strong>
            </p>
            <div className="stat-row">
              <div>
                <span>TIME</span>
                <strong>{formattedTime}</strong>
              </div>
              <div>
                <span>HINTS</span>
                <strong>{revealedCells.size}</strong>
              </div>
            </div>
            <button type="button" onClick={() => setComplete(false)}>
              Admire the grid
            </button>
            <button type="button" className="text-button" onClick={resetPuzzle}>
              Play again
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
