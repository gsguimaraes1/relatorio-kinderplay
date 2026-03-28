import { useState, useEffect, useMemo, useRef } from "react";
import Papa from "papaparse";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { 
  TrendingUp, DollarSign, Percent, Package, Calendar, 
  CreditCard, Truck, Receipt, ArrowUpRight, ArrowDownRight, 
  Filter, Download, Search 
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn, formatCurrency, parseCurrency, parsePercentage } from "@/src/lib/utils";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHXhpstLxB4rXbIyA2QcWMi9u92cH0MPKqvKA6L8hkfC0GMBrk_sf0AB4XqUq7OSWsIgMGAYeQ7Cdz/pub?gid=1542989067&single=true&output=csv";

const HIGHLIGHT_ORDER_ID = "14899";

interface OrderData {
  Pedido: string;
  "Emissão Pedido": string;
  "Local Pgto": string;
  "Ordem Compra / Cliente": string;
  "NFE SAIDA": string;
  Produto: string;
  "Valor Total Compra": string;
  "Valor Total Venda": string;
  Frete: string;
  "Valor Venda S/frete": string;
  "Lucro S Imp": string;
  Margem: string;
  PIS: string;
  COFINS: string;
  "ICMS Proprio": string;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightOrderId, setHighlightOrderId] = useState<string>("14899");

  useGSAP(() => {
    if (!loading && containerRef.current) {
      const tl = gsap.timeline();
      
      tl.fromTo(".gsap-header", { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" })
        .fromTo(".gsap-highlight", { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }, "-=0.3")
        .fromTo(".gsap-stat-card", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out" }, "-=0.2")
        .fromTo(".gsap-chart", { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out" }, "-=0.2")
        .fromTo(".gsap-table-row", { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }, "-=0.1");
    }
  }, { dependencies: [loading], scope: containerRef });

  useGSAP(() => {
    if (!loading && highlightOrderId) {
      gsap.fromTo(".gsap-highlight", 
        { scale: 0.98, opacity: 0.5 }, 
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }
      );
    }
  }, { dependencies: [highlightOrderId], scope: containerRef });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(CSV_URL);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Filter out the "Totais" row and empty rows
            const filteredData = (results.data as OrderData[]).filter(
              (row) => row.Pedido && row.Pedido !== "Totais" && !isNaN(Number(row.Pedido))
            );
            setData(filteredData);
            setLoading(false);
          },
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const totalRevenue = data.reduce((acc, row) => acc + parseCurrency(row["Valor Total Venda"]), 0);
    const totalProfit = data.reduce((acc, row) => acc + parseCurrency(row["Lucro S Imp"]), 0);
    const totalCost = data.reduce((acc, row) => acc + parseCurrency(row["Valor Total Compra"]), 0);
    const totalFreight = data.reduce((acc, row) => acc + parseCurrency(row.Frete), 0);
    const totalPIS = data.reduce((acc, row) => acc + parseCurrency(row.PIS), 0);
    const totalCOFINS = data.reduce((acc, row) => acc + parseCurrency(row.COFINS), 0);
    const totalICMS = data.reduce((acc, row) => acc + parseCurrency(row["ICMS Proprio"]), 0);
    const avgMargin = data.reduce((acc, row) => acc + parsePercentage(row.Margem), 0) / data.length;

    return {
      totalRevenue,
      totalProfit,
      totalCost,
      totalFreight,
      totalTaxes: totalPIS + totalCOFINS + totalICMS,
      avgMargin,
      totalPIS,
      totalCOFINS,
      totalICMS,
      orderCount: data.length,
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (data.length === 0) return { products: [], timeline: [], taxes: [] };

    // Products Chart
    const productMap: Record<string, number> = {};
    data.forEach((row) => {
      const name = row.Produto || "N/A";
      productMap[name] = (productMap[name] || 0) + parseCurrency(row["Valor Total Venda"]);
    });
    const products = Object.entries(productMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Timeline Chart
    const timelineMap: Record<string, number> = {};
    data.forEach((row) => {
      const date = row["Emissão Pedido"];
      timelineMap[date] = (timelineMap[date] || 0) + parseCurrency(row["Valor Total Venda"]);
    });
    const timeline = Object.entries(timelineMap)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => {
        const [d1, m1, y1] = a.date.split("/").map(Number);
        const [d2, m2, y2] = b.date.split("/").map(Number);
        return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
      });

    // Taxes Pie
    const taxes = [
      { name: "PIS", value: stats?.totalPIS || 0 },
      { name: "COFINS", value: stats?.totalCOFINS || 0 },
      { name: "ICMS", value: stats?.totalICMS || 0 },
    ];

    return { products, timeline, taxes };
  }, [data, stats]);

  const filteredOrders = data.filter((order) =>
    Object.values(order).some((val) =>
      val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const highlightedOrder = data.find((o) => o.Pedido === highlightOrderId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#8E9299] font-mono text-sm tracking-widest uppercase">Carregando Relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#F27D26]/30">
      {/* Header */}
      <header className="gsap-header border-b border-white/10 bg-[#111111]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F27D26] rounded-xl flex items-center justify-center shadow-lg shadow-[#F27D26]/20">
              <TrendingUp className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Sales Intelligence</h1>
              <p className="text-xs text-[#8E9299] font-mono uppercase tracking-wider">Dashboard de Performance</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9299] group-focus-within:text-[#F27D26] transition-colors" />
              <input
                type="text"
                placeholder="Buscar pedido, cliente ou produto..."
                className="bg-[#1A1A1A] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-[#8E9299] hover:text-white">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Highlight Section */}
        {highlightedOrder && (
          <section
            className="gsap-highlight relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1A1A] to-[#111111] border border-white/10 p-8"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Package className="w-32 h-32" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 border border-[#F27D26]/20 text-[#F27D26] text-[10px] font-bold uppercase tracking-widest">
                  Pedido em Destaque
                </div>
                <h2 className="text-3xl font-bold tracking-tight">
                  {highlightedOrder["Ordem Compra / Cliente"]}
                </h2>
                <div className="flex flex-wrap gap-6 text-sm text-[#8E9299]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{highlightedOrder["Emissão Pedido"]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>{highlightedOrder["Local Pgto"]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    <span>NFE: {highlightedOrder["NFE SAIDA"]}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mb-1">Venda Total</p>
                  <p className="text-xl font-bold text-[#F27D26]">{highlightedOrder["Valor Total Venda"]}</p>
                </div>
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mb-1">Margem</p>
                  <p className="text-xl font-bold text-emerald-400">{highlightedOrder.Margem}</p>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mb-2">Produto</p>
                <p className="text-sm font-medium line-clamp-2">{highlightedOrder.Produto}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mb-2">Frete</p>
                <p className="text-sm font-medium">{highlightedOrder.Frete || "R$ 0,00"}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mb-2">Lucro S/ Imp</p>
                <p className="text-sm font-medium text-emerald-400">{highlightedOrder["Lucro S Imp"]}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8E9299] uppercase tracking-widest mb-2">ICMS Próprio</p>
                <p className="text-sm font-medium">{highlightedOrder["ICMS Proprio"]}</p>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[
            { label: "Receita (Bruta)", value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: "text-[#F27D26]", trend: "+12.5%" },
            { label: "Frete (Repasse)", value: formatCurrency(stats?.totalFreight || 0), icon: Truck, color: "text-amber-500", trend: "+0.0%" },
            { label: "Lucro Líquido", value: formatCurrency(stats?.totalProfit || 0), icon: TrendingUp, color: "text-emerald-400", trend: "+8.2%" },
            { label: "Margem Média", value: `${stats?.avgMargin.toFixed(2)}%`, icon: Percent, color: "text-blue-400", trend: "-1.1%" },
            { label: "Impostos Totais", value: formatCurrency(stats?.totalTaxes || 0), icon: Receipt, color: "text-rose-400", trend: "+4.3%" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="gsap-stat-card bg-[#111111] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={cn("flex items-center gap-1 text-[10px] font-bold", stat.trend.startsWith("+") ? "text-emerald-400" : "text-rose-400")}>
                  {stat.trend.startsWith("+") ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              <p className="text-xs text-[#8E9299] uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Timeline */}
          <div
            className="gsap-chart lg:col-span-2 bg-[#111111] border border-white/10 rounded-3xl p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold">Faturamento ao Longo do Tempo</h3>
                <p className="text-xs text-[#8E9299]">Evolução diária das vendas brutas</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">Mensal</button>
                <button className="px-3 py-1 rounded-full bg-[#F27D26] text-black text-[10px] font-bold uppercase tracking-widest">Diário</button>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#8E9299" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.split("/")[0] + "/" + val.split("/")[1]}
                  />
                  <YAxis 
                    stroke="#8E9299" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `R$${val / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                    itemStyle={{ color: "#F27D26", fontSize: "12px" }}
                    labelStyle={{ color: "#8E9299", fontSize: "10px", marginBottom: "4px" }}
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#F27D26" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "#F27D26", strokeWidth: 2, stroke: "#111111" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tax Distribution */}
          <div
            className="gsap-chart bg-[#111111] border border-white/10 rounded-3xl p-8"
          >
            <h3 className="text-lg font-bold mb-1">Carga Tributária</h3>
            <p className="text-xs text-[#8E9299] mb-8">Distribuição por tipo de imposto</p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.taxes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {[
                      { name: "PIS", color: "#F27D26" },
                      { name: "COFINS", color: "#3B82F6" },
                      { name: "ICMS", color: "#10B981" },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {chartData.taxes.map((tax, i) => (
                <div key={tax.name} className="flex items-center justify-between text-sm">
                  <span className="text-[#8E9299]">{tax.name}</span>
                  <span className="font-mono font-bold">{formatCurrency(tax.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <section
          className="bg-[#111111] border border-white/10 rounded-3xl overflow-hidden"
        >
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Listagem de Pedidos</h3>
              <p className="text-xs text-[#8E9299]">Histórico detalhado de todas as transações</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-xs font-bold hover:bg-white/10 transition-colors">
                <Filter className="w-4 h-4" />
                Filtrar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/2">
                  <th className="px-8 py-4 text-[10px] text-[#8E9299] uppercase tracking-widest font-bold">Pedido</th>
                  <th className="px-8 py-4 text-[10px] text-[#8E9299] uppercase tracking-widest font-bold">Cliente</th>
                  <th className="px-8 py-4 text-[10px] text-[#8E9299] uppercase tracking-widest font-bold">Produto</th>
                  <th className="px-8 py-4 text-[10px] text-[#8E9299] uppercase tracking-widest font-bold text-right">Venda</th>
                  <th className="px-8 py-4 text-[10px] text-[#8E9299] uppercase tracking-widest font-bold text-right">Lucro</th>
                  <th className="px-8 py-4 text-[10px] text-[#8E9299] uppercase tracking-widest font-bold text-right">Margem</th>
                </tr>
              </thead>
                <tbody>
                  {filteredOrders.map((order, i) => (
                    <tr
                      key={order.Pedido}
                      onClick={() => setHighlightOrderId(order.Pedido)}
                      className={cn(
                        "gsap-table-row group hover:bg-white/5 transition-colors cursor-pointer",
                        order.Pedido === highlightOrderId && "bg-[#F27D26]/10"
                      )}
                    >
                      <td className="px-8 py-5">
                        <span className="font-mono text-sm text-[#8E9299] group-hover:text-white transition-colors">#{order.Pedido}</span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-medium truncate max-w-[200px]">{order["Ordem Compra / Cliente"]}</p>
                        <p className="text-[10px] text-[#8E9299]">{order["Emissão Pedido"]}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm text-[#8E9299] truncate max-w-[250px] group-hover:text-white transition-colors">{order.Produto}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="text-sm font-bold">{order["Valor Total Venda"]}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="text-sm font-bold text-emerald-400">{order["Lucro S Imp"]}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold">
                          {order.Margem}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="p-20 text-center">
              <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-[#8E9299] text-sm">Nenhum pedido encontrado para sua busca.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 text-[#8E9299] text-xs">
          <TrendingUp className="w-4 h-4" />
          <span>© 2026 Sales Intelligence Dashboard. Todos os direitos reservados.</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-[#8E9299]">
          <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
          <a href="#" className="hover:text-white transition-colors">Privacidade</a>
          <a href="#" className="hover:text-white transition-colors">Suporte</a>
        </div>
      </footer>
    </div>
  );
}
