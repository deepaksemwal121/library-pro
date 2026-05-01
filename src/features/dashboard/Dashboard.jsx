import { Users, DollarSign, BookOpen, UserCheck } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const data = [
  { name: "Revenue", value: 400 },
  { name: "Investment", value: 300 },
];
const COLORS = ["#2563eb", "#64748b"];

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm">{title}</p>
        <h3 className="text-2xl font-bold mt-1">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Available Seats" value="20" icon={Users} color="bg-blue-500" />
        <StatCard title="Total Seats" value="85" icon={BookOpen} color="bg-emerald-500" />
        <StatCard title="Demo Registrations" value="12" icon={UserCheck} color="bg-amber-500" />
        <StatCard title="Active Queries" value="3" icon={DollarSign} color="bg-rose-500" />
      </div>

      {/* Financial Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
        <h3 className="font-semibold mb-4">Financial Overview</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
