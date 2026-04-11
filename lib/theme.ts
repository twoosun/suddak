export function getStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

export function applyTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  localStorage.setItem("theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function toggleTheme(): "light" | "dark" {
  const next = getStoredTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}