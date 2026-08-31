const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('XPag client sends the documented SPEI and OXXO payloads', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true })
    };
  };

  try {
    const xpag = require('../lib/xpag');
    const credentials = { client_id: 'client', client_secret: 'secret' };

    await xpag.createSpei(credentials, {
      amount: 99,
      name: 'Juan Pérez',
      document: 'PEPJ800101HDFRRL09',
      external_id: 'dep-spei'
    });
    await xpag.createOxxo(credentials, {
      amount: 99,
      payerData: { name: 'Juan Pérez', email: 'juan@example.com' },
      external_id: 'dep-oxxo'
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://api.xpagamentos.com/cashin');
    assert.deepEqual(calls[0].body, {
      currency: 'MXN',
      amount: 99,
      name: 'Juan Pérez',
      document: 'PEPJ800101HDFRRL09',
      external_id: 'dep-spei'
    });
    assert.deepEqual(calls[1].body, {
      currency: 'MXN',
      method: 'OXXO',
      generateCheckout: false,
      amount: 99,
      payerData: { name: 'Juan Pérez', email: 'juan@example.com' },
      external_id: 'dep-oxxo'
    });
    assert.equal(calls[1].options.headers['x-client-id'], 'client');
    assert.equal(calls[1].options.headers['x-client-secret'], 'secret');
  } finally {
    global.fetch = originalFetch;
  }
});

test('deposit endpoint maps valid SPEI and OXXO instructions', async (t) => {
  const dbPath = require.resolve('../lib/db');
  const xpagPath = require.resolve('../lib/xpag');
  const handlerPath = require.resolve('../api/deposits/index');
  let sequence = 0;
  let deposits = new Map();
  let xpagMock;

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      getGatewaySettings: async () => ({ xpag: { client_id: 'client', client_secret: 'secret' } }),
      getModel: async () => ({
        gateway: 'xpag',
        currency: 'MXN',
        locale: 'es-MX',
        plans: [{ duration: '1 mes', price: 99 }],
        promotions: []
      }),
      createDeposit: async data => {
        const row = { id: `dep-${++sequence}`, ...data };
        deposits.set(row.id, row);
        return row;
      },
      updateDeposit: async (id, patch) => {
        const row = { ...deposits.get(id), ...patch, updated_at: new Date().toISOString() };
        deposits.set(id, row);
        return row;
      },
      deliverWebhook: async () => ({ ok: true })
    }
  };
  require.cache[xpagPath] = {
    id: xpagPath,
    filename: xpagPath,
    loaded: true,
    exports: {
      createSpei: (...args) => xpagMock.createSpei(...args),
      createOxxo: (...args) => xpagMock.createOxxo(...args)
    }
  };

  function loadHandler(mock) {
    xpagMock = mock;
    delete require.cache[handlerPath];
    return require(handlerPath);
  }

  function response() {
    return {
      statusCode: 200,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; }
    };
  }

  await t.test('SPEI exposes the 18-digit CLABE and reference', async () => {
    const handler = loadHandler({
      createSpei: async () => ({
        ok: true,
        status: 200,
        body: {
          ok: true,
          clabe: '012345678901234567',
          reference: 'REF123456',
          transaction_id: 'spei-1',
          bank_name: 'STP',
          beneficiary: 'XPAG',
          amount: 99,
          status: 'pending'
        }
      }),
      createOxxo: async () => { throw new Error('not expected'); }
    });
    const res = response();
    await handler({
      method: 'POST',
      headers: { host: '127.0.0.1:3000' },
      body: {
        amount: 99,
        method: 'spei',
        currency: 'MXN',
        model_slug: 'mexico-demo',
        reference: '1 mes',
        payer: { name: 'Juan', email: 'juan@example.com', document: 'PEPJ800101HDFRRL09' }
      }
    }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.gateway.clabe, '012345678901234567');
    assert.equal(res.body.gateway.reference, 'REF123456');
  });

  await t.test('OXXO exposes payee_data reference and barcode', async () => {
    const handler = loadHandler({
      createSpei: async () => { throw new Error('not expected'); },
      createOxxo: async () => ({
        ok: true,
        status: 200,
        body: {
          ok: true,
          method: 'OXXO',
          transaction_id: 'oxxo-1',
          amount: 99,
          status: 'pending',
          payee_data: {
            reference: '8204240000119882',
            barcode: 'https://static.muwe.mx/test.png'
          }
        }
      })
    });
    const res = response();
    await handler({
      method: 'POST',
      headers: { host: '127.0.0.1:3000' },
      body: {
        amount: 99,
        method: 'oxxo',
        currency: 'MXN',
        model_slug: 'mexico-demo',
        reference: '1 mes',
        payer: { name: 'Juan', email: 'juan@example.com' }
      }
    }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.gateway.reference, '8204240000119882');
    assert.equal(res.body.gateway.barcode, 'https://static.muwe.mx/test.png');
  });

  await t.test('OXXO rejects a SPEI-shaped response', async () => {
    const handler = loadHandler({
      createSpei: async () => { throw new Error('not expected'); },
      createOxxo: async () => ({
        ok: true,
        status: 200,
        body: {
          ok: true,
          clabe: '012345678901234567',
          reference: 'NOT-AN-OXXO-VOUCHER',
          transaction_id: 'wrong-1'
        }
      })
    });
    const res = response();
    await handler({
      method: 'POST',
      headers: { host: '127.0.0.1:3000' },
      body: {
        amount: 99,
        method: 'oxxo',
        currency: 'MXN',
        model_slug: 'mexico-demo',
        reference: '1 mes',
        payer: { name: 'Juan', email: 'juan@example.com' }
      }
    }, res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.error, 'invalid OXXO response');
  });

  await t.test('rejects a price changed in the browser', async () => {
    const handler = loadHandler({
      createSpei: async () => { throw new Error('gateway must not be called'); },
      createOxxo: async () => { throw new Error('gateway must not be called'); }
    });
    const res = response();
    await handler({
      method: 'POST',
      headers: { host: '127.0.0.1:3000' },
      body: {
        amount: 10,
        method: 'oxxo',
        currency: 'MXN',
        model_slug: 'mexico-demo',
        reference: '1 mes',
        payer: { name: 'Juan', email: 'juan@example.com' }
      }
    }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'amount mismatch');
  });
});

test('Meta Purchase is generated for SPEI/OXXO and absent from confirmation', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/script.js'), 'utf8');
  const confirmation = source.slice(
    source.indexOf('function onPaymentConfirmed'),
    source.indexOf('function isHttpUrl')
  );
  assert.match(source, /trackMetaPurchaseOnGeneration\('spei'\)/);
  assert.match(source, /trackMetaPurchaseOnGeneration\('oxxo'\)/);
  assert.match(source, /metaTrack\('Purchase', props\)/);
  assert.doesNotMatch(confirmation, /metaTrack\('Purchase'/);
});
