# AGENTS.md

## Git Workflow (Required)

After **every** file modification, always run the following commands in order, before
finishing your turn or reporting back to the user:

```bash
git add -A
git commit -m "<message>"
git push -u origin master
```

Rules:

- This applies to every change to tracked or untracked files in the repository, including
  new files, edits, deletions, and generated output that is not gitignored.
- Use a short, descriptive commit message that summarizes the change, for example:
  `git commit -m "Add user settings page"`.
- Run the commands in the order shown. Do not skip `git add -A` or `git commit`.
- If `git push` fails (for example, no `origin` remote is configured, or the branch is
  behind), report the failure and its exact error to the user instead of silently ignoring it.
- Group a single logical change into one commit rather than committing unrelated
  modifications together.
