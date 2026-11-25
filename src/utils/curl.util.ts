/** Wrap a value in single quotes for a shell, escaping any single quote inside. */
const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/**
 * Build a Postman-importable curl for a form-urlencoded POST.
 * Pass only what is really sent to PayU (key, command, var1, hash...): the salt never appears.
 */
export function buildPostmanCurl(url: string, form: Record<string, string>): string {
  const lines = [
    `curl --location ${shellQuote(url)}`,
    `--header 'Content-Type: application/x-www-form-urlencoded'`,
    ...Object.entries(form).map(([k, v]) => `--data-urlencode ${shellQuote(`${k}=${v}`)}`),
  ];
  return lines.join(' \\\n');
}
