/**
 * The origins of the Client ID Metadata Documents of the Claude apps. The MCP
 * clients of ledger are the Claude apps only (PLAN.md, D15).
 */
const claudeOrigins = new Set(["https://claude.ai", "https://claude.com"]);

/**
 * Tells if a `client_id` URL is a Client ID Metadata Document of a Claude
 * app. The CIMD plugin fetches only these URLs.
 */
export const isClaudeClientMetadataUrl = (input: string): boolean => {
  const url = URL.parse(input);
  return (
    url !== null &&
    url.username === "" &&
    url.password === "" &&
    claudeOrigins.has(url.origin)
  );
};
