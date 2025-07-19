'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    MathJax: any;
  }
}

interface MathJaxProps {
  children: string;
  className?: string;
  inline?: boolean;
}

export const MathJax: React.FC<MathJaxProps> = ({ children, className = '', inline = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load MathJax if not already loaded
    if (!window.MathJax) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js';
      script.async = true;
      
      script.onload = () => {
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true,
            processEnvironments: true
          },
          options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
            ignoreHtmlClass: 'tex2jax_ignore',
            processHtmlClass: 'tex2jax_process'
          },
          startup: {
            pageReady: () => {
              return window.MathJax.startup.defaultPageReady().then(() => {
                renderMath();
              });
            }
          }
        };
        
        const mathJaxScript = document.createElement('script');
        mathJaxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/startup.js';
        mathJaxScript.async = true;
        document.head.appendChild(mathJaxScript);
      };
      
      document.head.appendChild(script);
    } else {
      renderMath();
    }
  }, [children]);

  const renderMath = () => {
    if (window.MathJax && window.MathJax.typesetPromise && containerRef.current) {
      window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
        console.error('MathJax rendering error:', err);
      });
    }
  };

  // Process the text to handle LaTeX
  const processLatex = (text: string) => {
    if (!text) return '';
    
    // Convert inline LaTeX: \( ... \) or $ ... $
    let processed = text.replace(/\\\((.*?)\\\)/g, '\\($1\\)');
    processed = processed.replace(/\$([^$]+)\$/g, '\\($1\\)');
    
    // Convert display LaTeX: \[ ... \] or $$ ... $$
    processed = processed.replace(/\\\[(.*?)\\\]/g, '\\[$1\\]');
    processed = processed.replace(/\$\$(.*?)\$\$/g, '\\[$1\\]');
    
    return processed;
  };

  return (
    <div 
      ref={containerRef}
      className={`tex2jax_process ${className}`}
      dangerouslySetInnerHTML={{ __html: processLatex(children) }}
    />
  );
};