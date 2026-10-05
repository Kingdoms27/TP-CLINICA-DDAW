const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require(process.env.CLINICA_BROWSER_MODULE || 'playwright');
const base = process.env.CLINICA_TEST_URL || 'http://127.0.0.1:8080';
const previews = join(__dirname, 'runtime', 'previews');

(async () => {
  assert.ok(process.env.DB_DATABASE?.endsWith('_test'), 'Usar una base independiente terminada en _test.');
  const browser = await chromium.launch({
    ...(process.env.CLINICA_BROWSER_EXECUTABLE ? {executablePath: process.env.CLINICA_BROWSER_EXECUTABLE} : {}),
    args: ['--no-sandbox'],
  });
  try {
    await mkdir(previews, {recursive: true});
    for (const [nombre, width, height] of [['escritorio',1440,900], ['notebook',1366,768], ['tablet',820,1180], ['movil',390,844], ['movil-pequeno',320,720]]) {
      const context = await browser.newContext({viewport: {width, height}});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/login`);
      await page.locator('#email').waitFor();
      await page.waitForTimeout(1300);
      assert.equal(await page.title(), 'Clínica · Gestión de turnos');
      const layout = await page.evaluate(() => {
        const submit = document.querySelector('.submit-button').getBoundingClientRect();
        const logo = document.querySelector(innerWidth <= 820 ? '.mobile-brand img' : '.brand-symbol');
        return {overflow: document.documentElement.scrollWidth > innerWidth, submitVisible: submit.top >= 0 && submit.bottom <= innerHeight, logo: logo.complete && logo.naturalWidth > 0};
      });
      assert.equal(layout.overflow, false, `${nombre}: ancho de la página`);
      assert.ok(layout.submitVisible, `${nombre}: formulario visible al abrir`);
      assert.ok(layout.logo, `${nombre}: logo cargado`);
      await page.screenshot({path: join(previews, `${nombre}.png`)});
      await page.getByRole('button', {name: 'Un espacio para cada rol'}).click();
      await page.waitForFunction(() => scrollY > 100 && document.activeElement?.id === 'como-funciona');
      await page.waitForTimeout(900);
      assert.ok(await page.locator('.information-card').first().evaluate(el => Number(getComputedStyle(el).opacity) > .95), `${nombre}: tarjetas visibles tras scroll`);
      if (nombre === 'escritorio') await page.screenshot({path: join(previews, 'informacion.png')});
      await page.getByRole('button', {name: 'Volver al acceso'}).click();
      await page.waitForTimeout(900);
      await page.locator('#clave').fill('Prueba123!');
      await page.getByRole('button', {name: 'Mostrar contraseña'}).click();
      await page.waitForFunction(() => document.querySelector('#clave').type === 'text');
      await page.getByRole('button', {name: 'Ocultar contraseña'}).click();
      await page.waitForFunction(() => document.querySelector('#clave').type === 'password');
      assert.deepEqual(errors, [], `${nombre}: errores del navegador`);
      console.log(`Login aprobado en ${nombre}: ${width}×${height}, logo, formulario, scroll y contraseña.`);
      await context.close();
    }
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    await page.goto(`${base}/login`);
    await page.locator('#email').waitFor();
    assert.equal(await page.locator('.login-card').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.getByRole('button', {name: 'Un espacio para cada rol'}).click();
    assert.ok(await page.evaluate(() => scrollY > 100));
    await page.getByRole('button', {name: 'Volver al acceso'}).click();
    await page.locator('#email').fill('paciente1@clinica.com');
    await page.locator('#clave').fill('ClaveIncorrecta');
    await page.getByRole('button', {name: 'Iniciar sesión'}).click();
    await page.getByRole('alert').waitFor();
    await page.locator('#clave').fill('Clinica123!');
    await page.getByRole('button', {name: 'Iniciar sesión'}).click();
    await page.waitForURL(url => url.pathname === '/paciente');
    await page.getByRole('button', {name: 'Cerrar sesión'}).click();
    await page.waitForURL('**/login');
    console.log('Movimiento reducido, error recuperable, ingreso real por nginx y cierre de sesión aprobados.');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
