export type AppIconName = "home" | "users" | "briefcase" | "search" | "chart";

const paths: Record<AppIconName, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  briefcase: "M4 7h16v13H4zM9 7V5h6v2M4 12h16M10 12v2h4v-2",
  search: "m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
  chart: "M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7",
};

export function AppIcon({ name }: { name: AppIconName }) {
  return (
    <svg className="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
