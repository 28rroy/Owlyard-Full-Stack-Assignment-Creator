'use client';

import { useState } from 'react';
import { HelpCircle, X, Eye } from 'lucide-react';
import { MathJax } from '@/components/MathJax';

export const LatexHelp = () => {
  const [showHelp, setShowHelp] = useState(false);

  const examples = [
    {
      category: "Basic Math",
      items: [
        { latex: "$x^2$", description: "Superscript (x squared)" },
        { latex: "$x_1$", description: "Subscript" },
        { latex: "$\\frac{1}{2}$", description: "Fraction" },
        { latex: "$\\sqrt{x}$", description: "Square root" },
        { latex: "$\\sqrt[3]{x}$", description: "Cube root" }
      ]
    },
    {
      category: "Greek Letters",
      items: [
        { latex: "$\\alpha, \\beta, \\gamma$", description: "Greek letters" },
        { latex: "$\\pi, \\theta, \\lambda$", description: "More Greek letters" },
        { latex: "$\\Delta, \\Sigma, \\Omega$", description: "Capital Greek letters" }
      ]
    },
    {
      category: "Advanced",
      items: [
        { latex: "$\\sum_{i=1}^{n} x_i$", description: "Summation" },
        { latex: "$\\int_0^1 f(x) dx$", description: "Integral" },
        { latex: "$\\lim_{x \\to 0} f(x)$", description: "Limit" },
        { latex: "$$E = mc^2$$", description: "Display equation (centered)" }
      ]
    },
    {
      category: "Chemistry",
      items: [
        { latex: "$H_2O$", description: "Water molecule" },
        { latex: "$CO_2$", description: "Carbon dioxide" },
        { latex: "$NaCl$", description: "Sodium chloride" }
      ]
    }
  ];

  if (!showHelp) {
    return (
      <button
        onClick={() => setShowHelp(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
        title="LaTeX Help"
      >
        <HelpCircle className="h-4 w-4" />
        LaTeX Help
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">LaTeX Math Reference</h2>
          <button
            onClick={() => setShowHelp(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-medium text-blue-800 mb-2">Quick Start:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use <code className="bg-blue-100 px-1 rounded">$...$</code> for inline math: $x^2$</li>
              <li>• Use <code className="bg-blue-100 px-1 rounded">$$...$$</code> for display math (centered on new line)</li>
              <li>• Click the "Show Preview" button to see how your LaTeX will render</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {examples.map((category, categoryIndex) => (
              <div key={categoryIndex} className="border border-gray-200 rounded-md p-4">
                <h3 className="font-semibold text-gray-800 mb-3">{category.category}</h3>
                <div className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                          {item.latex}
                        </code>
                        <span className="text-sm text-gray-600">{item.description}</span>
                      </div>
                      <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                        <div className="text-sm text-gray-500 mb-1">Renders as:</div>
                        <MathJax>{item.latex}</MathJax>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-medium text-yellow-800 mb-2">Tips:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Use curly braces <code className="bg-yellow-100 px-1 rounded">{"{}"}</code> to group expressions: <code className="bg-yellow-100 px-1 rounded">$x^{"{2y}"}$</code> vs <code className="bg-yellow-100 px-1 rounded">$x^2y$</code></li>
              <li>• Escape special characters with backslash: <code className="bg-yellow-100 px-1 rounded">$\\%$</code> for %</li>
              <li>• Use spaces in LaTeX code for readability: <code className="bg-yellow-100 px-1 rounded">$x + y = z$</code></li>
              <li>• Preview your work before saving to ensure correct rendering</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="font-medium text-green-800 mb-2">Common Operators:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div><code className="bg-green-100 px-1 rounded">+</code> → +</div>
              <div><code className="bg-green-100 px-1 rounded">-</code> → -</div>
              <div><code className="bg-green-100 px-1 rounded">\\times</code> → ×</div>
              <div><code className="bg-green-100 px-1 rounded">\\div</code> → ÷</div>
              <div><code className="bg-green-100 px-1 rounded">\\pm</code> → ±</div>
              <div><code className="bg-green-100 px-1 rounded">\\neq</code> → ≠</div>
              <div><code className="bg-green-100 px-1 rounded">\\leq</code> → ≤</div>
              <div><code className="bg-green-100 px-1 rounded">\\geq</code> → ≥</div>
              <div><code className="bg-green-100 px-1 rounded">\\approx</code> → ≈</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
            <h3 className="font-medium text-purple-800 mb-2">More Examples:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium mb-2">Matrices:</div>
                <code className="bg-purple-100 px-2 py-1 rounded block mb-1">
                  $\begin{"{pmatrix}"} a & b \\ c & d \end{"{pmatrix}"}$
                </code>
                <div className="p-2 bg-white border rounded">
                  <MathJax>$\begin{"{pmatrix}"} a & b \\ c & d \end{"{pmatrix}"}$</MathJax>
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Sets:</div>
                <code className="bg-purple-100 px-2 py-1 rounded block mb-1">
                  $\{"{x | x > 0}"\}$
                </code>
                <div className="p-2 bg-white border rounded">
                  <MathJax>$\{"{x | x > 0}"\}$</MathJax>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Need more help? Check out the{" "}
              <a 
                href="https://katex.org/docs/supported.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                complete LaTeX reference
              </a>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};