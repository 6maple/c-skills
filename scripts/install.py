#!/usr/bin/env python3
"""Install c-skills into the current working directory."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


REPO_URL = "https://github.com/6maple/c-skills.git"
CACHE_RELATIVE_PATH = Path(".cache") / "c-skills"
GIT_DIR_NAME = ".git"
HIDDEN_GIT_DIR_NAME = ".git-lock"
LOCK_RELATIVE_PATH = Path("lock.json")
SOURCE_SKILLS_RELATIVE_PATH = Path(".claude") / "skills"
AGENT_SKILLS_PATHS = {
    "claude": Path(".claude") / "skills",
    "codex": Path(".agent") / "skills",
}
DOCS_RELATIVE_PATH = Path(".docs")
WARNING_COLOR = "\033[33m"
RESET_COLOR = "\033[0m"


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


def ensure_inside_root(path: Path, root: Path) -> Path:
    resolved = path.resolve()
    resolved.relative_to(root)
    return resolved


def sync_repo(cache_dir: Path) -> None:
    git_dir = cache_dir / GIT_DIR_NAME
    hidden_git_dir = cache_dir / HIDDEN_GIT_DIR_NAME

    if cache_dir.exists():
        if git_dir.is_dir():
            if hidden_git_dir.exists():
                raise RuntimeError(f"Both {GIT_DIR_NAME} and {HIDDEN_GIT_DIR_NAME} exist in cache: {cache_dir}")
            git_dir.rename(hidden_git_dir)
        if not hidden_git_dir.is_dir():
            raise RuntimeError(f"Cache path exists but is not a git repository: {cache_dir}")
        run(["git", "--git-dir", HIDDEN_GIT_DIR_NAME, "--work-tree", ".", "fetch", "--prune", "origin"], cwd=cache_dir)
        run(["git", "--git-dir", HIDDEN_GIT_DIR_NAME, "--work-tree", ".", "reset", "--hard", "origin/main"], cwd=cache_dir)
        return

    cache_dir.parent.mkdir(parents=True, exist_ok=True)
    run(["git", "clone", REPO_URL, str(cache_dir)])
    git_dir.rename(hidden_git_dir)


def load_lock(path: Path) -> dict[str, object]:
    if not path.exists():
        return {"agents": {}}

    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError(f"Invalid lock file: {path}")
    if "agents" not in data:
        data["agents"] = {}
    if not isinstance(data["agents"], dict):
        raise RuntimeError(f"Invalid lock file agents field: {path}")
    return data


def write_lock(path: Path, data: dict[str, object]) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def copy_skills_with_lock(source: Path, destination: Path, lock_path: Path, agent: str) -> list[str]:
    if not source.is_dir():
        raise RuntimeError(f"Source directory does not exist: {source}")

    lock_data = load_lock(lock_path)
    agents = lock_data["agents"]
    agent_lock = agents.get(agent, {})
    if not isinstance(agent_lock, dict):
        raise RuntimeError(f"Invalid lock file entry for agent: {agent}")

    old_skills = agent_lock.get("skills", [])
    if not isinstance(old_skills, list) or not all(isinstance(name, str) for name in old_skills):
        raise RuntimeError(f"Invalid locked skills for agent: {agent}")

    destination.mkdir(parents=True, exist_ok=True)
    for name in old_skills:
        old_path = destination / name
        if old_path.exists():
            if not old_path.is_dir():
                raise RuntimeError(f"Locked skill path exists but is not a directory: {old_path}")
            shutil.rmtree(old_path)

    skill_names = sorted(child.name for child in source.iterdir() if child.is_dir())
    for name in skill_names:
        source_path = source / name
        destination_path = destination / name
        if destination_path.exists():
            raise RuntimeError(
                f"Skill already exists and is not managed by lock: {destination_path}. "
                "Move or delete it manually, then run this script again."
            )
        shutil.copytree(source_path, destination_path)

    agents[agent] = {
        "skills_path": str(AGENT_SKILLS_PATHS[agent]).replace("\\", "/"),
        "skills": skill_names,
    }
    write_lock(lock_path, lock_data)
    return skill_names


def copy_docs_without_overwrite(source: Path, destination: Path) -> list[Path]:
    if not source.is_dir():
        raise RuntimeError(f"Source directory does not exist: {source}")

    warnings: list[Path] = []
    for source_path in source.rglob("*"):
        relative_path = source_path.relative_to(source)
        destination_path = destination / relative_path

        if source_path.is_dir():
            destination_path.mkdir(parents=True, exist_ok=True)
            continue

        destination_path.parent.mkdir(parents=True, exist_ok=True)
        if destination_path.exists():
            warnings.append(destination_path)
            continue

        shutil.copy2(source_path, destination_path)

    return warnings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Pull 6maple/c-skills into .cache/c-skills and install skills/docs for an agent."
    )
    parser.add_argument(
        "-a",
        "--agent",
        choices=sorted(AGENT_SKILLS_PATHS),
        required=True,
        help="Agent type to install for.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    execution_root = Path.cwd().resolve()

    try:
        cache_dir = ensure_inside_root(execution_root / CACHE_RELATIVE_PATH, execution_root)
        skills_destination = ensure_inside_root(execution_root / AGENT_SKILLS_PATHS[args.agent], execution_root)
        docs_destination = ensure_inside_root(execution_root / DOCS_RELATIVE_PATH, execution_root)

        sync_repo(cache_dir)

        skills_source = cache_dir / SOURCE_SKILLS_RELATIVE_PATH
        docs_source = cache_dir / DOCS_RELATIVE_PATH
        lock_path = cache_dir / LOCK_RELATIVE_PATH
        installed_skills = copy_skills_with_lock(skills_source, skills_destination, lock_path, args.agent)
        docs_warnings = copy_docs_without_overwrite(docs_source, docs_destination)

        print(f"Installed c-skills for {args.agent}.")
        print(f"Repository cache: {cache_dir}")
        print(f"Skills: {skills_destination} ({len(installed_skills)} skills)")
        print(f"Docs: {docs_destination}")
        for path in docs_warnings:
            print(
                f"{WARNING_COLOR}Warning: docs file already exists, skipped. "
                f"Review manually if updates are needed: {path}. "
                f"Also check whether c-shared/config.md needs updating.{RESET_COLOR}"
            )
        return 0
    except (OSError, RuntimeError, subprocess.CalledProcessError, ValueError) as error:
        print(f"install failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
