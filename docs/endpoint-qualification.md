# Endpoint verification

The automated endpoint acceptance runner was removed with the test suites on
October 16, 2026. Current `main` does not include that runner or Playwright.
The [former procedure](https://github.com/dispatchlabs-ai/agent-wiki/blob/82894153ea8728b3ef81134bc8ea0bece5292f73/docs/endpoint-qualification.md)
and earlier receipts remain historical evidence for their exact deployments.

For manual verification, use an explicitly authorized synthetic installation
through its HTTPS origin. Check liveness, authenticated article readiness, sign-in,
MCP create/read with actor attribution, browser edit/read, and MCP readback of the
browser revision. After restart or upgrade, verify retained identity and the
previous acknowledged article revision. Record what was actually exercised.

Keep bootstrap URLs and credentials in private operator storage. Functional
observations do not prove the image digest, task identity, filesystem ownership,
backup consistency, or safe quiescence. Bind those separate observations to the
deployment operation before constructing an operator-attested health receipt.
