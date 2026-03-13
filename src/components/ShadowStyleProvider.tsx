import {
  useRef,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import { ConfigProvider } from "antd";

interface ShadowStyleProviderProps {
  /** CSS strings to inject into the shadow root via adoptedStyleSheets */
  cssTexts: string[];
  children: ReactNode;
}

/**
 * Provides CSS isolation for the web component by injecting styles into the
 * shadow root. Handles three CSS concerns:
 *
 * 1. Static CSS (Tailwind, MapLibre, Ant Design, custom) → adoptedStyleSheets
 * 2. Ant Design component styles → static extraction (antd.css, zero-runtime)
 * 3. Ant Design portals (dropdowns, popups) → ConfigProvider getPopupContainer
 *
 * The `.ant` wrapper class is added so that the CSS-variable-based static
 * Ant Design styles (extracted with `cssVar: { key: 'ant' }`) activate for
 * every component inside the shadow root.
 */
export function ShadowStyleProvider({
  cssTexts,
  children,
}: ShadowStyleProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  // Resolve the shadow root from a DOM element inside it
  useEffect(() => {
    if (!containerRef.current) return;
    const root = containerRef.current.getRootNode();
    if (root instanceof ShadowRoot) {
      setShadowRoot(root);
    }
  }, []);

  // Inject static CSS into the shadow root via adoptedStyleSheets
  useEffect(() => {
    if (!shadowRoot) return;

    const sheets = cssTexts.map((css) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      return sheet;
    });

    shadowRoot.adoptedStyleSheets = [
      ...shadowRoot.adoptedStyleSheets,
      ...sheets,
    ];

    return () => {
      shadowRoot.adoptedStyleSheets = shadowRoot.adoptedStyleSheets.filter(
        (s) => !sheets.includes(s),
      );
    };
  }, [shadowRoot, cssTexts]);

  // Ant Design popups should render inside the shadow root, not document.body
  const getPopupContainer = useCallback(
    (triggerNode?: HTMLElement): HTMLElement => {
      const closest = triggerNode?.closest(
        "[data-popup-container]",
      ) as HTMLElement | null;
      return closest ?? containerRef.current ?? document.body;
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      data-popup-container
      className="ant css-var-root"
      style={{ height: "100%" }}
    >
      {shadowRoot ? (
        <ConfigProvider
          getPopupContainer={getPopupContainer}
          theme={{ cssVar: { key: "ant" }, hashed: false }}
        >
          {children}
        </ConfigProvider>
      ) : null}
    </div>
  );
}
