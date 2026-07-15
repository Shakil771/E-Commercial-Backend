/**
 * Builds a plain-data invoice representation for an order.
 * This can be rendered client-side to PDF, or piped into an HTML template
 * for emailing/printing, without introducing a heavy PDF dependency here.
 *
 * @param {import('../models/Order.model.js').default} order
 * @param {import('../models/User.model.js').default} user
 */
export const buildInvoiceData = (order, user) => {
  return {
    invoiceNumber: `INV-${order.orderNumber}`,
    issuedAt: new Date(order.createdAt).toISOString(),
    customer: {
      name: user.name,
      email: user.email,
      phone: user.phone || order.shippingAddress.phone,
    },
    shippingAddress: order.shippingAddress,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      lineTotal: Math.round(item.price * item.quantity * 100) / 100,
    })),
    summary: {
      itemsPrice: order.itemsPrice,
      shippingPrice: order.shippingPrice,
      taxPrice: order.taxPrice,
      discountAmount: order.discountAmount,
      totalPrice: order.totalPrice,
    },
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
  };
};

/**
 * Renders a simple, printable HTML invoice from invoice data.
 * @param {ReturnType<typeof buildInvoiceData>} invoice
 */
export const renderInvoiceHtml = (invoice) => {
  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px;text-align:center;border-bottom:1px solid #eee;">${item.quantity}</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">$${item.lineTotal.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `
    <html>
      <body style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
        <h1>Invoice ${invoice.invoiceNumber}</h1>
        <p>Issued: ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
        <h3>Bill To</h3>
        <p>${invoice.customer.name}<br/>${invoice.customer.email}<br/>${invoice.customer.phone}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #111;">Item</th>
              <th style="text-align:center;padding:8px;border-bottom:2px solid #111;">Qty</th>
              <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Unit Price</th>
              <th style="text-align:right;padding:8px;border-bottom:2px solid #111;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:16px;text-align:right;">
          <p>Subtotal: $${invoice.summary.itemsPrice.toFixed(2)}</p>
          <p>Shipping: $${invoice.summary.shippingPrice.toFixed(2)}</p>
          <p>Tax: $${invoice.summary.taxPrice.toFixed(2)}</p>
          <p>Discount: -$${invoice.summary.discountAmount.toFixed(2)}</p>
          <h3>Total: $${invoice.summary.totalPrice.toFixed(2)}</h3>
        </div>
      </body>
    </html>
  `;
};
