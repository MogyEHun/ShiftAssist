import {
  Html, Head, Body, Container, Section, Heading, Text, Hr, Preview, Link
} from '@react-email/components'

interface Props {
  employeeName: string
  approved: boolean
  startDate: string
  endDate: string
  managerNote?: string
  companyName: string
}

export function LeaveResult({ employeeName, approved, startDate, endDate, managerNote, companyName }: Props) {
  return (
    <Html lang="hu">
      <Head />
      <Preview>Szabadságkérelem {approved ? 'jóváhagyva' : 'elutasítva'} – {startDate}</Preview>
      <Body style={{ backgroundColor: '#f8f9fa', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <Section style={{ background: '#1a5c3a', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' }}>
            <Heading style={{ color: 'white', margin: 0, fontSize: '24px' }}>ShiftAssist</Heading>
          </Section>
          <Section style={{ background: '#ffffff', padding: '32px', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
            <Heading as="h2" style={{ color: approved ? '#1a5c3a' : '#dc2626', marginTop: 0 }}>
              Szabadságkérelem {approved ? 'jóváhagyva ✓' : 'elutasítva ✗'}
            </Heading>
            <Text style={{ color: '#4b5563', lineHeight: '1.6' }}>Kedves {employeeName},</Text>
            <Text style={{ color: '#4b5563', lineHeight: '1.6' }}>
              A(z) <strong>{startDate} – {endDate}</strong> időszakra vonatkozó szabadságkérelmed{' '}
              <strong>{approved ? 'jóváhagyásra' : 'elutasításra'}</strong> került.
            </Text>
            {managerNote && (
              <Section style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px 16px', margin: '16px 0' }}>
                <Text style={{ color: '#4b5563', margin: 0, fontSize: '14px' }}>
                  <em>Megjegyzés: {managerNote}</em>
                </Text>
              </Section>
            )}
            <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            <Text style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
              {companyName} – ShiftAssist beosztáskezelő
              {' · '}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/notifications`} style={{ color: '#9ca3af' }}>
                Értesítések kezelése
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default LeaveResult
