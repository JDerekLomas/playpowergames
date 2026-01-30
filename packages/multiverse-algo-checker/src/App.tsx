import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MultiverseQuestionSelector,
  mathFactTags,
  type MathFact,
  type StudentResponse,
  type MathFactTagKey,
} from '@k8-games/sdk/multiverse';

// Build operation -> tag keys map
const allTagKeys = Object.keys(mathFactTags) as MathFactTagKey[];
const additionKeys: MathFactTagKey[] = allTagKeys.filter(
  (k) =>
    k.startsWith('number_plus_'.toUpperCase()) ||
    [
      'DOUBLES_FACTS',
      'NEAR_DOUBLES_FACTS',
      'MAKE_10_FACTS',
      'BRIDGE_10_FACTS',
      'NUMBER_PLUS_10_FACTS',
      'SUMS_TO_5',
      'SUMS_TO_10',
      'TEEN_SUMS',
    ].includes(k)
);
const subtractionKeys: MathFactTagKey[] = allTagKeys.filter(
  (k) => k.startsWith('SUBTRACT') || k.startsWith('SUBTRACTING') || k.startsWith('DIFFERENCES')
);
const multiplicationKeys: MathFactTagKey[] = allTagKeys.filter(
  (k) => k.startsWith('MULTIPLY_BY_') || k === 'SQUARE_NUMBERS'
);
const divisionKeys: MathFactTagKey[] = allTagKeys.filter((k) => k.startsWith('DIVIDE_BY_'));

// 1) factGroup object
const factGroup: Record<string, MathFactTagKey[]> = {
  addition: additionKeys,
  subtraction: subtractionKeys,
  multiplication: multiplicationKeys,
  division: divisionKeys,
};

// Menu Page Component
interface MenuPageProps {
  onSelectOperation: (operation: string) => void;
}

