import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DIR = ROOT / "sample-data"


class SampleDataTest(unittest.TestCase):
    def test_sample_dataset_has_15_unique_jobs_and_synthetic_resumes(self):
        jobs = json.loads((SAMPLE_DIR / "jobs.json").read_text())
        resumes = json.loads((SAMPLE_DIR / "resumes.json").read_text())

        self.assertEqual(15, len(jobs))
        self.assertEqual(15, len(resumes))
        self.assertEqual(15, len({job["externalId"] for job in jobs}))
        self.assertEqual(15, len({resume["id"] for resume in resumes}))
        self.assertEqual(
            {job["externalId"] for job in jobs},
            {resume["targetJobExternalId"] for resume in resumes},
        )
        self.assertTrue(all(resume["email"].endswith("@example.com") for resume in resumes))
        self.assertTrue(all(resume["synthetic"] is True for resume in resumes))


if __name__ == "__main__":
    unittest.main()
