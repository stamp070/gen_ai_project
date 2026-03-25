import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface RiskData {
    loop: number;
    riskValue: number; // 0-100 indicating risk percentage
}

interface RiskTimelineProps {
    history: RiskData[];
}

export function RiskTimeline({ history }: RiskTimelineProps) {
    // A mapping function to format Tooltips
    const formatTooltip = (value: number) => {
        if (value >= 80) return [`${value}% (Critical)`, 'Risk'];
        if (value >= 60) return [`${value}% (High)`, 'Risk'];
        if (value >= 40) return [`${value}% (Moderate)`, 'Risk'];
        return [`${value}% (Low)`, 'Risk'];
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle>Risk Timeline</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[200px] w-full pt-4">
                {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="loop" stroke="#6b7280" fontSize={12} tickFormatter={(val) => `L${val}`} />
                            <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={12} />

                            <ReferenceLine y={80} stroke="#FF4444" strokeDasharray="3 3" opacity={0.5} />
                            <ReferenceLine y={60} stroke="#FF8C00" strokeDasharray="3 3" opacity={0.5} />
                            <ReferenceLine y={40} stroke="#FFB800" strokeDasharray="3 3" opacity={0.5} />
                            <ReferenceLine y={20} stroke="#00C853" strokeDasharray="3 3" opacity={0.5} />

                            <Tooltip
                                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#00D4FF' }}
                                labelFormatter={(label) => `Loop ${label}`}
                            />
                            <Line
                                type="monotone"
                                dataKey="riskValue"
                                stroke="#00D4FF"
                                strokeWidth={3}
                                dot={{ fill: '#0A0E1A', stroke: '#00D4FF', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, fill: '#00D4FF' }}
                                animationDuration={1500}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 italic text-sm">
                        No risk history available yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
