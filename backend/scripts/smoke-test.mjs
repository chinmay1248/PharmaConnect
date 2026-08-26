// End-to-end smoke test against a running PharmaConnect backend.
//
// Start the backend, seed the database, then run:
//   npm run smoke
//
// It signs in as each seeded role, checks that the authorization boundaries between them hold,
// drives one customer order from placement through delivery, and verifies invoices, notifications,
// live courier tracking, the B2B restock path, and prescription privacy. Set SMOKE_BASE to point at
// a backend on a different port.
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:4000/api';

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` :: ${detail}` : ''}`);
  }
}

async function call(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return { status: response.status, payload };
}

async function main() {
  console.log('\n== 1. Authentication ==');
  const anonMedicines = await call('/medicines?limit=1');
  check('public medicine catalogue is reachable without a token', anonMedicines.status === 200, `status ${anonMedicines.status}`);

  const badLogin = await call('/auth/login', { method: 'POST', body: { identifier: 'customer@pharmaconnect.app', password: 'wrong-password' } });
  check('wrong password is rejected', badLogin.status === 401, `status ${badLogin.status}`);

  const customerLogin = await call('/auth/login', { method: 'POST', body: { identifier: 'customer@pharmaconnect.app', password: 'Pharma@123' } });
  check('customer signs in', customerLogin.status === 200 && Boolean(customerLogin.payload?.token), JSON.stringify(customerLogin.payload).slice(0, 160));
  const customerToken = customerLogin.payload?.token;
  const customerId = customerLogin.payload?.user?.id;

  const retailerLogin = await call('/auth/login', { method: 'POST', body: { identifier: 'retailer@pharmaconnect.app', password: 'Pharma@123' } });
  check('retailer signs in and gets a retailer profile', retailerLogin.status === 200 && Boolean(retailerLogin.payload?.user?.retailerProfile), JSON.stringify(retailerLogin.payload?.user?.role));
  const retailerToken = retailerLogin.payload?.token;
  const retailerId = retailerLogin.payload?.user?.retailerProfile?.id;

  const wholesellerLogin = await call('/auth/login', { method: 'POST', body: { identifier: 'wholeseller@pharmaconnect.app', password: 'Pharma@123' } });
  check('wholeseller signs in', wholesellerLogin.status === 200 && Boolean(wholesellerLogin.payload?.user?.wholesellerProfile));
  const wholesellerToken = wholesellerLogin.payload?.token;
  const wholesellerId = wholesellerLogin.payload?.user?.wholesellerProfile?.id;

  const companyLogin = await call('/auth/login', { method: 'POST', body: { identifier: 'company@pharmaconnect.app', password: 'Pharma@123' } });
  check('company signs in', companyLogin.status === 200 && Boolean(companyLogin.payload?.user?.companyProfile));
  const companyToken = companyLogin.payload?.token;
  const companyId = companyLogin.payload?.user?.companyProfile?.id;

  const session = await call('/auth/session', { token: customerToken });
  check('session restore returns the signed-in profile', session.status === 200 && session.payload?.user?.id === customerId);

  const tamperedToken = `${customerToken.slice(0, -3)}xyz`;
  const tampered = await call('/auth/session', { token: tamperedToken });
  check('tampered token is rejected', tampered.status === 401, `status ${tampered.status}`);

  console.log('\n== 2. Authorization boundaries ==');
  const noToken = await call(`/orders/customer/${customerId}`);
  check('order history requires a token', noToken.status === 401, `status ${noToken.status}`);

  const crossUser = await call(`/orders/customer/${retailerLogin.payload.user.id}`, { token: customerToken });
  check("a customer cannot read another user's orders", crossUser.status === 403, `status ${crossUser.status}`);

  const customerHittingRetailer = await call(`/retailers/${retailerId}/customer-orders`, { token: customerToken });
  check('a customer cannot open the pharmacy order queue', customerHittingRetailer.status === 403, `status ${customerHittingRetailer.status}`);

  const retailerHittingWholeseller = await call(`/wholesellers/${wholesellerId}/retailer-orders`, { token: retailerToken });
  check("a retailer cannot open a wholeseller's order book", retailerHittingWholeseller.status === 403, `status ${retailerHittingWholeseller.status}`);

  const wholesellerHittingCompany = await call(`/companies/${companyId}/wholeseller-orders`, { token: wholesellerToken });
  check("a wholeseller cannot open a company's order book", wholesellerHittingCompany.status === 403, `status ${wholesellerHittingCompany.status}`);

  const retailerAnalyticsAsCustomer = await call(`/analytics/retailers/${retailerId}/summary`, { token: customerToken });
  check('a customer cannot read retailer analytics', retailerAnalyticsAsCustomer.status === 403, `status ${retailerAnalyticsAsCustomer.status}`);

  const ownAnalytics = await call(`/analytics/retailers/${retailerId}/summary`, { token: retailerToken });
  check('a retailer can read its own analytics', ownAnalytics.status === 200, `status ${ownAnalytics.status}`);

  const notificationsAsSelf = await call(`/notifications/users/${customerId}`, { token: customerToken });
  check('a customer reads their own notification inbox', notificationsAsSelf.status === 200);

  const notificationsCross = await call(`/notifications/users/${customerId}`, { token: retailerToken });
  check("a retailer cannot read a customer's inbox", notificationsCross.status === 403, `status ${notificationsCross.status}`);

  console.log('\n== 3. Customer order lifecycle ==');
  const inventory = await call(`/retailers/${retailerId}/inventory`, { token: retailerToken });
  const stockedItem = inventory.payload?.inventory?.find((item) => item.availableQuantity > 2);
  check('retailer has stocked inventory to sell', Boolean(stockedItem), `items ${inventory.payload?.inventory?.length}`);

  if (!stockedItem) {
    return;
  }

  const created = await call('/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      customerId,
      retailerId,
      deliveryMethod: 'HOME_DELIVERY',
      paymentMethod: 'CASH_ON_DELIVERY',
      items: [{ medicineId: stockedItem.medicineId, quantity: 1 }],
    },
  });
  check('customer places an order', created.status === 201 || created.status === 200, `status ${created.status} ${JSON.stringify(created.payload).slice(0, 200)}`);
  const orderId = created.payload?.order?.id ?? created.payload?.orderId ?? created.payload?.id;
  check('order id returned', Boolean(orderId), JSON.stringify(created.payload).slice(0, 200));

  if (!orderId) {
    return;
  }

  const spoofedOrder = await call('/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      customerId: retailerLogin.payload.user.id,
      retailerId,
      deliveryMethod: 'HOME_DELIVERY',
      items: [{ medicineId: stockedItem.medicineId, quantity: 1 }],
    },
  });
  check('a customer cannot place an order as someone else', spoofedOrder.status === 403, `status ${spoofedOrder.status}`);

  const queue = await call(`/retailers/${retailerId}/customer-orders?status=PENDING_ACTION`, { token: retailerToken });
  check('order appears in the pharmacy queue', queue.payload?.orders?.some((order) => order.id === orderId));

  const approved = await call(`/retailers/${retailerId}/customer-orders/${orderId}/decision`, {
    method: 'PATCH',
    token: retailerToken,
    body: { decision: 'APPROVE', notes: 'Smoke test approval.' },
  });
  check('pharmacy approves the order', approved.status === 200, `status ${approved.status} ${JSON.stringify(approved.payload).slice(0, 200)}`);

  const packed = await call(`/retailers/${retailerId}/customer-orders/${orderId}/status`, {
    method: 'PATCH',
    token: retailerToken,
    body: { status: 'PACKED' },
  });
  check('pharmacy marks the order packed', packed.status === 200, `status ${packed.status} ${JSON.stringify(packed.payload).slice(0, 200)}`);

  const dispatched = await call(`/retailers/${retailerId}/customer-orders/${orderId}/status`, {
    method: 'PATCH',
    token: retailerToken,
    body: { status: 'OUT_FOR_DELIVERY', courierName: 'Smoke Courier', courierPhone: '9876500011', etaMinutes: 25 },
  });
  check('pharmacy dispatches with courier details', dispatched.status === 200, `status ${dispatched.status} ${JSON.stringify(dispatched.payload).slice(0, 200)}`);
  check('dispatch creates a courier record', Boolean(dispatched.payload?.order?.delivery?.courierName), JSON.stringify(dispatched.payload?.order?.delivery));

  console.log('\n== 4. Live delivery tracking ==');
  const located = await call(`/retailers/${retailerId}/customer-orders/${orderId}/delivery`, {
    method: 'PATCH',
    token: retailerToken,
    body: { latitude: 18.5204, longitude: 73.8567, etaMinutes: 8 },
  });
  check('courier position update is accepted', located.status === 200, `status ${located.status} ${JSON.stringify(located.payload).slice(0, 200)}`);
  check('position is marked live', located.payload?.delivery?.isLive === true, JSON.stringify(located.payload?.delivery));

  const tracking = await call(`/orders/${orderId}/tracking`, { token: customerToken });
  check('customer sees the tracking timeline', tracking.status === 200 && Array.isArray(tracking.payload?.trackingEvents));
  check('customer sees the live courier position', tracking.payload?.delivery?.latitude === 18.5204 && tracking.payload?.delivery?.etaMinutes === 8, JSON.stringify(tracking.payload?.delivery));
  check('customer sees the pharmacy contact number', Boolean(tracking.payload?.retailerPhone));

  const trackingAsStranger = await call(`/orders/${orderId}/tracking`, { token: wholesellerToken });
  check('an unrelated account cannot track the order', trackingAsStranger.status === 403, `status ${trackingAsStranger.status}`);

  const badLocation = await call(`/retailers/${retailerId}/customer-orders/${orderId}/delivery`, {
    method: 'PATCH',
    token: retailerToken,
    body: { latitude: 18.5204 },
  });
  check('a half-supplied coordinate pair is rejected', badLocation.status === 400, `status ${badLocation.status}`);

  console.log('\n== 5. Delivery, invoice, notifications ==');
  const delivered = await call(`/retailers/${retailerId}/customer-orders/${orderId}/status`, {
    method: 'PATCH',
    token: retailerToken,
    body: { status: 'DELIVERED' },
  });
  check('pharmacy confirms delivery', delivered.status === 200, `status ${delivered.status}`);

  const finalTracking = await call(`/orders/${orderId}/tracking`, { token: customerToken });
  check('courier record closes on delivery', Boolean(finalTracking.payload?.delivery?.deliveredAt), JSON.stringify(finalTracking.payload?.delivery));

  const invoice = await call(`/invoices/order/${orderId}`, { token: customerToken });
  check('customer reads the invoice', invoice.status === 200 && Boolean(invoice.payload?.invoice?.invoiceNumber), `status ${invoice.status}`);
  const invoiceId = invoice.payload?.invoice?.id;
  const signedPath = invoice.payload?.invoice?.downloadUrl;

  const invoiceAsStranger = await call(`/invoices/${invoiceId}`, { token: wholesellerToken });
  check('an unrelated account cannot read the invoice', invoiceAsStranger.status === 403, `status ${invoiceAsStranger.status}`);

  const unsignedDownload = await fetch(`${BASE}/invoices/${invoiceId}/download`);
  check('an unsigned invoice download without a token is refused', unsignedDownload.status === 401, `status ${unsignedDownload.status}`);

  const signedDownload = await fetch(`${BASE.replace(/\/api$/, '')}${signedPath}`);
  const signedBody = Buffer.from(await signedDownload.arrayBuffer());
  check('a signed invoice link downloads a PDF', signedDownload.status === 200 && signedBody.subarray(0, 4).toString() === '%PDF', `status ${signedDownload.status}`);

  // Notifications are written inside the order transaction, so give the commit a moment.
  await new Promise((resolve) => setTimeout(resolve, 400));
  const inbox = await call(`/notifications/users/${customerId}?limit=10`, { token: customerToken });
  const orderNotifications = inbox.payload?.notifications?.filter((item) => item.referenceId === orderId) ?? [];
  check('order lifecycle wrote notifications for the customer', orderNotifications.length >= 3, `found ${orderNotifications.length}`);

  const device = await call('/notifications/devices', {
    method: 'POST',
    token: customerToken,
    body: { userId: customerId, deviceToken: `smoke-web-${customerId}`, platform: 'web' },
  });
  check('device registration succeeds', device.status === 201, `status ${device.status}`);

  const deviceSpoof = await call('/notifications/devices', {
    method: 'POST',
    token: retailerToken,
    body: { userId: customerId, deviceToken: 'smoke-spoof', platform: 'web' },
  });
  check("a device cannot be registered against another user's account", deviceSpoof.status === 403, `status ${deviceSpoof.status}`);

  const deviceRemoved = await call(`/notifications/devices/${encodeURIComponent(`smoke-web-${customerId}`)}`, {
    method: 'DELETE',
    token: customerToken,
  });
  check('device is removed on sign-out', deviceRemoved.status === 200 && deviceRemoved.payload?.removed === true);

  console.log('\n== 6. B2B flows ==');
  const wholesellerList = await call('/wholesellers', { token: retailerToken });
  check('retailer can browse wholesellers', wholesellerList.status === 200 && wholesellerList.payload?.wholesellers?.length > 0);

  const companyList = await call('/companies', { token: wholesellerToken });
  check('wholeseller can browse companies', companyList.status === 200 && companyList.payload?.companies?.length > 0);

  const wsInventory = await call(`/wholesellers/${wholesellerId}/inventory`, { token: retailerToken });
  check('retailer can browse wholeseller stock', wsInventory.status === 200, `status ${wsInventory.status}`);

  const wsOwnOrders = await call(`/wholesellers/${wholesellerId}/retailer-orders`, { token: wholesellerToken });
  check('wholeseller reads its own retailer orders', wsOwnOrders.status === 200, `status ${wsOwnOrders.status}`);

  const companyOwnOrders = await call(`/companies/${companyId}/wholeseller-orders`, { token: companyToken });
  check('company reads its own wholeseller orders', companyOwnOrders.status === 200, `status ${companyOwnOrders.status}`);

  const stockedWsItem = wsInventory.payload?.inventory?.find((item) => (item.availableQuantity ?? item.stockQuantity) > 10);
  if (stockedWsItem) {
    const purchaseOrder = await call(`/retailers/${retailerId}/purchase-orders`, {
      method: 'POST',
      token: retailerToken,
      body: { wholesellerId, paymentMethod: 'BANK_TRANSFER', items: [{ medicineId: stockedWsItem.medicineId, quantity: 5 }] },
    });
    check('retailer places a restock order with a wholeseller', purchaseOrder.status === 201 || purchaseOrder.status === 200, `status ${purchaseOrder.status} ${JSON.stringify(purchaseOrder.payload).slice(0, 200)}`);
  } else {
    console.log('  SKIP  retailer restock order (no wholeseller stock available)');
  }

  console.log('\n== 7. Prescription privacy ==');
  const upload = await call('/prescriptions/uploads', {
    method: 'POST',
    token: customerToken,
    body: {
      customerId,
      source: 'gallery',
      originalFileName: 'smoke-rx.txt',
      mimeType: 'text/plain',
      contentBase64: Buffer.from('smoke test prescription').toString('base64'),
    },
  });
  check('customer uploads a prescription', upload.status === 201, `status ${upload.status} ${JSON.stringify(upload.payload).slice(0, 200)}`);
  const fileUrl = upload.payload?.upload?.fileUrl;
  const previewUrl = upload.payload?.upload?.previewUrl;
  check('upload returns a signed preview link', typeof previewUrl === 'string' && previewUrl.includes('signature='), String(previewUrl).slice(0, 120));

  if (previewUrl) {
    const origin = BASE.replace(/\/api$/, '');
    const signedFile = await fetch(previewUrl.startsWith('http') ? previewUrl : `${origin}${previewUrl}`);
    check('signed prescription link serves the file', signedFile.status === 200, `status ${signedFile.status}`);

    const unsignedFile = await fetch((previewUrl.startsWith('http') ? previewUrl : `${origin}${previewUrl}`).split('?')[0]);
    check('unsigned prescription link without a token is refused', unsignedFile.status === 401, `status ${unsignedFile.status}`);

    const tamperedSignature = `${previewUrl.slice(0, -4)}dead`;
    const tamperedFile = await fetch(tamperedSignature.startsWith('http') ? tamperedSignature : `${origin}${tamperedSignature}`);
    check('a tampered prescription signature is refused', tamperedFile.status === 403, `status ${tamperedFile.status}`);
  }

  const spoofUpload = await call('/prescriptions/uploads', {
    method: 'POST',
    token: retailerToken,
    body: { customerId, source: 'gallery', originalFileName: 'spoof.txt', mimeType: 'text/plain', contentBase64: Buffer.from('x').toString('base64') },
  });
  check("a retailer cannot upload a prescription as a customer", spoofUpload.status === 403, `status ${spoofUpload.status}`);

  console.log('\n== 8. Prescription review by the pharmacy ==');
  // The durable stored path must be what the client sends back, and reads must re-sign it so the
  // pharmacy can still open the file long after the upload link would have expired.
  check('stored file reference carries no signature', typeof fileUrl === 'string' && !fileUrl.includes('signature='), String(fileUrl).slice(0, 120));

  const rxOrder = await call('/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      customerId,
      retailerId,
      deliveryMethod: 'HOME_DELIVERY',
      paymentMethod: 'CASH_ON_DELIVERY',
      items: [{ medicineId: stockedItem.medicineId, quantity: 1 }],
      prescription: { fileUrl, originalFileName: 'smoke-rx.txt' },
    },
  });
  check('customer places an order with a prescription attached', rxOrder.status === 201 || rxOrder.status === 200, `status ${rxOrder.status}`);
  const rxOrderId = rxOrder.payload?.order?.id ?? rxOrder.payload?.orderId ?? rxOrder.payload?.id;

  if (rxOrderId) {
    const rxQueue = await call(`/retailers/${retailerId}/customer-orders?status=PENDING_ACTION`, { token: retailerToken });
    const queued = rxQueue.payload?.orders?.find((order) => order.id === rxOrderId);
    check('pharmacy sees the prescription on the queued order', Boolean(queued?.prescription?.fileUrl));
    check('pharmacy receives a freshly signed prescription link', String(queued?.prescription?.fileUrl).includes('signature='), String(queued?.prescription?.fileUrl).slice(0, 120));

    if (queued?.prescription?.fileUrl) {
      const origin = BASE.replace(/\/api$/, '');
      const rxFile = await fetch(queued.prescription.fileUrl.startsWith('http') ? queued.prescription.fileUrl : `${origin}${queued.prescription.fileUrl}`);
      check('pharmacy can open the prescription file', rxFile.status === 200, `status ${rxFile.status}`);
    }

    const rxDetail = await call(`/prescriptions/customer-orders/${rxOrderId}`, { token: retailerToken });
    check('pharmacy reads the prescription record for the order', rxDetail.status === 200 && Boolean(rxDetail.payload?.prescription?.fileUrl), `status ${rxDetail.status}`);
  }

  console.log(`\n===== ${passed} passed, ${failed} failed =====`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exitCode = 1;
});
