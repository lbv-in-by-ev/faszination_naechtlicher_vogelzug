/**
 * Extracts the complete Ant Design CSS (all components).
 * Run with: node scripts/extract-antd-css.mjs
 *
 * Output: tmp/antd.css (imported with ?inline in main.tsx)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractStyle } from "@ant-design/static-style-extract";
import { ConfigProvider } from "antd";
import React from "react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Only the Ant Design components imported across the project:
//   Checkbox     – Timeline.tsx, LayersDropdown.tsx
//   DatePicker   – Timeline.tsx (RangePicker)
//   Slider       – Timeline.tsx
//   Collapse     – SpeciesDropdown.tsx, LayersDropdown.tsx
//   Spin         – SpeciesDropdown.tsx, MapLoadingIndicator.tsx
//   AutoComplete – SpeciesDropdown.tsx
//   Input        – AutoComplete depends on Input styles (border etc.)
const includes = [
  "Checkbox",
  "DatePicker",
  "Slider",
  "Collapse",
  "Spin",
  "AutoComplete",
  "Input",
];

const css = extractStyle({
  includes,
  customTheme: (node) =>
    React.createElement(
      ConfigProvider,
      {
        theme: {
          hashed: false,
          cssVar: { key: "ant" },
          token: { colorTextQuaternary: "#fff" },
        },
      },
      node,
    ),
});

const outFile = path.resolve(__dirname, "../tmp/antd.css");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, css, "utf-8");

console.log(
  `✔ Extracted complete Ant Design CSS → ${path.relative(process.cwd(), outFile)} (${(css.length / 1024).toFixed(1)} KB)`,
);
