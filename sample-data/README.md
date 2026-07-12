# Demo hiring dataset

This directory contains a deterministic 15-job / 15-resume fixture set for demos and local development.

- `jobs.json` contains 15 randomly selected active Lever postings from the local scraper output.
- `resumes.json` contains one matching **synthetic** resume per job.
- Every resume uses an `@example.com` address and explicitly includes `"synthetic": true`; none represent a real applicant.
- `targetJobExternalId` joins each resume to one item in `jobs.json`.

Regenerate the same selection from the current local scraper output:

```bash
python3 scripts/generate_sample_dataset.py
python3 -m unittest tests/test_sample_data.py -v
```

The fixed random seed makes the generated dataset reproducible.
