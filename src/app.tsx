import { AnimatePresence, motion } from "motion/react";
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { SettingsModal } from "./components/settings/settings-modal";
import { CommandPalette } from "./components/shell/command-palette";
import { FocusFuse } from "./components/shell/focus-status";
import { Sidebar } from "./components/shell/sidebar";
import { StorageAlert } from "./components/shell/storage-alert";
import { ui, useUi } from "./components/shell/ui-store";
import { WelcomeModal } from "./components/shell/welcome-modal";
import { focusActions, useFocusTicker } from "./features/focus/focus-store";
import { ProjectDialog } from "./features/projects/project-dialog";
import { TaskPanel } from "./features/tasks/detail/task-panel";
import { QuickAddDialog } from "./features/tasks/quick-add-dialog";
import { WorkflowDialog } from "./features/workflow/workflow-dialog";
import { useHotkeys } from "./lib/hotkeys";
import { isDarkTheme } from "./lib/settings";
import { navigate, routeKey, useRoute, type Route } from "./lib/router";
import { useLocalStorage } from "./lib/use-local-storage";
import { useApplySettings, useSettings } from "./lib/use-settings";
import { TaskScopePage } from "./pages/task-scope-page";
import { TodayPage } from "./pages/today-page";

// Less-visited pages load on demand to keep the first paint light.
const InsightsPage = lazy(() => import("./pages/insights-page").then((m) => ({ default: m.InsightsPage })));
const NotesPage = lazy(() => import("./pages/notes-page").then((m) => ({ default: m.NotesPage })));
const FocusPage = lazy(() => import("./pages/focus-page").then((m) => ({ default: m.FocusPage })));
const LinksPage = lazy(() => import("./pages/links-page").then((m) => ({ default: m.LinksPage })));

/**
 * Workspace shell: the sidebar sits on the sage canvas, the current page on a
 * single sheet beside it. Overlays (task panel, create, palette, settings)
 * are mounted once here and opened from anywhere through the UI store / URL.
 */
export function App() {
  useApplySettings();
  useFocusTicker();
  const settings = useSettings();
  const { route, query } = useRoute();
  const { mobileNav } = useUi();
  const [welcomed, setWelcomed] = useLocalStorage("pt.welcomed", false);

  useHotkeys({
    onPalette: ui.openPalette,
    keys: {
      c: () => ui.openQuickAdd(currentProjectPrefill(route)),
      p: focusActions.toggle,
    },
    goto: {
      h: () => navigate({ name: "today" }),
      i: () => navigate({ name: "inbox" }),
      a: () => navigate({ name: "tasks" }),
      r: () => navigate({ name: "insights" }),
      n: () => navigate({ name: "notes" }),
      f: () => navigate({ name: "focus" }),
      l: () => navigate({ name: "links" }),
    },
  });

  return (
    <>
      <FocusFuse />
      <div className="flex h-dvh">
        <aside className="hidden w-[252px] shrink-0 lg:block">
          <Sidebar />
        </aside>
        <main className="flex min-w-0 flex-1 lg:py-2 lg:pr-2">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface shadow-[var(--shadow-sheet)] lg:rounded-[var(--radius-sheet)] lg:border lg:border-line">
            <Suspense fallback={<div className="flex-1" />}>
              <Page key={routeKey(route)} route={route} />
            </Suspense>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {mobileNav ? (
          <motion.div
            className="fixed inset-0 z-40 bg-[rgb(16_18_16/0.3)] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => ui.setMobileNav(false)}
          >
            <motion.div
              className="h-full w-[280px] max-w-[85vw] bg-canvas shadow-[var(--shadow-float)]"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <TaskPanel taskId={query.get("task")} />
      <QuickAddDialog />
      <CommandPalette />
      <ProjectDialog />
      <WorkflowDialog />
      <SettingsModal />
      <WelcomeModal open={!welcomed} onClose={() => setWelcomed(true)} />
      <StorageAlert />
      <Toaster
        position="bottom-center"
        theme={isDarkTheme(settings.theme) ? "dark" : "light"}
        toastOptions={{
          style: {
            background: "var(--color-btn)",
            color: "var(--color-btn-ink)",
            border: "none",
            borderRadius: "10px",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            padding: "10px 14px",
          },
          actionButtonStyle: {
            background: "transparent",
            color: "var(--color-btn-ink)",
            fontWeight: 600,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          },
        }}
      />
    </>
  );
}

function currentProjectPrefill(route: Route) {
  return route.name === "project" ? { projectId: route.id } : {};
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case "today":
      return <TodayPage />;
    case "inbox":
    case "tasks":
    case "project":
      return <TaskScopePage route={route} />;
    case "insights":
      return <InsightsPage />;
    case "notes":
      return <NotesPage noteId={route.id} />;
    case "focus":
      return <FocusPage />;
    case "links":
      return <LinksPage />;
  }
}
