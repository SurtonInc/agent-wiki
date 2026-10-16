# Package acceptance records

The automated package and container acceptance runners were removed on October
16, 2026, together with their synthetic fixtures and browser dependencies.
`npm run check` performs static checks; `scripts/check-package` builds artifacts
and verifies package identity. Neither command performs functional acceptance.

Earlier qualification receipts remain evidence for their recorded source,
artifact, platform, and scenarios. The
[former package acceptance procedure](https://github.com/dispatchlabs-ai/agent-wiki/blob/82894153ea8728b3ef81134bc8ea0bece5292f73/docs/qualify-package.md)
is retained in Git history; it is not a command available in current `main`.

For a new installation or upgrade, document the manual workflows actually
verified using disposable synthetic state: bootstrap and sign-in, article and
MCP reads/writes, evidence and published media, restart continuity, backup and
fresh-root restore, and writer recovery. Follow the [lifecycle contract](lifecycle.md)
and record exact package identities and any unverified boundaries.

## Existing-state container adoption

The container adoption runner was also removed. Before activation, verify the
old and candidate images against disposable state on the target architecture,
including preserved content and identity, external evidence access, authenticated
writes, forced recreation, and backup/restore. See [container deployment](container-deployment.md).
Record SSH transport and remote Git publication separately when used.
