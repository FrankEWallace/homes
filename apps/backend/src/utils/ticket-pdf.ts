import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { Response } from 'express';

const TEAL       = '#0ABFBC';
const TEAL_DARK  = '#089B98';
const TEAL_LIGHT = '#E0F7F6';
const GRAY_900   = '#111827';
const GRAY_500   = '#6B7280';
const GRAY_200   = '#E5E7EB';

export interface TicketData {
  reference:     string;
  bookingId:     string;
  checkInCode:   string | null;
  guestName:     string;
  listingTitle:  string;
  listingType:   string;
  locationName:  string | null;
  dateFrom:      Date;
  dateTo:        Date | null;
  quantity:      number;
  totalAmount:   number;
  currency:      string;
  status:        string;
  paymentMethod: string | null;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-TZ', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtAmount(n: number, currency: string): string {
  return `${currency} ${n.toLocaleString('en-TZ')}`;
}

export async function streamTicketPDF(res: Response, t: TicketData): Promise<void> {
  const base  = process.env.TICKET_VERIFY_BASE_URL ?? 'https://app.tojoin.co';
  const qrUrl = `${base}/bookings/${t.bookingId}`;

  const qrBuf = await QRCode.toBuffer(qrUrl, {
    width: 180,
    margin: 1,
    color: { dark: GRAY_900, light: '#FFFFFF' },
  });

  const doc = new PDFDocument({ size: 'A4', margin: 48 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="ticket-${t.reference}.pdf"`);
  doc.pipe(res);

  const M = 48;
  const W = doc.page.width - M * 2;

  // ── Header ────────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 88).fill(TEAL);
  doc.fillColor('#FFFFFF')
    .font('Helvetica-Bold').fontSize(28).text('ToJoin', M, 22)
    .font('Helvetica').fontSize(11).text('Official Booking Ticket', M, 54);

  // ── Reference + status pill ──────────────────────────────────────────────
  doc.fillColor(GRAY_900).font('Helvetica-Bold').fontSize(22).text(t.reference, M, 108);
  doc.fillColor(GRAY_500).font('Helvetica').fontSize(9).text('BOOKING REFERENCE', M, 133);

  const pillColor = t.status === 'confirmed' ? '#16A34A' : t.status === 'completed' ? '#2563EB' : '#D97706';
  const pillX = doc.page.width - M - 100;
  doc.roundedRect(pillX, 106, 100, 28, 6).fill(pillColor);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10)
    .text(t.status.toUpperCase(), pillX, 116, { width: 100, align: 'center' });

  // ── Divider ───────────────────────────────────────────────────────────────
  doc.moveTo(M, 152).lineTo(M + W, 152).strokeColor(GRAY_200).lineWidth(1).stroke();

  // ── Detail rows (left) + QR code (right) ─────────────────────────────────
  const detailW = W - 168;
  const qrX = M + detailW + 20;
  let y = 168;

  const row = (label: string, value: string) => {
    doc.fillColor(GRAY_500).font('Helvetica').fontSize(8).text(label.toUpperCase(), M, y, { width: detailW });
    doc.fillColor(GRAY_900).font('Helvetica-Bold').fontSize(11).text(value, M, y + 11, { width: detailW });
    y += 36;
  };

  row('Guest', t.guestName);
  row('Listing', t.listingTitle);
  row('Type', t.listingType.replace(/_/g, ' '));
  if (t.locationName) row('Location', t.locationName);
  row('Check-in Date', fmtDate(t.dateFrom));
  if (t.dateTo && t.dateTo.getTime() !== t.dateFrom.getTime()) {
    row('Check-out Date', fmtDate(t.dateTo));
  }
  row('Guests / Qty', String(t.quantity));
  row('Total Paid', fmtAmount(t.totalAmount, t.currency));
  if (t.paymentMethod) {
    row('Paid via', t.paymentMethod.replace(/_/g, ' '));
  }

  // QR code
  doc.image(qrBuf, qrX, 168, { width: 148, height: 148 });
  doc.fillColor(GRAY_500).font('Helvetica').fontSize(7.5)
    .text('Scan to view payment', qrX, 322, { width: 148, align: 'center' });

  // ── Check-in code strip ───────────────────────────────────────────────────
  const stripY = Math.max(y + 8, 360);
  doc.rect(M, stripY, W, 54).fill(TEAL_LIGHT);
  doc.fillColor(GRAY_500).font('Helvetica').fontSize(8).text('CHECK-IN CODE', M + 16, stripY + 10);
  doc.fillColor(TEAL_DARK).font('Helvetica-Bold').fontSize(22)
    .text(t.checkInCode ?? '—', M + 16, stripY + 22);

  // ── Tear line ─────────────────────────────────────────────────────────────
  const tearY = stripY + 68;
  doc.moveTo(M, tearY).lineTo(M + W, tearY)
    .dash(4, { space: 4 }).strokeColor(GRAY_200).lineWidth(1).stroke().undash();

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.fillColor(GRAY_500).font('Helvetica').fontSize(8.5)
    .text('Present this ticket at the venue. The QR code links to your payment record.', M, tearY + 14, { width: W, align: 'center' })
    .text('app.tojoin.co  •  support@tojoin.co', M, tearY + 28, { width: W, align: 'center' });

  doc.end();
}
