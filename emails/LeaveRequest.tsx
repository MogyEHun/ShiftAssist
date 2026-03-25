import {
  Html, Head, Body, Container, Section, Heading, Text, Button, Hr, Preview, Link
} from '@react-email/components'

interface Props {
  managerName: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  companyName: string
  reviewUrl: string
}

export function LeaveRequest({ managerName, employeeName, leaveType, startDate, endDate, companyName, reviewUrl }: Props) {
  return (
    <Html lang="hu">
      <Head />
      <Preview>{employeeName} szabadság kérelmet nyújtott be – {startDate}</Preview>
      <Body style={{ backgroundColor: '#f8f9fa', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <Section style={{ background: '#1a5c3a', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' }}>
            <Heading style={{ color: 'white', margin: 0, fontSize: '24px' }}>ShiftAssist</Heading>
          </Section>
          <Section style={{ background: '#ffffff', padding: '32px', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
            <Heading as="h2" style={{ color: '#1a5c3a', marginTop: 0 }}>Új szabadságkérelem</Heading>
            <Text style={{ color: '#4b5563', lineHeight: '1.6' }}>Kedves {managerName},</Text>
            <Text style={{ color: '#4b5563', lineHeight: '1.6' }}>
              <strong>{employeeName}</strong> szabadságkérelmet nyújtott be:
            </Text>
            <Section style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
              <Text style={{ margin: '4px 0', color: '#374151' }}>Típus: <strong>{leaveType}</strong></Text>
              <Text style={{ margin: '4px 0', color: '#374151' }}>Kezdete: <strong>{startDate}</strong></Text>
              <Text style={{ margin: '4px 0', color: '#374151' }}>Vége: <strong>{endDate}</strong></Text>
            </Section>
            <Button
              href={reviewUrl}
              style={{ background: '#1a5c3a', color: 'white', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', marginTop: '8px' }}
            >
              Kérelem elbírálása
            </Button>
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

export default LeaveRequest
