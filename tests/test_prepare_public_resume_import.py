import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from prepare_public_resume_import import build_applicant, sanitize_resume_text


class PreparePublicResumeImportTests(unittest.TestCase):
    def test_sanitizes_contact_details_and_preserves_resume_sections(self):
        text = "Jane Example\njane@example.com | (412) 555-1212 | linkedin.com/in/jane\nEDUCATION\nB.S. Computer Science\nSKILLS\nPython, SQL"

        sanitized = sanitize_resume_text(text)

        self.assertNotIn("jane@example.com", sanitized)
        self.assertNotIn("555-1212", sanitized)
        self.assertNotIn("Jane Example", sanitized)
        self.assertIn("EDUCATION", sanitized)
        self.assertIn("Python, SQL", sanitized)

    def test_builds_a_non_personal_public_example_profile(self):
        entry = {
            "id": "06-cmu-cs-undergraduate",
            "sourceUrl": "https://example.edu/resumes.pdf",
            "sourcePage": 3,
            "sha256": "abc123",
        }

        applicant = build_applicant(entry, "EDUCATION\nB.S. Computer Science\nSKILLS\nPython SQL Docker")

        self.assertEqual(applicant["publicId"], "public_resume_example_06_cmu_cs_undergraduate")
        self.assertEqual(applicant["name"], "Olivia Thompson")
        self.assertEqual(applicant["location"], "Seattle, Washington, USA")
        self.assertEqual(applicant["sourceKind"], "public-educational-example")
        self.assertEqual(applicant["sourceUrl"], entry["sourceUrl"])
        self.assertIn("Python", applicant["skills"])
        self.assertNotIn("example.edu", applicant["resumeText"])


if __name__ == "__main__":
    unittest.main()
