"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { computeMonthlyPayment } from "@/lib/notes/schedule";
import type { MyScheduleRow } from "@/lib/db/queries";

export function DownloadScheduleButton({
  rows,
  noteId,
  noteTitle,
  lenderName,
  invested,
  annualRatePct,
  termMonths,
  interestType,
  startDate,
}: {
  rows: MyScheduleRow[];
  noteId: string;
  noteTitle: string;
  lenderName: string;
  invested: string;
  annualRatePct: number;
  termMonths: number;
  interestType: string;
  startDate: string | null;
}) {
  const onClick = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const halfWidth = contentWidth / 2;

    // ============ Title bar ============
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LOAN AMORTIZATION SCHEDULE", margin, 60);
    doc.setFontSize(11);
    doc.text("Note ID", pageWidth - margin - 80, 60, { align: "right" });
    doc.setTextColor(0);
    doc.text(noteId, pageWidth - margin, 60, { align: "right" });

    // Thin orange rule under the title.
    doc.setDrawColor(242, 106, 66);
    doc.setLineWidth(1);
    doc.line(margin, 70, pageWidth - margin, 70);
    doc.setDrawColor(0);

    // ============ Two-column summary ============
    // Left: lender's inputs that drive the schedule. Right: derived values.
    const invDollars = Number(invested);
    const years = termMonths > 0 ? termMonths / 12 : 0;
    const scheduled = computeMonthlyPayment({
      principal: invDollars,
      annualRatePct,
      termMonths,
      interestType,
    });
    const leftRows: Array<[string, string]> = [
      ["Loan amount", formatCurrency(invDollars)],
      ["Annual interest rate", formatPercent(annualRatePct)],
      ["Loan period in years", years % 1 === 0 ? String(years) : years.toFixed(2)],
      ["Number of payments per year", "12"],
      ["Start date of loan", formatDate(startDate)],
    ];
    const rightRows: Array<[string, string]> = [
      ["Scheduled payment", scheduled === null ? "—" : formatCurrency(scheduled)],
      ["Scheduled number of payments", String(termMonths || rows.length)],
      ["Lender name", lenderName],
    ];

    // Left summary table (ENTER VALUES).
    autoTable(doc, {
      startY: 85,
      head: [["ENTER VALUES", ""]],
      body: leftRows,
      tableWidth: halfWidth - 8,
      margin: { left: margin },
      theme: "plain",
      headStyles: {
        fontStyle: "bold",
        fillColor: [220, 220, 220],
        textColor: 30,
      },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: "italic", textColor: 60 },
        1: { halign: "right", fillColor: [235, 235, 235] },
      },
    });

    // Right summary table (LOAN SUMMARY). autoTable wraps long values onto
    // additional lines automatically (overflow defaults to "linebreak"), so
    // a long loan_agreement_title like "Specialized Trust Company Custodian
    // FBO Felipe Vazquez ROTH IRA" will flow across two lines in the value
    // cell. We also shrink the font for very long lender names so the row
    // doesn't dominate the summary block.
    const lenderNameRowIndex = rightRows.findIndex(
      ([label]) => label === "Lender name",
    );
    const longName = lenderName.length > 28;
    autoTable(doc, {
      startY: 85,
      head: [["LOAN SUMMARY", ""]],
      body: rightRows,
      tableWidth: halfWidth - 8,
      margin: { left: margin + halfWidth + 8 },
      theme: "plain",
      headStyles: {
        fontStyle: "bold",
        fillColor: [220, 220, 220],
        textColor: 30,
      },
      styles: { fontSize: 10, cellPadding: 5, overflow: "linebreak" },
      columnStyles: {
        0: { fontStyle: "italic", textColor: 60 },
        1: { halign: "right", fillColor: [235, 235, 235] },
      },
      didParseCell: (data) => {
        if (
          longName &&
          data.section === "body" &&
          data.row.index === lenderNameRowIndex &&
          data.column.index === 1
        ) {
          data.cell.styles.fontSize = 8;
        }
      },
    });

    // Generated-on stamp sits above the schedule table, right-aligned over
    // the CUMULATIVE INTEREST column so the metadata reads top-left
    // (title block) and top-right (generated date).
    const afterSummaryY =
      Math.max(
        // @ts-expect-error — autoTable attaches lastAutoTable at runtime
        doc.lastAutoTable?.finalY ?? 200,
        200,
      ) + 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    if (noteTitle) {
      doc.text(noteTitle, margin, afterSummaryY);
    }
    doc.text(
      `Generated ${formatDate(new Date().toISOString())}`,
      pageWidth - margin,
      afterSummaryY,
      { align: "right" },
    );
    doc.setTextColor(0);

    // ============ Detailed schedule ============
    // Walk the rows once to build beginning balances + a running cumulative
    // interest. Beginning balance of payment 1 is the lender's invested
    // amount; for payment N it's the previous row's ending balance.
    let cumulativeInterest = 0;
    let beginningBalance = invDollars;
    const body: string[][] = rows.map((r) => {
      const begin = beginningBalance;
      const end = r.my_balance;
      cumulativeInterest += r.my_interest;
      beginningBalance = end;
      return [
        String(r.payment_number),
        formatDate(r.received_date ?? r.due_date),
        formatCurrency(begin),
        formatCurrency(r.my_principal),
        formatCurrency(r.my_interest),
        formatCurrency(end),
        formatCurrency(cumulativeInterest),
      ];
    });

    autoTable(doc, {
      startY: afterSummaryY + 12,
      head: [[
        "PMT NO",
        "PAYMENT DATE",
        "BEGINNING BALANCE",
        "PRINCIPAL",
        "INTEREST",
        "ENDING BALANCE",
        "CUMULATIVE INTEREST",
      ]],
      body,
      showHead: "everyPage",
      headStyles: {
        fillColor: [242, 106, 66],
        textColor: 255,
        halign: "center",
        fontSize: 8,
      },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { halign: "right", cellWidth: 38 },
        1: { halign: "right", cellWidth: 70 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
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
