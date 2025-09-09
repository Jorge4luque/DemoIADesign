/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ArrowDownIcon } from './icons';

type Direction = 'left' | 'right' | 'top' | 'bottom';

interface ExpandPanelProps {
  onExpand: (direction: Direction, prompt: string) => void;
  isLoading: boolean;
}

const ExpandPanel: React.FC<ExpandPanelProps> = ({ onExpand, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleExpand = (direction: Direction) => {
    onExpand(direction, prompt);
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-gray-300">Expand Image Canvas</h3>
      <p className="text-sm text-gray-400 -mt-2 text-center">
        Extend the image to add more context. Optionally, describe what you'd like to see in the new area.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Optional: e.g., 'add more of the sandy beach'"
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading}
        rows={2}
      />

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        <button
          onClick={() => handleExpand('left')}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Expand Left
        </button>
        <button
          onClick={() => handleExpand('right')}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          Expand Right
          <ArrowRightIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleExpand('top')}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          <ArrowUpIcon className="w-5 h-5" />
          Expand Top
        </button>
        <button
          onClick={() => handleExpand('bottom')}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          Expand Bottom
          <ArrowDownIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ExpandPanel;
