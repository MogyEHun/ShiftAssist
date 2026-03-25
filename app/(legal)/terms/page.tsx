export const metadata = {
  title: 'Általános Szerződési Feltételek – ShiftAssist',
}

export default function TermsPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Általános Szerződési Feltételek</h1>
      <p className="text-sm text-gray-500 mb-8">Hatályos: 2026. március 25-től</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">1. A szolgáltató</h2>
        <p className="text-gray-700 leading-relaxed">
          A ShiftAssist szolgáltatást a <strong>B&A Solutions Kft.</strong> (a továbbiakban: „Szolgáltató") üzemelteti.
        </p>
        <ul className="list-none mt-3 space-y-1 text-gray-700 text-sm">
          <li><strong>Cégnév:</strong> B&A Solutions Kft.</li>
          <li><strong>Email:</strong> support@shiftsync.hu</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">2. A szolgáltatás tárgya</h2>
        <p className="text-gray-700 leading-relaxed">
          A ShiftAssist egy vállalkozások (különösen vendéglátóipari és kiskereskedelmi egységek) számára készült
          webalapú SaaS (Software as a Service) platform, amely az alábbi funkciókat nyújtja:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
          <li>Munkabeosztás tervezése és kezelése</li>
          <li>Szabadságkérelmek kezelése és jóváhagyása</li>
          <li>Csereigény-kezelés</li>
          <li>QR-kódos jelenléti nyilvántartás (clock-in/out)</li>
          <li>Feladatkezelés</li>
          <li>Személyzeti adminisztráció</li>
          <li>Statisztikák és riportok</li>
          <li>AI-alapú beosztási asszisztens (Prémium csomag)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">3. Regisztráció és fiók</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>A regisztrációhoz érvényes email cím és jelszó megadása szükséges.</li>
          <li>Minden regisztráló vállalkozás <strong>14 napos ingyenes próbaidőszakot</strong> kap, bankkártya megadása nélkül.</li>
          <li>Próbaidő alatt minden funkció korlátozás nélkül elérhető.</li>
          <li>A felhasználó felelős fiókja biztonságáért és a hozzáférési adatok titokban tartásáért.</li>
          <li>Egy vállalkozás (cég) csak egy aktív előfizetéssel rendelkezhet.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">4. Előfizetési csomagok és árazás</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          A szolgáltatás két előfizetési csomagban érhető el: <strong>Alap (Basic)</strong> és <strong>Prémium (Premium)</strong>.
          A díjazás havonta, az aktív dolgozók száma alapján, sávos árazással kerül megállapításra.
        </p>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Dolgozószám</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Alap (Ft/fő/hó)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Prémium (Ft/fő/hó)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-4 py-2 text-gray-700">1–10 fő</td><td className="px-4 py-2">1 060 Ft</td><td className="px-4 py-2">1 700 Ft</td></tr>
              <tr><td className="px-4 py-2 text-gray-700">11–25 fő</td><td className="px-4 py-2">890 Ft</td><td className="px-4 py-2">1 425 Ft</td></tr>
              <tr><td className="px-4 py-2 text-gray-700">26–60 fő</td><td className="px-4 py-2">720 Ft</td><td className="px-4 py-2">1 150 Ft</td></tr>
              <tr><td className="px-4 py-2 text-gray-700">61–100 fő</td><td className="px-4 py-2">595 Ft</td><td className="px-4 py-2">950 Ft</td></tr>
              <tr><td className="px-4 py-2 text-gray-700">100+ fő</td><td className="px-4 py-2">510 Ft</td><td className="px-4 py-2">815 Ft</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
          <li>Alap csomag minimális havidíja: 20 000 Ft (+ ÁFA).</li>
          <li>Prémium csomag minimális havidíja: 30 000 Ft (+ ÁFA).</li>
          <li>Az árak nettó összegek, az aktuális ÁFA-tartalommal növelt összeg kerül számlázásra.</li>
          <li>A számlázás Stripe fizetési rendszeren keresztül, minden hónap 1-jén történik.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">5. Lemondás és felmondás</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Az előfizetés bármikor lemondható a számlázási portálon keresztül.</li>
          <li>A lemondás a következő számlázási időszak kezdetén lép életbe; az előre kifizetett időszak végéig a szolgáltatás elérhető marad.</li>
          <li>Már kifizetett időszakra visszatérítés nem jár, kivéve, ha a Szolgáltató hibájából nem volt elérhető a szolgáltatás 72 óránál hosszabb ideig.</li>
          <li>Lemondás után az adatok 30 napig megmaradnak, ezt követően véglegesen törlésre kerülnek.</li>
          <li>A Szolgáltató jogosult az előfizetést azonnali hatállyal felmondani, ha a felhasználó megsérti jelen feltételeket (pl. visszaélés, jogellenes használat).</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">6. A felhasználó kötelezettségei</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>A platform kizárólag jogszerű, a vonatkozó munkajogi és adatvédelmi előírásoknak megfelelő célra használható.</li>
          <li>A felhasználó felelős azért, hogy az általa rögzített munkavállalói adatok kezelése megfeleljen a GDPR és a magyar adatvédelmi jogszabályoknak.</li>
          <li>Tilos a platform visszafejtése, sokszorosítása, harmadik fél részére történő továbbértékesítése.</li>
          <li>A felhasználó köteles a számlázási adatokat naprakészen tartani.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">7. Rendelkezésre állás és szavatosság</h2>
        <p className="text-gray-700 leading-relaxed">
          A Szolgáltató törekszik a platform folyamatos elérhetőségére (célérték: 99,5% éves átlagban),
          de nem vállal garanciát a szünetmentes működésre. Tervezett karbantartásokról előzetesen értesítést küldünk.
          A platform „ahogy van" alapon kerül nyújtásra; a Szolgáltató nem vállal szavatosságot az üzleti céljainak
          való megfelelőségért.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">8. Felelősség korlátozása</h2>
        <p className="text-gray-700 leading-relaxed">
          A Szolgáltató nem felelős a platform használatából eredő közvetett, következményes vagy elmaradt haszonból
          fakadó károkért. A közvetlen kár esetén a felelősség maximuma az érintett hónapban a felhasználó által
          ténylegesen megfizetett előfizetési díj összege.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">9. Szellemi tulajdon</h2>
        <p className="text-gray-700 leading-relaxed">
          A ShiftAssist platform, annak forráskódja, felhasználói felülete, logói és egyéb elemei a B&A Solutions Kft.
          szellemi tulajdonát képezik. Az előfizetés nem ruház át szellemi tulajdonjogot – csupán korlátozott, nem kizárólagos,
          nem átruházható használati jogot biztosít.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">10. Módosítás</h2>
        <p className="text-gray-700 leading-relaxed">
          A B&A Solutions Kft. jogosult jelen feltételeket egyoldalúan módosítani. Lényeges változásokról legalább
          <strong> 14 nappal</strong> előre email-ben értesítjük a felhasználókat. A módosítás hatályba lépése után a
          platform használatának folytatása a módosítások elfogadásának minősül.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">11. Irányadó jog és jogvita</h2>
        <p className="text-gray-700 leading-relaxed">
          Jelen feltételekre a <strong>magyar jog</strong> az irányadó. Jogvita esetén a felek elsősorban
          tárgyalásos úton kísérelik meg a rendezést. Ennek sikertelensége esetén a hatáskörrel és illetékességgel
          rendelkező magyar bíróság jár el.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">12. Kapcsolat</h2>
        <p className="text-gray-700">
          Kérdés, panasz esetén:{' '}
          <a href="mailto:support@shiftsync.hu" className="text-[#1a5c3a] hover:underline">support@shiftsync.hu</a>
        </p>
      </section>
    </article>
  )
}
