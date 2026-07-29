"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Direction = "across" | "down";
type Interest = "agents" | "infra" | "genai" | "data";
type Difficulty = "casual" | "curious" | "expert";
type Phase = "setup" | "generating" | "playing";
type Cell = { row: number; col: number };
type ClueText = { casual?: string; standard: string; expert?: string };
type Entry = {
  answer: string;
  row: number;
  col: number;
  direction: Direction;
  clue: ClueText;
};
type Puzzle = {
  label: string;
  shortLabel: string;
  description: string;
  entries: Entry[];
};
type Clue = {
  number: number;
  direction: Direction;
  answer: string;
  clue: string;
  cells: Cell[];
};
type CompiledPuzzle = {
  solution: string[][];
  clues: Clue[];
  cellNumbers: Record<string, number>;
  firstCell: Cell;
};

const GRID_SIZE = 9;

const entry = (
  answer: string,
  row: number,
  col: number,
  direction: Direction,
  standard: string,
  casual?: string,
  expert?: string,
): Entry => ({
  answer,
  row,
  col,
  direction,
  clue: { standard, casual, expert },
});

const puzzles: Record<Interest, Puzzle> = {
  agents: {
    label: "Agents & orchestration",
    shortLabel: "agents",
    description: "Memory, tools, runtimes, and the systems that connect them.",
    entries: [
      entry("ADK", 0, 3, "across", "Agent Development Kit, briefly", "Google's agent-building kit, briefly"),
      entry("INBOX", 1, 2, "across", "Gemini Enterprise hub for managing agent activity", "Where an agent's work lands"),
      entry("GATEWAY", 2, 1, "across", "Policy layer for agent-to-agent and agent-to-tool traffic", "Guarded entrance for agent connections"),
      entry("AUTOMATED", 3, 0, "across", "Handled by software without constant human steering", "Able to run on its own"),
      entry("PROTOCOLS", 4, 0, "across", "Rules that let agents and tools talk reliably", "Shared rules for systems talking"),
      entry("INTERFACE", 5, 0, "across", "Surface where a person, model, or tool connects", "A connection surface"),
      entry("PROMPTS", 6, 1, "across", "Instructions that steer model behavior", "Things you ask an AI"),
      entry("AGENT", 7, 2, "across", "AI system that plans and acts toward a goal", "AI that can plan and take action"),
      entry("MCP", 8, 3, "across", "Protocol that connects models to tools, briefly", "Model Context Protocol, briefly"),
      entry("API", 3, 0, "down", "Programmatic doorway used by tools and agents", "How apps talk to other apps, briefly"),
    ],
  },
  infra: {
    label: "TPUs & infrastructure",
    shortLabel: "infrastructure",
    description: "AI chips, networking, training, and inference at cloud scale.",
    entries: [
      entry("TPU", 0, 3, "across", "Google AI accelerator, briefly", "Tensor Processing Unit, briefly"),
      entry("AXION", 1, 2, "across", "Google Cloud custom CPU family", "Google's custom cloud CPU"),
      entry("SILICON", 2, 1, "across", "Material at the heart of AI accelerators", "What chips are made from"),
      entry("TRAINABLE", 3, 0, "across", "Capable of learning from examples", "Able to learn from examples"),
      entry("INFERENCE", 4, 0, "across", "What optimized serving hardware accelerates", "What a model does after training"),
      entry("NETWORKED", 5, 0, "across", "Linked for distributed compute", "Connected together"),
      entry("ROUTERS", 6, 1, "across", "Devices that move traffic between networks", "Traffic directors for networks"),
      entry("CLOUD", 7, 2, "across", "Home of managed AI infrastructure", "Where remote compute lives"),
      entry("GPU", 8, 3, "across", "Accelerator often compared with a TPU", "Another AI accelerator, briefly"),
      entry("TIN", 3, 0, "down", "Metal used in solder on circuit boards", "Circuit-board solder metal"),
    ],
  },
  genai: {
    label: "Generative AI",
    shortLabel: "generative AI",
    description: "Models that create text, imagery, video, music, and more.",
    entries: [
      entry("VEO", 0, 3, "across", "Google's generative video model", "Three-letter video model"),
      entry("LYRIA", 1, 2, "across", "Google model family for music generation", "Google's music-generation model"),
      entry("PROMPTS", 2, 1, "across", "Inputs that steer generated output", "Things you ask an AI"),
      entry("GENERATES", 3, 0, "across", "Creates text, images, video, or sound", "Makes new media"),
      entry("PROMPTING", 4, 0, "across", "Crafting instructions for a model", "Writing better asks for AI"),
      entry("SYNTHETIC", 5, 0, "across", "Artificially created, as AI media may be", "Made rather than captured"),
      entry("MODELER", 6, 1, "across", "Person who shapes systems that generate", "Person building models"),
      entry("AUDIO", 7, 2, "across", "Sound-based model output", "What reaches your ears"),
      entry("ART", 8, 3, "across", "Creative output an image model may produce", "Creative visual output"),
      entry("GPS", 3, 0, "down", "Location tech that can ground a generated map", "Location system, briefly"),
    ],
  },
  data: {
    label: "Data & security",
    shortLabel: "data and security",
    description: "Trusted context, governance, defenses, and enterprise data.",
    entries: [
      entry("WIZ", 0, 3, "across", "Cloud security company now paired with Google Cloud", "Google Cloud security partner"),
      entry("TRUST", 1, 2, "across", "Foundation of secure enterprise AI", "Confidence in a system"),
      entry("CATALOG", 2, 1, "across", "Knowledge ___ grounds agents in trusted business context", "Knowledge ___ organizes trusted context"),
      entry("ANALYTICS", 3, 0, "across", "Discipline that turns data into decisions", "Finding meaning in data"),
      entry("CATALOGUE", 4, 0, "across", "Organized index of governed assets", "An organized asset index"),
      entry("LAKEHOUSE", 5, 0, "across", "Cross-cloud, AI-native home for analytical data", "Data architecture mixing lake and warehouse"),
      entry("THREATS", 6, 1, "across", "Risks that security teams detect and remediate", "Potential security dangers"),
      entry("QUERY", 7, 2, "across", "Question sent to a database", "A database question"),
      entry("SQL", 8, 3, "across", "Language for relational data", "Database language, briefly"),
      entry("ACL", 3, 0, "down", "Access-control list, briefly", "Permissions list, briefly"),
    ],
  },
};

