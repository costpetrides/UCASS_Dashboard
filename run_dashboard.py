#!/usr/bin/env python3
"""Rebuild index.html from folders, then serve the dashboard."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Build and serve UCASS dashboard")
    parser.add_argument("--port", type=int, default=8000, help="HTTP port (default: 8000)")
    parser.add_argument("--no-open", action="store_true", help="Do not open browser")
    args = parser.parse_args()

    build_script = ROOT / "build_dashboard.py"
    subprocess.run([sys.executable, str(build_script)], check=True, cwd=ROOT)

    url = f"http://127.0.0.1:{args.port}/index.html"
    print(f"Serving dashboard at {url}")
    print("Press Ctrl+C to stop.")

    if not args.no_open:
        subprocess.Popen(["open", url])

    subprocess.run(
        [sys.executable, "-m", "http.server", str(args.port)],
        cwd=ROOT,
    )


if __name__ == "__main__":
    main()
