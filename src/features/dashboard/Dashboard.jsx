import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Brain,
  IndianRupee,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import supabase from "../../../helpers/supabase";
import { loadManagementData } from "../librarymanagement/libraryStorage";
import { getPaymentStatus, mapMemberFromDb } from "../members/memberUtils";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const COLORS = ["#2563eb", "#059669", "#f59e0b", "#e11d48", "#7c3aed", "#0f766e"];

const monthKey = (dateValue) => {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  return date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
};

const isSameMonth = (dateValue, offset = 0) => {
  if (!dateValue) return false;

  const date = new Date(`${dateValue}T00:00:00`);
  const target = new Date();
  target.setMonth(target.getMonth() + offset);

  return date.getMonth() === target.getMonth() && date.getFullYear() === target.getFullYear();
};

const KpiCard = ({ title, value, helper, icon, tone = "blue" }) => {
  const toneClasses = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">{value}</h3>
          <p className="mt-2 text-xs text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-lg p-2 text-white ${toneClasses[tone]}`}>{icon}</div>
      </div>
    </div>
  );
};

const InsightCard = ({ title, description, tone }) => {
  const toneClasses = {
    risk: "border-rose-200 bg-rose-50 text-rose-700",
    growth: "border-emerald-200 bg-emerald-50 text-emerald-700",
    focus: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <div className="border border-slate-200 bg-white p-4">
      <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md ${toneClasses[tone]}`}>
        {tone === "risk" ? <AlertTriangle size={16} /> : tone === "growth" ? <TrendingUp size={16} /> : <Target size={16} />}
      </div>
      <h4 className="font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
};

const Dashboard = () => {
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("library_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (error) {
        setErrorMessage(error.message);
        setMembers([]);
      } else {
        setMembers(data.map(mapMemberFromDb));
      }

      setExpenses(loadManagementData().expenses || []);
      setLoading(false);
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const activeMembers = members.filter((member) => member.memberStatus === "active");
    const inactiveMembers = members.filter((member) => member.memberStatus === "inactive");
    const monthlyRevenue = activeMembers.reduce((total, member) => total + Number(member.feeAmount || 0), 0);
    const monthlyExpense = expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const projectedProfit = monthlyRevenue - monthlyExpense;
    const overdueMembers = activeMembers.filter((member) => getPaymentStatus(member.paidUntil).tone === "red");
    const dueMembers = activeMembers.filter((member) => getPaymentStatus(member.paidUntil).tone === "yellow");
    const joinedThisMonth = members.filter((member) => isSameMonth(member.registrationDate, 0)).length;
    const joinedLastMonth = members.filter((member) => isSameMonth(member.registrationDate, -1)).length;
    const growthRate = joinedLastMonth ? Math.round(((joinedThisMonth - joinedLastMonth) / joinedLastMonth) * 100) : joinedThisMonth * 100;
    const churnRate = activeMembers.length ? Math.round((inactiveMembers.length / (activeMembers.length + inactiveMembers.length)) * 100) : 0;

    return {
      activeMembers,
      inactiveMembers,
      monthlyRevenue,
      monthlyExpense,
      projectedProfit,
      overdueMembers,
      dueMembers,
      joinedThisMonth,
      growthRate,
      churnRate,
    };
  }, [expenses, members]);

  const trendData = useMemo(() => {
    const grouped = new Map();

    members.forEach((member) => {
      const key = monthKey(member.registrationDate);
      const current = grouped.get(key) || { month: key, revenue: 0, members: 0, expense: 0 };
      grouped.set(key, {
        ...current,
        revenue: current.revenue + Number(member.feeAmount || 0),
        members: current.members + 1,
      });
    });

    expenses.forEach((expense) => {
      const key = monthKey(expense.date);
      const current = grouped.get(key) || { month: key, revenue: 0, members: 0, expense: 0 };
      grouped.set(key, {
        ...current,
        expense: current.expense + Number(expense.amount || 0),
      });
    });

    return Array.from(grouped.values()).slice(-6);
  }, [expenses, members]);

  const expenseMix = useMemo(() => {
    const grouped = expenses.reduce((result, expense) => {
      result[expense.category] = (result[expense.category] || 0) + Number(expense.amount || 0);
      return result;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((first, second) => second.value - first.value)
      .slice(0, 6);
  }, [expenses]);

  const exitReasons = useMemo(() => {
    const grouped = metrics.inactiveMembers.reduce((result, member) => {
      const reason = member.exitNotes?.trim() || "No reason recorded";
      result[reason] = (result[reason] || 0) + 1;
      return result;
    }, {});

    return Object.entries(grouped)
      .map(([reason, count]) => ({ reason, count }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 5);
  }, [metrics.inactiveMembers]);

  const suggestions = useMemo(() => {
    const list = [];

    if (metrics.overdueMembers.length > 0) {
      list.push({
        title: "Recover overdue revenue",
        tone: "risk",
        description: `${metrics.overdueMembers.length} active members are past due. Prioritize payment follow-ups before adding new discount offers.`,
      });
    }

    if (metrics.monthlyExpense > metrics.monthlyRevenue * 0.45 && metrics.monthlyRevenue > 0) {
      list.push({
        title: "Expense pressure is rising",
        tone: "risk",
        description: `Expenses are ${Math.round((metrics.monthlyExpense / metrics.monthlyRevenue) * 100)}% of active monthly revenue. Review recurring categories first.`,
      });
    }

    if (metrics.growthRate >= 0) {
      list.push({
        title: "Growth runway looks positive",
        tone: "growth",
        description: `This month has ${metrics.joinedThisMonth} registrations. Keep seat availability visible and follow up with warm leads quickly.`,
      });
    }

    if (exitReasons.length > 0) {
      list.push({
        title: "Reduce member exits",
        tone: "focus",
        description: `Top exit signal: "${exitReasons[0].reason}". Track this reason consistently to spot service gaps.`,
      });
    }

    if (list.length === 0) {
      list.push({
        title: "Start collecting stronger signals",
        tone: "focus",
        description: "Add expenses and exit notes consistently so predictions become more useful over time.",
      });
    }

    return list.slice(0, 4);
  }, [exitReasons, metrics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Business Intelligence</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Library Performance Command Center</h2>
          <p className="mt-2 text-sm text-slate-500">Revenue, expenses, growth, risk, and operational guidance from your live library data.</p>
        </div>
        <div className="w-full border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 sm:w-auto">
          Prediction: {currency.format(metrics.projectedProfit)} monthly operating margin
        </div>
      </div>

      {errorMessage && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}
      {loading && <div className="border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">Loading dashboard metrics...</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Active Revenue" value={currency.format(metrics.monthlyRevenue)} helper="Projected from active member fees" icon={<IndianRupee size={20} />} tone="blue" />
        <KpiCard title="Operating Expense" value={currency.format(metrics.monthlyExpense)} helper="From Library Management ledger" icon={<BarChart3 size={20} />} tone="amber" />
        <KpiCard title="Active Members" value={metrics.activeMembers.length} helper={`${metrics.joinedThisMonth} joined this month`} icon={<Users size={20} />} tone="emerald" />
        <KpiCard title="At-Risk Payments" value={metrics.overdueMembers.length + metrics.dueMembers.length} helper={`${metrics.overdueMembers.length} overdue, ${metrics.dueMembers.length} due`} icon={<AlertTriangle size={20} />} tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Revenue vs Expense Trend</h3>
              <p className="text-sm text-slate-500">Last available operating months.</p>
            </div>
            <ArrowUpRight className="text-slate-400" size={20} />
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => currency.format(value)} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revenueFill)" />
                <Area type="monotone" dataKey="expense" stroke="#f59e0b" strokeWidth={2} fill="url(#expenseFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-900">KRA Health</h3>
            <p className="text-sm text-slate-500">Targets that deserve owner attention.</p>
          </div>
          <div className="space-y-4">
            <div className="border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Growth Rate</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-3xl font-bold text-slate-950">{metrics.growthRate}%</span>
                <TrendingUp className="text-emerald-600" size={22} />
              </div>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Churn Rate</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-3xl font-bold text-slate-950">{metrics.churnRate}%</span>
                <Users className="text-rose-600" size={22} />
              </div>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Net Margin Forecast</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-2xl font-bold text-slate-950">{currency.format(metrics.projectedProfit)}</span>
                <Brain className="text-blue-600" size={22} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Expense Mix</h3>
          <div className="mt-4 h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4}>
                  {expenseMix.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => currency.format(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Exit Reason Signals</h3>
          <div className="mt-4 h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exitReasons} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="reason" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#e11d48" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">AI-Style Suggestions</h3>
          <div className="mt-4 space-y-3">
            {suggestions.map((suggestion) => (
              <InsightCard key={suggestion.title} {...suggestion} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
