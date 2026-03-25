'use server'

import { Resend } from 'resend'
import { getResend } from '@/lib/resend'
import { render } from '@react-email/components'
import { format, parseISO } from 'date-fns'
import { hu } from 'date-fns/locale'
import { LEAVE_TYPE_LABELS } from '@/types'
import { ShiftSwapRequest } from '@/emails/ShiftSwapRequest'
import { ShiftSwapResult } from '@/emails/ShiftSwapResult'
import { LeaveRequest } from '@/emails/LeaveRequest'
import { LeaveResult } from '@/emails/LeaveResult'
import { createAdminClient } from '@/lib/supabase/admin'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ShiftAssist <noreply@shiftsync.hu>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ------------------------------------------------------------
// Email retry helper – exponential backoff + audit_log logolás
// ------------------------------------------------------------
async function sendEmailWithRetry(
  params: Parameters<Resend['emails']['send']>[0],
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await getResend().emails.send(params)
      return
    } catch (err) {
      if (attempt === maxRetries - 1) {
        // Véglegesen sikertelen – logolás audit_log-ba
        try {
          const admin = createAdminClient()
          await admin.from('audit_log').insert({
            company_id: null,
            user_id: null,
            action: 'email.failed',
            entity_type: 'email',
            entity_id: null,
            old_data: null,
            new_data: { to: params.to, subject: params.subject, error: String(err) },
          })
        } catch { /* logolás meghibásodása ne törje el a fő folyamatot */ }
      } else {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }
    }
  }
}

// ------------------------------------------------------------
// Manager értesítése: valaki elvállalta a cserét
// ------------------------------------------------------------
export async function sendSwapRequestEmail(
  manager: { id: string; email: string; full_name: string },
  swapReq: any,
  acceptor: { full_name: string }
) {
  const shiftDate = swapReq.shift?.start_time
    ? format(parseISO(swapReq.shift.start_time), 'yyyy. MMMM d. (EEEE) HH:mm', { locale: hu })
    : 'Ismeretlen időpont'

  const requesterName = swapReq.requester?.full_name || 'Ismeretlen dolgozó'

  const html = await render(ShiftSwapRequest({
    managerName: manager.full_name,
    requesterName,
    targetName: acceptor.full_name,
    shiftDate,
    companyName: 'ShiftAssist',
    approveUrl: `${APP_URL}/dashboard/swap-requests`,
  }))

  await sendEmailWithRetry({
    from: FROM_EMAIL,
    to: manager.email,
    subject: `[ShiftAssist] Csereigény jóváhagyásra vár`,
    html,
  })
}

// ------------------------------------------------------------
// Dolgozó értesítése: csere jóváhagyva/elutasítva
// ------------------------------------------------------------
export async function sendSwapResultEmail(
  user: { id: string; email: string; full_name: string },
  approved: boolean,
  shiftTitle: string
) {
  const html = await render(ShiftSwapResult({
    recipientName: user.full_name,
    approved,
    shiftDate: shiftTitle,
    companyName: 'ShiftAssist',
  }))

  await sendEmailWithRetry({
    from: FROM_EMAIL,
    to: user.email,
    subject: `[ShiftAssist] Csereigény ${approved ? 'jóváhagyva' : 'elutasítva'}`,
    html,
  })
}

// ------------------------------------------------------------
// Manager értesítése: új szabadságkérelem érkezett
// ------------------------------------------------------------
export async function sendLeaveRequestEmail(
  manager: { id: string; email: string; full_name: string },
  leaveReq: { type: string; start_date: string; end_date: string; reason: string | null },
  employee: { full_name: string }
) {
  const typeLabel = LEAVE_TYPE_LABELS[leaveReq.type as keyof typeof LEAVE_TYPE_LABELS] ?? leaveReq.type
  const startStr = format(parseISO(leaveReq.start_date), 'yyyy. MMMM d.', { locale: hu })
  const endStr = format(parseISO(leaveReq.end_date), 'yyyy. MMMM d.', { locale: hu })

  const html = await render(LeaveRequest({
    managerName: manager.full_name,
    employeeName: employee.full_name,
    leaveType: typeLabel,
    startDate: startStr,
    endDate: endStr,
    companyName: 'ShiftAssist',
    reviewUrl: `${APP_URL}/dashboard/leave`,
  }))

  await sendEmailWithRetry({
    from: FROM_EMAIL,
    to: manager.email,
    subject: `[ShiftAssist] Új szabadságkérelem – ${employee.full_name}`,
    html,
  })
}

