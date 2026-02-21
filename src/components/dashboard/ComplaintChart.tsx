import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, TooltipProps } from 'recharts';
import { ChartData } from '@/types';

interface ComplaintChartProps {
  data: ChartData[];
  type: 'area' | 'bar' | 'pie';
  title: string;
}

const COLORS = ['hsl(0, 70%, 50%)', 'hsl(45, 90%, 50%)', 'hsl(142, 70%, 45%)', 'hsl(270, 70%, 60%)'];

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-sm">
        <p className="text-muted-foreground">{label || payload[0].name}</p>
        <p className="font-semibold text-foreground">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export const ComplaintChart = ({ data, type, title }: ComplaintChartProps) => {
  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 15%, 20%)" />
              <XAxis
                dataKey="name"
                stroke="hsl(240, 5%, 60%)"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(240, 5%, 60%)"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(270, 70%, 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          ) : type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 15%, 20%)" />
              <XAxis
                dataKey="name"
                stroke="hsl(240, 5%, 60%)"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(240, 5%, 60%)"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      {type === 'pie' && (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
