import { NextResponse } from 'next/server'
import { getMyDataExport } from '@/app/actions/gdpr'
import { format, parseISO } from 'date-fns'
import { hu } from 'date-fns/locale'

export const runtime = 'nodejs'

const GREEN = [26, 92, 58] as [number, number, number]
const DARK  = [17, 24, 39] as [number, number, number]
const GRAY  = [107, 114, 128] as [number, number, number]
const LIGHT = [243, 244, 246] as [number, number, number]

function addPageHeader(doc: any, pageNum: number, totalPages: number) {
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, 210, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ShiftAssist – GDPR Adatexport', 14, 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`${pageNum} / ${totalPages} oldal`, 196, 11, { align: 'right' })
}

function addSection(doc: any, title: string, y: number): number {
  doc.setFillColor(...LIGHT)
  doc.rect(14, y, 182, 8, 'F')
  doc.setTextColor(...GREEN)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 16, y + 5.5)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'normal')
  return y + 12
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '–'
  try { return format(parseISO(iso), 'yyyy. MMM d. HH:mm', { locale: hu }) } catch { return iso }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '–'
  try { return format(parseISO(iso), 'yyyy. MMM d.', { locale: hu }) } catch { return iso }
}

export async function GET() {
  const { data, error } = await getMyDataExport()

  if (error || !data) {
    return NextResponse.json({ error: error ?? 'Ismeretlen hiba' }, { status: 401 })
  }

  // Dynamic import – elkerüli a browser-globals problémát buildeléskor
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const exportDate = format(new Date(), 'yyyy. MMMM d.', { locale: hu })
  const dateTag   = format(new Date(), 'yyyy-MM-dd')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // ─────────────────────────────────────────────
  // OLDAL 1 – Fedőlap + Adatvédelmi tájékoztató
  // ─────────────────────────────────────────────
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, 210, 60, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('Személyes adatok exportja', 105, 28, { align: 'center' })
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('GDPR 20. cikk – Adathordozhatósághoz való jog', 105, 37, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`Exportálva: ${exportDate}`, 105, 45, { align: 'center' })

  // Fedőlap info doboz
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.5)
  doc.roundedRect(14, 66, 182, 40, 3, 3, 'FD')

  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Érintett neve:', 20, 78)
  doc.text('E-mail:', 20, 86)
  doc.text('Szerepkör:', 20, 94)
  doc.text('Beosztás:', 20, 102)

  doc.setFont('helvetica', 'normal')
  doc.text(data.profile?.full_name ?? '–', 65, 78)
  doc.text(data.profile?.email ?? '–', 65, 86)
  doc.text(data.profile?.role ?? '–', 65, 94)
  doc.text(data.profile?.position ?? '–', 65, 102)

  // ── Adatvédelmi tájékoztató ──
  let y = 116
  doc.setFillColor(...LIGHT)
  doc.rect(14, y, 182, 8, 'F')
  doc.setTextColor(...GREEN)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Adatvédelmi Tájékoztató', 16, y + 5.5)
  y += 13

  doc.setTextColor(...DARK)
  doc.setFontSize(9)

  doc.setFont('helvetica', 'bold')
  doc.text('Adatkezelő:', 14, y); y += 6
  doc.setFont('helvetica', 'normal')
  const lines1 = doc.splitTextToSize(
    'B&A Solutions Kft. (székhely: Magyarország; e-mail: privacy@basolutions.hu)',
    182
  )
  doc.text(lines1, 14, y); y += lines1.length * 5 + 3

  doc.setFont('helvetica', 'bold')
  doc.text('Az adatkezelés célja és jogalapja:', 14, y); y += 6
  doc.setFont('helvetica', 'normal')
  const lines2 = doc.splitTextToSize(
    'A ShiftAssist rendszerben kezelt személyes adatok (név, e-mail, munkaidő adatok, jelenléti napló) kezelésének célja a munkaviszonnyal összefüggő beosztásszervezés és munkaidő-nyilvántartás. Jogalapja a GDPR 6. cikk (1) bekezdés b) pontja (szerződés teljesítése) és c) pontja (jogi kötelezettség).',
    182
  )
  doc.text(lines2, 14, y); y += lines2.length * 5 + 3

  doc.setFont('helvetica', 'bold')
  doc.text('Az adatok tárolási ideje:', 14, y); y += 6
  doc.setFont('helvetica', 'normal')
  const l3 = doc.splitTextToSize(
    'A személyes adatok a munkaviszony megszűnésétől számított 5 évig kerülnek megőrzésre, ezt követően törlésre kerülnek.',
    182
  )
  doc.text(l3, 14, y); y += l3.length * 5 + 3

  doc.setFont('helvetica', 'bold')
  doc.text('Érintetti jogok:', 14, y); y += 6
  doc.setFont('helvetica', 'normal')
  const rights = [
    '• Hozzáférési jog (GDPR 15. cikk): jogosult hozzáférni a kezelt adataihoz.',
    '• Helyesbítési jog (GDPR 16. cikk): kérheti pontatlan adatai helyesbítését.',
    '• Törlési jog (GDPR 17. cikk): kérheti adatai törlését.',
    '• Adathordozhatóság joga (GDPR 20. cikk): e dokumentum ennek alapján készült.',
    '• Tiltakozási jog (GDPR 21. cikk): tiltakozhat az adatkezelés ellen.',
  ]
  rights.forEach(r => { doc.text(r, 14, y); y += 5.5 })
  y += 3

  doc.setFont('helvetica', 'bold')
  doc.text('Panasztétel:', 14, y); y += 6
  doc.setFont('helvetica', 'normal')
  const l4 = doc.splitTextToSize(
    'Panasz esetén a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH, www.naih.hu) fordulhat.',
    182
  )
  doc.text(l4, 14, y)

  // ─────────────────────────────────────────────
  // OLDAL 2 – Profiladatok + Műszakok
  // ─────────────────────────────────────────────
  doc.addPage()
  y = 24

  y = addSection(doc, '1. Profiladatok', y)
  const profileRows = [
    ['Teljes név', data.profile?.full_name ?? '–'],
    ['E-mail cím', data.profile?.email ?? '–'],
    ['Telefonszám', data.profile?.phone ?? '–'],
    ['Szerepkör', data.profile?.role ?? '–'],
    ['Beosztás', data.profile?.position ?? '–'],
    ['Regisztráció dátuma', fmtDate(data.profile?.created_at)],
  ];
  (doc as any).autoTable({
    startY: y,
    head: [['Mező', 'Érték']],
    body: profileRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })
  y = (doc as any).lastAutoTable.finalY + 10

  y = addSection(doc, '2. Műszakok', y)
  if (!data.shifts || data.shifts.length === 0) {
    doc.setFontSize(9); doc.setTextColor(...GRAY)
    doc.text('Nincs rögzített műszak.', 14, y + 5)
    y += 12
  } else {
    const shiftRows = data.shifts.slice(0, 200).map((s: any) => [
      fmt(s.start_time),
      fmt(s.end_time),
      s.title ?? '–',
      s.status ?? '–',
      s.break_minutes != null ? `${s.break_minutes} perc` : '–',
    ]);
    (doc as any).autoTable({
      startY: y,
      head: [['Kezdés', 'Befejezés', 'Cím', 'Státusz', 'Szünet']],
      body: shiftRows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  if (y > 240) { doc.addPage(); y = 24 }
  y = addSection(doc, '3. Szabadságkérelmek', y)
  if (!data.leaveRequests || data.leaveRequests.length === 0) {
    doc.setFontSize(9); doc.setTextColor(...GRAY)
    doc.text('Nincs rögzített szabadságkérelem.', 14, y + 5)
    y += 12
  } else {
    const leaveRows = data.leaveRequests.map((l: any) => [
      l.type ?? '–',
      fmtDate(l.start_date),
      fmtDate(l.end_date),
      l.status ?? '–',
      l.reason ?? '–',
    ]);
    (doc as any).autoTable({
      startY: y,
      head: [['Típus', 'Kezdés', 'Befejezés', 'Státusz', 'Indoklás']],
      body: leaveRows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  if (y > 220) { doc.addPage(); y = 24 }
  y = addSection(doc, '4. Tevékenységnapló', y)
  if (!data.activityLog || data.activityLog.length === 0) {
    doc.setFontSize(9); doc.setTextColor(...GRAY)
    doc.text('Nincs rögzített tevékenység.', 14, y + 5)
  } else {
    const logRows = data.activityLog.map((a: any) => [
      fmt(a.created_at),
      a.action ?? '–',
      a.entity_type ?? '–',
    ]);
    (doc as any).autoTable({
      startY: y,
      head: [['Dátum', 'Esemény', 'Entitás']],
      body: logRows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })
  }

  // Oldalszámok + lábléc
  const totalPages = (doc as any).getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPageHeader(doc, i, totalPages)
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(14, 286, 196, 286)
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text('B&A Solutions Kft. – ShiftAssist | privacy@basolutions.hu | www.shiftsync.hu', 105, 290, { align: 'center' })
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer') as ArrayBuffer)

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="shiftsync-adatexport-${dateTag}.pdf"`,
    },
  })
}
