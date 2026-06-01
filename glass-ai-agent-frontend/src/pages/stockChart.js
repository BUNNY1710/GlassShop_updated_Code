import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

function StockChart({ data }) {
  const chartData = data.map(s => ({
    name: `${s.glass?.type}-S${s.standNo}`,
    quantity: s.quantity
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="quantity" fill="#4CAF50" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default StockChart;
