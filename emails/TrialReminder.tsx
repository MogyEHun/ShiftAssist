import {
  Html, Head, Body, Container, Section, Heading, Text, Button, Hr, Preview
} from '@react-email/components'

interface Props {
  ownerName: string
  companyName: string
  daysLeft: number
  billingUrl: string
}

export function TrialReminder({ ownerName, companyName, daysLeft, billingUrl }: Props) {
  return (
    <Html lang="hu">
      <Head />
      <Preview>{`ShiftAssist próbaidőszak – ${daysLeft} nap maradt`}</Preview>
      <Body style={{ backgroundColor: '#f8f9fa', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <Section style={{ background: '#1a5c3a', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' }}>
            <Heading style={{ color: 'white', margin: 0, fontSize: '24px' }}>ShiftAssist</Heading>
          </Section>
          <Section style={{ background: '#ffffff', padding: '32px', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
            <Heading as="h2" style={{ color: '#d97706', marginTop: 0 }}>
              A próbaidőszak hamarosan lejár
            </Heading>
            <Text style={{ color: '#4b5563', lineHeight: '1.6' }}>Kedves {ownerName},</Text>
            <Text style={{ color: '#4b5563', lineHeight: '1.6' }}>
              A <strong>{companyName}</strong> ShiftAssist próbaidőszaka{' '}
              <strong>{daysLeft} nap múlva lejár</strong>.
              A hozzáférés fenntartásához kérjük aktiváld az előfizetésedet.
            </Text>
            <Button
              href={billingUrl}
              style={{ background: '#1a5c3a', color: 'white', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', marginTop: '16px' }}
            >
              Előfizetés aktiválása
            </Button>
            <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
              Kérdéseid vannak? Írj nekünk:{' '}
              <a href="mailto:support@shiftsync.hu" style={{ color: '#1a5c3a' }}>support@shiftsync.hu</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default TrialReminder
