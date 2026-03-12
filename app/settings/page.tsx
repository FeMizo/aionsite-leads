import { PageHeader } from "@/components/crm/page-header";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Settings"
        title="Configuracion operativa"
        description="Referencia rapida para las integraciones y branding de AionSite."
      />
      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>AionSite</h2>
            <p>https://aionsite.com.mx/</p>
          </div>
        </div>
        <div className="settings-grid">
          <article>
            <h3>Generacion</h3>
            <p>
              Usa Google Places API (New) y mueve los registros nuevos a la bandeja
              Generated.
            </p>
          </article>
          <article>
            <h3>Envio</h3>
            <p>
              SMTP configurado desde <code>contacto@aionsite.com.mx</code> y
              protegido contra reenvios accidentales.
            </p>
          </article>
          <article>
            <h3>Crecimiento</h3>
            <p>
              Puedes ampliar categorias y ciudades modificando
              <code>scripts/generateProspects.js</code>.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