const interestOptions: Array<{
  value: Interest;
  label: string;
  detail: string;
  mark: string;
}> = [
  { value: "agents", label: "Agents", detail: "Orchestration, memory, tools", mark: "A" },
  { value: "infra", label: "TPUs & infrastructure", detail: "Chips, networks, inference", mark: "T" },
  { value: "genai", label: "Generative AI", detail: "Models, audio, video", mark: "G" },
  { value: "data", label: "Data & security", detail: "Catalogs, defense, trust", mark: "D" },
];

const difficultyOptions: Array<{
  value: Difficulty;
  label: string;
  detail: string;
}> = [
  { value: "casual", label: "Quick & friendly", detail: "Clear clues with answer lengths" },
  { value: "curious", label: "Product curious", detail: "A balanced Next ’26 challenge" },
  { value: "expert", label: "Deep cut", detail: "More insider-style clueing" },
];

const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const keyFor = ({ row, col }: Cell) => `${row}-${col}`;

const compilePuzzle = (
  puzzle: Puzzle,
  difficulty: Difficulty,
): CompiledPuzzle => {
  const solution = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "#"),
  );

  puzzle.entries.forEach((item) => {
    [...item.answer].forEach((letter, index) => {
      const row = item.row + (item.direction === "down" ? index : 0);
      const col = item.col + (item.direction === "across" ? index : 0);
      solution[row][col] = letter;
    });
  });

  const starts = new Map<string, number>();
  const orderedStarts = [...new Set(puzzle.entries.map((item) => `${item.row}-${item.col}`))]
    .map((key) => {
      const [row, col] = key.split("-").map(Number);
      return { key, row, col };
    })
    .sort((a, b) => a.row - b.row || a.col - b.col);

  orderedStarts.forEach((start, index) => starts.set(start.key, index + 1));

  const clues = puzzle.entries
    .map((item): Clue => {
      const base =
        difficulty === "casual"
          ? item.clue.casual ?? item.clue.standard
          : difficulty === "expert"
            ? item.clue.expert ?? item.clue.standard
            : item.clue.standard;
      return {
        number: starts.get(`${item.row}-${item.col}`) ?? 1,
        direction: item.direction,
        answer: item.answer,
        clue: difficulty === "casual" ? `${base} (${item.answer.length})` : base,
        cells: [...item.answer].map((_, index) => ({
          row: item.row + (item.direction === "down" ? index : 0),
          col: item.col + (item.direction === "across" ? index : 0),
        })),
      };
    })
    .sort(
      (a, b) =>
        (a.direction === b.direction
          ? 0
          : a.direction === "across"
            ? -1
            : 1) || a.number - b.number,
    );

  return {
    solution,
    clues,
    cellNumbers: Object.fromEntries(starts),
    firstCell: clues[0].cells[0],
  };
};

