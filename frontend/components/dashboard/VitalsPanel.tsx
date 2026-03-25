import React from 'react';
import { PatientVitals } from '../../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Activity, Thermometer, Droplets, HeartPulse, Wind } from 'lucide-react';

export function VitalsPanel({ vitals }: { vitals: PatientVitals }) {
    const getVitalStatus = (value: number, min: number, max: number) => {
        if (value < min || value > max) return 'text-[var(--color-critical)]';
        // Add logic for warning if close to boundary
        return 'text-[var(--color-low)]';
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Vital Signs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-1 gap-4">

                <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/20 rounded-full">
                            <Activity className="w-5 h-5 text-pink-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Heart Rate</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-bold ${getVitalStatus(vitals.heart_rate, 60, 100)}`}>
                                    {vitals.heart_rate}
                                </span>
                                <span className="text-xs text-gray-500">bpm</span>
                            </div>
                        </div>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">60-100</span>
                </div>

                <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-full">
                            <HeartPulse className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Blood Pressure</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-bold ${(vitals.blood_pressure_sys < 90 || vitals.blood_pressure_sys > 140 || vitals.blood_pressure_dia < 60 || vitals.blood_pressure_dia > 90)
                                        ? 'text-[var(--color-critical)]' : 'text-[var(--color-low)]'
                                    }`}>
                                    {vitals.blood_pressure_sys}/{vitals.blood_pressure_dia}
                                </span>
                                <span className="text-xs text-gray-500">mmHg</span>
                            </div>
                        </div>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">90/60-140/90</span>
                </div>

                <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-full">
                            <Droplets className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">SpO2</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-bold ${getVitalStatus(vitals.spo2, 95, 100)}`}>
                                    {vitals.spo2}%
                                </span>
                            </div>
                        </div>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">&gt;95%</span>
                </div>

                <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-full">
                            <Thermometer className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Temperature</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-bold ${getVitalStatus(vitals.temperature, 36.1, 37.2)}`}>
                                    {vitals.temperature}
                                </span>
                                <span className="text-xs text-gray-500">°C</span>
                            </div>
                        </div>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">36.1-37.2</span>
                </div>

                <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-500/20 rounded-full">
                            <Wind className="w-5 h-5 text-teal-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Resp Rate</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-bold ${getVitalStatus(vitals.respiratory_rate, 12, 20)}`}>
                                    {vitals.respiratory_rate}
                                </span>
                                <span className="text-xs text-gray-500">/min</span>
                            </div>
                        </div>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">12-20</span>
                </div>

            </CardContent>
        </Card>
    );
}
