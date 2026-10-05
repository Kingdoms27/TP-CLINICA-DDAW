const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require(process.env.CLINICA_BROWSER_MODULE || 'playwright');
const base = process.env.CLINICA_TEST_URL || 'http://127.0.0.1:8080';
const previews = join(__dirname, 'runtime', 'previews');

(async () => {
  assert.ok(process.env.DB_DATABASE?.endsWith('_test'), 'Usar una base independiente terminada en _test.');
  const response = await fetch(`${base}/api/auth/login`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: 'paciente1@clinica.com', clave: 'Clinica123!'})});
  assert.ok(response.ok);
  const sesion = await response.json();
  const fecha = dias => new Date(Date.now() + dias * 86400000).toISOString();
  const fixtures = Array.from({length: 18}, (_, i) => ({id: 10000 + i, fechaHora: fecha(i - 3), estado: ['ACTIVO','ATENDIDO','CANCELADO','AUSENTE'][i % 4], valorConsulta: i % 2 ? 18000 : 15000, medico: {id: i % 2 + 1, matricula: i % 2 + 1001, nombres: i % 2 ? 'Laura' : 'Juan', apellidos: i % 2 ? 'Gomez' : 'Perez'}}));
  const browser = await chromium.launch({...(process.env.CLINICA_BROWSER_EXECUTABLE ? {executablePath: process.env.CLINICA_BROWSER_EXECUTABLE} : {}), args: ['--no-sandbox']});
  try {
    await mkdir(previews, {recursive: true});
    for (const [nombre, width, height] of [['escritorio',1440,900], ['notebook',1366,768], ['tablet',820,1180], ['movil',390,844], ['movil-pequeno',320,720]]) {
      const context = await browser.newContext({viewport: {width, height}, isMobile: width <= 700, hasTouch: width <= 700});
      await context.addInitScript(s => sessionStorage.setItem('clinica.sesion', JSON.stringify(s)), sesion);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/api/reservas/mis-turnos', route => route.fulfill({json: fixtures}));
      await page.goto(`${base}/paciente`);
      await page.locator('tbody tr').first().waitFor();
      await page.waitForTimeout(800);
      assert.equal(await page.locator('tbody tr').count(), fixtures.length);
      assert.equal(await page.locator('.summary-card').last().locator('strong').textContent(), '18');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${nombre}: ancho del panel`);
      assert.equal(await page.getByRole('link', {name: 'Mis turnos', exact: true}).getAttribute('aria-current'), 'page');
      if (width <= 700) assert.equal(await page.locator('tbody tr').first().evaluate(el => getComputedStyle(el).display), 'grid');
      await page.screenshot({path: join(previews, `paciente-${nombre}.png`)});
      await page.getByRole('button', {name: 'Ver mis reservas'}).click();
      await page.waitForFunction(() => document.activeElement?.id === 'listado-turnos' && scrollY > 100);
      await page.locator('tbody tr').last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      assert.ok(await page.locator('tbody tr').last().evaluate(el => Number(getComputedStyle(el).opacity) > .95), `${nombre}: turnos visibles tras scroll`);
      const ultima = await page.locator('tbody tr').last().boundingBox();
      assert.ok(ultima.width <= width, `${nombre}: reserva dentro de la pantalla`);
      if (nombre === 'movil') await page.screenshot({path: join(previews, 'paciente-movil-listado.png')});
      await page.getByRole('link', {name: 'Reservar consulta', exact: true}).click();
      await page.waitForURL('**/paciente/reservar');
      await page.locator('#medico').waitFor();
      await page.waitForFunction(() => scrollY === 0);
      await page.waitForTimeout(700);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${nombre}: ancho de la reserva`);
      await page.screenshot({path: join(previews, `reserva-${nombre}.png`)});
      assert.deepEqual(errors, [], `${nombre}: errores del navegador`);
      console.log(`Paciente aprobado en ${nombre}: ${width}×${height}, resumen, turnos, scroll, navegación y reserva. Los 18 turnos de presentación son datos de prueba del navegador.`);
      await context.close();
    }
    const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, reducedMotion: 'reduce'});
    await context.addInitScript(s => sessionStorage.setItem('clinica.sesion', JSON.stringify(s)), sesion);
    const page = await context.newPage();
    await page.goto(`${base}/paciente/reservar`);
    await page.waitForFunction(() => document.querySelector('#medico')?.options.length > 1);
    await page.locator('#medico').selectOption({index: 1});
    const dia = fecha(2).slice(0, 10);
    await page.locator('#fecha').fill(dia);
    await page.locator('#hora').selectOption('11:00');
    const reservada = page.waitForResponse(r => r.url().endsWith('/api/reservas') && r.request().method() === 'POST');
    await page.getByRole('button', {name: 'Confirmar reserva'}).click();
    const resultado = await reservada;
    assert.equal(resultado.status(), 201);
    const turno = await resultado.json();
    try {
      await page.getByRole('heading', {name: 'Tu turno quedó reservado'}).waitFor();
      await page.getByRole('link', {name: 'Ver mis turnos', exact: true}).click();
      const fila = page.locator(`[data-turno-id="${turno.id}"]`);
      await fila.waitFor();
      assert.equal(await page.locator('app-mis-turnos').evaluate(el => getComputedStyle(el).animationName), 'none');
      assert.equal(await fila.evaluate(el => getComputedStyle(el).animationName), 'none');
      await fila.getByRole('button', {name: /^Cancelar turno/}).click();
      await page.waitForFunction(() => document.activeElement?.classList.contains('cancel-confirm'));
      assert.ok(await page.locator('.cancel-confirm').evaluate(el => el.getBoundingClientRect().top >= -1));
      await page.getByRole('button', {name: 'Conservar turno'}).click();
      await page.locator('.cancel-confirm').waitFor({state: 'detached'});
      await fila.getByRole('button', {name: /^Cancelar turno/}).click();
      const cancelada = page.waitForResponse(r => r.url().endsWith(`/api/reservas/${turno.id}/cancelar`) && r.request().method() === 'PATCH');
      await page.getByRole('button', {name: 'Sí, cancelar turno'}).click();
      assert.equal((await cancelada).status(), 200);
      await page.getByRole('status').filter({hasText: 'Tu turno se canceló correctamente'}).waitFor();
      assert.equal((await fila.locator('.state').textContent()).trim(), 'Cancelado');
      assert.equal(await fila.getByRole('button', {name: /^Cancelar turno/}).count(), 0);
      console.log('Operación real aprobada en móvil: reserva por nginx, precio confirmado, conservar, cancelar, foco de confirmación y movimiento reducido.');
    } finally {
      const cancelar = await fetch(`${base}/api/reservas/${turno.id}/cancelar`, {method: 'PATCH', headers: {Authorization: `Bearer ${sesion.accessToken}`}});
      assert.ok(cancelar.ok || cancelar.status === 400, 'Limpiar la reserva de prueba.');
    }
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
