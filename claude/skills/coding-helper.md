\---

name: coding-helper

description: "helps you internalize the coding usage and regulate outptus"

\---

&#x20;

\# 🚀 Claude Ultra-Efficiency System v4

&#x20;

A high-performance prompting architecture designed to minimize token usage, maximize reasoning efficiency, and enforce deterministic, structured outputs across complex workflows.

&#x20;

This system is optimized for:

\- Large-scale development workflows

\- Multi-step reasoning tasks

\- API + backend + frontend systems

\- Iterative engineering with minimal token waste

&#x20;

\---

&#x20;

\# 🧠 CORE DESIGN PHILOSOPHY

&#x20;

Claude does not “store intent” — it expands based on available context.

&#x20;

Therefore:

&#x20;

> ❗ Unstructured input = exponential token waste  

> ❗ Overloaded prompts = reduced accuracy  

> ❗ Ambiguous scope = unnecessary reasoning branches  

&#x20;

\---

&#x20;

\## ⚡ PRIMARY OPTIMIZATION GOAL

&#x20;

Reduce cognitive load on the model by enforcing:

&#x20;

\- strict input structure  

\- minimal ambiguity  

\- isolated task execution  

\- compressed reasoning paths  

\- deterministic output formats  

&#x20;

\---

&#x20;

\# ⚡ GLOBAL EXECUTION RULES (HARD CONSTRAINTS)

&#x20;

These rules override all instructions unless explicitly disabled:

&#x20;

\### 🔒 Core Rules

\- Always minimize tokens in input and output  

\- Never include unnecessary explanation  

\- Never expand scope beyond requested task  

\- Avoid repetition or paraphrasing  

\- Prefer structured output over natural language  

\- Prefer correctness over completeness when constrained  

&#x20;

\---

&#x20;

\### 🔒 Output Behavior Rules

Default response must follow one format:

&#x20;

\- ≤ 5 bullets  

\- OR ≤ 100 lines  

\- OR diff/patch format  

\- OR structured schema output  

&#x20;

No hybrid formats unless explicitly requested.

&#x20;

\---

&#x20;

\### 🔒 Reasoning Constraints

\- Do not expose step-by-step reasoning unless required  

\- Do not explore multiple solutions unless requested  

\- Do not generate alternatives by default  

\- Perform single-pass optimization only  

&#x20;

\---

&#x20;

\# 🧩 SYSTEM ARCHITECTURE OVERVIEW

&#x20;

This system is composed of modular reasoning layers:

&#x20;

1\. Context Compression Layer  

2\. Scope Enforcement Layer  

3\. Task Decomposition Layer  

4\. Output Normalization Layer  

5\. Token Efficiency Controller  

&#x20;

Each layer reduces unnecessary token expansion.

&#x20;

\---

&#x20;

\# 🧠 1. CONTEXT COMPRESSION LAYER

&#x20;

\## Purpose

Transform large or unstructured input into minimal actionable representation.

&#x20;

\---

&#x20;

\## 📦 Required Compression Schema

&#x20;

All inputs MUST be converted into:

&#x20;

```

Purpose:

Inputs:

Outputs:

Flow:

Key Logic:

```

&#x20;

\---

&#x20;

\## ⚙️ Compression Rules

&#x20;

\- Remove comments, logs, metadata, and repetition  

\- Replace verbose descriptions with semantic summaries  

\- Reduce large code blocks into behavior-level logic  

\- Eliminate redundant variable or function explanations  

\- Compress repeated patterns into single references  

&#x20;

\---

&#x20;

\## 🔥 Advanced Compression Techniques

&#x20;

\### Pattern Folding

Repeated logic → single abstraction

&#x20;

\### Behavior Mapping

Code → functional behavior description

&#x20;

\### Structural Reduction

Full system → architecture summary

&#x20;

\---

&#x20;

\# 🎯 2. SCOPE ISOLATION LAYER

&#x20;

\## Purpose

Prevent cross-domain reasoning and unintended modifications.

&#x20;

\---

&#x20;

\## 📦 Scope Definition Format

&#x20;

```

Scope:

\- Only modify: \[target area]

&#x20;

Ignore:

\- Everything else

```

&#x20;

\---

&#x20;

\## ⚙️ Enforcement Rules

&#x20;

\- Never modify outside defined scope  

\- Never infer missing requirements outside scope  

\- Treat scope boundaries as hard constraints  

\- Ignore unrelated system components completely  

&#x20;

\---

&#x20;

\## 🧠 Scope Best Practices

&#x20;

\- One task per request  

\- One system layer per prompt  

\- One functional domain per instruction  

&#x20;

\---

&#x20;

\# 🧱 3. TASK DECOMPOSITION LAYER

&#x20;

\## Purpose

Break complex requests into atomic operations.

&#x20;

\---

&#x20;

\## ⚙️ Decomposition Rule

&#x20;

If a prompt contains:

\- “and”

\- multiple objectives

\- multiple systems  

&#x20;

👉 It MUST be split.

&#x20;

\---

&#x20;

\## 📊 Standard Execution Flow

&#x20;

1\. Design phase  

2\. Validation phase  

3\. Optimization phase  

4\. Finalization phase  

&#x20;

\---

&#x20;

\## 🔥 Advanced Decomposition Strategy

&#x20;

Instead of:

> “Build secure full-stack system”

&#x20;

Break into:

\- API design  

\- validation logic  

