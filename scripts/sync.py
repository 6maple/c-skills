#!/usr/bin/env python3
"""Sync only c-* skills that directly map to mattpocock/skills.

The script intentionally does not add new upstream skills, update local-only
skills, rewrite upstream skill bodies, edit README files, or rebuild release
zips. Local path behavior is injected as a short instruction read from
`.claude/skills/c-shared/config.md`.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


UPSTREAM_URL = "https://github.com/mattpocock/skills.git"
UPSTREAM_REF = "origin/main"
CONFIG_PATH = ".claude/skills/c-shared/config.md"
GIT_DIR_NAME = ".git"
HIDDEN_GIT_DIR_NAME = ".git-lock"
WARNING = "\033[33m"
ERROR = "\033[31m"
RESET = "\033[0m"


@dataclass(frozen=True)
class SkillMapping:
    local: str
    upstream_path: str
    upstream_name: str


MAPPED_SKILLS: tuple[SkillMapping, ...] = (
    SkillMapping(
        "c-arch",
        "skills/engineering/improve-codebase-architecture",
        "improve-codebase-architecture",
    ),
    SkillMapping("c-fix", "skills/engineering/diagnose", "diagnose"),
    SkillMapping("c-grill", "skills/engineering/grill-with-docs", "grill-with-docs"),
    SkillMapping("c-handoff", "skills/productivity/handoff", "handoff"),
    SkillMapping("c-issues", "skills/engineering/to-issues", "to-issues"),
    SkillMapping("c-prd", "skills/engineering/to-prd", "to-prd"),
    SkillMapping("c-prototype", "skills/engineering/prototype", "prototype"),
    SkillMapping("c-review", "skills/in-progress/review", "review"),
    SkillMapping("c-tdd", "skills/engineering/tdd", "tdd"),
    SkillMapping("c-zoom-out", "skills/engineering/zoom-out", "zoom-out"),
)


SHARED_NON_SKILL_DIRS = ("c-shared",)


def run(args: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(
        args,
        cwd=cwd,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout.strip()


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")


def print_warning(message: str) -> None:
    print(f"{WARNING}{message}{RESET}")


def print_error(message: str) -> None:
    print(f"{ERROR}{message}{RESET}", file=sys.stderr)


def load_sync_instruction(root: Path) -> str:
    config_text = read_text(root / CONFIG_PATH)
    match = re.search(
        r"\A\s*(<important>.*?</important>)\s*\Z", config_text, flags=re.DOTALL
    )
    if match is None:
        raise RuntimeError(f"Expected a single <important> block in {CONFIG_PATH}")

    raw = match.group(1).strip()
    if not raw:
        raise RuntimeError(f"Empty <important> block in {CONFIG_PATH}")

    return raw


def ensure_upstream(cache_dir: Path, ref: str, fetch: bool) -> str:
    git_dir = cache_dir / GIT_DIR_NAME
    hidden_git_dir = cache_dir / HIDDEN_GIT_DIR_NAME

    if not cache_dir.exists():
        if not fetch:
            raise RuntimeError(f"Upstream cache does not exist: {cache_dir}")
        cache_dir.parent.mkdir(parents=True, exist_ok=True)
        run(["git", "clone", UPSTREAM_URL, str(cache_dir)])
        git_dir.rename(hidden_git_dir)
    elif git_dir.is_dir():
        if hidden_git_dir.exists():
            raise RuntimeError(
                f"Both {GIT_DIR_NAME} and {HIDDEN_GIT_DIR_NAME} exist in cache: {cache_dir}"
            )
        git_dir.rename(hidden_git_dir)

    if not hidden_git_dir.is_dir():
        raise RuntimeError(
            f"Cache path exists but is not a git repository: {cache_dir}"
        )

    git_args = ["git", "--git-dir", HIDDEN_GIT_DIR_NAME, "--work-tree", "."]
    if fetch:
        run([*git_args, "fetch", "--prune", "origin"], cwd=cache_dir)

    run([*git_args, "checkout", "--detach", ref], cwd=cache_dir)
    return run([*git_args, "rev-parse", "HEAD"], cwd=cache_dir)


def copy_mapped_skill(root: Path, upstream_root: Path, mapping: SkillMapping) -> None:
    source = upstream_root / mapping.upstream_path
    destination = root / ".claude" / "skills" / mapping.local

    if not source.is_dir():
        raise RuntimeError(f"Mapped upstream skill does not exist: {source}")
    if not destination.parent.is_dir():
        raise RuntimeError(
            f"Local skills directory does not exist: {destination.parent}"
        )

    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination)


def backup_mapped_skills(root: Path, backup_root: Path) -> None:
    for mapping in MAPPED_SKILLS:
        source = root / ".claude" / "skills" / mapping.local
        destination = backup_root / mapping.local
        if source.exists():
            shutil.copytree(source, destination)


def restore_mapped_skills(root: Path, backup_root: Path) -> None:
    for mapping in MAPPED_SKILLS:
        destination = root / ".claude" / "skills" / mapping.local
        backup = backup_root / mapping.local
        if destination.exists():
            shutil.rmtree(destination)
        if backup.exists():
            shutil.copytree(backup, destination)


def replace_required(text: str, old: str, new: str, path: Path) -> str:
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old!r}")
    return text.replace(old, new, 1)


def adapt_frontmatter(root: Path, mapping: SkillMapping) -> None:
    path = root / ".claude" / "skills" / mapping.local / "SKILL.md"
    text = read_text(path)
    text = replace_required(
        text, f"name: {mapping.upstream_name}", f"name: {mapping.local}", path
    )
    if "disable-model-invocation: true" not in text:
        text = replace_required(
            text, "\n---\n", "\ndisable-model-invocation: true\n---\n", path
        )
    write_text(path, text)


def insert_instruction_after_frontmatter(
    root: Path, mapping: SkillMapping, instruction: str
) -> None:
    path = root / ".claude" / "skills" / mapping.local / "SKILL.md"
    text = read_text(path)
    if instruction in text:
        return

    match = re.match(r"\A(---\n.*?\n---\n)(.*)\Z", text, flags=re.DOTALL)
    if match is None:
        raise RuntimeError(f"Expected YAML frontmatter in {path}")

    rewritten = (
        match.group(1) + "\n" + instruction.strip() + "\n\n" + match.group(2).lstrip()
    )
    write_text(path, rewritten)


def adapt_local_skill_references(root: Path, local_skill: str) -> None:
    skill_dir = root / ".claude" / "skills" / local_skill
    replacements = {
        "../grill-with-docs/": "../c-grill/",
        "/grill-with-docs": "c-grill",
        "/improve-codebase-architecture": "c-arch",
    }
    for path in skill_dir.rglob("*.md"):
        text = read_text(path)
        rewritten = text
        for old, new in replacements.items():
            rewritten = rewritten.replace(old, new)
        if rewritten != text:
            write_text(path, rewritten)


def validate_plugin_paths(root: Path) -> list[str]:
    plugin_path = root / ".claude-plugin" / "plugin.json"
    data = json.loads(read_text(plugin_path))
    missing: list[str] = []
    for relative in data["skills"]:
        if not (root / relative).exists():
            missing.append(relative)
    return missing


def list_local_only_skills(root: Path) -> list[str]:
    mapped = {mapping.local for mapping in MAPPED_SKILLS}
    shared_non_skill = set(SHARED_NON_SKILL_DIRS)
    skills_dir = root / ".claude" / "skills"
    local_only = []
    for child in sorted(skills_dir.iterdir()):
        if (
            child.is_dir()
            and child.name not in mapped
            and child.name not in shared_non_skill
        ):
            local_only.append(child.name)
    return local_only


def print_reminders(root: Path, upstream_commit: str) -> None:
    local_only = list_local_only_skills(root)
    print()
    print(f"Synced mapped skills from {UPSTREAM_URL} at {upstream_commit}.")
    print("Only directly mapped skills were updated.")
    print()
    print_warning("Reminder: review and update local-only skills manually:")
    for name in local_only:
        print_warning(f"- {name} (local-only)")
    if not local_only:
        print_warning("- No local-only skills found.")
    print()
    print_warning(
        "Also review README.md, README.zh-CN.md, and release zip packaging if this is a release."
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync only mapped c-* skills from mattpocock/skills."
    )
    parser.add_argument(
        "--ref",
        default=UPSTREAM_REF,
        help=f"Git ref to sync from. Default: {UPSTREAM_REF}",
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=repo_root() / ".cache" / "mattpocock-skills",
        help="Local clone/cache directory for upstream.",
    )
    parser.add_argument(
        "--no-fetch",
        action="store_true",
        help="Use the existing upstream cache without fetching from origin.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = repo_root()
    cache_dir = args.cache_dir.resolve()

    try:
        instruction = load_sync_instruction(root)
        upstream_commit = ensure_upstream(cache_dir, args.ref, fetch=not args.no_fetch)
        with tempfile.TemporaryDirectory(
            prefix="c-skills-sync-backup-"
        ) as backup_dir_name:
            backup_root = Path(backup_dir_name)
            backup_mapped_skills(root, backup_root)
            try:
                for mapping in MAPPED_SKILLS:
                    copy_mapped_skill(root, cache_dir, mapping)
                    adapt_frontmatter(root, mapping)
                    insert_instruction_after_frontmatter(root, mapping, instruction)
                    adapt_local_skill_references(root, mapping.local)

                missing = validate_plugin_paths(root)
                if missing:
                    raise RuntimeError(
                        "Missing plugin skill paths: " + ", ".join(missing)
                    )

            except Exception:
                restore_mapped_skills(root, backup_root)
                raise

        print_reminders(root, upstream_commit)
        return 0
    except Exception as error:
        print_error(f"sync failed: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
