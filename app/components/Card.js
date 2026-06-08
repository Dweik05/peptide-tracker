export default function Card({ title, value, subtitle, color }) {
  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
      <p className="text-slate-400 text-sm mb-1">{title}</p>
      <p className={`text-3xl font-bold mb-1 ${color ? color : "text-white"}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-slate-500 text-sm">{subtitle}</p>
      )}
    </div>
  )
}