\- DB schema  

\- auth layer  

\- performance optimization  

&#x20;

\---

&#x20;

\# ✂️ 4. DIFF OUTPUT LAYER (CODE MODE)

&#x20;

\## Purpose

Minimize output size during iterative development.

&#x20;

\---

&#x20;

\## 📦 Default Code Output Rule

&#x20;

Always return:

&#x20;

```

Only modified lines

No full file

No redundant context

```

&#x20;

\---

&#x20;

\## ⚙️ Benefits

&#x20;

\- Reduces token usage significantly  

\- Enables rapid iteration cycles  

\- Prevents output bloat  

\- Improves change clarity  

&#x20;

\---

&#x20;

\## 🔥 Strict Diff Mode

&#x20;

\- No explanation  

\- No file recreation  

\- No unrelated changes  

&#x20;

\---

&#x20;

\# 🧮 5. TOKEN AWARENESS CONTROLLER

&#x20;

\## Purpose

Prevent unnecessary context inflation before execution.

&#x20;

\---

&#x20;

\## ⚙️ Pre-Processing Rules

&#x20;

Before sending any prompt:

&#x20;

\- Remove at least 30–50% of content  

\- Replace logs with summaries  

\- Replace raw data with structured abstraction  

\- Eliminate duplicated instructions  

&#x20;

\---

&#x20;

\## 🔥 Token Kill Strategy

&#x20;

If input is still large:

&#x20;

👉 compress again before submission

&#x20;

\---

&#x20;

\# 🧠 6. SYSTEM MAPPING LAYER

&#x20;

\## Purpose

Replace verbose descriptions with structured architecture.

&#x20;

\---

&#x20;

\## 📦 Required Format

&#x20;

```

Frontend:

Backend:

Database:

Auth:

Flow:

```

&#x20;

\---

&#x20;

\## ⚙️ Extended Mapping (Optional)

&#x20;

\- API endpoints  

\- Data models  

\- State management  

\- Service boundaries  

\- External dependencies  

&#x20;

\---

&#x20;

\# ⚡ 7. PRECISION PROMPTING SYSTEM

&#x20;

\## Purpose

Eliminate ambiguity in instructions.

&#x20;

\---

&#x20;

\## 📦 Required Format

&#x20;

```

Goal:

Scope:

Constraints:

Output Format:

```

&#x20;

\---

&#x20;

\## ⚙️ Rules

&#x20;

\- Every request must define constraints  

\- Output format must always be explicit  

\- Scope must always be bounded  

\- Goals must be singular  

&#x20;

\---

&#x20;

\# 🔁 8. ITERATION CONTROL SYSTEM

&#x20;

\## Purpose

Avoid multi-turn inefficiency loops.

&#x20;

\---

&#x20;

\## ⚙️ Rule

&#x20;

Always request complete solutions in one pass.

&#x20;

\---

&#x20;

\## 📦 Standard Instruction

&#x20;

> Provide final optimized solution. No follow-ups required.

&#x20;

\---

&#x20;

\# 📤 9. OUTPUT CONTROL SYSTEM

&#x20;

\## Purpose

Ensure responses remain minimal and structured.

&#x20;

\---

&#x20;

\## ⚙️ Constraints

&#x20;

\- No repetition  

\- No filler phrases  

\- No unnecessary examples  

\- No expanded explanations  

\- No redundant restatement  

&#x20;

\---

&#x20;

\# 🧠 10. ABSTRACTION LAYER

&#x20;

\## Purpose

Reduce code-level detail into conceptual representation.

&#x20;

\---

&#x20;

\## 📦 Transformation Rules

&#x20;

Instead of:

&#x20;

\- full code blocks  

\- verbose implementations  

&#x20;

Use:

&#x20;

\- behavior description  

\- functional mapping  

\- structural logic  

&#x20;

\---

&#x20;

\## Example

&#x20;

Instead of:

&#x20;

```js

function validateUser(input) { ... }

```

&#x20;

Use:

&#x20;

> Validates user input before processing request

&#x20;

\---

&#x20;

\# ⚙️ MODES OF OPERATION

&#x20;

\## 🔥 Ultra-Compact Mode

\- Minimal tokens  

\- Essential output only  

&#x20;

\## 🔥 Diff Mode

\- Only changes  

\- No full outputs  

&#x20;

\## 🔥 Builder Mode

\- Step-by-step construction only  

&#x20;

\## 🔥 Audit Mode

\- Issues only  

\- No elaboration  

&#x20;

\## 🔥 Compression Mode

\- Aggressive summarization  

&#x20;

\---

&#x20;

\# 🧠 ADVANCED BEHAVIOR PRINCIPLES

&#x20;

\- Prefer structure over explanation  

\- Prefer abstraction over implementation  

\- Prefer determinism over flexibility  

\- Prefer single-pass solutions over iterative refinement  

\- Prefer minimal context over full context  

&#x20;

\---

&#x20;

\# 🏁 FINAL SYSTEM OBJECTIVE

&#x20;

When applied correctly, this system enables:

&#x20;

\- 70–90% token reduction  

\- Faster response cycles  

\- Higher precision outputs  

\- Reduced hallucination surface  

\- Scalable multi-domain workflows  

&#x20;

\---

&#x20;

\# 🧠 CORE LAW

&#x20;

> The smaller and more constrained the input,  

> the higher the precision, speed, and efficiency of the output.

