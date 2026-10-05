const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require(process.env.CLINICA_BROWSER_MODULE || 'playwright');
const base = process.env.CLINICA_TEST_URL || 'http://127.0.0.1:8080';
const previews = join(__dirname, 'runtime', 'previews');
async function api(path, method = 'GET', body, token) {
  const r = await fetch(`${base}/api${path}`, {method, headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
  const text = await r.text();
  assert.ok(r.ok, `${method} ${path}: ${r.status} ${text}`);
  return JSON.parse(text);
}
async function abrir(browser, sesion, width, height, reducir = false) {
  const context = await browser.newContext({viewport: {width, height}, locale: 'es-AR', isMobile: width <= 700, hasTouch: width <= 700, reducedMotion: reducir ? 'reduce' : 'no-preference'});
  await context.addInitScript(s => sessionStorage.setItem('clinica.sesion', JSON.stringify(s)), sesion);
  return context;
}
(async () => {
  assert.ok(process.env.DB_DATABASE?.endsWith('_test'), 'Usar una base independiente terminada en _test.');
  const admin = await api('/auth/login', 'POST', {email: 'admin@clinica.com', clave: 'Clinica123!'});
  const medicoSesion = await api('/auth/login', 'POST', {email: 'medico1@clinica.com', clave: 'Clinica123!'});
  const pacientes = await api('/usuarios/pacientes', 'GET', null, admin.accessToken);
  const medicos = await api('/medicos', 'GET', null, admin.accessToken);
  const medico = medicos.find(m => m.matricula === 1001);
  const paciente = pacientes[0];
  assert.ok(medico && paciente);
  const fechaDia = (dias = 0) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
  const horaFecha = (dias, hora) => `${fechaDia(dias)}T${String(hora + 3).padStart(2,'0')}:00:00.000Z`;
  const agenda = Array.from({length: 8}, (_, i) => ({id: 20000 + i, fechaHora: horaFecha(0, 8 + i), estado: ['ACTIVO','ATENDIDO','AUSENTE'][i % 3], valorConsulta: 15000, paciente: {...paciente, nombres: ['Carlos','Ana','Elena','Lucas'][i % 4]}}));
  const turnos = Array.from({length: 16}, (_, i) => ({...agenda[i % 8], id: 21000 + i, fechaHora: horaFecha(Math.floor(i / 8), 8 + i % 8), estado: ['ACTIVO','ATENDIDO','CANCELADO','AUSENTE'][i % 4], medico}));
  const browser = await chromium.launch({...(process.env.CLINICA_BROWSER_EXECUTABLE ? {executablePath: process.env.CLINICA_BROWSER_EXECUTABLE} : {}), args: ['--no-sandbox']});
  try {
    await mkdir(previews, {recursive: true});
    for (const [nombre, width, height] of [['escritorio',1440,900], ['notebook',1366,768], ['tablet',820,1180], ['movil',390,844], ['movil-pequeno',320,720]]) {
      for (const [rol, sesion, ruta, listado] of [['medico',medicoSesion,'medico',agenda], ['admin',admin,'administrador',turnos]]) {
        const context = await abrir(browser, sesion, width, height);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route(rol === 'medico' ? '**/api/reservas/medico?*' : '**/api/reservas/admin', route => route.fulfill({json: listado}));
        await page.goto(`${base}/${ruta}`);
        await page.locator('tbody tr').first().waitFor();
        await page.waitForTimeout(750);
        assert.equal(await page.locator('tbody tr').count(), listado.length);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${rol}/${nombre}: ancho de la página`);
        if (width <= 700) assert.equal(await page.locator('tbody tr').first().evaluate(el => getComputedStyle(el).display), 'grid');
        await page.screenshot({path: join(previews, `${rol}-${nombre}.png`)});
        await page.locator('tbody tr').last().scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        assert.ok(await page.locator('tbody tr').last().evaluate(el => Number(getComputedStyle(el).opacity) > .95), `${rol}/${nombre}: filas visibles al desplazarse`);
        if (nombre === 'movil') await page.screenshot({path: join(previews, `${rol}-movil-listado.png`)});
        if (rol === 'admin') {
          await page.locator('#busqueda').fill('NombreInexistente');
          await page.getByRole('heading', {name: 'No encontramos consultas.'}).waitFor();
          await page.locator('#busqueda').fill('');
          await page.locator('tbody tr').first().waitFor();
          await page.getByRole('button', {name: 'Reservar', exact: true}).click();
          await page.locator('#paciente-admin').waitFor();
          assert.equal(await page.getByRole('button', {name: 'Reservar', exact: true}).getAttribute('aria-pressed'), 'true');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          if (nombre === 'escritorio' || nombre === 'movil') await page.screenshot({path: join(previews, `admin-reservar-${nombre}.png`), fullPage: true});
          await page.getByRole('button', {name: 'Valores de consulta', exact: true}).click();
          await page.locator('.price-input').first().waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          if (nombre === 'escritorio' || nombre === 'movil') await page.screenshot({path: join(previews, `admin-precios-${nombre}.png`), fullPage: true});
        }
        assert.deepEqual(errors, [], `${rol}/${nombre}: errores del navegador`);
        console.log(`${rol} aprobado en ${nombre}: ${width}×${height}, presentación, tarjetas, scroll y secciones. Los listados de presentación usan datos simulados.`);
        await context.close();
      }
    }
    const contextoAdmin = await abrir(browser, admin, 390, 844, true);
    const page = await contextoAdmin.newPage();
    const reservas = [];
    const valorOriginal = medico.valorConsulta;
    try {
      await page.goto(`${base}/administrador`);
      await page.getByRole('button', {name: 'Reservar', exact: true}).click();
      await page.waitForFunction(() => document.querySelector('#paciente-admin')?.options.length > 1);
      await page.locator('#paciente-admin').selectOption({index: 1});
      await page.locator('#medico-admin').selectOption({label: `${medico.nombres} ${medico.apellidos}`});
      await page.locator('#fecha-admin').fill(fechaDia(2));
      await page.locator('#hora-admin').selectOption('12:00');
      const respuesta = page.waitForResponse(r => r.url().endsWith('/api/reservas') && r.request().method() === 'POST');
      await page.getByRole('button', {name: 'Confirmar reserva', exact: true}).click();
      const creada = await respuesta;
      assert.equal(creada.status(), 201);
      const primera = await creada.json();reservas.push(primera);
      await page.getByRole('heading', {name: 'Reserva confirmada'}).waitFor();
      await page.getByRole('button', {name: 'Valores de consulta', exact: true}).click();
      const precioFila = page.locator(`[data-medico-id="${medico.id}"]`);
      await precioFila.locator('input').fill(String(valorOriginal + 1000));
      const precio = page.waitForResponse(r => r.url().endsWith(`/api/medicos/${medico.id}/valor-consulta`) && r.request().method() === 'PATCH');
      await precioFila.getByRole('button', {name: 'Guardar', exact: true}).click();
      assert.equal((await precio).status(), 200);
      await page.getByRole('status').filter({hasText: 'Valor actualizado.'}).waitFor();
      await page.getByRole('button', {name: 'Turnos', exact: true}).click();
      const lista = page.waitForResponse(r => r.url().endsWith('/api/reservas/admin') && r.request().method() === 'GET');
      await page.getByRole('button', {name: 'Actualizar', exact: true}).click();await lista;
      const primeraFila = page.locator(`[data-turno-id="${primera.id}"]`);await primeraFila.waitFor();
      assert.equal(Number((await primeraFila.locator('.value-cell').textContent()).replace(/\D/g,'')), valorOriginal);
      const ausente = await api('/reservas', 'POST', {idPaciente: paciente.id, idMedico: medico.id, fechaHora: horaFecha(2, 13)}, admin.accessToken);reservas.push(ausente);
      const cancelar = await api('/reservas', 'POST', {idPaciente: paciente.id, idMedico: medico.id, fechaHora: horaFecha(2, 14)}, admin.accessToken);reservas.push(cancelar);
      assert.equal(ausente.valorConsulta, valorOriginal + 1000);
      const contextoMedico = await abrir(browser, medicoSesion, 390, 844, true);
      const agendaPage = await contextoMedico.newPage();
      await agendaPage.goto(`${base}/medico`);
      await agendaPage.locator('#fecha-agenda').fill(fechaDia(2));
      const consulta = agendaPage.waitForResponse(r => r.url().includes('/api/reservas/medico?fecha=') && r.request().method() === 'GET');
      await agendaPage.getByRole('button', {name: 'Consultar agenda'}).click();await consulta;
      for (const [turno, accion, estado] of [[primera,'atendido','Atendido'],[ausente,'ausente','Ausente']]) {
        const fila = agendaPage.locator(`[data-turno-id="${turno.id}"]`);await fila.waitFor();
        await fila.getByRole('button', {name: new RegExp(`^Marcar ${accion}`)}).click();
        await agendaPage.waitForFunction(() => document.activeElement?.classList.contains('confirmation'));
        assert.ok(await agendaPage.locator('.confirmation').evaluate(el => el.getBoundingClientRect().top >= -1));
        const actualizada = agendaPage.waitForResponse(r => r.url().endsWith(`/api/reservas/${turno.id}/${accion}`) && r.request().method() === 'PATCH');
        await agendaPage.getByRole('button', {name: 'Confirmar', exact: true}).click();assert.equal((await actualizada).status(), 200);
        await agendaPage.waitForFunction(({id, estado}) => document.querySelector(`[data-turno-id="${id}"] .badge`)?.textContent.trim() === estado, {id: turno.id, estado});
        assert.equal(await fila.locator('.actions').count(), 0);
      }
      assert.equal(await agendaPage.locator('app-agenda-medico').evaluate(el => getComputedStyle(el).animationName), 'none');
      await contextoMedico.close();
      const recarga = page.waitForResponse(r => r.url().endsWith('/api/reservas/admin') && r.request().method() === 'GET');
      await page.getByRole('button', {name: 'Actualizar', exact: true}).click();await recarga;
      const filaCancelacion = page.locator(`[data-turno-id="${cancelar.id}"]`);await filaCancelacion.waitFor();
      await filaCancelacion.getByRole('button', {name: /^Cancelar turno/}).click();
      await page.waitForFunction(() => document.activeElement?.classList.contains('confirmation'));
      await page.getByRole('button', {name: 'Conservar turno', exact: true}).click();
      await page.locator('.confirmation').waitFor({state: 'detached'});
      await filaCancelacion.getByRole('button', {name: /^Cancelar turno/}).click();
      const cancelada = page.waitForResponse(r => r.url().endsWith(`/api/reservas/${cancelar.id}/cancelar-admin`) && r.request().method() === 'PATCH');
      await page.getByRole('button', {name: 'Confirmar cancelación', exact: true}).click();assert.equal((await cancelada).status(), 200);
      await page.waitForFunction(id => document.querySelector(`[data-turno-id="${id}"] .badge`)?.textContent.trim() === 'Cancelado', cancelar.id);
      assert.equal(await page.locator('app-administrador').evaluate(el => getComputedStyle(el).animationName), 'none');
      console.log('Gestión real aprobada en móvil: administrador reserva, cambia precio con importe anterior congelado, conserva/cancela; médico consulta fecha y confirma atendido/ausente; foco y movimiento reducido.');
    } finally {
      await api(`/medicos/${medico.id}/valor-consulta`, 'PATCH', {valorConsulta: valorOriginal}, admin.accessToken);
      for (const r of reservas) await fetch(`${base}/api/reservas/${r.id}/cancelar-admin`, {method:'PATCH', headers:{Authorization:`Bearer ${admin.accessToken}`}});
      await contextoAdmin.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