const MenuPage: React.FC<MenuPageProps> = ({ onSelectOperation }) => {
  const operations = [
    { name: 'Addition', icon: '+', key: 'addition' },
    { name: 'Subtraction', icon: '-', key: 'subtraction' },
    { name: 'Multiplication', icon: '×', key: 'multiplication' },
    { name: 'Division', icon: '÷', key: 'division' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8 font-inter">Choose an Operation</h1>
      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
        {operations.map((op) => (
          <div
            key={op.key}
            onClick={() => onSelectOperation(op.key)}
            className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl shadow-lg cursor-pointer transition-transform transform hover:scale-105 hover:shadow-xl border border-slate-700"
          >
            <div className="text-5xl font-semibold mb-4 text-emerald-400">{op.icon}</div>
            <h2 className="text-xl font-bold font-inter">{op.name}</h2>
          </div>
        ))}
      </div>
    </div>
  );
};

// Modal for Eligible Fact Groups
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: { key: MathFactTagKey; title: string }[];
  selectedKeys: MathFactTagKey[];
  onApply: (keys: MathFactTagKey[]) => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, groups, selectedKeys, onApply }) => {
  if (!isOpen) return null;

  const [localSelected, setLocalSelected] = useState<Set<MathFactTagKey>>(new Set(selectedKeys));

  useEffect(() => {
    setLocalSelected(new Set(selectedKeys));
  }, [selectedKeys, isOpen]);

  const toggle = (key: MathFactTagKey) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApply = () => {
    onApply(Array.from(localSelected));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-3xl p-6 w-full max-w-xl text-white shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-emerald-400">Eligible Fact Groups</h2>
        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2">
          {groups.map((g) => (
            <div key={g.key} className="flex items-center">
              <input
                type="checkbox"
                id={g.key}
                name={g.key}
                checked={localSelected.has(g.key)}
                onChange={() => toggle(g.key)}
                className="w-5 h-5 accent-emerald-500 rounded focus:ring-0"
              />
              <label htmlFor={g.key} className="ml-3 text-lg">{g.title}</label>
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="py-2 px-6 bg-slate-700 rounded-lg text-white font-semibold transition-colors hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="py-2 px-6 bg-emerald-500 rounded-lg text-white font-bold transition-colors hover:bg-emerald-600"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};


// Game Page Component
interface GamePageProps {
  operation: string;
  onGoBack: () => void;
  selectorRef: React.RefObject<MultiverseQuestionSelector | null>;
}

const GamePage: React.FC<GamePageProps> = ({ operation, onGoBack, selectorRef }) => {
  const [currentQuestion, setCurrentQuestion] = useState<MathFact | null>(null);
  const [log, setLog] = useState<StudentResponse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<MathFactTagKey[]>([]);

  // Build eligible tag keys for the current operation
  const requestedKeys = useMemo<MathFactTagKey[]>(() => {
    const keys = factGroup[operation] ?? [];
    return keys;
  }, [operation]);

  useEffect(() => {
    // Update eligible groups on operation change, reuse selector instance
    if (!selectorRef.current) return;
    selectorRef.current.updateEligibleFactGroup(requestedKeys);
    setSelectedGroupKeys(requestedKeys);
    const next = selectorRef.current.getNextQuestion();
    setCurrentQuestion(next);
    setStartTime(Date.now());
    setLog([]);
  }, [operation, requestedKeys, selectorRef]);

  const handleAnswer = (correct: boolean) => {
    if (!currentQuestion) return;

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Build student response and fetch next question
    const selector = selectorRef.current;
    if (!selector) return;
    const studentResponse = selector.createStudentResponse(
      currentQuestion,
      responseTime,
      correct
    );
    setLog((prevLog) => [...prevLog, studentResponse]);

    const next = selector.getNextQuestion(studentResponse);
    setCurrentQuestion(next);
    setStartTime(Date.now());
  };

  // 2) Provide Modal with human-readable titles for the operation's eligible groups
  const modalGroups = useMemo<{ key: MathFactTagKey; title: string }[]>(() => {
    const keys = factGroup[operation] ?? [];
    return keys.map((k) => ({ key: k, title: mathFactTags[k] }));
  }, [operation]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-900 text-white font-inter">
      {/* Left Side: Question and Controls */}
      <div className="flex flex-col items-center justify-center p-8 bg-slate-800 flex-grow rounded-r-3xl md:rounded-r-none shadow-2xl">
        <h1 className="text-3xl font-bold capitalize mb-4 text-emerald-400">{operation}</h1>
        <div className="bg-slate-700 p-8 rounded-2xl shadow-xl border border-slate-600 mb-8 w-full max-w-sm text-center">
          <p className="text-6xl font-bold text-white tracking-wide">
            {currentQuestion?.["question text"] || 'Loading...'}
          </p>
        </div>
        <div className="flex space-x-4 w-full max-w-sm">
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 py-4 px-6 text-xl font-bold text-white bg-green-500 rounded-xl shadow-md transition-transform transform hover:scale-105 hover:bg-green-600"
          >
            Pass
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 py-4 px-6 text-xl font-bold text-white bg-red-500 rounded-xl shadow-md transition-transform transform hover:scale-105 hover:bg-red-600"
          >
            Fail
          </button>
        </div>
        <button
          onClick={onGoBack}
          className="mt-8 py-3 px-6 text-md font-semibold text-slate-300 bg-slate-700 rounded-xl transition-colors hover:bg-slate-600"
        >
          &larr; Back to Menu
        </button>
      </div>

      {/* Right Side: Logger */}
      <div className="w-full md:w-1/2 p-4 md:p-8 bg-slate-950 text-sm md:text-base font-mono relative flex flex-col h-screen">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2 flex-shrink-0">
            <h2 className="text-xl font-bold text-emerald-400">Eligible Fact Groups</h2>
            <div className="flex space-x-2">
                <button
                    onClick={() => setLog([])}
                    className="py-1 px-4 bg-red-600 rounded-md text-white font-semibold transition-colors hover:bg-red-700"
                >
                    Clear
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="py-1 px-4 bg-slate-700 rounded-md text-white font-semibold transition-colors hover:bg-slate-600"
                >
                    Edit
                </button>
            </div>
        </div>
        <div className="flex-1 bg-black bg-opacity-70 rounded-xl p-4 md:p-6 text-slate-300 border border-slate-800 shadow-inner overflow-hidden">
          <div className="h-full scrollbar-visible">
            <table className="w-full text-left table-auto">
              <thead className="sticky top-0 bg-black bg-opacity-70 z-10">
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2 px-2">Fact Answered:</th>
                  <th className="py-2 px-2">Student Response:</th>
                </tr>
              </thead>
              <tbody>
                {log.slice().reverse().map((entry, index) => (
                  <tr key={index} className="border-b border-slate-700 last:border-b-0">
                    <td className="py-3 px-2 align-top">{entry.mathFact["question text"]}</td>
                    <td className="py-3 px-2 text-xs">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(entry, null, 2)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groups={modalGroups}
        selectedKeys={selectedGroupKeys}
        onApply={(keys) => {
          if (!selectorRef.current) return;
          selectorRef.current.updateEligibleFactGroup(keys);
          setSelectedGroupKeys(keys);
        }}
      />
    </div>
  );
};


// Main App container component
export default function App() {
  const [currentPage, setCurrentPage] = useState<'menu' | 'game'>('menu');
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const selectorRef = useRef<MultiverseQuestionSelector | null>(null);

  // Create a single instance for the app lifetime
  useEffect(() => {
    if (!selectorRef.current) {
      // initialize with addition by default
      selectorRef.current = new MultiverseQuestionSelector(factGroup['addition']);
    }
  }, []);

  const handleSelectOperation = (operation: string) => {
    setCurrentOperation(operation);
    setCurrentPage('game');
  };

  const handleGoBack = () => {
    setCurrentPage('menu');
    setCurrentOperation('');
  };

  return (
    <>
      {currentPage === 'menu' ? (
        <MenuPage onSelectOperation={handleSelectOperation} />
      ) : (
        <GamePage operation={currentOperation} onGoBack={handleGoBack} selectorRef={selectorRef} />
      )}
    </>
  );
}
