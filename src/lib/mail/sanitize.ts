/**
 * Minimal HTML sanitization for email template interpolation.
 *
 * Email clients do not run JavaScript so XSS via script tags is not
 * a concern for the recipient. However, unescaped HTML in templates:
 *  1. Allows users to inject styling that makes phishing emails look legitimate
 *  2. Can break the email layout for all recipients if angle brackets appear
 *  3. Creates link injection via href attributes
 *
 * We escape all five HTML special characters before interpolating
 * any user-supplied string into an email template.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/**
 * Escapes a string for safe interpolation into HTML email content.
 * Use this on every user-supplied value before putting it in a template.
 *
 * @example
 *   const safe = escapeHtml(user.name); // "Frank <test>" → "Frank &lt;test&gt;"
 */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}
