import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "CipherLend — App" },
      { name: "description", content: "Confidential lending dashboard powered by Arcium." },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen flex overflow-x-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar inApp />
        <main className="flex-1 w-full min-w-0 overflow-x-hidden px-3 sm:px-4 md:px-8 py-5 md:py-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
