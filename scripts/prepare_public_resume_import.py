#!/usr/bin/env python3
"""Prepare sanitized public educational resume examples for a controlled Convex import."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import fitz

SKILL_PATTERNS = [
    ("Python", r"\bpython\b"),
    ("Java", r"\bjava\b"),
    ("JavaScript", r"\bjavascript\b"),
    ("TypeScript", r"\btypescript\b"),
    ("Node.js", r"\bnode(?:\.js)?\b"),
    ("React", r"\breact\b"),
    ("SQL", r"\bsql\b"),
    ("PostgreSQL", r"\bpostgres(?:ql)?\b"),
    ("AWS", r"\baws\b|amazon web services"),
    ("Machine Learning", r"machine learning"),
    ("Data Analysis", r"data analy"),
    ("C++", r"c\+\+"),
    ("C", r"\bc\b"),
    ("MATLAB", r"\bmatlab\b"),
    ("Excel", r"\bexcel\b"),
    ("Power BI", r"power bi"),
    ("Tableau", r"\btableau\b"),
    ("Git", r"\bgit\b"),
    ("Docker", r"\bdocker\b"),
    ("Linux", r"\blinux\b"),
    ("R", r"\br\b"),
    ("HTML", r"\bhtml\b"),
    ("CSS", r"\bcss\b"),
]

EMAIL = re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b")
PHONE = re.compile(r"(?:\+?\d[\d().\-\s]{6,}\d)")
URL = re.compile(r"(?:https?://|www\.|linkedin\.com/|github\.com/)\S+", re.IGNORECASE)

# These are deliberately fictional demo identities. They replace source-document headers
# so no sample-document identity is represented as a real applicant in the database.
DEMO_IDENTITIES = {
    "01": ("Aarav Mehta", "Mumbai, Maharashtra, India"),
    "02": ("Emily Carter", "Chicago, Illinois, USA"),
    "03": ("Rohan Kapoor", "Bengaluru, Karnataka, India"),
    "04": ("Sophia Bennett", "New York, New York, USA"),
    "05": ("Arjun Patel", "Toronto, Ontario, Canada"),
    "06": ("Olivia Thompson", "Seattle, Washington, USA"),
    "07": ("Karan Malhotra", "Austin, Texas, USA"),
    "08": ("Daniel Brooks", "San Francisco, California, USA"),
    "09": ("Priya Nair", "Boston, Massachusetts, USA"),
    "10": ("Ethan Walker", "Houston, Texas, USA"),
    "11": ("Ananya Iyer", "Chicago, Illinois, USA"),
    "12": ("Michael Reynolds", "Pittsburgh, Pennsylvania, USA"),
}


def sanitize_resume_text(text: str) -> str:
    """Remove contact/header content while retaining substantive resume sections."""
    lines = [line.strip() for line in text.replace("\u00a0", " ").splitlines() if line.strip()]
    education_index = next((index for index, line in enumerate(lines) if line.upper().startswith("EDUCATION")), None)
    if education_index is not None:
        lines = lines[education_index:]
    else:
        lines = lines[3:]

    sanitized_lines = []
    for line in lines:
        line = EMAIL.sub("[redacted-email]", line)
        line = PHONE.sub("[redacted-phone]", line)
        line = URL.sub("[redacted-url]", line)
        sanitized_lines.append(line)
    return "\n".join(sanitized_lines)


def discipline(entry_id: str) -> tuple[list[str], list[str]]:
    normalized = entry_id.lower()
    if "business" in normalized:
        return ["Business Analyst", "Operations Analyst"], ["Excel", "Data Analysis", "SQL"]
    if "cs" in normalized:
        return ["Software Engineer", "Backend Engineer"], ["Python", "Java", "C++", "SQL", "Git"]
    return ["Process Engineer", "Engineering Analyst"], ["MATLAB", "Python", "Data Analysis", "Excel"]


def experience_years(entry_id: str) -> int:
    normalized = entry_id.lower()
    if "freshman" in normalized:
        return 1
    if "sophomore" in normalized or "undergraduate" in normalized:
        return 2
    if "junior" in normalized or "consulting" in normalized or "research" in normalized:
        return 3
    return 4 if "senior" in normalized else 3


def extract_skills(text: str, defaults: list[str]) -> list[str]:
    lowered = text.lower()
    detected = [skill for skill, pattern in SKILL_PATTERNS if re.search(pattern, lowered)]
    return list(dict.fromkeys(detected or defaults))


def build_applicant(entry: dict[str, Any], resume_text: str) -> dict[str, Any]:
    target_roles, default_skills = discipline(entry["id"])
    sequence = entry["id"].split("-", 1)[0]
    name, location = DEMO_IDENTITIES[sequence]
    return {
        "publicId": f"public_resume_example_{entry['id'].replace('-', '_')}",
        "name": name,
        "targetRoles": target_roles,
        "skills": extract_skills(resume_text, default_skills),
        "resumeText": sanitize_resume_text(resume_text),
        "location": location,
        "remote": True,
        "experienceYears": experience_years(entry["id"]),
        "education": "Public educational resume example",
        "availability": "Example profile — not a real applicant",
        "projects": ["Imported public educational example for matching evaluation."],
        "evidenceLines": [
            "Public educational sample; not a real applicant profile.",
            "Contact details removed before database import.",
        ],
        "profileStory": "Public educational resume example imported for controlled applicant-matching evaluation.",
        "sourceKind": "public-educational-example",
        "sourceId": entry["id"],
        "sourceUrl": entry["sourceUrl"],
        "sourcePage": entry["sourcePage"],
        "sourceChecksum": entry["sha256"],
    }


def prepare(manifest_path: Path, include_pending_review: bool) -> list[dict[str, Any]]:
    root = manifest_path.parent
    manifest = json.loads(manifest_path.read_text())
    applicants = []
    for entry in manifest["entries"]:
        if entry["reviewStatus"] != "approved" and not include_pending_review:
            raise ValueError(f"{entry['id']} is not approved; pass --include-pending-review only after explicit user approval.")
        document = fitz.open(root / entry["file"])
        if document.page_count != 1:
            raise ValueError(f"{entry['id']} must be a one-page review PDF.")
        text = document[0].get_text("text")
        if len(text.strip()) < 200:
            raise ValueError(f"{entry['id']} has insufficient extractable text.")
        applicants.append(build_applicant(entry, text))
    return applicants


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="local-data/resume-review/manifest.json")
    parser.add_argument("--output", default=".tmp/public-resume-applicants.json")
    parser.add_argument("--include-pending-review", action="store_true")
    args = parser.parse_args()

    applicants = prepare(Path(args.manifest), args.include_pending_review)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(applicants, indent=2) + "\n")
    print(f"prepared {len(applicants)} sanitized applicant records at {output}")


if __name__ == "__main__":
    main()