// ------------------------------------------------------------
// Dolgozó értesítése: szabadságkérelem döntés
// ------------------------------------------------------------
export async function sendLeaveResultEmail(
  employee: { id: string; email: string; full_name: string },
  approved: boolean,
  leaveReq: { type: string; start_date: string; end_date: string; manager_note?: string | null }
) {
  const typeLabel = LEAVE_TYPE_LABELS[leaveReq.type as keyof typeof LEAVE_TYPE_LABELS] ?? leaveReq.type
  const startStr = format(parseISO(leaveReq.start_date), 'yyyy. MMMM d.', { locale: hu })
  const endStr = format(parseISO(leaveReq.end_date), 'yyyy. MMMM d.', { locale: hu })

  const html = await render(LeaveResult({
    employeeName: employee.full_name,
    approved,
    startDate: startStr,
    endDate: endStr,
    managerNote: leaveReq.manager_note ?? undefined,
    companyName: 'ShiftAssist',
  }))

  await sendEmailWithRetry({
    from: FROM_EMAIL,
    to: employee.email,
    subject: `[ShiftAssist] Szabadságkérelem ${approved ? 'elfogadva' : 'elutasítva'}`,
    html,
  })
}

// ------------------------------------------------------------
// Szabad műszak értesítés – jogosult dolgozóknak
// ------------------------------------------------------------
export async function sendOpenShiftNotification(
  _shiftId: string,
  users: { id: string; email: string; full_name: string }[],
  shiftTitle: string,
  startTime: string
) {
  const shiftDate = format(parseISO(startTime), 'MMMM d. (EEEE)', { locale: hu })

  await Promise.allSettled(
    users.map((u) =>
      sendEmailWithRetry({
        from: FROM_EMAIL,
        to: u.email,
        subject: `Új szabad műszak elérhető: ${shiftTitle}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#1a5c3a;padding:24px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0">ShiftAssist</h1></div><div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="color:#1a5c3a;margin-top:0">Szabad műszak elérhető</h2><p>Kedves ${u.full_name}!</p><p><strong>${shiftTitle}</strong> – ${shiftDate}</p><div style="text-align:center;margin:28px 0"><a href="${APP_URL}/dashboard/open-shifts" style="background:#1a5c3a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Elvállalom</a></div></div></div>`,
      })
    )
  )
}

// ------------------------------------------------------------
// Feladat értesítés: dolgozónak kiosztottak egy feladatot
// ------------------------------------------------------------
export async function sendTaskAssignedNotification(
  employee: { id: string; email: string; full_name: string },
  task: { title: string; description: string | null; due_date: string | null; priority: string }
) {
  const dueLine = task.due_date
    ? `Határidő: ${format(new Date(task.due_date), 'yyyy. MMMM d.', { locale: hu })}`
    : ''
  const priorityLine = task.priority === 'high' ? '⚠️ Sürgős feladat' : ''

  await sendEmailWithRetry({
    from: FROM_EMAIL,
    to: employee.email,
    subject: `Új feladat: ${task.title}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a5c3a;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:white;margin:0">ShiftAssist</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <h2 style="color:#1a5c3a;margin-top:0">Új feladatot kaptál</h2>
        <p>Kedves ${employee.full_name}!</p>
        ${priorityLine ? `<p style="color:#dc2626;font-weight:bold">${priorityLine}</p>` : ''}
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <strong style="font-size:16px">${task.title}</strong>
          ${task.description ? `<p style="color:#6b7280;margin:8px 0 0">${task.description}</p>` : ''}
          ${dueLine ? `<p style="color:#6b7280;margin:8px 0 0">${dueLine}</p>` : ''}
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${APP_URL}/my/tasks" style="background:#1a5c3a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Feladataim megtekintése</a>
        </div>
      </div>
    </div>`,
  })
}
