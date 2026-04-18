export function normalizeMathMarkdown(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expression: string) => `$$${expression.trim()}$$`)
    .replace(/\\\(((?:\\.|[^\\\n])+?)\\\)/g, (_, expression: string) => `$${expression.trim()}$`);
}
