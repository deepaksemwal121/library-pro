import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, BarChart3, Brain, IndianRupee, Lock, ShieldCheck, Target, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import supabase from "../../../helpers/supabase";
import { loadExpensesFromDb } from "../librarymanagement/libraryStorage";
import { getExitReasonLabel, getPaymentStatus, mapMemberFromDb } from "../members/memberUtils";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const COLORS = ["#2563eb", "#059669", "#f59e0b", "#e11d48", "#7c3aed", "#0f766e"];

const monthKey = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  return date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
};

const isSameMonth = (dateValue, offset = 0) => {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  const target = new Date();
  target.setMonth(target.getMonth() + offset);

  return date.getMonth() === target.getMonth() && date.getFullYear() === target.getFullYear();
};

const currentMonthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

const monthId = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabelFromId = (id) => {
  if (!id) return "Unknown month";

  return new Date(`${id}-01T00:00:00`).toLocaleString("en-IN", { month: "long", year: "numeric" });
};

const addMonthsToId = (id, offset) => {
  const date = new Date(`${id}-01T00:00:00`);
  date.setMonth(date.getMonth() + offset);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getPaymentType = (payment) => payment.payment_type || "Monthly Fee";

const KpiCard = ({ title, value, helper, icon, tone = "blue" }) => {
  const toneClasses = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-600",
    slate: "bg-slate-700",
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
  const [payments, setPayments] = useState([]);
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage("");

      const [{ data, error }, { data: paymentData, error: paymentError }, loadedExpenses] = await Promise.all([
        supabase.from("library_members").select("*").order("created_at", { ascending: false }),
        supabase.from("payment_history").select("*").order("transaction_date", { ascending: false }),
        loadExpensesFromDb(),
      ]);

      if (ignore) return;

      if (error) {
        setErrorMessage(error.message);
        setMembers([]);
      } else {
        setMembers(data.map(mapMemberFromDb));
      }

      if (paymentError) {
        setErrorMessage((message) => [message, paymentError.message].filter(Boolean).join(" "));
        setPayments([]);
      } else {
        setPayments(paymentData || []);
      }

      setExpenses(loadedExpenses);
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
    const currentMonthPayments = payments.filter((payment) => isSameMonth(payment.transaction_date || payment.created_at, 0));
    const monthlyRevenue = currentMonthPayments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const membershipRevenue = currentMonthPayments
      .filter((payment) => ["Registration Fee", "Monthly Fee"].includes(getPaymentType(payment)))
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const lockerFee = currentMonthPayments
      .filter((payment) => getPaymentType(payment) === "Locker Fee")
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const securityDeposit = currentMonthPayments
      .filter((payment) => getPaymentType(payment) === "Locker Security")
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const currentMonthExpenses = expenses.filter((expense) => isSameMonth(expense.date, 0));
    const monthlyExpense = currentMonthExpenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const projectedProfit = monthlyRevenue - monthlyExpense;
    const overdueMembers = activeMembers.filter((member) => getPaymentStatus(member.paidUntil, member).tone === "red");
    const dueMembers = activeMembers.filter((member) => getPaymentStatus(member.paidUntil, member).tone === "yellow");
    const joinedThisMonth = members.filter((member) => isSameMonth(member.registrationDate, 0)).length;

    // Calculate seat occupancy growth rate (active members this month vs last month)
    const occupiedSeatsThisMonth = activeMembers.length;
    // Estimate last month's occupancy by subtracting members who joined this month and are active
    const activeJoinedThisMonth = joinedThisMonth;
    const occupiedSeatsLastMonth = Math.max(0, occupiedSeatsThisMonth - activeJoinedThisMonth);
    const growthRate =
      occupiedSeatsLastMonth > 0
        ? Math.round(((occupiedSeatsThisMonth - occupiedSeatsLastMonth) / occupiedSeatsLastMonth) * 100)
        : activeJoinedThisMonth > 0
          ? 100
          : 0;

    const churnRate = activeMembers.length
      ? Math.round((inactiveMembers.length / (activeMembers.length + inactiveMembers.length)) * 100)
      : 0;

    return {
      activeMembers,
      inactiveMembers,
      currentMonthPayments,
      monthlyRevenue,
      membershipRevenue,
      lockerFee,
      securityDeposit,
      monthlyExpense,
      currentMonthExpenses,
      projectedProfit,
      overdueMembers,
      dueMembers,
      joinedThisMonth,
      growthRate,
      churnRate,
    };
  }, [expenses, members, payments]);

  const trendData = useMemo(() => {
    const grouped = new Map();

    payments.forEach((payment) => {
      const key = monthKey(payment.transaction_date || payment.created_at);
      const current = grouped.get(key) || { month: key, sortDate: payment.transaction_date || payment.created_at, revenue: 0, members: 0, expense: 0 };
      grouped.set(key, {
        ...current,
        revenue: current.revenue + Number(payment.amount || 0),
      });
    });

    members.forEach((member) => {
      const key = monthKey(member.registrationDate);
      const current = grouped.get(key) || { month: key, sortDate: member.registrationDate, revenue: 0, members: 0, expense: 0 };
      grouped.set(key, { ...current, sortDate: current.sortDate || member.registrationDate, members: current.members + 1 });
    });

    expenses.forEach((expense) => {
      const key = monthKey(expense.date);
      const current = grouped.get(key) || { month: key, sortDate: expense.date, revenue: 0, members: 0, expense: 0 };
      grouped.set(key, {
        ...current,
        expense: current.expense + Number(expense.amount || 0),
      });
    });

    return Array.from(grouped.values())
      .sort((first, second) => new Date(first.sortDate) - new Date(second.sortDate))
      .slice(-6);
  }, [expenses, members, payments]);

  const monthlyFinanceRows = useMemo(() => {
    const grouped = new Map();

    const getRow = (id) => {
      const existing = grouped.get(id);

      if (existing) {
        return existing;
      }

      const next = {
        id,
        month: monthLabelFromId(id),
        revenue: 0,
        membershipRevenue: 0,
        expenditure: 0,
        securityDeposit: 0,
        lockerFee: 0,
        payments: 0,
        expenses: 0,
      };
      grouped.set(id, next);
      return next;
    };

    payments.forEach((payment) => {
      const id = monthId(payment.transaction_date || payment.created_at);
      if (!id) return;

      const amount = Number(payment.amount || 0);
      const type = getPaymentType(payment);
      const row = getRow(id);

      row.payments += 1;

      if (type === "Locker Security") {
        row.securityDeposit += amount;
      }

      if (type === "Locker Fee") {
        row.lockerFee += amount;
      }

      if (["Registration Fee", "Monthly Fee"].includes(type)) {
        row.membershipRevenue += amount;
      }

      row.revenue += amount;
    });

    expenses.forEach((expense) => {
      const id = monthId(expense.date);
      if (!id) return;

      const row = getRow(id);
      row.expenditure += Number(expense.amount || 0);
      row.expenses += 1;
    });

    const currentId = monthId(new Date().toISOString());
    const monthIds = [...grouped.keys(), currentId].filter(Boolean).sort();
    const firstMonthId = monthIds[0];
    const rows = [];

    if (!firstMonthId) {
      return rows;
    }

    for (let id = currentId; id >= firstMonthId; id = addMonthsToId(id, -1)) {
      rows.push(getRow(id));

      if (id === firstMonthId) {
        break;
      }
    }

    return rows
      .map((row) => ({ ...row, net: row.revenue - row.expenditure }))
      .sort((first, second) => second.id.localeCompare(first.id));
  }, [expenses, payments]);

  const visibleFinanceRows = useMemo(() => {
    if (selectedFinanceMonth) {
      return monthlyFinanceRows.filter((row) => row.id === selectedFinanceMonth);
    }

    return monthlyFinanceRows.slice(0, 3);
  }, [monthlyFinanceRows, selectedFinanceMonth]);

  const expenseMix = useMemo(() => {
    const grouped = metrics.currentMonthExpenses.reduce((result, expense) => {
      result[expense.category] = (result[expense.category] || 0) + Number(expense.amount || 0);
      return result;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((first, second) => second.value - first.value)
      .slice(0, 6);
  }, [metrics.currentMonthExpenses]);

  const exitReasons = useMemo(() => {
    const grouped = metrics.inactiveMembers.reduce((result, member) => {
      const reason = getExitReasonLabel(member.exitNotes);
      const key = reason.toLowerCase();
      const current = result.get(key) || { reason, count: 0 };
      result.set(key, { ...current, count: current.count + 1 });
      return result;
    }, new Map());

    return Array.from(grouped.values())
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
        description: `Expenses are ${Math.round((metrics.monthlyExpense / metrics.monthlyRevenue) * 100)}% of recorded monthly revenue. Review recurring categories first.`,
      });
    }

    if (metrics.growthRate >= 0) {
      list.push({
        title: "Seat occupancy is growing",
        tone: "growth",
        description: `Your seat occupancy is up ${metrics.growthRate}% compared to last month. With ${metrics.activeMembers.length}/85 seats occupied, there's room for growth.`,
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
          <p className="mt-2 text-sm text-slate-500">
            Revenue, expenses, growth, risk, and operational guidance from your live library data.
          </p>
        </div>
        <div className="w-full border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 sm:w-auto">
          Prediction: {currency.format(metrics.projectedProfit)} monthly operating margin
        </div>
      </div>

      {errorMessage && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}
      {loading && <div className="border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">Loading dashboard metrics...</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Monthly Finance Snapshot</h3>
            <p className="text-sm text-slate-500">{currentMonthLabel} cashflow from recorded payments and expenses.</p>
          </div>
          <div
            className={`border px-3 py-2 text-sm font-semibold ${
              metrics.projectedProfit >= 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            Net: {currency.format(metrics.projectedProfit)}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Monthly Revenue"
            value={currency.format(metrics.monthlyRevenue)}
            helper={`Membership: ${currency.format(metrics.membershipRevenue)}`}
            icon={<IndianRupee size={20} />}
            tone="blue"
          />
          <KpiCard
            title="Monthly Expenditure"
            value={currency.format(metrics.monthlyExpense)}
            helper={`${metrics.currentMonthExpenses.length} expense entries`}
            icon={<BarChart3 size={20} />}
            tone="amber"
          />
          <KpiCard
            title="Security Deposit"
            value={currency.format(metrics.securityDeposit)}
            helper="Locker security collected this month"
            icon={<ShieldCheck size={20} />}
            tone="slate"
          />
          <KpiCard
            title="Locker Fee"
            value={currency.format(metrics.lockerFee)}
            helper="Locker fee payments this month"
            icon={<Lock size={20} />}
            tone="emerald"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Monthly Finance History</h3>
            <p className="text-sm text-slate-500">
              {selectedFinanceMonth ? "Selected month totals from recorded payments and expenses." : "Latest 3 months from recorded payments and expenses."}
            </p>
          </div>
          <select
            value={selectedFinanceMonth}
            onChange={(event) => setSelectedFinanceMonth(event.target.value)}
            className="min-w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-blue-500"
          >
            <option value="">Latest 3 months</option>
            {monthlyFinanceRows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.month}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Month</th>
                <th className="px-3 py-3 text-right">Revenue</th>
                <th className="px-3 py-3 text-right">Expenditure</th>
                <th className="px-3 py-3 text-right">Security Deposit</th>
                <th className="px-3 py-3 text-right">Locker Fee</th>
                <th className="px-3 py-3 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {visibleFinanceRows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                    No monthly finance records available yet.
                  </td>
                </tr>
              )}

              {visibleFinanceRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-900">{row.month}</div>
                    <div className="text-xs text-slate-500">
                      {row.payments} payments, {row.expenses} expenses
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">{currency.format(row.revenue)}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{currency.format(row.expenditure)}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{currency.format(row.securityDeposit)}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{currency.format(row.lockerFee)}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${row.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {currency.format(row.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          title="Active Members"
          value={metrics.activeMembers.length}
          helper={`${metrics.joinedThisMonth} joined this month`}
          icon={<Users size={20} />}
          tone="emerald"
        />
        <KpiCard
          title="At-Risk Payments"
          value={metrics.overdueMembers.length + metrics.dueMembers.length}
          helper={`${metrics.overdueMembers.length} overdue, ${metrics.dueMembers.length} due`}
          icon={<AlertTriangle size={20} />}
          tone="rose"
        />
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
              <p className="text-sm text-slate-500">Seat Occupancy Growth</p>
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
