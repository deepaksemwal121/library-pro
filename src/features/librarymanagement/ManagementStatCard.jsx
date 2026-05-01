export const ManagementStatCard = ({ title, value, helper, icon, color }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <h3 className="mt-1 text-2xl font-bold text-slate-900">{value}</h3>
        {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
      </div>
      <div className={`rounded-lg p-2 text-white ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);
