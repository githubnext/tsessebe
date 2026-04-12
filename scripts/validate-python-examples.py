#!/usr/bin/env python3
"""
Validate Python/pandas examples from playground HTML pages.

Extracts all <textarea class="playground-python"> blocks from playground HTML
files, runs each one with Python/pandas, and reports any failures.

Usage:
    python scripts/validate-python-examples.py [playground_dir]

Exit code 0 if all examples pass, 1 if any fail.
"""

import html
import os
import re
import subprocess
import sys
import tempfile
import time


def extract_python_blocks(html_file: str) -> list[tuple[str, str]]:
    """Extract Python code blocks from a playground HTML file.

    Returns a list of (section_label, code) tuples.
    """
    with open(html_file, "r", encoding="utf-8") as f:
        content = f.read()

    blocks: list[tuple[str, str]] = []

    # Find all playground-python textareas
    pattern = re.compile(
        r'<textarea\s+class="playground-python"[^>]*>(.*?)</textarea>',
        re.DOTALL,
    )

    # Also find section headings to label blocks
    section_pattern = re.compile(r"<h2>(.*?)</h2>", re.DOTALL)
    sections = section_pattern.findall(content)

    for i, match in enumerate(pattern.finditer(content)):
        code = html.unescape(match.group(1))
        # Try to find the closest preceding section heading
        label = sections[i] if i < len(sections) else f"block_{i}"
        # Strip HTML tags from label
        label = re.sub(r"<[^>]+>", "", label).strip()
        blocks.append((label, code))

    return blocks


def run_python_block(code: str, label: str, html_file: str) -> tuple[bool, str, float]:
    """Run a Python code block and return (success, output, elapsed_ms)."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as f:
        f.write(code)
        tmp_path = f.name

    try:
        start = time.perf_counter()
        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000

        if result.returncode != 0:
            return (
                False,
                f"STDERR:\n{result.stderr}\nSTDOUT:\n{result.stdout}",
                elapsed_ms,
            )
        return True, result.stdout, elapsed_ms
    except subprocess.TimeoutExpired:
        return False, "TIMEOUT (30s)", 0.0
    finally:
        os.unlink(tmp_path)


def main() -> int:
    playground_dir = sys.argv[1] if len(sys.argv) > 1 else "playground"

    if not os.path.isdir(playground_dir):
        print(f"Error: directory '{playground_dir}' not found", file=sys.stderr)
        return 1

    html_files = sorted(
        f
        for f in os.listdir(playground_dir)
        if f.endswith(".html") and f != "index.html"
    )

    total = 0
    passed = 0
    failed = 0
    failures: list[str] = []

    for html_file in html_files:
        filepath = os.path.join(playground_dir, html_file)
        blocks = extract_python_blocks(filepath)

        if not blocks:
            continue

        print(f"\n{'='*60}")
        print(f"  {html_file} ({len(blocks)} Python blocks)")
        print(f"{'='*60}")

        for i, (label, code) in enumerate(blocks):
            total += 1
            success, output, elapsed_ms = run_python_block(
                code, label, html_file
            )

            if success:
                passed += 1
                print(f"  ✅ [{i+1}] {label} ({elapsed_ms:.1f}ms)")
            else:
                failed += 1
                fail_msg = f"  ❌ [{i+1}] {label} in {html_file}"
                print(fail_msg)
                print(f"     {output[:200]}")
                failures.append(f"{html_file} [{i+1}] {label}")

    print(f"\n{'='*60}")
    print(f"  Results: {passed}/{total} passed, {failed} failed")
    print(f"{'='*60}")

    if failures:
        print("\nFailed examples:")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("\n✅ All Python examples validated successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
