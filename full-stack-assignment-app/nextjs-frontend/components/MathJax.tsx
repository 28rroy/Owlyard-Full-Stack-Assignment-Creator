'use client';

import { useEffect, useRef, useState } from 'react';

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

// Helper function to detect if text contains LaTeX
const hasLatexContent = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  // Check for common LaTeX patterns
  const latexPatterns = [
    /\$.*?\$/,                    // $...$
    /\$\$.*?\$\$/,               // $...$
    /\\\(.*?\\\)/,               // \(...\)
    /\\\[.*?\\\]/,               // \[...\]
    /\\[a-zA-Z]+/,               // \command
    /\^[{]?[^}]*[}]?/,           // ^{...} or ^x
    /_[{]?[^}]*[}]?/,            // _{...} or _x
    /\\frac\{.*?\}\{.*?\}/,      // \frac{}{} 
    /\\sqrt(\[.*?\])?\{.*?\}/,   // \sqrt{} or \sqrt[n]{}
    /\\begin\{.*?\}/,            // \begin{}
    /\\end\{.*?\}/,              // \end{}
    /\\[a-zA-Z]*\{.*?\}/         // \command{...}
  ];
  
  return latexPatterns.some(pattern => pattern.test(text));
};

// Simple text component for non-LaTeX content
const PlainText: React.FC<{ children: string; className?: string }> = ({ children, className = '' }) => {
  return (
    <span className={className} suppressHydrationWarning>
      {children}
    </span>
  );
};

// Full MathJax component (only used when LaTeX is detected)
const FullMathJax: React.FC<MathJaxProps> = ({ children, className = '', inline = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      initializeMathJax();
    }
  }, [isClient]);

  useEffect(() => {
    if (isReady && children && isClient) {
      setTimeout(() => {
        renderMath();
      }, 10);
    }
  }, [children, isReady, renderKey, isClient]);

  const initializeMathJax = async () => {
    if (typeof window === 'undefined') return;
    
    if (window.MathJax && window.MathJax.typesetPromise) {
      setIsReady(true);
      return;
    }

    window.MathJax = {
      tex: {
        inlineMath: [[', '], ['\\(', '\\)']],
        displayMath: [['$', '$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true,
        tags: 'none',
        autoload: {
          color: [],
          colorv2: ['color']
        },
        packages: {'[+]': ['noerrors']}
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process'
      },
      loader: {
        load: ['[tex]/noerrors']
      },
      startup: {
        ready: () => {
          window.MathJax.startup.defaultReady();
          setIsReady(true);
        }
      }
    };

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    
    script.onerror = () => {
      console.warn('Primary MathJax CDN failed, trying fallback...');
      loadFallbackMathJax();
    };
    
    document.head.appendChild(script);
  };

  const loadFallbackMathJax = () => {
    const fallbackScript = document.createElement('script');
    fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js';
    fallbackScript.async = true;
    
    fallbackScript.onload = () => {
      setIsReady(true);
    };
    
    fallbackScript.onerror = () => {
      console.error('Both MathJax CDNs failed');
    };
    
    document.head.appendChild(fallbackScript);
  };

  const renderMath = async () => {
    if (!containerRef.current || !window.MathJax || !isReady || typeof window === 'undefined') {
      return;
    }

    try {
      const processedContent = processLatex(children);
      if (containerRef.current) {
        containerRef.current.innerHTML = processedContent;
      }

      if (window.MathJax.startup && window.MathJax.startup.promise) {
        await window.MathJax.startup.promise;
      }

      if (window.MathJax.typesetPromise) {
        await window.MathJax.typesetPromise([containerRef.current]);
      }
    } catch (error) {
      console.error('MathJax render error:', error);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <span style="color: #dc2626; background: #fef2f2; padding: 2px 4px; border-radius: 4px; font-size: 0.875em;">
            LaTeX Error: ${escapeHtml(children)}
          </span>
        `;
      }
      
      setTimeout(() => {
        setRenderKey(prev => prev + 1);
      }, 1000);
    }
  };

  const processLatex = (text: string): string => {
    if (!text) return '';
    
    try {
      let processed = text;
      
      processed = processed.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, '\\($1\\)');
      processed = processed.replace(/\$\$([^]*?)\$\$/g, '\\[$1\\]');
      processed = processed.replace(/\\\((.*?)\\\)/g, '\\($1\\)');
      processed = processed.replace(/\\\[(.*?)\\\]/g, '\\[$1\\]');
      
      return processed;
    } catch (error) {
      console.error('LaTeX processing error:', error);
      return escapeHtml(text);
    }
  };

  const escapeHtml = (text: string): string => {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  // Don't render anything on server side
  if (!isClient) {
    return <span className={className}>{children}</span>;
  }

  return (
    <div className={`tex2jax_process ${className}`} suppressHydrationWarning>
      <div 
        ref={containerRef}
        className="mathjax-container"
        style={{ minHeight: '1.2em', lineHeight: '1.4' }}
        suppressHydrationWarning
      >
        {!isReady ? (
          <span className="text-gray-400 text-sm">Loading math...</span>
        ) : (
          <span suppressHydrationWarning>{processLatex(children)}</span>
        )}
      </div>
    </div>
  );
};

// Smart MathJax component that chooses between plain text and full MathJax
export const MathJax: React.FC<MathJaxProps> = ({ children, className = '', inline = false }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle empty or invalid children
  if (!children || typeof children !== 'string') {
    return <span className={className}></span>;
  }

  // On server, always render as plain text to avoid hydration issues
  if (!isClient) {
    return <span className={className}>{children}</span>;
  }

  // If no LaTeX content detected, just render as plain text
  if (!hasLatexContent(children)) {
    return <PlainText className={className}>{children}</PlainText>;
  }
  
  // If LaTeX content detected, use full MathJax component
  return <FullMathJax className={className} inline={inline}>{children}</FullMathJax>;
};

// Hook for manual MathJax operations (keep for utility)
export const useMathJax = () => {
  const rerenderAll = async () => {
    if (typeof window !== 'undefined' && window.MathJax && window.MathJax.typesetPromise) {
      try {
        await window.MathJax.typesetPromise();
      } catch (error) {
        console.error('MathJax rerender failed:', error);
      }
    }
  };

  const rerenderElement = async (element: HTMLElement) => {
    if (typeof window !== 'undefined' && window.MathJax && window.MathJax.typesetPromise) {
      try {
        await window.MathJax.typesetPromise([element]);
      } catch (error) {
        console.error('Element MathJax rerender failed:', error);
      }
    }
  };

  const isReady = () => {
    return typeof window !== 'undefined' && !!(window.MathJax && window.MathJax.typesetPromise);
  };

  return { 
    rerenderAll, 
    rerenderElement, 
    isReady
  };
};