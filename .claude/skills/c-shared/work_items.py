#!/usr/bin/env python3
"""Minimal work item lifecycle tool.

Stdlib-only. Mechanical file/index management only.
No semantic search, no history summarization, no fact judgment.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

CONFIG = Path(".claude/skills/c-shared/config.md")
DEFAULTS = {
    "work_items_dir": ".docs/work-items",
    "work_items_index": ".docs/work-items/INDEX.csv",
    "work_items_active_dir": ".docs/work-items/active",
    "work_items_archive_dir": ".docs/work-items/archive",
    "work_item_template": ".docs/work-items/.template.md",
}
STATUSES = {"active", "handed-off", "blocked", "done", "stale", "invalid"}
FINAL_STATUSES = {"done", "stale", "invalid"}
MAX_RECENT_ARCHIVED = 10


def extract_config_block(text: str) -> str:
    m = re.search(r"<config\b[^>]*>.*?</config>", text, re.DOTALL)
    return m.group(0) if m else ""


def load_paths() -> dict[str, Path]:
    values = dict(DEFAULTS)
    try:
        block = extract_config_block(CONFIG.read_text(encoding="utf-8"))
        if block:
            root = ET.fromstring(block)
            for key in DEFAULTS:
                value = root.findtext(f"./docs/{key}")
                if value and value.strip():
                    values[key] = value.strip()
    except Exception:
        pass
    return {k: Path(v) for k, v in values.items()}


def ensure_dirs(paths: dict[str, Path]) -> None:
    paths["work_items_dir"].mkdir(parents=True, exist_ok=True)
    paths["work_items_active_dir"].mkdir(parents=True, exist_ok=True)
    paths["work_items_archive_dir"].mkdir(parents=True, exist_ok=True)
    paths["work_items_index"].parent.mkdir(parents=True, exist_ok=True)


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def slugify(title: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", title.strip().lower()).strip("-._")
    return slug[:60] or "work-item"


def safe_resolve(path: Path) -> Path:
    return path.expanduser().resolve(strict=False)


def is_under(path: Path, root: Path) -> bool:
    try:
        safe_resolve(path).relative_to(safe_resolve(root))
        return True
    except ValueError:
        return False


def allowed_roots(paths: dict[str, Path], include_archive: bool) -> list[Path]:
    roots = [paths["work_items_active_dir"]]
    if include_archive:
        roots.append(paths["work_items_archive_dir"])
    return roots


def in_allowed_roots(path: Path, paths: dict[str, Path], include_archive: bool) -> bool:
    return any(is_under(path, root) for root in allowed_roots(paths, include_archive))


def rel(path: Path) -> str:
    try:
        return path.relative_to(Path.cwd()).as_posix()
    except ValueError:
        return path.as_posix()


def parse_item(path: Path) -> dict[str, str]:
    text = read(path)
    title = path.stem
    m = re.search(r"^#\s+Work Item:\s*(.+)$", text, re.MULTILINE)
    if not m:
        m = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    if m:
        title = m.group(1).strip()

    item_id = path.stem
    m = re.search(r"^ID:\s*(\S+)\s*$", text, re.MULTILINE)
    if m:
        item_id = m.group(1).strip()

    status = "unknown"
    m = re.search(r"^Status:\s*([^\n|]+)", text, re.MULTILINE)
    if m:
        status = m.group(1).strip()

    try:
        updated = dt.datetime.fromtimestamp(path.stat().st_mtime).date().isoformat()
    except OSError:
        updated = ""

    return {
        "id": item_id,
        "status": status,
        "title": title,
        "path": rel(path),
        "updated": updated,
    }


def md_files(base: Path, recursive: bool = False) -> list[Path]:
    if not base.exists():
        return []
    files = base.rglob("*.md") if recursive else base.glob("*.md")
    return sorted([p for p in files if p.is_file() and not p.name.startswith(".")])


def active_items(paths: dict[str, Path]) -> list[dict[str, str]]:
    return [parse_item(p) for p in md_files(paths["work_items_active_dir"])]


def archived_items(paths: dict[str, Path], limit: int | None = MAX_RECENT_ARCHIVED) -> list[dict[str, str]]:
    files = md_files(paths["work_items_archive_dir"], recursive=True)
    files.sort(key=lambda p: p.stat().st_mtime if p.exists() else 0, reverse=True)
    if limit is not None:
        files = files[:limit]
    return [parse_item(p) for p in files]


def csv_cell(value: str) -> str:
    return value.replace("\r", " ").replace("\n", " ").strip()


def rebuild_index(paths: dict[str, Path]) -> None:
    active = active_items(paths)
    archived = archived_items(paths)
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(["bucket", "id", "status", "title", "path", "updated"])
    for bucket, items in (("active", active), ("recent-archived", archived)):
        for item in items:
            writer.writerow([
                bucket,
                csv_cell(item["id"]),
                csv_cell(item["status"]),
                csv_cell(item["title"]),
                csv_cell(item["path"]),
                csv_cell(item["updated"]),
            ])
    write(paths["work_items_index"], out.getvalue())


def print_list(paths: dict[str, Path]) -> None:
    rebuild_index(paths)
    active = active_items(paths)
    archived = archived_items(paths)
    print(f"work-items(active={len(active)}, archived_recent={len(archived)})")
    if active:
        print("\nactive:")
        for item in active:
            print(f"- {item['id']} {item['status']} {item['title']} {item['path']}")
    if archived:
        print("\nrecent-archived:")
        for item in archived:
            print(f"- {item['id']} {item['status']} {item['title']} {item['path']}")
    risks = []
    if len(active) > 1:
        risks.append("active > 1; select one before reading details")
    bad = [x for x in active if x["status"] not in STATUSES]
    if bad:
        risks.append("invalid status in active work item")
    final = [x for x in active if x["status"] in FINAL_STATUSES]
    if final:
        risks.append("final status still in active dir; archive it")
    if risks:
        print("\nrisk:")
        for r in risks:
            print(f"- {r}")


def new_id() -> str:
    return "WI-" + dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")


def create(paths: dict[str, Path], title: str) -> None:
    wid = new_id()
    name = f"{dt.date.today().isoformat()}-{slugify(title)}.md"
    path = paths["work_items_active_dir"] / name
    if path.exists():
        path = paths["work_items_active_dir"] / f"{dt.date.today().isoformat()}-{slugify(title)}-{wid[-6:]}.md"
    template = read(paths["work_item_template"])
    if not template:
        template = "# Work Item: <title>\n\nID: <id>\nStatus: active\n"
    text = template.replace("<title>", title.strip()).replace("<id>", wid)
    text = re.sub(r"^Status:.*$", "Status: active", text, count=1, flags=re.MULTILINE)
    if "Status:" not in text:
        text = text.rstrip() + "\nStatus: active\n"
    write(path, text)
    rebuild_index(paths)
    print(f"created: {wid} {rel(path)}")


def find_item(paths: dict[str, Path], key: str, include_archive: bool = True) -> Path | None:
    candidate = Path(key)
    if candidate.exists() and candidate.is_file():
        if not in_allowed_roots(candidate, paths, include_archive):
            return None
        return candidate

    files = md_files(paths["work_items_active_dir"])
    if include_archive:
        files += md_files(paths["work_items_archive_dir"], recursive=True)
    for path in files:
        item = parse_item(path)
        if key in {item["id"], path.stem, rel(path), path.name}:
            return path
    return None


def resolved_line(path: Path) -> str:
    item = parse_item(path)
    return f"resolved: {item['id']} {item['status']} {item['path']}"


def reject_final_in_active(path: Path, paths: dict[str, Path]) -> None:
    if is_under(path, paths["work_items_active_dir"]):
        item = parse_item(path)
        if item["status"] in FINAL_STATUSES:
            sys.exit(f"error: final status in active dir: {item['id']} {item['status']} {item['path']}")


def resolve(paths: dict[str, Path], key: str | None, active_only: bool) -> None:
    rebuild_index(paths)
    if key:
        path = find_item(paths, key, include_archive=not active_only)
        if not path:
            scope = "active work item" if active_only else "work item"
            sys.exit(f"error: {scope} not found: {key}")
        reject_final_in_active(path, paths)
        print(resolved_line(path))
        return

    active_paths = md_files(paths["work_items_active_dir"])
    if not active_paths:
        sys.exit("error: no active work item")
    if len(active_paths) > 1:
        print(f"error: multiple active work items: {len(active_paths)}")
        for path in active_paths:
            item = parse_item(path)
            print(f"- {item['id']} {item['status']} {item['title']} {item['path']}")
        sys.exit(2)
    path = active_paths[0]
    reject_final_in_active(path, paths)
    print(resolved_line(path))


def replace_status(text: str, status: str) -> str:
    if re.search(r"^Status:", text, re.MULTILINE):
        return re.sub(r"^Status:.*$", f"Status: {status}", text, count=1, flags=re.MULTILINE)
    return text.rstrip() + f"\nStatus: {status}\n"


def set_status(paths: dict[str, Path], key: str, status: str) -> None:
    if status not in STATUSES:
        sys.exit(f"error: invalid status: {status}")
    path = find_item(paths, key)
    if not path:
        sys.exit(f"error: work item not found: {key}")
    write(path, replace_status(read(path), status))
    rebuild_index(paths)
    print(f"status: {status} {rel(path)}")
    if status in FINAL_STATUSES and is_under(path, paths["work_items_active_dir"]):
        print("risk: final status remains in active dir; run archive")


def archive(paths: dict[str, Path], key: str) -> None:
    path = find_item(paths, key)
    if not path:
        sys.exit(f"error: work item not found: {key}")
    if not is_under(path, paths["work_items_active_dir"]):
        rebuild_index(paths)
        print(f"already-archived: {rel(path)}")
        return
    item = parse_item(path)
    text = read(path)
    if item["status"] not in FINAL_STATUSES:
        text = replace_status(text, "done")
    year = dt.date.today().strftime("%Y")
    dest = paths["work_items_archive_dir"] / year / path.name
    i = 2
    while dest.exists():
        dest = paths["work_items_archive_dir"] / year / f"{path.stem}-{i}{path.suffix}"
        i += 1
    write(dest, text)
    path.unlink()
    rebuild_index(paths)
    print(f"archived: {item['id']} {rel(dest)}")


def validate(paths: dict[str, Path]) -> None:
    rebuild_index(paths)
    active = active_items(paths)
    archived = archived_items(paths, limit=None)
    risks: list[str] = []
    if len(active) > 5:
        risks.append("active work items > 5")
    if len(active) > 1:
        risks.append("multiple active work items; select one before reading details")
    for item in active:
        if item["status"] not in STATUSES:
            risks.append(f"invalid active status: {item['id']}")
        if item["status"] in FINAL_STATUSES:
            risks.append(f"final status still in active dir: {item['id']}")
    for item in archived:
        if item["status"] not in FINAL_STATUSES:
            risks.append(f"non-final status in archive: {item['id']} {item['status']}")
    print(f"validate: active={len(active)} archived={len(archived)}")
    if risks:
        print("risk:")
        for r in risks:
            print(f"- {r}")
    else:
        print("ok")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Minimal work item lifecycle tool")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list")
    p = sub.add_parser("resolve")
    p.add_argument("key", nargs="?")
    p.add_argument("--active-only", action="store_true")
    p = sub.add_parser("create")
    p.add_argument("--title", required=True)
    p = sub.add_parser("set-status")
    p.add_argument("key")
    p.add_argument("status")
    p = sub.add_parser("archive")
    p.add_argument("key")
    sub.add_parser("validate")

    args = parser.parse_args(argv)
    paths = load_paths()
    ensure_dirs(paths)

    if args.cmd == "list":
        print_list(paths)
    elif args.cmd == "resolve":
        resolve(paths, args.key, args.active_only)
    elif args.cmd == "create":
        create(paths, args.title)
    elif args.cmd == "set-status":
        set_status(paths, args.key, args.status)
    elif args.cmd == "archive":
        archive(paths, args.key)
    elif args.cmd == "validate":
        validate(paths)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