const emptyGridFor = (solution: string[][]): string[][] =>
  solution.map((row) => row.map((cell) => (cell === "#" ? "#" : "")));

export default function Home() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [interest, setInterest] = useState<Interest | null>(null);
  const [chosenDifficulty, setChosenDifficulty] =
    useState<Difficulty | null>(null);
  const [activeInterest, setActiveInterest] = useState<Interest>("agents");
  const [difficulty, setDifficulty] = useState<Difficulty>("curious");

  const puzzle = puzzles[activeInterest];
  const compiled = useMemo(
    () => compilePuzzle(puzzle, difficulty),
    [difficulty, puzzle],
  );
  const { solution, clues, cellNumbers, firstCell } = compiled;

  const [grid, setGrid] = useState(() => emptyGridFor(solution));
  const [selected, setSelected] = useState<Cell>(firstCell);
  const [direction, setDirection] = useState<Direction>("across");
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set());
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState("");
  const [complete, setComplete] = useState(false);

  const storageKey = `neural-mini-${activeInterest}-${difficulty}`;

  useEffect(() => {
    if (!running || phase !== "playing") return;
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [phase, running]);

  useEffect(() => {
    if (phase !== "playing") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(grid));
    } catch {
      // Progress saving is an optional enhancement.
    }
  }, [grid, phase, storageKey]);

  const clueList = useMemo(
    () => clues.filter((clue) => clue.direction === direction),
    [clues, direction],
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
  }, [clues, direction, selected]);

  const activeKeys = useMemo(
    () => new Set(currentClue.cells.map((cell) => keyFor(cell))),
    [currentClue],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
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
  }, [complete, grid, phase, solution]);

  const generatePuzzle = () => {
    if (!interest || !chosenDifficulty) return;
    const nextInterest = interest;
    const nextDifficulty = chosenDifficulty;
    const nextPuzzle = compilePuzzle(
      puzzles[nextInterest],
      nextDifficulty,
    );
    setPhase("generating");
    window.setTimeout(() => {
      setActiveInterest(nextInterest);
      setDifficulty(nextDifficulty);
      setGrid(emptyGridFor(nextPuzzle.solution));
      setSelected(nextPuzzle.firstCell);
      setDirection("across");
      setWrongCells(new Set());
      setRevealedCells(new Set());
      setElapsed(0);
      setComplete(false);
      setRunning(true);
      setPhase("playing");
    }, 620);
  };

  const startAnother = () => {
    setRunning(false);
    setComplete(false);
    setInterest(null);
    setChosenDifficulty(null);
    setPhase("setup");
  };

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
      if (phase !== "playing") return;
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
    [moveWithinClue, phase, selected],
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
      while (
        row >= 0 &&
        row < GRID_SIZE &&
        col >= 0 &&
        col < GRID_SIZE
      ) {
        if (solution[row][col] !== "#") {
          setSelected({ row, col });
          setDirection(rowDelta === 0 ? "across" : "down");
          return;
        }
        row += rowDelta;
        col += colDelta;
      }
    },
    [selected, solution],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (complete || phase !== "playing") return;
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
  }, [backspace, complete, enterLetter, moveSpatially, phase]);

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
      (clue) =>
        clue.number === currentClue.number &&
        clue.direction === currentClue.direction,
    );
    const startIndex = index < 0 ? 0 : index;
    const next =
      clueList[
        (startIndex + offset + clueList.length) % clueList.length
      ];
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
    else if (wrong.size)
      showToast(
        `${wrong.size} letter${wrong.size > 1 ? "s" : ""} to rethink`,
      );
    else showToast("Looking sharp so far");
  };

  const revealLetter = () => {
    const key = keyFor(selected);
    setGrid((previous) => {
      const updated = previous.map((row) => [...row]);
      updated[selected.row][selected.col] =
        solution[selected.row][selected.col];
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
    if (!window.confirm("Clear the whole puzzle and restart the timer?"))
      return;
    setGrid(emptyGridFor(solution));
    setWrongCells(new Set());
    setRevealedCells(new Set());
    setSelected(firstCell);
    setDirection("across");
    setElapsed(0);
    setRunning(true);
    setComplete(false);
    localStorage.removeItem(storageKey);
  };

  const formattedTime = `${Math.floor(elapsed / 60)}:${String(
    elapsed % 60,
  ).padStart(2, "0")}`;

  if (phase !== "playing") {
    return (
      <main className="app-shell">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <section className="game-card setup-card" aria-label="Build your AI crossword">
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
              <span>MADE FOR YOU</span>
              <b>AI CROSSWORD</b>
            </div>
          </header>

          {phase === "generating" ? (
            <div className="generating-panel" role="status" aria-live="polite">
              <div className="build-grid" aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
              </div>
              <p>Crossing your interests…</p>
              <span>Building a fresh {interest ? puzzles[interest].shortLabel : "AI"} grid</span>
            </div>
          ) : (
            <div className="setup-body">
              <div className="setup-intro">
                <p className="eyebrow">YOUR PERSONAL AI MINI</p>
                <h1>What’s been on your tech radar?</h1>
                <p>
                  Two quick choices, then we’ll build a crossword around what
                  you want to explore.
                </p>
              </div>

              <fieldset className="question-block">
                <legend>
                  <span>1</span>
                  Pick an area
                </legend>
                <div className="interest-grid">
                  {interestOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={interest === option.value ? "chosen" : ""}
                      aria-pressed={interest === option.value}
                      onClick={() => setInterest(option.value)}
                    >
                      <b aria-hidden="true">{option.mark}</b>
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.detail}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="question-block">
                <legend>
                  <span>2</span>
                  Choose your clue depth
                </legend>
                <div className="difficulty-row">
                  {difficultyOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={
                        chosenDifficulty === option.value ? "chosen" : ""
                      }
                      aria-pressed={chosenDifficulty === option.value}
                      onClick={() => setChosenDifficulty(option.value)}
                    >
                      <strong>{option.label}</strong>
                      <small>{option.detail}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                className="generate-button"
                disabled={!interest || !chosenDifficulty}
                onClick={generatePuzzle}
              >
                Generate my crossword
                <span aria-hidden="true">→</span>
              </button>
              <p className="setup-note">No account needed. Your choices stay on this device.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

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
            <span>{puzzle.label.toUpperCase()}</span>
            <time aria-label={`Elapsed time ${formattedTime}`}>
              {formattedTime}
            </time>
          </div>
        </header>

        <div className="toolbar" aria-label="Puzzle tools">
          <p>
            <span>{difficultyOptions.find((item) => item.value === difficulty)?.label}</span>
            {puzzle.description}
          </p>
          <div>
            <button type="button" onClick={startAnother} aria-label="Build another puzzle">
              <b>＋</b>
              New
            </button>
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
            className="crossword-grid grid-9"
            role="grid"
            aria-label="9 by 9 personalized crossword grid"
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
            <div
              className="direction-tabs"
              role="tablist"
              aria-label="Clue direction"
            >
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
                      const first = clues.find(
                        (clue) => clue.direction === tab,
                      );
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
                    clue.number === currentClue.number &&
                    clue.direction === currentClue.direction
                      ? "current"
                      : ""
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
          <span>MADE FOR YOU</span>
          <p>{puzzle.label}</p>
          <span>9 × 9</span>
        </footer>
      </section>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

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
            <p className="eyebrow">PERSONALIZATION: ON POINT</p>
            <h1 id="completion-title">You cracked it.</h1>
            <p>
              The {puzzle.shortLabel} grid is <strong>complete.</strong>
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
            <button
              type="button"
              className="text-button"
              onClick={startAnother}
            >
              Build another puzzle
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
