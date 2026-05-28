"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent } from "@/lib/format";
import { computeMonthlyPayment, type ScheduleRow } from "@/lib/notes/schedule";

// Same PDF layout as the lender-facing schedule, but uses the note's full
// principal and lists the borrower instead of a lender. Useful for sharing
// the schedule with the borrower or pulling a clean reference copy from the
// admin console.
export function DownloadNoteScheduleButton({
  rows,
  receivedNumbers,
  noteId,
  noteTitle,
  borrowerName,
  principal,
  annualRatePct,
  termMonths,
  interestType,
  startDate,
}: {
  rows: ScheduleRow[];
  receivedNumbers: Set<number>;
  noteId: string;
  noteTitle: string;
  borrowerName: string;
  principal: number;
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

    doc.setDrawColor(242, 106, 66);
    doc.setLineWidth(1);
    doc.line(margin, 70, pageWidth - margin, 70);
    doc.setDrawColor(0);

    // ============ Two-column summary ============
    const years = termMonths > 0 ? termMonths / 12 : 0;
    const scheduled = computeMonthlyPayment({
      principal,
      annualRatePct,
      termMonths,
      interestType,
    });
    const formatDate = (iso: string | null) => {
      if (!iso) return "—";
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
      return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
    };

    const leftRows: Array<[string, string]> = [
      ["Loan amount", formatCurrency(principal)],
      ["Annual interest rate", formatPercent(annualRatePct)],
      ["Loan period in years", years % 1 === 0 ? String(years) : years.toFixed(2)],
      ["Number of payments per year", "12"],
      ["Start date of loan", formatDate(startDate)],
    ];
    const rightRows: Array<[string, string]> = [
      ["Scheduled payment", scheduled === null ? "—" : formatCurrency(scheduled)],
      ["Scheduled number of payments", String(termMonths || rows.length)],
      ["Borrower name", borrowerName],
    ];

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

    // Borrower names can be long entity names. Shrink the value font when
    // it exceeds ~28 chars so the row stays single-line where possible and
    // wraps cleanly when it doesn't.
    const borrowerRowIndex = rightRows.findIndex(
      ([label]) => label === "Borrower name",
    );
    const longName = borrowerName.length > 28;
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
          data.row.index === borrowerRowIndex &&
          data.column.index === 1
        ) {
          data.cell.styles.fontSize = 8;
        }
      },
    });

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
      `Generated ${new Date().toLocaleDateString()}`,
      pageWidth - margin,
      afterSummaryY,
      { align: "right" },
    );
    doc.setTextColor(0);

    // ============ Detailed schedule ============
    // Track beginning balance + cumulative interest as we walk the rows.
    // Row 1's beginning balance is the note's full principal.
    let cumulativeInterest = 0;
    let beginningBalance = principal;
    const body: string[][] = rows.map((r) => {
      const begin = beginningBalance;
      const end = r.ending_balance;
      cumulativeInterest += r.interest_amount;
      beginningBalance = end;
      // Received rows surface the actual recorded date implicitly via the
      // separate ledger; for the borrower's reference copy we just show
      // the due date for every row.
      void receivedNumbers; // kept on the API for future "received_date" mode
      return [
        String(r.payment_number),
        formatDate(r.due_date),
        formatCurrency(begin),
        formatCurrency(r.principal_amount),
        formatCurrency(r.interest_amount),
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
