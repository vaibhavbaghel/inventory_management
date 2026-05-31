import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { SectionCard } from './components/SectionCard';
import { StatCard } from './components/StatCard';

const emptyProduct = {
  name: '',
  sku: '',
  price: '',
  quantity: '',
  description: '',
};

const emptyCustomer = {
  full_name: '',
  email: '',
  phone: '',
};

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function App() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dashboard, setDashboard] = useState({ total_products: 0, total_customers: 0, total_orders: 0, low_stock_products: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [orderForm, setOrderForm] = useState({ customer_id: '', items: [{ product_id: '', quantity: '1' }] });
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) || null, [orders, selectedOrderId]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, productData, customerData, orderData] = await Promise.all([
        api.getDashboard(),
        api.listProducts(),
        api.listCustomers(),
        api.listOrders(),
      ]);
      setDashboard(dashboardData);
      setProducts(productData);
      setCustomers(customerData);
      setOrders(orderData);
      if (orderData.length > 0 && selectedOrderId == null) {
        setSelectedOrderId(orderData[0].id);
      }
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }

  function pushMessage(text, tone = 'success') {
    setMessage({ text, tone });
    setError(null);
    window.setTimeout(() => setMessage(null), 3500);
  }

  function updateProductField(field, value) {
    setProductForm((current) => ({ ...current, [field]: value }));
  }

  function editProduct(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      sku: product.sku,
      price: String(product.price),
      quantity: String(product.quantity),
      description: product.description || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductForm(emptyProduct);
  }

  async function submitProduct(event) {
    event.preventDefault();
    if (!productForm.name || !productForm.sku || !productForm.price || productForm.quantity === '') {
      setError('Please complete all product fields.');
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim(),
      price: Number(productForm.price),
      quantity: Number(productForm.quantity),
      description: productForm.description.trim() || null,
    };

    try {
      if (editingProductId) {
        await api.updateProduct(editingProductId, payload);
        pushMessage('Product updated successfully.');
      } else {
        await api.createProduct(payload);
        pushMessage('Product created successfully.');
      }
      resetProductForm();
      await loadAll();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function removeProduct(productId) {
    if (!window.confirm('Delete this product?')) {
      return;
    }
    try {
      await api.deleteProduct(productId);
      pushMessage('Product deleted.');
      await loadAll();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function submitCustomer(event) {
    event.preventDefault();
    if (!customerForm.full_name || !customerForm.email || !customerForm.phone) {
      setError('Please complete all customer fields.');
      return;
    }

    try {
      await api.createCustomer({
        full_name: customerForm.full_name.trim(),
        email: customerForm.email.trim(),
        phone: customerForm.phone.trim(),
      });
      setCustomerForm(emptyCustomer);
      pushMessage('Customer created successfully.');
      await loadAll();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function removeCustomer(customerId) {
    if (!window.confirm('Delete this customer?')) {
      return;
    }
    try {
      await api.deleteCustomer(customerId);
      pushMessage('Customer deleted.');
      await loadAll();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function updateOrderField(field, value) {
    setOrderForm((current) => ({ ...current, [field]: value }));
  }

  function updateOrderItem(index, field, value) {
    setOrderForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addOrderItem() {
    setOrderForm((current) => ({
      ...current,
      items: [...current.items, { product_id: '', quantity: '1' }],
    }));
  }

  function removeOrderItem(index) {
    setOrderForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!orderForm.customer_id || orderForm.items.some((item) => !item.product_id || Number(item.quantity) <= 0)) {
      setError('Choose a customer and at least one valid line item.');
      return;
    }

    try {
      await api.createOrder({
        customer_id: Number(orderForm.customer_id),
        items: orderForm.items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
        })),
      });
      setOrderForm({ customer_id: '', items: [{ product_id: '', quantity: '1' }] });
      pushMessage('Order placed successfully.');
      await loadAll();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function removeOrder(orderId) {
    if (!window.confirm('Delete this order? Inventory will be restored.')) {
      return;
    }
    try {
      await api.deleteOrder(orderId);
      pushMessage('Order deleted.');
      if (selectedOrderId === orderId) {
        setSelectedOrderId(null);
      }
      await loadAll();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <div className="app-shell">
      <div className="background background--one" />
      <div className="background background--two" />
      <header className="hero">
        <div>
          <span className="eyebrow">Inventory & Order Management</span>
          <h1>Track stock, customers, and orders from one production-ready dashboard.</h1>
          <p>
            A responsive management dashboard built for business workflows and assessment-ready deployment.
          </p>
        </div>
        <div className="hero__status">
          <div>
            <strong>Reliable backend</strong>
            <span>Validated API operations</span>
          </div>
          <div>
            <strong>Secure records</strong>
            <span>Consistent inventory and order data</span>
          </div>
          <div>
            <strong>Smooth delivery</strong>
            <span>Ready for local and hosted environments</span>
          </div>
        </div>
      </header>

      {message ? <div className={`banner banner--${message.tone}`}>{message.text}</div> : null}
      {error ? <div className="banner banner--error">{error}</div> : null}

      <section className="stats-grid">
        <StatCard label="Total products" value={dashboard.total_products} tone="teal" />
        <StatCard label="Total customers" value={dashboard.total_customers} tone="amber" />
        <StatCard label="Total orders" value={dashboard.total_orders} tone="coral" />
        <StatCard label="Low stock items" value={dashboard.low_stock_products.length} tone="slate" />
      </section>

      <main className="content-grid">
        <SectionCard title="Products" description="Create, update, and remove products with live stock control.">
          <form className="form-grid" onSubmit={submitProduct}>
            <input placeholder="Product name" value={productForm.name} onChange={(event) => updateProductField('name', event.target.value)} />
            <input placeholder="SKU code" value={productForm.sku} onChange={(event) => updateProductField('sku', event.target.value)} />
            <input type="number" min="0.01" step="0.01" placeholder="Price" value={productForm.price} onChange={(event) => updateProductField('price', event.target.value)} />
            <input type="number" min="0" step="1" placeholder="Quantity" value={productForm.quantity} onChange={(event) => updateProductField('quantity', event.target.value)} />
            <textarea placeholder="Description (optional)" value={productForm.description} onChange={(event) => updateProductField('description', event.target.value)} />
            <div className="form-actions">
              <button type="submit">{editingProductId ? 'Update product' : 'Add product'}</button>
              {editingProductId ? (
                <button type="button" className="button button--ghost" onClick={resetProductForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{money(product.price)}</td>
                    <td>{product.quantity}</td>
                    <td className="row-actions">
                      <button type="button" className="button button--ghost" onClick={() => editProduct(product)}>
                        Edit
                      </button>
                      <button type="button" className="button button--danger" onClick={() => removeProduct(product.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!products.length ? (
                  <tr>
                    <td colSpan="5" className="empty-state">No products yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Customers" description="Keep a simple, unique customer directory.">
          <form className="form-grid" onSubmit={submitCustomer}>
            <input placeholder="Full name" value={customerForm.full_name} onChange={(event) => setCustomerForm({ ...customerForm, full_name: event.target.value })} />
            <input placeholder="Email address" value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} />
            <input placeholder="Phone number" value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} />
            <div className="form-actions">
              <button type="submit">Add customer</button>
            </div>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.full_name}</td>
                    <td>{customer.email}</td>
                    <td>{customer.phone}</td>
                    <td className="row-actions">
                      <button type="button" className="button button--danger" onClick={() => removeCustomer(customer.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!customers.length ? (
                  <tr>
                    <td colSpan="4" className="empty-state">No customers yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Orders" description="Build multi-product orders and inspect details instantly.">
          <form className="form-grid" onSubmit={submitOrder}>
            <select value={orderForm.customer_id} onChange={(event) => updateOrderField('customer_id', event.target.value)}>
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>

            {orderForm.items.map((item, index) => (
              <div key={`${index}-${item.product_id}`} className="order-line">
                <select value={item.product_id} onChange={(event) => updateOrderItem(index, 'product_id', event.target.value)}>
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.quantity} left)
                    </option>
                  ))}
                </select>
                <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateOrderItem(index, 'quantity', event.target.value)} />
                <button type="button" className="button button--ghost" onClick={() => removeOrderItem(index)}>
                  Remove
                </button>
              </div>
            ))}

            <div className="form-actions">
              <button type="button" className="button button--ghost" onClick={addOrderItem}>
                Add line item
              </button>
              <button type="submit">Create order</button>
            </div>
          </form>

          <div className="order-layout">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className={selectedOrderId === order.id ? 'is-selected' : ''}>
                      <td>#{order.id}</td>
                      <td>{order.customer_name}</td>
                      <td>{money(order.total_amount)}</td>
                      <td className="row-actions">
                        <button type="button" className="button button--ghost" onClick={() => setSelectedOrderId(order.id)}>
                          View
                        </button>
                        <button type="button" className="button button--danger" onClick={() => removeOrder(order.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!orders.length ? (
                    <tr>
                      <td colSpan="4" className="empty-state">No orders yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <aside className="order-details">
              <h3>Order details</h3>
              {selectedOrder ? (
                <>
                  <p>
                    Order #{selectedOrder.id} for <strong>{selectedOrder.customer_name}</strong>
                  </p>
                  <p>Status: {selectedOrder.status}</p>
                  <p>Total: {money(selectedOrder.total_amount)}</p>
                  <ul>
                    {selectedOrder.items.map((item) => (
                      <li key={`${selectedOrder.id}-${item.product_id}`}>
                        {item.product_name} x {item.quantity} at {money(item.unit_price)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>Select an order to view its line items.</p>
              )}
            </aside>
          </div>
        </SectionCard>

        <SectionCard title="Low stock" description="Products at or below the configured threshold.">
          <div className="low-stock-list">
            {dashboard.low_stock_products.length ? (
              dashboard.low_stock_products.map((product) => (
                <div key={product.id} className="low-stock-item">
                  <strong>{product.name}</strong>
                  <span>{product.sku}</span>
                  <span>{product.quantity} remaining</span>
                </div>
              ))
            ) : (
              <p>No low-stock products right now.</p>
            )}
          </div>
        </SectionCard>
      </main>

      {loading ? <div className="loading-overlay">Loading data...</div> : null}
    </div>
  );
}

export default App;
