import {
  Html, Head, Body, Container, Section, Heading, Text, Button, Hr, Preview, Link
} from '@react-email/components'

interface Props {
  managerName: string
  requesterName: string
  targetName: string
  shiftDate: string
  companyName: string
  approveUrl: string
}

export function ShiftSwapRequest({ managerName, requesterName, targetName, shiftDate, companyName, approveUrl }: Props) {
  return (
    <Html lang="hu">
      <Head />
      <Preview>{requesterName} cserét kér {targetName} dolgozóval – {shiftDate}</Preview>
      <Body style={{ backgroundColor: '#f8f9fa', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <Section style={{ background: '#1a5c3a', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' }}>
            <Heading style={{ color: 'white', margin: 0, fontSize: '24px' }}>ShiftAssist</Heading>
          </Section>
          <Section style={{ background: '#ffffff', padding: '32px', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
            <Heading as="h2" style={{ color: '#1a5c3a', marginTop: 0 }}>Csereigény jóváhagyást vár</Heading>
            <Text style={{ color: '#4b5563', lineHeight: '1.6' }}>
              Kedves {managerName},
            </Text>
            <Text style={{ color: '#4b5563', lineHeight: '1.6' }}>
              <strong>{requesterName}</strong> cserét kér <strong>{targetName}</strong> dolgozóval a következő műszakra:
              <br /><strong>{shiftDate}</strong>
            </Text>
            <Button
              href={approveUrl}
              style={{ background: '#1a5c3a', color: 'white', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', marginTop: '16px' }}
            >
              Csere jóváhagyása
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

export default ShiftSwapRequest
