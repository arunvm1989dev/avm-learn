#!/usr/bin/env node
/**
 * doc_generator.js
 * Called by the kt-agent after analysis is complete.
 *
 * Usage:
 *   node templates/doc_generator.js '<json-string>' 'ServiceName'
 *
 * Or via a file:
 *   node templates/doc_generator.js --file /tmp/analysis.json
 *
 * Output: output/KT_<ServiceName>.docx
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, LevelFormat, PageNumber, PageBreak, TableOfContents,
  Header, Footer,
} = require("docx");
const fs   = require("fs");
const path = require("path");

// ── Parse arguments ──────────────────────────────────────────────────────────
let analysis;
let outputName;

if (process.argv[2] === "--file") {
  const filePath = process.argv[3];
  analysis   = JSON.parse(fs.readFileSync(filePath, "utf8"));
  outputName = process.argv[4] || analysis.serviceOverview?.name || "service";
} else {
  analysis   = JSON.parse(process.argv[2] || "{}");
  outputName = process.argv[3] || analysis.serviceOverview?.name || "service";
}

// ── Style tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:  "1B3A6B", secondary: "2E75B6", accent: "00A8A8",
  headerBg: "1B3A6B", rowAlt: "EEF4FB",   codeBg: "F1F5F9",
  white:    "FFFFFF", body: "1E293B",      muted: "64748B",
  border:   "CBD5E1", noteYellow: "FEF9C3",
};
const PAGE_W = 12240, CONTENT_W = 10080;

// ── Helpers ───────────────────────────────────────────────────────────────────
const b  = (color = C.border) => ({ style: BorderStyle.SINGLE, size: 1, color });
const cb = (color = C.border) => ({ top: b(color), bottom: b(color), left: b(color), right: b(color) });
const nb = () => { const n = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }; return { top: n, bottom: n, left: n, right: n }; };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, font: "Calibri", size: 36, bold: true, color: C.primary })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.secondary, space: 2 } },
    children: [new TextRun({ text, font: "Calibri", size: 28, bold: true, color: C.secondary })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: "Calibri", size: 24, bold: true, color: C.body })] });
}
function body(text, opts = {}) {
  return new Paragraph({ spacing: { before: 60, after: 80 },
    children: [new TextRun({ text: String(text || ""), font: "Calibri", size: 22,
      color: opts.color || C.body, bold: opts.bold || false, italics: opts.italic || false })] });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
    children: [new TextRun({ text: String(text || ""), font: "Calibri", size: 22 })] });
}
function numbered(text) {
  return new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: String(text || ""), font: "Calibri", size: 22 })] });
}
function code(text) {
  return new Paragraph({ shading: { fill: C.codeBg, type: ShadingType.CLEAR },
    spacing: { before: 60, after: 60 }, indent: { left: 360, right: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 10, color: C.accent, space: 4 } },
    children: [new TextRun({ text: String(text || ""), font: "Courier New", size: 18, color: "0F4C81" })] });
}
function note(text) {
  return new Paragraph({ shading: { fill: C.noteYellow, type: ShadingType.CLEAR },
    spacing: { before: 80, after: 80 }, indent: { left: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 4 } },
    children: [new TextRun({ text: String(text || ""), font: "Calibri", size: 20, color: "854D0E" })] });
}
function sp(n = 1) { return new Paragraph({ spacing: { before: 80 * n, after: 0 }, children: [new TextRun("")] }); }
function pb()       { return new Paragraph({ children: [new PageBreak()] }); }

function hCell(text, w) {
  return new TableCell({ width: { size: w, type: WidthType.DXA },
    shading: { fill: C.headerBg, type: ShadingType.CLEAR }, borders: cb(C.secondary),
    margins: { top: 100, bottom: 100, left: 140, right: 140 }, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Calibri", size: 20, bold: true, color: C.white })] })] });
}
function dCell(text, w, alt = false, mono = false) {
  return new TableCell({ width: { size: w, type: WidthType.DXA },
    shading: { fill: alt ? C.rowAlt : C.white, type: ShadingType.CLEAR }, borders: cb(C.border),
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text || "—"),
      font: mono ? "Courier New" : "Calibri", size: mono ? 18 : 20, color: C.body })] })] });
}
function tbl(headers, rows, widths) {
  const total = widths.reduce((s, w) => s + w, 0);
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => hCell(h, widths[i])) }),
      ...rows.map((row, ri) => new TableRow({ children: row.map((c, ci) => dCell(c, widths[ci], ri % 2 === 1)) })),
    ] });
}
function infoRow(label, value, alt = false) {
  const LW = 2600, VW = CONTENT_W - LW;
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [LW, VW],
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: LW, type: WidthType.DXA }, borders: nb(),
        shading: { fill: C.secondary, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({ children: [new TextRun({ text: label, font: "Calibri", size: 20, bold: true, color: C.white })] })] }),
      new TableCell({ width: { size: VW, type: WidthType.DXA }, borders: nb(),
        shading: { fill: alt ? C.rowAlt : "F8FAFC", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({ children: [new TextRun({ text: String(value || "—"), font: "Calibri", size: 20, color: C.body })] })] }),
    ]}) ] });
}

// ── Section renderers ─────────────────────────────────────────────────────────
function cover(a, name) {
  const ov = a.serviceOverview || {};
  const today = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  return [
    sp(3),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 },
      children: [new TextRun({ text: "KNOWLEDGE TRANSFER DOCUMENT", font: "Calibri", size: 22, bold: true, color: C.muted, allCaps: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 },
      children: [new TextRun({ text: ov.name || name, font: "Calibri", size: 56, bold: true, color: C.primary })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 400 },
      children: [new TextRun({ text: (ov.description || "Spring Boot Microservice").split(".")[0], font: "Calibri", size: 26, italics: true, color: C.secondary })] }),
    sp(2),
    new Table({
      width: { size: 7000, type: WidthType.DXA }, alignment: AlignmentType.CENTER, columnWidths: [2800, 4200],
      rows: [
        ["Spring Boot", ov.springBootVersion || "N/A"], ["Java", ov.javaVersion || "N/A"],
        ["Build", ov.buildTool || "N/A"], ["Packaging", ov.packagingType || "jar"],
        ["Generated", today],
      ].map(([k, v], i) => new TableRow({ children: [
        new TableCell({ width: { size: 2800, type: WidthType.DXA }, borders: cb(C.border),
          shading: { fill: i % 2 === 0 ? C.rowAlt : C.white, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          children: [new Paragraph({ children: [new TextRun({ text: k, font: "Calibri", size: 20, bold: true, color: C.secondary })] })] }),
        new TableCell({ width: { size: 4200, type: WidthType.DXA }, borders: cb(C.border),
          shading: { fill: i % 2 === 0 ? C.rowAlt : C.white, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          children: [new Paragraph({ children: [new TextRun({ text: v, font: "Calibri", size: 20, color: C.body })] })] }),
      ]})),
    }),
    pb(),
  ];
}

function summary(a) {
  const ov = a.serviceOverview || {};
  const items = [h1("1. Executive Summary"), body(ov.description || ""), sp()];
  if (ov.purpose) { items.push(h3("Business Purpose")); items.push(body(ov.purpose)); }
  items.push(h3("Identity"));
  [["Name", ov.name], ["Main Class", ov.mainClass], ["Base Package", ov.basePackage]].forEach(([k, v]) => items.push(infoRow(k, v)));
  if (ov.techStack?.length) { items.push(sp()); items.push(h3("Tech stack")); ov.techStack.forEach(t => items.push(bullet(t))); }
  return items;
}

function architecture(a) {
  const arch = a.architecture || {};
  const items = [pb(), h1("2. Architecture & Design"), h2("2.1 Pattern"), infoRow("Pattern", arch.pattern), sp(), body(arch.description || "")];
  if (arch.designPatterns?.length) { items.push(h3("Design patterns")); arch.designPatterns.forEach(p => items.push(bullet(p))); }
  if (arch.crossCuttingConcerns?.length) { items.push(h3("Cross-cutting concerns")); arch.crossCuttingConcerns.forEach(c => items.push(bullet(c))); }
  if (arch.layers?.length) {
    items.push(h2("2.2 Layers"));
    arch.layers.forEach(l => {
      items.push(h3(l.name)); items.push(body(l.description || ""));
      if (l.classes?.length) { items.push(body("Key classes:", { bold: true })); l.classes.forEach(c => items.push(bullet(c))); }
      items.push(sp());
    });
  }
  if (arch.externalDependencies?.length) {
    items.push(h2("2.3 External dependencies"));
    items.push(tbl(["Type", "Name", "Purpose", "Config Key"],
      arch.externalDependencies.map(d => [d.type || "", d.name || "", d.purpose || "", d.connectionConfigKey || ""]),
      [1600, 1800, 3800, 2680]));
  }
  if (arch.securityMechanism) { items.push(h2("2.4 Security")); items.push(body(arch.securityMechanism)); }
  return items;
}

function diagram(a) {
  const d = a._diagramCode || "flowchart TD\n  Client --> Service\n  Service --> DB[(Database)]";
  const items = [pb(), h1("3. Architecture Diagram"),
    body("Paste the Mermaid code below into https://mermaid.live to render the diagram."), sp(), h3("Mermaid source")];
  d.split("\n").forEach(line => items.push(code(line)));
  items.push(sp()); items.push(note("Render at: https://mermaid.live or any Mermaid-enabled Markdown viewer."));
  return items;
}

function apiEndpoints(a) {
  const eps = a.apiEndpoints || [];
  const items = [pb(), h1("4. REST API Reference")];
  if (!eps.length) { items.push(body("No endpoints detected.")); return items; }
  items.push(body(`${eps.length} endpoint(s) exposed.`)); items.push(sp());
  items.push(h2("4.1 Summary"));
  items.push(tbl(["Method", "Path", "Description", "Auth"],
    eps.map(e => [e.method || "", e.path || "", e.description || "", e.authRequired ? "Yes" : "No"]),
    [1200, 3000, 4400, 1280]));
  items.push(h2("4.2 Details"));
  eps.forEach(ep => {
    items.push(h3(`${ep.method}  ${ep.path}`));
    items.push(infoRow("Controller", `${ep.controllerClass || ""}::${ep.handlerMethod || ""}`));
    items.push(infoRow("Auth", ep.authRequired ? `Required — ${(ep.roles || []).join(", ") || "authenticated"}` : "None", true));
    items.push(sp()); items.push(body(ep.description || ""));
    if (ep.requestBody && ep.requestBody !== "None") { items.push(body("Request:", { bold: true })); items.push(code(ep.requestBody)); }
    items.push(body("Response:", { bold: true })); items.push(code(ep.responseBody || "N/A"));
    if (ep.validations?.length) { items.push(body("Validations:", { bold: true })); ep.validations.forEach(v => items.push(bullet(v))); }
    if (ep.notes) items.push(note(ep.notes));
    items.push(sp());
  });
  return items;
}

function dataModel(a) {
  const ents = a.dataModel || [];
  const items = [pb(), h1("5. Data Model")];
  if (!ents.length) { items.push(body("No entities detected.")); return items; }
  ents.forEach(e => {
    items.push(h2(`${e.entityName}  (${e.type || "Entity"})`));
    items.push(infoRow("Table", e.tableName || "derived")); items.push(sp()); items.push(body(e.description || ""));
    if (e.fields?.length) {
      items.push(h3("Fields"));
      items.push(tbl(["Field", "Type", "Constraints", "Description"],
        e.fields.map(f => [f.name || "", f.type || "", f.constraints || "", f.description || ""]),
        [2000, 2000, 2200, 3680]));
    }
    if (e.relationships?.length) {
      items.push(h3("Relationships"));
      items.push(tbl(["Type", "Target", "Fetch", "Description"],
        e.relationships.map(r => [r.type || "", r.targetEntity || "", r.fetchType || "", r.description || ""]),
        [2000, 2200, 1200, 4480]));
    }
    items.push(sp());
  });
  return items;
}

function serviceLayer(a) {
  const svcs = a.serviceLayer || [];
  const items = [pb(), h1("6. Service Layer")];
  svcs.forEach(s => {
    items.push(h2(s.className)); items.push(body(s.description || ""));
    if (s.dependencies?.length) { items.push(h3("Dependencies")); s.dependencies.forEach(d => items.push(bullet(d))); }
    if (s.keyMethods?.length) {
      items.push(h3("Key methods"));
      items.push(tbl(["Method", "Transactional", "Propagation", "Description"],
        s.keyMethods.map(m => [m.name || "", m.transactional ? "Yes" : "No", m.transactionPropagation || "—", m.description || ""]),
        [2400, 1400, 1800, 4280]));
    }
    items.push(sp());
  });
  return items;
}

function codeFlow(a) {
  const flows = a.codeFlow || [];
  const items = [pb(), h1("7. Code Flows")];
  flows.forEach((f, fi) => {
    items.push(h2(`7.${fi + 1}  ${f.scenario}`));
    items.push(infoRow("Trigger", f.trigger || "N/A")); items.push(sp()); items.push(body(f.description || ""));
    if (f.steps?.length) {
      items.push(h3("Step-by-step"));
      items.push(tbl(["#", "Layer", "Class :: Method", "Description"],
        f.steps.map(s => [String(s.stepNumber || ""), s.layer || "", `${s.class || ""}::${s.method || ""}`, s.description || ""]),
        [540, 1600, 2800, 4940]));
    }
    if (f.errorHandling) { items.push(h3("Error handling")); items.push(body(f.errorHandling)); }
    items.push(sp());
  });
  return items;
}

function configuration(a) {
  const conf = a.configuration || {};
  const items = [pb(), h1("8. Configuration")];
  if (conf.profiles?.length) { items.push(h2("Profiles")); conf.profiles.forEach(p => items.push(bullet(p))); }
  if (conf.keyProperties?.length) {
    items.push(h2("Key properties"));
    items.push(tbl(["Key", "Description", "Default", "Profile"],
      conf.keyProperties.map(p => [p.key || "", p.description || "", p.defaultValue || "", p.profile || "all"]),
      [3000, 3500, 1800, 1580]));
  }
  if (conf.environmentVariables?.length) {
    items.push(h2("Environment variables"));
    items.push(tbl(["Variable", "Description", "Required", "Example"],
      conf.environmentVariables.map(e => [e.name || "", e.description || "", e.required ? "Yes" : "No", e.example || ""]),
      [2800, 3800, 1200, 2080]));
  }
  return items;
}

function messaging(a) {
  const msg = a.messaging || {};
  if (!msg.hasMessaging) return [];
  const items = [pb(), h1("9. Messaging"), infoRow("Broker", msg.broker || "N/A"), sp()];
  if (msg.producers?.length) {
    items.push(h2("Producers"));
    items.push(tbl(["Topic", "Event Class", "Producer", "When sent"],
      msg.producers.map(p => [p.topic || "", p.eventClass || "", p.producerClass || "", p.triggerDescription || ""]),
      [2200, 2200, 2200, 3280]));
  }
  if (msg.consumers?.length) {
    items.push(h2("Consumers"));
    items.push(tbl(["Topic", "Event Class", "Consumer", "Error handling"],
      msg.consumers.map(c => [c.topic || "", c.eventClass || "", c.consumerClass || "", c.errorHandling || ""]),
      [2200, 2200, 2200, 3280]));
  }
  return items;
}

function scheduled(a) {
  const jobs = a.scheduledJobs || [];
  if (!jobs.length) return [];
  const items = [pb(), h1("10. Scheduled Jobs")];
  items.push(tbl(["Job", "Cron", "Class :: Method", "Side effects"],
    jobs.map(j => [j.jobName || "", j.cronExpression || "", `${j.class || ""}::${j.method || ""}`, j.sideEffects || j.description || ""]),
    [2200, 1800, 2800, 3080]));
  return items;
}

function exceptions(a) {
  const eh = a.exceptionHandling || {};
  const items = [pb(), h1("11. Exception Handling"), infoRow("Global handler", eh.globalHandlerClass || "None"), sp()];
  if (eh.customExceptions?.length) {
    items.push(h2("Custom exceptions"));
    items.push(tbl(["Class", "HTTP Status", "When thrown"],
      eh.customExceptions.map(e => [e.className || "", e.httpStatus || "", e.description || ""]),
      [3000, 1800, 5080]));
  }
  if (eh.errorResponseFormat) { items.push(h2("Error response format")); items.push(body(eh.errorResponseFormat)); }
  return items;
}

function testing(a) {
  const t = a.testing || {};
  const items = [pb(), h1("12. Testing")];
  [["Unit tests", t.hasUnitTests ? "Yes" : "No"], ["Integration tests", t.hasIntegrationTests ? "Yes" : "No"],
   ["Unit frameworks", (t.unitTestFrameworks || []).join(", ") || "N/A"],
   ["Integration frameworks", (t.integrationTestFrameworks || []).join(", ") || "N/A"],
   ["Test data", t.testDataStrategy || "N/A"]].forEach(([k, v], i) => items.push(infoRow(k, v, i % 2 === 1)));
  if (t.testCoverageNotes) { items.push(sp()); items.push(h2("Coverage notes")); items.push(body(t.testCoverageNotes)); }
  return items;
}

function deployment(a) {
  const dep = a.deployment || {};
  const items = [pb(), h1("13. Deployment")];
  [["Containerised", dep.containerized ? "Yes" : "No"], ["Dockerfile", dep.dockerfilePath || "not found"],
   ["Docker Compose", dep.dockerComposeFile || "not found"], ["Kubernetes", dep.kubernetesManifestsPath || "not found"],
   ["CI/CD", dep.ciCdPlatform || "not detected"], ["Health check", dep.healthCheckEndpoint || "not configured"],
   ["Metrics", dep.metricsEndpoint || "not configured"]].forEach(([k, v], i) => items.push(infoRow(k, v, i % 2 === 1)));
  if (dep.deploymentNotes) { items.push(sp()); items.push(h2("Notes")); items.push(body(dep.deploymentNotes)); }
  return items;
}

function localSetup(a) {
  const ls = a.localSetup || {};
  const items = [pb(), h1("14. Local Setup")];
  if (ls.prerequisites?.length) { items.push(h2("Prerequisites")); ls.prerequisites.forEach(p => items.push(bullet(p))); }
  if (ls.steps?.length) { items.push(h2("Steps")); ls.steps.forEach(s => items.push(numbered(s))); }
  items.push(infoRow("Default port", ls.defaultPort || "8080"));
  items.push(infoRow("Swagger URL", ls.swaggerUrl || "not configured", true));
  return items;
}

function complexities(a) {
  const cx = a.knownComplexities || [];
  if (!cx.length) return [];
  const items = [pb(), h1("15. Known Complexities")];
  cx.forEach(c => {
    items.push(h3(c.area || "")); items.push(body(c.description || ""));
    if (c.recommendation) items.push(note(`Recommendation: ${c.recommendation}`));
    items.push(sp());
  });
  return items;
}

function handover(a) {
  const notes = a.handoverNotes || [];
  const items = [pb(), h1("16. Handover Checklist")];
  if (notes.length) {
    items.push(h2("Notes"));
    items.push(tbl(["Priority", "Category", "Note"],
      notes.map(n => [n.priority || "MEDIUM", n.category || "General", n.note || ""]),
      [1400, 2200, 6280]));
    items.push(sp());
  }
  items.push(h2("Standard checklist"));
  ["Repository access granted", "CI/CD pipeline explained", "All env vars documented",
   "Local setup verified end-to-end", "DB migration runbooks reviewed",
   "External credentials transferred", "Monitoring dashboards explained",
   "On-call runbook reviewed", "Open bugs and issues reviewed",
   "Architecture walkthrough done", "Swagger/API docs reviewed",
   "Deployment demonstrated in staging"].forEach(i => items.push(bullet(`☐  ${i}`)));
  return items;
}

// ── Header / Footer ──────────────────────────────────────────────────────────
function makeHeader(name) {
  return { default: new Header({ children: [
    new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [6500, CONTENT_W - 6500],
      rows: [new TableRow({ children: [
        new TableCell({ width: { size: 6500, type: WidthType.DXA }, borders: nb(),
          shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 0, bottom: 60, left: 0, right: 0 },
          children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.secondary } },
            children: [new TextRun({ text: `KT Document  |  ${name}`, font: "Calibri", size: 18, color: C.muted })] })] }),
        new TableCell({ width: { size: CONTENT_W - 6500, type: WidthType.DXA }, borders: nb(),
          shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 0, bottom: 60, left: 0, right: 0 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.secondary } },
            children: [new TextRun({ text: "CONFIDENTIAL", font: "Calibri", size: 16, color: "B45309", bold: true })] })] }),
      ]})] }) ] }) };
}

function makeFooter(name) {
  return { default: new Footer({ children: [
    new Paragraph({ alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border } }, spacing: { before: 80 },
      children: [
        new TextRun({ text: `${name}  |  Page `, font: "Calibri", size: 16, color: C.muted }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: C.secondary }),
        new TextRun({ text: " of ", font: "Calibri", size: 16, color: C.muted }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 16, color: C.secondary }),
      ] }) ] }) };
}

// ── Assemble document ─────────────────────────────────────────────────────────
const SECTION_ORDER = [
  "cover", "summary", "architecture", "diagram",
  "apiEndpoints", "dataModel", "serviceLayer", "codeFlow",
  "configuration", "messaging", "scheduled", "exceptions",
  "testing", "deployment", "localSetup", "complexities", "handover",
];
const RENDERERS = {
  cover: (a, n) => cover(a, n),
  summary: summary, architecture, diagram, apiEndpoints, dataModel,
  serviceLayer, codeFlow, configuration, messaging, scheduled,
  exceptions, testing, deployment, localSetup, complexities, handover,
};

const serviceName = analysis.serviceOverview?.name || outputName;
const allChildren = [];

for (const key of SECTION_ORDER) {
  try {
    const nodes = RENDERERS[key](analysis, serviceName);
    if (nodes?.length) allChildren.push(...nodes);
  } catch (e) {
    console.warn(`Section "${key}" failed: ${e.message}`);
  }
}

// Insert TOC after cover page break
const pbIdx = allChildren.findIndex(n => n instanceof Paragraph &&
  n.root?.find?.(r => r?.constructor?.name === "PageBreak"));
const insertAt = pbIdx >= 0 ? pbIdx + 1 : 1;
allChildren.splice(insertAt, 0,
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  pb()
);

const doc = new Document({
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ]},
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Calibri", color: C.primary },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Calibri", color: C.secondary },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Calibri", color: C.body },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    headers: makeHeader(serviceName), footers: makeFooter(serviceName),
    properties: { page: {
      size:   { width: PAGE_W, height: 15840 },
      margin: { top: 1440, right: 1080, bottom: 1080, left: 1080 },
    }},
    children: allChildren,
  }],
});

const safe = serviceName.replace(/[^a-zA-Z0-9_-]/g, "_");
const outDir = path.resolve("output");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `KT_${safe}.docx`);

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log(`✓ Document written: ${outPath}`);
}).catch(err => {
  console.error(`✗ Failed: ${err.message}`);
  process.exit(1);
});
