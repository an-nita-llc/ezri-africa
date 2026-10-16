// Bryntum + AG Grid styles — dashboard routes only (global CSS is only
// allowed in layout files). Both widgets render as light "report paper"
// panels in either app theme; the app chrome around them stays themed.
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/stockholm-light.css";
import "@bryntum/scheduler/fontawesome/css/fontawesome.css";
import "@bryntum/scheduler/fontawesome/css/solid.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
