#!/usr/bin/env python3
"""Clean stale configured documentation assets.

Default mode is interactive: list candidates, ask for confirmation, then delete.
Use -y/--yes for non-interactive deletion.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path.cwd()
CONFIG_PATH = Path(".claude/skills/c-shared/config.md")


@dataclass(frozen=True)
class DocsConfig:
    root_dir: Path
    context_file: Path
    adr_dir: Path
    prd_dir: Path
    issues_dir: Path
    handoff_file: Path


@dataclass(frozen=True)
class Candidate:
    path: Path
    reason: str


def read_config(path: Path = CONFIG_PATH) -> DocsConfig:
    if not path.exists():
        raise SystemExit(f"config not found: {path}")

    raw = path.read_text(encoding="utf-8")
    root = ET.fromstring(raw)
    docs = root.find("docs")
    if docs is None:
        raise SystemExit(f"config missing <docs>: {path}")

    def required(name: str) -> Path:
        node = docs.find(name)
        if node is None or not node.text or not node.text.strip():
            raise SystemExit(f"config missing <docs><{name}>: {path}")
        return Path(node.text.strip())

    return DocsConfig(
        root_dir=required("root_dir"),
        context_file=required("context_file"),
        adr_dir=required("adr_dir"),
        prd_dir=required("prd_dir"),
        issues_dir=required("issues_dir"),
        handoff_file=required("handoff_file"),
    )


def is_inside(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def safe_doc_path(path: Path, config: DocsConfig) -> Path:
    resolved = (ROOT / path).resolve()
    root = (ROOT / config.root_dir).resolve()
    if not is_inside(resolved, root):
        raise SystemExit(f"refusing path outside docs root: {path}")
    return resolved


def markdown_files(root: Path) -> Iterable[Path]:
    if not root.exists():
        return []
    return sorted(p for p in root.rglob("*.md") if p.is_file())


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(errors="replace")


def age_days(path: Path, now: dt.datetime) -> int:
    mtime = dt.datetime.fromtimestamp(path.stat().st_mtime)
    return max(0, (now - mtime).days)


def extract_status(text: str) -> str | None:
    patterns = [
        r"(?im)^status:\s*([a-zA-Z_-]+)\s*$",
        r"(?im)^-\s*status:\s*([a-zA-Z_-]+)\s*$",
        r"(?im)^##\s+Status\s*\n\s*([a-zA-Z_-]+)",
    ]
    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            return m.group(1).strip().lower()
    return None


def active_issue_texts(issues_dir: Path) -> list[tuple[Path, str]]:
    active = []
    for issue in markdown_files(issues_dir):
        if issue.name.startswith("."):
            continue
        text = read_text(issue)
        status = extract_status(text) or "todo"
        if status in {"todo", "doing", "blocked", "proposed", "ready"}:
            active.append((issue, text))
    return active


def referenced_by_active_issue(path: Path, active_issues: list[tuple[Path, str]], root: Path) -> bool:
    rel = path.relative_to(root).as_posix()
    names = {path.name, path.stem, rel}
    for _, text in active_issues:
        if any(name in text for name in names):
            return True
    return False


def collect_candidates(config: DocsConfig, *, done_days: int, prd_days: int, adr_days: int, handoff_days: int) -> list[Candidate]:
    now = dt.datetime.now()
    root = safe_doc_path(config.root_dir, config)
    issues_dir = safe_doc_path(config.issues_dir, config)
    prd_dir = safe_doc_path(config.prd_dir, config)
    adr_dir = safe_doc_path(config.adr_dir, config)
    handoff_file = safe_doc_path(config.handoff_file, config)
    context_file = safe_doc_path(config.context_file, config)

    candidates: list[Candidate] = []

    # Done issues are execution state, not long-term docs.
    for issue in markdown_files(issues_dir):
        if issue.name.startswith("."):
            continue
        text = read_text(issue)
        if (extract_status(text) or "").lower() == "done" and age_days(issue, now) >= done_days:
            candidates.append(Candidate(issue, f"done issue; age={age_days(issue, now)}d >= {done_days}d"))

    active = active_issue_texts(issues_dir)

    # PRDs not referenced by active issues tend to become stale intent documents.
    for prd in markdown_files(prd_dir):
        if prd.name.startswith("."):
            continue
        if "template" in prd.name.lower():
            continue
        if age_days(prd, now) >= prd_days and not referenced_by_active_issue(prd, active, root):
            candidates.append(Candidate(prd, f"orphan PRD; no active issue reference; age={age_days(prd, now)}d >= {prd_days}d"))

    # Superseded ADRs are safe cleanup candidates after the replacement has settled.
    for adr in markdown_files(adr_dir):
        if adr.name.startswith(".") or "template" in adr.name.lower():
            continue
        text = read_text(adr)
        if (extract_status(text) or "").lower() == "superseded" and age_days(adr, now) >= adr_days:
            candidates.append(Candidate(adr, f"superseded ADR; age={age_days(adr, now)}d >= {adr_days}d"))

    # Handoff is a single ephemeral hint. Old content should be removed or regenerated.
    if handoff_file.exists() and handoff_file != context_file and age_days(handoff_file, now) >= handoff_days:
        text = read_text(handoff_file).strip()
        if text and not text.startswith("# Handoff\n\nNo active handoff."):
            candidates.append(Candidate(handoff_file, f"stale handoff; age={age_days(handoff_file, now)}d >= {handoff_days}d"))

    return sorted(candidates, key=lambda c: c.path.as_posix())


def delete_candidate(candidate: Candidate, config: DocsConfig) -> None:
    safe_doc_path(candidate.path.relative_to(ROOT) if candidate.path.is_absolute() else candidate.path, config)
    candidate.path.unlink()


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Clean stale configured documentation assets.")
    parser.add_argument("-y", "--yes", action="store_true", help="Delete without interactive confirmation.")
    parser.add_argument("--done-days", type=int, default=14, help="Delete done issues at least this many days old. Default: 14.")
    parser.add_argument("--prd-days", type=int, default=30, help="Delete orphan PRDs at least this many days old. Default: 30.")
    parser.add_argument("--adr-days", type=int, default=90, help="Delete superseded ADRs at least this many days old. Default: 90.")
    parser.add_argument("--handoff-days", type=int, default=7, help="Delete stale handoff at least this many days old. Default: 7.")
    args = parser.parse_args(argv)

    config = read_config()
    candidates = collect_candidates(
        config,
        done_days=args.done_days,
        prd_days=args.prd_days,
        adr_days=args.adr_days,
        handoff_days=args.handoff_days,
    )

    if not candidates:
        print("doc-hygiene: no cleanup candidates")
        return 0

    print("doc-hygiene: cleanup candidates")
    for idx, candidate in enumerate(candidates, 1):
        rel = candidate.path.relative_to(ROOT) if candidate.path.is_absolute() else candidate.path
        print(f"{idx}. {rel} — {candidate.reason}")

    if not args.yes:
        answer = input("Delete these files? Type 'y' to confirm: ").strip().lower()
        if answer != "y":
            print("doc-hygiene: cancelled")
            return 1

    for candidate in candidates:
        delete_candidate(candidate, config)
        rel = candidate.path.relative_to(ROOT) if candidate.path.is_absolute() else candidate.path
        print(f"deleted: {rel}")

    print(f"doc-hygiene: deleted {len(candidates)} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
