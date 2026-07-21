import type { ReactNode } from "react";

export const metadata = {
  title: "Aura Work Agent",
  description: "Discord operations agent for SKYGRID and Aura-Core",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#090b18", color: "#eef2ff" }}>
        {children}
      </body>
    </html>
  );
}
