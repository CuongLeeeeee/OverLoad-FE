"use client";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { EditorView } from "@codemirror/view";

interface Props {
  value: string;
  language: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
}

function getExtensions(lang: string) {
  if (lang === "javascript") return [javascript()];
  if (lang === "css") return [css()];
  if (lang === "html") return [html()];
  return [javascript()];
}

const fullHeightTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto", background: "#282c34" },
  ".cm-gutters": { background: "#21252b" },
});

export default function CodeEditor({ value, language, onChange, readOnly }: Props) {
  return (
    <div className="h-full" style={{ background: "#282c34" }}>
      <CodeMirror
        value={value}
        theme={oneDark}
        extensions={[...getExtensions(language), fullHeightTheme]}
        onChange={onChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: false,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: false,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: false,
          tabSize: 2,
        }}
        style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", height: "100%" }}
        height="100%"
      />
    </div>
  );
}