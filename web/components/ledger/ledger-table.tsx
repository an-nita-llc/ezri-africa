"use client";

// AG Grid styles ride with this lazily-loaded chunk (imported by the
// dashboard page only when the Table tab opens), keeping the dashboard
// route compile light.
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { FEE_PCT_LABEL, feeOf, lrdOf, totalOf } from "@/app/fx";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

export interface LedgerGridRow {
  id: string;
  tag: string;
  status: string;
  amount_usd: number;
  fee_usd?: number;
  provider?: string;
  verdict?: string;
  mock_momo_txn_id?: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  HELD: "Escrow Held",
  NEEDS_RETRY: "Action Needed",
  RELEASED: "Released",
  REFUNDED: "Refunded",
  EXPIRED: "Expired",
};

const STATUS_CELL_CLASS: Record<string, string> = {
  RELEASED: "font-bold text-emerald-700",
  HELD: "font-bold text-amber-700",
  NEEDS_RETRY: "font-bold text-rose-700",
};

const money = (v: number | undefined) => `$${(Number(v) || 0).toFixed(2)}`;

/** AG Grid ledger browser — sortable, paginated read view over the same rows
 *  as the cards. Money actions (override/refund with PIN) stay on the cards. */
export function LedgerTable({
  rows,
  onOpen,
}: {
  rows: LedgerGridRow[];
  onOpen: (id: string) => void;
}) {
  const columnDefs = useMemo<ColDef<LedgerGridRow>[]>(
    () => [
      { field: "id", headerName: "Escrow", minWidth: 150, cellClass: "font-mono" },
      { field: "tag", headerName: "Purpose", width: 110 },
      {
        field: "status",
        headerName: "Status",
        width: 140,
        valueFormatter: (p) => STATUS_LABELS[p.value] ?? String(p.value ?? ""),
        cellClass: (p) => STATUS_CELL_CLASS[String(p.value)] ?? "font-semibold",
      },
      {
        field: "amount_usd",
        headerName: "Amount",
        width: 110,
        valueFormatter: (p) => money(p.value),
        cellClass: "tabular-nums",
      },
      {
        headerName: `Fee (${FEE_PCT_LABEL}%)`,
        width: 100,
        valueGetter: (p) => {
          const fee = Number(p.data?.fee_usd);
          return fee > 0 ? fee : feeOf(Number(p.data?.amount_usd) || 0);
        },
        valueFormatter: (p) => money(p.value),
        cellClass: "tabular-nums",
      },
      {
        headerName: "Charged",
        width: 110,
        valueGetter: (p) => totalOf(Number(p.data?.amount_usd) || 0),
        valueFormatter: (p) => money(p.value),
        cellClass: "tabular-nums font-semibold",
      },
      {
        headerName: "Payout LRD",
        width: 130,
        valueGetter: (p) => lrdOf(Number(p.data?.amount_usd) || 0),
        valueFormatter: (p) => `${Math.round(Number(p.value) || 0).toLocaleString()}`,
        cellClass: "tabular-nums",
      },
      {
        field: "provider",
        headerName: "Provider",
        width: 110,
        valueFormatter: (p) => p.value || "—",
      },
      {
        field: "verdict",
        headerName: "AI verdict",
        width: 110,
        valueFormatter: (p) => p.value || "—",
      },
      {
        field: "mock_momo_txn_id",
        headerName: "MoMo ref",
        minWidth: 170,
        valueFormatter: (p) => p.value || "—",
        cellClass: "font-mono",
      },
    ],
    []
  );

  return (
    <div
      role="region"
      aria-label="Transfers table — click a row to open its action card"
      className="ag-theme-quartz rounded-2xl border border-border"
      style={{ height: 440, width: "100%", colorScheme: "light" }}
    >
      <AgGridReact<LedgerGridRow>
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: true, resizable: true }}
        getRowId={(p) => p.data.id}
        pagination
        paginationPageSize={10}
        paginationPageSizeSelector={[10, 25, 50]}
        overlayNoRowsTemplate="No transactions match your query."
        onRowClicked={(e) => {
          if (e.data?.id) onOpen(e.data.id);
        }}
      />
    </div>
  );
}
