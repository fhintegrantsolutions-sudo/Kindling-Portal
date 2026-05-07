"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { MyScheduleRow } from "@/lib/db/queries";

export function DownloadScheduleButton({
  rows,
  noteId,
  noteTitle,
  lenderName,
  invested,
}: {
  rows: MyScheduleRow[];
  noteId: string;
  noteTitle: string;
  lenderName: string;
  invested: string;
}) {
  const onClick = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Payment schedule", margin, 60);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`${noteId} · ${noteTitle}`, margin, 80);
    doc.text(`Lender: ${lenderName}`, margin, 96);
    doc.text(`Invested: ${formatCurrency(invested)}`, margin, 112);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Generated ${new Date().toLocaleDateString()}`,
      pageWidth - margin,
      60,
      { align: "right" },
    );
    doc.setTextColor(0);

    const totals = rows.reduce(
      (acc, r) => {
        if (r.received_date) {
          acc.principalReceived += r.my_principal;
          acc.interestReceived += r.my_interest;
        }
        acc.principalTotal += r.my_principal;
        acc.interestTotal += r.my_interest;
        return acc;
      },
      {
        principalReceived: 0,
        interestReceived: 0,
        principalTotal: 0,
        interestTotal: 0,
      },
    );

    autoTable(doc, {
      startY: 130,
      head: [["#", "Date", "Principal", "Interest", "Balance", "Status"]],
      body: rows.map((r) => [
        String(r.payment_number),
        r.received_date ?? r.due_date,
        formatCurrency(r.my_principal),
        formatCurrency(r.my_interest),
        formatCurrency(r.my_balance),
        r.received_date ? "Received" : "Scheduled",
      ]),
      foot: [
        [
          "",
          "Totals",
          formatCurrency(totals.principalTotal),
          formatCurrency(totals.interestTotal),
          "",
          "",
        ],
      ],
      headStyles: { fillColor: [242, 106, 66], textColor: 255 },
      footStyles: {
        fillColor: [245, 245, 245],
        textColor: 30,
        fontStyle: "bold",
      },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { halign: "right", cellWidth: 30 },
        1: { cellWidth: 80 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "center", cellWidth: 70 },
      },
      margin: { left: margin, right: margin },
    });

    doc.save(`${noteId}-schedule.pdf`);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      Download PDF
    </Button>
  );
}
