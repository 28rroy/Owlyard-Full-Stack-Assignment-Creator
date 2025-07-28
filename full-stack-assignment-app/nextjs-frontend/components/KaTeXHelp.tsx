'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Direct KaTeX Component with improved styling
const KaTeXRenderer: React.FC<{ children: string; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && children) {
      try {
        ref.current.innerHTML = '';
        
        if (children.includes('$') || children.includes('\\')) {
          let processedContent = children;
          
          processedContent = processedContent.replace(/\$\$(.*?)\$\$/g, (match, math) => {
            try {
              return katex.renderToString(math, { displayMode: true });
            } catch (e) {
              return `<span style="color: red;">Math Error: ${math}</span>`;
            }
          });
          
          processedContent = processedContent.replace(/\$([^$]*?)\$/g, (match, math) => {
            try {
              return katex.renderToString(math, { displayMode: false });
            } catch (e) {
              return `<span style="color: red;">Math Error: ${math}</span>`;
            }
          });
          
          ref.current.innerHTML = processedContent;
        } else {
          ref.current.textContent = children;
        }
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        if (ref.current) {
          ref.current.innerHTML = `<span style="color: red;">Render Error: ${children}</span>`;
        }
      }
    }
  }, [children]);

  // Enhanced styling with better color contrast
  return (
    <div 
      ref={ref} 
      className={`katex-improved ${className}`}
      style={{
        color: '#1f2937', // Dark gray for better readability
        fontSize: '16px',
        lineHeight: '1.5'
      }}
    />
  );
};

export const KaTeXHelp = () => {
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
        title="KaTeX Help"
      >
        <HelpCircle className="h-4 w-4" />
        LaTeX Help
      </button>
    );
  }

  return (
    <>
      {/* Add improved KaTeX styling */}
      <style jsx global>{`
        .katex-improved .katex {
          color: #1f2937 !important;
          font-size: 1.1em !important;
        }
        
        .katex-improved .katex .mord,
        .katex-improved .katex .mop,
        .katex-improved .katex .mbin,
        .katex-improved .katex .mrel,
        .katex-improved .katex .mopen,
        .katex-improved .katex .mclose,
        .katex-improved .katex .mpunct {
          color: #1f2937 !important;
        }
        
        .katex-improved .katex .mfrac .frac-line {
          border-bottom-color: #1f2937 !important;
        }
        
        .katex-improved .katex .sqrt > .root {
          color: #1f2937 !important;
        }
        
        .katex-improved .katex .accent-body {
          color: #1f2937 !important;
        }
        
        .katex-improved .katex .msupsub {
          color: #1f2937 !important;
        }
        
        .katex-improved .katex .delimsizing {
          color: #1f2937 !important;
        }
        
        .katex-improved .katex .strut {
          color: #1f2937 !important;
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">LaTeX Help - KaTeX Edition</h2>
            <button
              onClick={() => setShowHelp(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">LaTeX Examples</h3>
              <p className="text-gray-600 mb-4">
                Use <code className="bg-gray-100 px-2 py-1 rounded">$...$</code> for inline math and 
                <code className="bg-gray-100 px-2 py-1 rounded">$$...$$</code> for display math.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {examples.map((category, categoryIndex) => (
                <div key={categoryIndex} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{category.category}</h4>
                  <div className="space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <code className="bg-white text-sm px-2 py-1 rounded border text-gray-800">
                            {item.latex}
                          </code>
                          <span className="text-xs text-gray-600">{item.description}</span>
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded">
                          <div className="text-sm text-gray-500 mb-2">Renders as:</div>
                          <KaTeXRenderer>{item.latex}</KaTeXRenderer>
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
                <li>• Use curly braces <code className="bg-white text-gray-800 px-1 rounded border">{`{}`}</code> to group expressions</li>
                <li>• Escape special characters with backslash: <code className="bg-white text-gray-800 px-1 rounded border">$\\%$</code> for %</li>
                <li>• Use spaces in LaTeX code for readability</li>
                <li>• Preview your work before saving to ensure correct rendering</li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-medium text-green-800 mb-2">Common Operators:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <code className="bg-white text-gray-800 px-1 rounded border">+</code> 
                  <span>→</span>
                  <KaTeXRenderer>$+$</KaTeXRenderer>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white text-gray-800 px-1 rounded border">-</code> 
                  <span>→</span>
                  <KaTeXRenderer>$-$</KaTeXRenderer>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white text-gray-800 px-1 rounded border">\\times</code> 
                  <span>→</span>
                  <KaTeXRenderer>$\times$</KaTeXRenderer>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white text-gray-800 px-1 rounded border">\\div</code> 
                  <span>→</span>
                  <KaTeXRenderer>$\div$</KaTeXRenderer>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white text-gray-800 px-1 rounded border">\\pm</code> 
                  <span>→</span>
                  <KaTeXRenderer>$\pm$</KaTeXRenderer>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white text-gray-800 px-1 rounded border">\\neq</code> 
                  <span>→</span>
                  <KaTeXRenderer>$\neq$</KaTeXRenderer>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
              <h3 className="font-medium text-purple-800 mb-2">Advanced Examples:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-2 text-purple-900">Matrix:</div>
                  <code className="bg-white text-gray-800 px-2 py-1 rounded block mb-1 border">
                    {`$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$`}
                  </code>
                  <div className="p-3 bg-white border rounded">
                    <KaTeXRenderer>{`$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$`}</KaTeXRenderer>
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-2 text-purple-900">Set:</div>
                  <code className="bg-white text-gray-800 px-2 py-1 rounded block mb-1 border">
                    {`$\\{x | x > 0\\}$`}
                  </code>
                  <div className="p-3 bg-white border rounded">
                    <KaTeXRenderer>{`$\\{x | x > 0\\}$`}</KaTeXRenderer>
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
                  complete KaTeX reference
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
    </>
  );
};