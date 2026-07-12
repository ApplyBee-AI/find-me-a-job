#!/usr/bin/env python3
"""Create a deterministic, safe demo dataset from scraped Lever jobs."""

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "lever-job-scraper" / "output" / "lever"
OUTPUT = ROOT / "sample-data"
RNG = random.Random(20260712)

FIRST_NAMES = [
    "Avery", "Jordan", "Morgan", "Riley", "Casey", "Taylor", "Cameron", "Quinn",
    "Reese", "Parker", "Rowan", "Skyler", "Emerson", "Hayden", "Blake",
]
LAST_NAMES = [
    "Rivera", "Morgan", "Chen", "Patel", "Nguyen", "Brooks", "Foster", "Ellis",
    "Santos", "Kim", "Diaz", "Reed", "Owens", "Bailey", "Hayes",
]
LOCATIONS = ["Remote", "Austin, TX", "New York, NY", "Seattle, WA", "Toronto, Canada"]
SAMPLE_EMPLOYERS = ["Northstar Labs", "Cedar Systems", "Atlas Works", "Brightline Studio", "Signal Forge"]


def read_jobs():
    jobs = []
    for path in SOURCE.rglob("*.json"):
        if path.name == "manifest.json":
            continue
        try:
            job = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        if isinstance(job, dict) and job.get("job_id_external"):
            jobs.append(job)
    if len(jobs) < 15:
        raise RuntimeError(f"Expected at least 15 scraped jobs, found {len(jobs)}")
    return jobs


def normalized_job(job):
    return {
        "externalId": job["job_id_external"],
        "platform": job["platform"],
        "company": job["company"],
        "title": job["job_title"],
        "location": job["location"],
        "jobUrl": job["job_url"],
        "applicationLink": job["application_link"],
        "summary": job["summary"],
        "requirements": job["requirements"],
        "skills": job["skills"],
        "jobType": job["job_type"],
        "employmentType": job["employment_type"],
        "experienceLevel": job["experience_level"],
        "isRemote": job["is_remote"],
        "postedDate": job["posted_date"],
        "isActive": job["is_active"],
    }


def synthetic_resume(index, job):
    first_name, last_name = FIRST_NAMES[index], LAST_NAMES[index]
    name = f"{first_name} {last_name}"
    skills = list(dict.fromkeys(job.get("skills", []) + ["Communication", "Problem Solving"]))[:8]
    years = RNG.randint(3, 10)
    employer = RNG.choice(SAMPLE_EMPLOYERS)
    return {
        "id": f"sample-resume-{index + 1:02d}",
        "synthetic": True,
        "name": name,
        "email": f"{first_name.lower()}.{last_name.lower()}@example.com",
        "location": RNG.choice(LOCATIONS),
        "headline": f"{job['job_title']} candidate",
        "yearsExperience": years,
        "skills": skills,
        "summary": (
            f"Synthetic demo resume for a {job['job_title']} role. "
            "This record contains no real applicant data."
        ),
        "experience": [
            {
                "company": employer,
                "title": f"Senior {job['job_title']}",
                "years": min(years, 5),
                "highlights": [
                    "Delivered production features with a cross-functional team.",
                    "Improved reliability and developer workflow through automation.",
                ],
            },
            {
                "company": "Demo Product Co.",
                "title": "Software Engineer",
                "years": max(1, years - min(years, 5)),
                "highlights": ["Built and maintained customer-facing product capabilities."],
            },
        ],
        "education": {"institution": "Example University", "degree": "B.S. Computer Science"},
        "targetJobExternalId": job["job_id_external"],
    }


def main():
    selected = RNG.sample(read_jobs(), 15)
    jobs = [normalized_job(job) for job in selected]
    resumes = [synthetic_resume(index, job) for index, job in enumerate(selected)]

    OUTPUT.mkdir(exist_ok=True)
    (OUTPUT / "jobs.json").write_text(json.dumps(jobs, indent=2) + "\n")
    (OUTPUT / "resumes.json").write_text(json.dumps(resumes, indent=2) + "\n")
    print(f"Wrote {len(jobs)} jobs and {len(resumes)} synthetic resumes to {OUTPUT}")


if __name__ == "__main__":
    main()
