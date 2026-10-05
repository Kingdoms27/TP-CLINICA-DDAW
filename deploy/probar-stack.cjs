const assert = require('node:assert/strict');
if (!process.env.DB_DATABASE?.endsWith('_test')) throw new Error('La prueba de stack requiere una base independiente cuyo nombre termine en _test.');
const base = process.env.CLINICA_TEST_URL || 'http://127.0.0.1:8080';
async function api(path, method = 'GET', body, token) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})},
    ...(body ? {body:JSON.stringify(body)} : {}),
  });
  const text = await response.text();
  assert.ok(response.ok, `${method} ${path}: ${response.status} ${text}`);
  return JSON.parse(text);
}
(async()=>{
  const inicio = await fetch(`${base}/administrador`);
  assert.equal(inicio.status,200);assert.match(await inicio.text(),/app-root/);
  const schema = await api('/docs-json');assert.ok(schema.paths['/reservas']);assert.ok(schema.components.schemas.ReservaRespuestaDto);
  const paciente = await api('/api/auth/login','POST',{email:'paciente1@clinica.com',clave:'Clinica123!'});
  const admin = await api('/api/auth/login','POST',{email:'admin@clinica.com',clave:'Clinica123!'});
  const catalogo = await api('/api/medicos','GET',null,paciente.accessToken);
  const medico = catalogo.find(m=>m.matricula===1001);assert.ok(medico);
  const fecha = new Date();fecha.setUTCDate(fecha.getUTCDate()+3);fecha.setUTCHours(12,0,0,0);
  const reserva = await api('/api/reservas','POST',{idMedico:medico.id,fechaHora:fecha.toISOString()},paciente.accessToken);
  assert.equal(reserva.valorConsulta,medico.valorConsulta);
  try {
    await api(`/api/medicos/${medico.id}/valor-consulta`,'PATCH',{valorConsulta:medico.valorConsulta+1000},admin.accessToken);
    const turnos = await api('/api/reservas/mis-turnos','GET',null,paciente.accessToken);
    assert.equal(turnos.find(t=>t.id===reserva.id).valorConsulta,medico.valorConsulta);
    const cancelada = await api(`/api/reservas/${reserva.id}/cancelar`,'PATCH',{},paciente.accessToken);assert.equal(cancelada.estado,'CANCELADO');
  } finally {
    await api(`/api/medicos/${medico.id}/valor-consulta`,'PATCH',{valorConsulta:medico.valorConsulta},admin.accessToken);
  }
  console.log('Stack aprobado: Angular servido por nginx, rutas SPA, proxy API, Swagger, JWT, reserva, precio congelado y cancelación con PostgreSQL y PM2.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
