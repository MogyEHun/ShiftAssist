export const metadata = {
  title: 'Adatkezelési tájékoztató – ShiftAssist',
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Adatkezelési tájékoztató</h1>
      <p className="text-sm text-gray-500 mb-8">Hatályos: 2026. március 25-től</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Az adatkezelő</h2>
        <p className="text-gray-700 leading-relaxed">
          A ShiftAssist platform adatkezelője a <strong>B&A Solutions Kft.</strong>
        </p>
        <ul className="list-none mt-3 space-y-1 text-gray-700 text-sm">
          <li><strong>Adatkezelő neve:</strong> B&A Solutions Kft.</li>
          <li><strong>Email:</strong>{' '}
            <a href="mailto:support@shiftsync.hu" className="text-[#1a5c3a] hover:underline">support@shiftsync.hu</a>
          </li>
        </ul>
        <p className="text-gray-700 mt-3 text-sm">
          Jelen tájékoztató az Európai Parlament és a Tanács (EU) 2016/679 rendelete (GDPR) és az Infotv.
          (2011. évi CXII. törvény) alapján készült.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">2. Az adatkezelés célja és jogalapja</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Adatkör</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Cél</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Jogalap</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Megőrzés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 text-gray-700">Név, email cím</td>
                <td className="px-4 py-3 text-gray-600">Regisztráció, bejelentkezés, értesítések</td>
                <td className="px-4 py-3 text-gray-600">Szerződés teljesítése (GDPR 6. cikk (1) b)</td>
                <td className="px-4 py-3 text-gray-600">Fiók törléséig</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Telefonszám</td>
                <td className="px-4 py-3 text-gray-600">Kapcsolattartás (opcionális)</td>
                <td className="px-4 py-3 text-gray-600">Hozzájárulás (GDPR 6. cikk (1) a)</td>
                <td className="px-4 py-3 text-gray-600">Fiók törléséig</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Munkabeosztás és jelenlét</td>
                <td className="px-4 py-3 text-gray-600">Beosztáskezelő funkció</td>
                <td className="px-4 py-3 text-gray-600">Szerződés teljesítése</td>
                <td className="px-4 py-3 text-gray-600">Előfizetés megszűnésétől 30 nap</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Óra- és napibér adatok</td>
                <td className="px-4 py-3 text-gray-600">Bérköltség kalkuláció</td>
                <td className="px-4 py-3 text-gray-600">Jogos érdek / szerződés</td>
                <td className="px-4 py-3 text-gray-600">Előfizetés megszűnésétől 30 nap</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Helyadatok (GPS clock-in)</td>
                <td className="px-4 py-3 text-gray-600">Jelenléti ellenőrzés (opcionális)</td>
                <td className="px-4 py-3 text-gray-600">Hozzájárulás</td>
                <td className="px-4 py-3 text-gray-600">90 nap</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Push értesítési azonosítók</td>
                <td className="px-4 py-3 text-gray-600">Push értesítések küldése</td>
                <td className="px-4 py-3 text-gray-600">Hozzájárulás</td>
                <td className="px-4 py-3 text-gray-600">Leiratkozásig</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">AI chat üzenetek</td>
                <td className="px-4 py-3 text-gray-600">AI beosztási asszisztens</td>
                <td className="px-4 py-3 text-gray-600">Szerződés teljesítése</td>
                <td className="px-4 py-3 text-gray-600">90 nap</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Számlázási adatok</td>
                <td className="px-4 py-3 text-gray-600">Díjfizetés, számla kiállítása</td>
                <td className="px-4 py-3 text-gray-600">Jogi kötelezettség (Sztv.)</td>
                <td className="px-4 py-3 text-gray-600">8 év (számviteli törvény)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">3. Adatbiztonság</h2>
        <p className="text-gray-700 leading-relaxed">
          Az érzékeny személyes adatokat (név, email, telefonszám, bér) titkosított formában tároljuk
          az adatbázisban. A kommunikáció TLS/HTTPS protokollon keresztül történik. A rendszerhez csak
          az arra jogosult személyek (felhasználók, platform adminisztrátorok) férnek hozzá.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">4. Adatfeldolgozók</h2>
        <p className="text-gray-700 mb-3">Az adatkezelő az alábbi adatfeldolgozókat veszi igénybe:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Adatfeldolgozó</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Tevékenység</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Székhely</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">Supabase Inc.</td>
                <td className="px-4 py-3 text-gray-600">Adatbázis, hitelesítés (EU adatközpont)</td>
                <td className="px-4 py-3 text-gray-600">USA / EU (GDPR megfelelő, DPA megkötve)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">Vercel Inc.</td>
                <td className="px-4 py-3 text-gray-600">Tárhelyszolgáltatás, szerverfunkciók</td>
                <td className="px-4 py-3 text-gray-600">USA (SCCs alapján, DPA megkötve)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">Resend Inc.</td>
                <td className="px-4 py-3 text-gray-600">Tranzakciós email küldés</td>
                <td className="px-4 py-3 text-gray-600">USA (GDPR megfelelő)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">Stripe Inc.</td>
                <td className="px-4 py-3 text-gray-600">Online fizetés, számlázás</td>
                <td className="px-4 py-3 text-gray-600">USA / EU (PCI DSS, GDPR megfelelő)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">OpenAI LLC</td>
                <td className="px-4 py-3 text-gray-600">AI beosztási asszisztens (Prémium)</td>
                <td className="px-4 py-3 text-gray-600">USA (adatok nem kerülnek tréningadatba)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">5. Adattovábbítás harmadik országba</h2>
        <p className="text-gray-700 leading-relaxed">
          Egyes adatfeldolgozók (Vercel, Stripe, OpenAI) az USA-ban működnek. Az adattovábbítás az EU-USA
          Adatvédelmi Keretrendszer (DPF), illetve standard szerződési záradékok (SCCs) alapján jogszerű.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">6. Érintetti jogok</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          A GDPR alapján az alábbi jogokkal rendelkezel adataid vonatkozásában:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>Hozzáférési jog</strong> – megtekintheted és exportálhatod a kezelt adataidat (az appban: Beállítások → Adatok exportálása)</li>
          <li><strong>Helyesbítési jog</strong> – kérheted a pontatlan adatok javítását</li>
          <li><strong>Törlési jog</strong> – kérheted az adataid törlését (az appban: Beállítások → Fiók törlése)</li>
          <li><strong>Adathordozhatósági jog</strong> – géppel olvasható formátumban kérheted adataidat (JSON)</li>
          <li><strong>Tiltakozás joga</strong> – tiltakozhatsz a jogos érdeken alapuló adatkezelés ellen</li>
          <li><strong>Korlátozáshoz való jog</strong> – kérheted az adatkezelés korlátozását</li>
        </ul>
        <p className="text-gray-700 mt-4">
          Kérelmek benyújtása:{' '}
          <a href="mailto:support@shiftsync.hu" className="text-[#1a5c3a] hover:underline">support@shiftsync.hu</a>{' '}
          – a kérelmeket <strong>30 napon belül</strong> teljesítjük.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">7. Sütik (cookie-k)</h2>
        <p className="text-gray-700 leading-relaxed">
          A ShiftAssist <strong>kizárólag szükséges sütiket</strong> alkalmaz: munkamenet-azonosítás
          (Supabase auth token) és biztonsági tokenek. Harmadik feles reklám- vagy követési célú
          cookie-kat <strong>nem</strong> használunk.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">8. Automatizált döntéshozatal</h2>
        <p className="text-gray-700 leading-relaxed">
          Az AI beosztás-javaslat funkció javaslatokat tesz, de végső döntést minden esetben a felhasználó hoz.
          Kizárólag automatizált döntéshozatal jogkövetkezménnyel nem történik.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">9. Jogorvoslat</h2>
        <p className="text-gray-700 leading-relaxed">
          Panasszal fordulhatsz a <strong>Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH)</strong>:{' '}
          <a href="https://naih.hu" target="_blank" rel="noopener noreferrer" className="text-[#1a5c3a] hover:underline">naih.hu</a>
          {' '}| ugyfelszolgalat@naih.hu | 1055 Budapest, Falk Miksa utca 9–11.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">10. Tájékoztató módosítása</h2>
        <p className="text-gray-700 leading-relaxed">
          Jelen tájékoztató módosítása esetén az érintetteket email-ben értesítjük, és az új változat
          hatályba lépésének dátumát feltüntetjük az oldalon.
        </p>
      </section>
    </article>
  )
}
