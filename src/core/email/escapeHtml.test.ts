import { escapeHtml } from "./escapeHtml.ts";
import { describe, expect, it } from "vitest";

describe("escapeHtml", () => {
  it("escapes the HTML characters", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;",
    );
  });
});
