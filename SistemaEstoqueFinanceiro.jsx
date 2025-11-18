import React, { useEffect, useState } from "react";

// SistemaEstoqueFinanceiro.jsx
// Componente React único. Requisitos: projeto React (Vite/CRA) + TailwindCSS (opcional).
// Copie esse arquivo para src/ e importe no App.jsx: import SistemaEstoqueFinanceiro from './SistemaEstoqueFinanceiro';

export default function SistemaEstoqueFinanceiro() {
  // ---------- State ----------
  const [products, setProducts] = useState([]); // {id,name,sku,qty,cost}
  const [transactions, setTransactions] = useState([]); // {id,type,productId,productName,qty,unitPrice,total,date,notes}

  // UI states
  const [q, setQ] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", qty: 0, cost: 0 });
  const [showTransForm, setShowTransForm] = useState(false);
  const [transForm, setTransForm] = useState({ type: "entry", productId: "", qty: 1, unitPrice: 0, notes: "" });

  // ---------- Persistence ----------
  useEffect(() => {
    const p = localStorage.getItem("sef_products");
    const t = localStorage.getItem("sef_transactions");
    if (p) setProducts(JSON.parse(p));
    if (t) setTransactions(JSON.parse(t));
  }, []);
  useEffect(() => localStorage.setItem("sef_products", JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem("sef_transactions", JSON.stringify(transactions)), [transactions]);

  // ---------- Helpers ----------
  const uid = () => Math.random().toString(36).slice(2, 9);
  const now = () => new Date().toISOString();

  // ---------- Product CRUD ----------
  function openNewProduct() {
    setForm({ name: "", sku: "", qty: 0, cost: 0 });
    setEditingProduct(null);
    setShowProductForm(true);
  }
  function openEditProduct(p) {
    setForm({ name: p.name, sku: p.sku, qty: p.qty, cost: p.cost });
    setEditingProduct(p.id);
    setShowProductForm(true);
  }
  function saveProduct(e) {
    e && e.preventDefault();
    const cleaned = { ...form, name: form.name.trim() };
    if (!cleaned.name) return alert("Nome do produto é obrigatório");
    if (editingProduct) {
      setProducts((prev) => prev.map((x) => (x.id === editingProduct ? { ...x, ...cleaned } : x)));
    } else {
      setProducts((prev) => [...prev, { id: uid(), ...cleaned }]);
    }
    setShowProductForm(false);
  }
  function deleteProduct(id) {
    if (!confirm("Excluir produto e todas as transações relacionadas?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setTransactions((prev) => prev.filter((t) => t.productId !== id));
  }

  // ---------- Transactions (entries/exits) ----------
  function openNewTransaction(type = "entry", productId = "") {
    setTransForm({ type, productId, qty: 1, unitPrice: 0, notes: "" });
    setShowTransForm(true);
  }
  function saveTransaction(e) {
    e && e.preventDefault();
    const prod = products.find((p) => p.id === transForm.productId);
    if (!prod) return alert("Escolha um produto válido");
    const qty = Number(transForm.qty);
    if (qty <= 0) return alert("Quantidade deve ser maior que 0");
    const unitPrice = Number(transForm.unitPrice);
    const total = +(qty * unitPrice).toFixed(2);

    const tr = {
      id: uid(),
      type: transForm.type, // entry | exit | expense | income (we will keep entry/exit for stock)
      productId: prod.id,
      productName: prod.name,
      qty,
      unitPrice,
      total,
      date: now(),
      notes: transForm.notes,
    };

    // Update stock for entry/exit
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== prod.id) return p;
        const newQty = transForm.type === "entry" ? Number(p.qty) + qty : Number(p.qty) - qty;
        return { ...p, qty: newQty };
      })
    );

    setTransactions((prev) => [tr, ...prev]);
    setShowTransForm(false);
  }

  // Quick sale / saída rápida
  function quickExit(productId) {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const q = Number(prompt("Quantidade para saída (venda):", "1"));
    if (!q || q <= 0) return;
    const price = Number(prompt("Preço unitário de venda:", String(prod.cost || 0)));
    if (isNaN(price)) return;
    setTransForm({ type: "exit", productId: prod.id, qty: q, unitPrice: price, notes: "Venda rápida" });
    saveTransaction();
  }

  // ---------- Financeiros resumidos ----------
  const totalInventoryValue = products.reduce((s, p) => s + Number(p.qty) * Number(p.cost || 0), 0);
  const totalRevenue = transactions.filter((t) => t.type === "exit").reduce((s, t) => s + Number(t.total), 0);
  const totalExpenses = transactions.filter((t) => t.type === "entry").reduce((s, t) => s + Number(t.total), 0);
  const profit = totalRevenue - totalExpenses;

  // ---------- Import / Export ----------
  function exportJSON() {
    const blob = new Blob([JSON.stringify({ products, transactions }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup_sef.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        if (obj.products && obj.transactions) {
          setProducts(obj.products);
          setTransactions(obj.transactions);
          alert("Importação concluída");
        } else {
          alert("Arquivo inválido");
        }
      } catch (err) {
        alert("Erro ao ler arquivo: " + err.message);
      }
    };
    reader.readAsText(f);
  }

  function exportCSV() {
    // exports transactions
    const rows = [
      ["id", "type", "productId", "productName", "qty", "unitPrice", "total", "date", "notes"].join(","),
      ...transactions.map((t) =>
        [t.id, t.type, t.productId, `"${t.productName.replace(/"/g, '""') }"`, t.qty, t.unitPrice, t.total, t.date, `"${(t.notes||"").replace(/"/g,'""') }"`].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions_sef.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Small UI helpers ----------
  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sistema: Estoque • Entradas • Saídas • Finanças</h1>
        <div className="flex gap-2">
          <button className="btn" onClick={() => openNewProduct()}>+ Produto</button>
          <button className="btn" onClick={() => openNewTransaction("entry")}>+ Entrada</button>
          <button className="btn" onClick={() => openNewTransaction("exit")}>+ Saída</button>
          <button className="btn-ghost" onClick={exportJSON}>Backup (JSON)</button>
          <label className="btn-ghost cursor-pointer">
            Import
            <input type="file" accept="application/json" onChange={importJSON} className="hidden" />
          </label>
          <button className="btn-ghost" onClick={exportCSV}>Export CSV</button>
        </div>
      </header>

      {/* Resumo financeiro */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-sm">Valor do Estoque</div>
          <div className="text-xl font-semibold">R$ {totalInventoryValue.toFixed(2)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm">Receita (Saídas)</div>
          <div className="text-xl font-semibold">R$ {totalRevenue.toFixed(2)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm">Despesas (Entradas)</div>
          <div className="text-xl font-semibold">R$ {totalExpenses.toFixed(2)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm">Lucro Estimado</div>
          <div className={`text-xl font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>R$ {profit.toFixed(2)}</div>
        </div>
      </section>

      {/* Produto e Transações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Produtos</h2>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome ou SKU" className="input" />
          </div>

          <div className="overflow-auto bg-white rounded shadow p-2">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>SKU</th>
                  <th>Qtd</th>
                  <th>Custo</th>
                  <th>Valor Estoque</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td>{p.name}</td>
                    <td>{p.sku}</td>
                    <td>{p.qty}</td>
                    <td>R$ {Number(p.cost || 0).toFixed(2)}</td>
                    <td>R$ {(Number(p.qty) * Number(p.cost || 0)).toFixed(2)}</td>
                    <td className="text-right">
                      <button className="text-sm mr-2" onClick={() => openEditProduct(p)}>Editar</button>
                      <button className="text-sm mr-2" onClick={() => openNewTransaction("entry", p.id)}>Entrada</button>
                      <button className="text-sm mr-2" onClick={() => openNewTransaction("exit", p.id)}>Saída</button>
                      <button className="text-sm mr-2" onClick={() => quickExit(p.id)}>Venda Rápida</button>
                      <button className="text-sm text-red-600" onClick={() => deleteProduct(p.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">Nenhum produto encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Transações Recentes</h2>
          <div className="overflow-auto bg-white rounded shadow p-2 h-96">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td>{new Date(t.date).toLocaleString()}</td>
                    <td>{t.type}</td>
                    <td>{t.productName}</td>
                    <td>{t.qty}</td>
                    <td>R$ {Number(t.total).toFixed(2)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">Sem transações ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="modal fixed inset-0 flex items-center justify-center bg-black/40">
          <form onSubmit={saveProduct} className="bg-white p-4 rounded shadow w-96">
            <h3 className="font-bold mb-2">{editingProduct ? "Editar produto" : "Novo produto"}</h3>
            <label className="block mb-2">Nome
              <input className="input mt-1 w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block mb-2">SKU
              <input className="input mt-1 w-full" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </label>
            <label className="block mb-2">Quantidade inicial
              <input type="number" className="input mt-1 w-full" value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
            </label>
            <label className="block mb-2">Custo unitário
              <input type="number" step="0.01" className="input mt-1 w-full" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            </label>

            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="btn-ghost" onClick={() => setShowProductForm(false)}>Cancelar</button>
              <button className="btn" type="submit">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction Form Modal */}
      {showTransForm && (
        <div className="modal fixed inset-0 flex items-center justify-center bg-black/40">
          <form onSubmit={saveTransaction} className="bg-white p-4 rounded shadow w-96">
            <h3 className="font-bold mb-2">{transForm.type === "entry" ? "Registrar Entrada" : "Registrar Saída"}</h3>
            <label className="block mb-2">Produto
              <select className="input mt-1 w-full" value={transForm.productId} onChange={(e) => setTransForm({ ...transForm, productId: e.target.value })}>
                <option value="">-- selecione --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (Qtd: {p.qty})</option>
                ))}
              </select>
            </label>
            <label className="block mb-2">Quantidade
              <input type="number" className="input mt-1 w-full" value={transForm.qty} onChange={(e) => setTransForm({ ...transForm, qty: Number(e.target.value) })} />
            </label>
            <label className="block mb-2">Preço unitário
              <input type="number" step="0.01" className="input mt-1 w-full" value={transForm.unitPrice} onChange={(e) => setTransForm({ ...transForm, unitPrice: Number(e.target.value) })} />
            </label>
            <label className="block mb-2">Observações
              <input className="input mt-1 w-full" value={transForm.notes} onChange={(e) => setTransForm({ ...transForm, notes: e.target.value })} />
            </label>

            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="btn-ghost" onClick={() => setShowTransForm(false)}>Cancelar</button>
              <button className="btn" type="submit">Registrar</button>
            </div>
          </form>
        </div>
      )}

      {/* small styles for demo without Tailwind setup */}
      <style>{`
        .btn{padding:0.5rem 0.75rem;border-radius:0.5rem;background:#1f2937;color:white}
        .btn-ghost{padding:0.4rem 0.6rem;border-radius:0.5rem;background:transparent;border:1px solid #e5e7eb}
        .input{padding:0.45rem 0.5rem;border:1px solid #d1d5db;border-radius:0.375rem}
        .card{background:white;border-radius:0.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
        .modal{z-index:60}
        table th, table td{padding:0.5rem}
      `}</style>
    </div>
  );
}

