# Security Policy

DabblerDB runs entirely in your browser. Schemas are stored in `localStorage` and are never sent to a server, so there is no backend to attack. Security problems are therefore mostly about how the app handles files and links you open (for example a crafted `.json` file, `.sql` file or share link).

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately with GitHub's **"Report a vulnerability"** button on the [Security tab](https://github.com/sakiththewmika/DabblerDB/security/advisories/new). Include:

- what you found and why it matters,
- steps to reproduce it (a sample file or link helps a lot),
- the browser and version you tested in.

You can expect a first reply within a week. Once a fix is released we are happy to credit you, if you want.

## Supported versions

Only the latest release (the version deployed at the live demo) receives fixes.
