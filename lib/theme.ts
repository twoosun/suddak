export type ThemeMode = "light" | "dark";

/* # 1. 저장 키 */
const THEME_KEY = "theme";

/* # 2. 현재 테마 읽기 */
export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

/* # 3. DOM 반영 */
export function applyTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;

  localStorage.setItem(THEME_KEY, theme);

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/* # 4. 토글 */
export function toggleTheme(): ThemeMode {
  const nextTheme: ThemeMode = getStoredTheme() === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  return nextTheme;
}

/* # 5. 초기화 */
export function initTheme() {
  if (typeof window === "undefined") return;
  applyTheme(getStoredTheme());
}